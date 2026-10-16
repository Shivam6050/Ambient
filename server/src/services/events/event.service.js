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

// Approval means showing this simulated update now, never executing arbitrary model tools.
export function resolveReview(id, choice, userId = 'demo-user') {
  if (!['approve', 'decline'].includes(choice)) throw Object.assign(new Error('Choose approve or decline.'), { statusCode: 400 });
  return serialize(async () => {
    const db = isDBConnected();
    const record = db ? await EventRecord.findOne({ id, userId }).lean() : getRecord(userId, id);
    if (!record) throw Object.assign(new Error('Event not found.'), { statusCode: 404 });
    if (record.resolution?.choice) {
      if (record.resolution.choice !== choice) throw Object.assign(new Error('This request has already been resolved.'), { statusCode: 409 });
      return record;
    }
    const pending = record.decision.decision === 'ASK' && record.action?.status === 'pending_user_input' && ['review', 'notified'].includes(record.status);
    if (!pending) throw Object.assign(new Error('This event is not awaiting confirmation.'), { statusCode: 409 });
    const approved = choice === 'approve';
    const at = new Date();
    const patch = {
      status: approved ? 'notified' : 'dismissed',
      resolution: { choice, at },
      event: { ...record.event, status: approved ? 'handled' : 'dismissed' },
      action: approved
        ? { channel: 'alexa', mode: 'simulated-alexa-plus', status: 'ready', message: `You approved this update: ${String(record.event.type).replaceAll('_', ' ')}.` }
        : { channel: 'ambient', mode: 'memory', status: 'declined' }
    };
    const entry = { at, action: approved ? 'APPROVED' : 'DECLINED', reason: approved ? 'User chose to show this simulated update now.' : 'User declined the update.', source: 'user' };
    if (db) {
      const updated = await EventRecord.findOneAndUpdate({ id, userId, status: record.status, 'resolution.choice': { $exists: false } }, { $set: patch, $push: { timeline: entry } }, { new: true, runValidators: true }).lean();
      if (!updated) throw Object.assign(new Error('This request changed. Refresh and try again.'), { statusCode: 409 });
      await Event.updateOne({ _id: record.event._id, userId }, { $set: { status: patch.event.status } });
      return updated;
    }
    patchEvent(userId, id, { status: patch.event.status });
    return saveRecord({ ...record, ...patch, timeline: [...record.timeline, entry] });
  });
}
