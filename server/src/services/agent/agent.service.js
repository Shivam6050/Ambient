import Event from '../../models/Event.js';
import Decision from '../../models/Decision.js';
import EventRecord from '../../models/EventRecord.js';
import { generateDecision } from './llm.service.js';
import { validateProposal } from './decision.schema.js';
import { validateDecision } from '../decisions/policy.service.js';
import { getContext } from '../context/context.service.js';
import { rememberEvent, rememberDecision, updateRememberedEvent } from '../events/eventMemory.js';
import { routeAction } from '../actions/actionRouter.js';
import { applyConfidenceGate } from '../decisions/confidenceGate.service.js';

function buildReason(decision, event, context, info = {}) {
  const confidence = Math.round((info.confidence || 0) * 100);
  if (decision === 'WAIT') return `Selected WAIT (${confidence}% confidence) because the user is ${context.availability} and this event can wait.`;
  if (decision === 'NOTIFY') return `Selected NOTIFY (${confidence}% confidence) based on the event urgency and current moment.`;
  if (decision === 'IGNORE') return `Selected IGNORE (${confidence}% confidence) for this non-actionable event.`;
  if (decision === 'ASK') return `Selected ASK (${confidence}% confidence) because user clarification is required.`;
  return `Selected ESCALATE (${confidence}% confidence) because the event requires escalation.`;
}

function enrichProposal(raw, event, context) {
  const decision = raw.decision;
  const target = decision === 'NOTIFY' ? 'alexa' : 'ambient';
  const suggestedAction = {
    NOTIFY: 'Notify the user and offer event details.',
    WAIT: 'Store the event and re-evaluate when the user becomes available.',
    IGNORE: 'Take no action and mark the event as ignored.',
    ASK: 'Ask the user how they want the event handled.',
    ESCALATE: 'Route the event to the configured escalation handler.'
  }[decision] || raw.suggestedAction;

  return {
    ...raw,
    decision,
    priority: raw.priority || 'medium',
    reason: raw.reason || buildReason(decision, event, context, raw),
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.95,
    suggestedAction,
    target: raw.target || target,
    source: raw.source || 'agent'
  };
}

export async function evaluateEvent(payload, suppliedContext, userId = 'demo-user', options = {}) {
  const eventPayload = { ...payload };
  const { context: storedContext, preferences } = await getContext(userId);
  const context = suppliedContext ? { ...storedContext, ...suppliedContext } : storedContext;

  let event;
  const isMongoReady = Event.db?.readyState === 1;

  if (options.existingEventId && isMongoReady) {
    event = await Event.findById(options.existingEventId);
    if (!event) event = await Event.findOne({ _id: options.existingEventId });
  } else if (isMongoReady) {
    event = await Event.create({ ...eventPayload, userId });
  } else if (options.existingEventId) {
    event = updateRememberedEvent(options.existingEventId, {}, userId);
  }

  if (!event) {
    event = {
      ...eventPayload,
      userId,
      _id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'pending',
      occurredAt: new Date()
    };
    rememberEvent(event);
  }

  const plainEvent = typeof event.toObject === 'function' ? event.toObject() : event;
  const generated = await generateDecision({ event: plainEvent, context, preferences });
  const proposal = validateProposal(enrichProposal(generated, plainEvent, context));
  const validatedDecision = validateDecision(proposal, plainEvent, context, preferences);
  const decision = applyConfidenceGate(validatedDecision, { event: plainEvent, context });

  const nextStatus = decision.decision === 'WAIT' ? 'waiting' : decision.decision === 'IGNORE' ? 'ignored' : 'handled';
  event.status = nextStatus;

  if (typeof event.save === 'function') {
    await event.save();
  } else {
    updateRememberedEvent(event._id, { status: nextStatus }, userId);
  }

  let savedDecision;
  if (Decision.db?.readyState === 1) {
    savedDecision = await Decision.create({
      userId,
      eventId: isMongoReady && event._id && typeof event._id !== 'string' ? event._id : null,
      ...decision
    });
  } else {
    savedDecision = rememberDecision({
      _id: `memory-decision-${Date.now()}`,
      userId,
      eventId: event._id,
      ...decision,
      createdAt: new Date()
    });
  }

  // Also maintain EventRecord for complete lifecycle timeline persistence when MongoDB is active
  if (EventRecord.db?.readyState === 1) {
    const recordId = String(event._id);
    await EventRecord.findOneAndUpdate(
      { id: recordId },
      {
        $setOnInsert: {
          id: recordId,
          event: plainEvent,
          context,
          decision,
          status: decision.decision === 'WAIT' ? 'deferred' : 'notified',
          timeline: [
            { at: new Date(), action: 'RECEIVED', reason: 'Simulated device event received.' },
            { at: new Date(), action: decision.decision, reason: decision.reason, source: decision.source, policyReason: decision.policyReason }
          ]
        }
      },
      { upsert: true }
    );
  }

  const action = await routeAction({ decision, event: plainEvent, context, userId });

  return {
    event: plainEvent,
    context,
    preferences,
    decision: typeof savedDecision.toObject === 'function' ? savedDecision.toObject() : savedDecision,
    action
  };
}
