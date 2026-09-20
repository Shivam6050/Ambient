import Event from '../../models/Event.js';
import { getContext } from '../context/context.service.js';
import { evaluateEvent } from '../agent/agent.service.js';
import { getWaitingEvents } from './eventMemory.js';

export async function getWaitingEventsForUser(userId = 'demo-user') {
  if (Event.db?.readyState === 1) {
    return Event.find({ userId, status: { $in: ['waiting', 'deferred'] } }).sort({ occurredAt: 1 });
  }
  return getWaitingEvents(userId);
}

export async function reEvaluateWaitingEvents(userId = 'demo-user') {
  const { context } = await getContext(userId);
  const waiting = await getWaitingEventsForUser(userId);
  const results = [];

  for (const eventDoc of waiting) {
    const event = typeof eventDoc.toObject === 'function' ? eventDoc.toObject() : eventDoc;
    const result = await evaluateEvent(
      { source: event.source, type: event.type, priority: event.priority, metadata: event.metadata },
      context,
      userId,
      { existingEventId: event._id }
    );
    results.push(result);
  }

  return { context, reEvaluated: results.length, results };
}
