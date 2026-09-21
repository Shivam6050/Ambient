import Event from '../../models/Event.js';
import { isDBConnected } from '../../config/db.js';
import { getContext } from '../context/context.service.js';
import { evaluateEvent } from '../agent/agent.service.js';
import { getWaiting } from './memory.js';

export async function getWaitingEvents(userId = 'demo-user') {
  if (isDBConnected()) return Event.find({ userId, status: 'waiting' }).sort({ occurredAt: 1 }).lean();
  return getWaiting(userId);
}

export async function reEvaluateWaitingEvents(userId = 'demo-user') {
  const { context } = await getContext(userId);
  if (context.availability !== 'available') return { context, reEvaluated: 0, results: [] };
  const waiting = await getWaitingEvents(userId);
  const results = [];
  for (const event of waiting) {
    results.push(await evaluateEvent({ source: event.source, type: event.type, priority: event.priority, metadata: event.metadata }, context, userId, { existingEventId: String(event._id) }));
  }
  return { context, reEvaluated: results.length, results };
}
