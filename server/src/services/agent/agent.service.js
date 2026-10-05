import { serialize } from '../serialize.js';
import Event from '../../models/Event.js';
import Decision from '../../models/Decision.js';
import EventRecord from '../../models/EventRecord.js';
import { isDBConnected } from '../../config/db.js';
import { getContext } from '../context/context.service.js';
import { proposeDecision } from './decision.service.js';
import { validateProposal } from '../decisions/decision.schema.js';
import { applyPolicy } from '../decisions/policy.service.js';
import { applyConfidenceGate } from '../decisions/confidenceGate.service.js';
import { routeAction } from '../actions/actionRouter.js';
import { saveEvent, patchEvent, saveDecision, saveRecord, getRecord, getEvent } from '../events/memory.js';

function id() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadOrCreateEvent(payload, userId, existingEventId) {
  if (isDBConnected()) {
    if (existingEventId) {
      const existing = await Event.findOne({ _id: existingEventId, userId });
      if (!existing) throw Object.assign(new Error('Waiting event not found'), { statusCode: 404 });
      return existing;
    }
    return Event.create({ ...payload, userId, status: 'pending' });
  }

  if (existingEventId) {
    const existing = getEvent(userId, existingEventId);
    if (!existing) throw Object.assign(new Error('Waiting event not found'), { statusCode: 404 });
    return existing;
  }

  const event = { ...payload, userId, _id: id(), status: 'pending', occurredAt: new Date() };
  saveEvent(event);
  return event;
}

export function evaluateEvent(...args) { return serialize(() => evaluateEventInternal(...args)); }

async function evaluateEventInternal(payload, suppliedContext = null, userId = 'demo-user', options = {}) {
  const { context: storedContext, preferences } = await getContext(userId);
  const context = suppliedContext ? { ...storedContext, ...suppliedContext } : storedContext;
  const eventDoc = await loadOrCreateEvent(payload, userId, options.existingEventId);
  const event = typeof eventDoc.toObject === 'function' ? eventDoc.toObject() : eventDoc;

  const previous = options.existingEventId
    ? (isDBConnected() ? await EventRecord.findOne({ id: String(event._id), userId }).lean() : getRecord(userId, String(event._id)))
    : null;
  // A stale waiting-list snapshot must never redeliver a handled or dismissed event.
  if (options.existingEventId && event.status !== 'waiting') {
    return { event, context, preferences, decision: previous?.decision, action: { status: 'unchanged', channel: 'ambient' } };
  }

  let proposal;
  try {
    proposal = validateProposal(await proposeDecision({ event, context, preferences }));
  } catch (error) {
    proposal = {
      decision: context.availability === 'busy' ? 'WAIT' : 'NOTIFY',
      priority: event.priority || 'medium',
      reason: 'Decision provider failed safely; Ambient is deferring to its deterministic policy.',
      confidence: 0.4,
      suggestedAction: context.availability === 'busy'
        ? 'Re-evaluate when the user becomes available.'
        : 'Ask the user before taking action.',
      target: context.availability === 'busy' ? 'ambient' : 'alexa',
      source: 'fallback',
      providerError: error.message
    };
  }

  const policyDecision = applyPolicy(proposal, event, context, preferences);
  const decision = applyConfidenceGate(policyDecision, { event });
  const status = decision.decision === 'WAIT'
    ? 'waiting'
    : decision.decision === 'IGNORE'
      ? 'ignored'
      : 'handled';

  if (typeof eventDoc.save === 'function') {
    eventDoc.status = status;
    await eventDoc.save();
  } else {
    patchEvent(userId, event._id, { status });
  }

  const decisionRecord = {
    ...decision,
    userId,
    eventId: event._id,
    createdAt: new Date()
  };

  const savedDecision = isDBConnected()
    ? await Decision.create(decisionRecord)
    : saveDecision({
        ...decisionRecord,
        _id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      });

  const action = await routeAction({ decision, event, context, userId });
  const recordId = String(event._id);
  const timeline = [
    ...(previous?.timeline || [{ at: new Date(), action: 'RECEIVED', reason: 'Device event received.' }]),
    {
      at: new Date(),
      action: decision.decision,
      reason: decision.reason,
      source: decision.source,
      policyReason: decision.policyReason
    }
  ];

  const record = {
    id: recordId,
    userId,
    event: { ...event, status },
    action,
    context,
    decision: savedDecision.toObject?.() || savedDecision,
    status: status === 'waiting' ? 'deferred' : status === 'ignored' ? 'ignored' : 'notified',
    timeline
  };

  if (isDBConnected()) {
    await EventRecord.findOneAndUpdate(
      { id: recordId, userId },
      { $set: record },
      { upsert: true, new: true }
    );
  } else {
    saveRecord(record);
  }

  return {
    event: { ...(typeof eventDoc.toObject === 'function' ? eventDoc.toObject() : eventDoc), status },
    context,
    preferences,
    decision: savedDecision.toObject?.() || savedDecision,
    action
  };
}

export async function getDecisionProviderStatus() {
  return { provider: (await import('../../config/env.js')).env.aiProvider };
}
