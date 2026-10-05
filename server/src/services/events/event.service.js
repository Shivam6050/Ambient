import Event from '../../models/Event.js';
import Decision from '../../models/Decision.js';
import EventRecord from '../../models/EventRecord.js';
import { isDBConnected } from '../../config/db.js';
import { getEvents, getDecisions, getWaiting, getRecords, patchEvent, getRecord, saveRecord } from './memory.js';
import { serialize } from '../serialize.js';
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
export function dismissEvent(id, userId = 'demo-user') {
  return serialize(async () => {
    if (isDBConnected()) {
      const changed = await EventRecord.findOneAndUpdate({ id, userId, status: { $ne: 'dismissed' } }, {
        $set: { status: 'dismissed' }, $push: { timeline: { at: new Date(), action: 'DISMISSED', reason: 'Dismissed by user.' } }
      }, { new: true }).lean();
      const record = changed || await EventRecord.findOne({ id, userId }).lean();
      if (!record) return null;
      await Event.updateOne({ _id: record.event._id, userId }, { $set: { status: 'dismissed' } });
      return record;
    }
    const record = getRecord(userId, id);
    if (!record) return null;
    patchEvent(userId, id, { status: 'dismissed' });
    if (record.status === 'dismissed') return record;
    return saveRecord({ ...record, status: 'dismissed', timeline: [...record.timeline, { at: new Date(), action: 'DISMISSED', reason: 'Dismissed by user.' }] });
  });
}
