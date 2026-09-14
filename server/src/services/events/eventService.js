import Event from '../../models/Event.js';
import { decide } from '../decisions/decisionEngine.js';
import { readContext } from '../context/contextService.js';
const records = new Map();
function transition(record, context) {
  record.context = context;
  record.decision = decide({ event: record.event, context });
  record.status = record.decision.decision === 'WAIT' ? 'deferred' : 'notified';
  record.timeline.push({ at: new Date().toISOString(), action: record.decision.decision, reason: record.decision.reason });
}
export async function processEvent(payload) {
  if (!payload || !['package_delivered', 'security_alert'].includes(payload.type)) throw new Error('Choose a supported demo event.');
  const document = new Event(payload);
  await document.validate();
  const event = process.env.MONGODB_URI ? (await document.save()).toObject() : document.toObject();
  const record = { id: String(event._id), event, timeline: [{ at: new Date().toISOString(), action: 'RECEIVED', reason: 'Simulated device event received.' }] };
  transition(record, readContext());
  records.set(record.id, record);
  return record;
}
export function listEvents() { return [...records.values()].reverse(); }
export function reevaluateDeferred(context) {
  if (context.availability !== 'available') return;
  for (const record of records.values()) {
    if (record.status === 'deferred') transition(record, context);
  }
}
export function dismissEvent(id) {
  const record = records.get(id);
  if (!record) return null;
  if (record.status !== 'dismissed') {
    record.status = 'dismissed';
    record.timeline.push({ at: new Date().toISOString(), action: 'DISMISSED', reason: 'Dismissed by you.' });
  }
  return record;
}
