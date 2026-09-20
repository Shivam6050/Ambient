import Event from '../../models/Event.js';
import EventRecord from '../../models/EventRecord.js';
import { evaluateEvent } from '../agent/agent.service.js';
import { updateRememberedEvent, getRecentEvents } from './eventMemory.js';

export async function processEvent(payload, context, userId = 'demo-user') {
  return evaluateEvent(payload, context, userId);
}

export async function listEvents(userId = 'demo-user') {
  if (EventRecord.db?.readyState === 1) {
    const records = await EventRecord.find().sort({ createdAt: -1, _id: -1 }).lean();
    if (records.length) return records;
  }
  if (Event.db?.readyState === 1) {
    return Event.find({ userId }).sort({ occurredAt: -1 }).lean();
  }
  return getRecentEvents(userId);
}

export async function reevaluateDeferred(context, userId = 'demo-user') {
  if (context?.availability !== 'available') return;
  const { reEvaluateWaitingEvents } = await import('./reEvaluation.service.js');
  return reEvaluateWaitingEvents(userId);
}

export async function dismissEvent(id, userId = 'demo-user') {
  let updated = null;

  if (EventRecord.db?.readyState === 1) {
    updated = await EventRecord.findOneAndUpdate(
      { id, status: { $ne: 'dismissed' } },
      {
        $set: { status: 'dismissed' },
        $push: { timeline: { at: new Date(), action: 'DISMISSED', reason: 'Dismissed by user.' } }
      },
      { new: true }
    ).lean();
  }

  if (Event.db?.readyState === 1) {
    const event = await Event.findByIdAndUpdate(
      id,
      { $set: { status: 'dismissed' } },
      { new: true }
    ).lean();
    if (event && !updated) updated = event;
  }

  const remembered = updateRememberedEvent(id, { status: 'dismissed' }, userId);
  return updated || remembered || { id, status: 'dismissed' };
}
