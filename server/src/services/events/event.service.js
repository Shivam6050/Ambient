import Event from '../../models/Event.js';
import Decision from '../../models/Decision.js';
import EventRecord from '../../models/EventRecord.js';
import { isDBConnected } from '../../config/db.js';
import { getEvents, getDecisions, getWaiting, getRecords, patchEvent, getRecord } from './memory.js';

export async function history(userId = 'demo-user') {
  if (isDBConnected()) {
    const [events, decisions, waiting] = await Promise.all([
      Event.find({ userId }).sort({ occurredAt: -1 }).limit(20).lean(),
      Decision.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
      Event.find({ userId, status: 'waiting' }).sort({ occurredAt: 1 }).lean()
    ]);
    return { events, decisions, waiting };
  }
  return { events: getEvents(userId), decisions: getDecisions(userId), waiting: getWaiting(userId), records: getRecords(userId) };
}

export async function listEvents(userId = 'demo-user') {
  if (isDBConnected()) return EventRecord.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
  return getRecords(userId);
}

export async function dismissEvent(id, userId = 'demo-user') {
  if (isDBConnected()) {
    const record = await EventRecord.findOneAndUpdate({ id, userId }, { $set: { status: 'dismissed' }, $push: { timeline: { at: new Date(), action: 'DISMISSED', reason: 'Dismissed by user.' } } }, { new: true }).lean();
    await Event.findOneAndUpdate({ _id: id, userId }, { $set: { status: 'dismissed' } });
    if (record) return record;
  }
  const event = patchEvent(userId, id, { status: 'dismissed' });
  const record = getRecord(userId, id);
  if (record) return { ...record, status: 'dismissed', timeline: [...record.timeline, { at: new Date(), action: 'DISMISSED', reason: 'Dismissed by user.' }] };
  return event;
}
