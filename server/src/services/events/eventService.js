import Event from '../../models/Event.js';
import Record from '../../models/EventRecord.js';
import { evaluateDecision } from '../agent/decisionService.js';
import { readContext } from '../context/contextService.js';
export async function processEvent(payload) {
  if (!payload || !['package_delivered', 'security_alert'].includes(payload.type)) throw new Error('Choose a supported demo event.');
  const document = new Event(payload);
  await document.validate();
  const event = document.toObject();
  const context = await readContext();
  const decision = await evaluateDecision({ event, context });
  return Record.create({ id: String(event._id), event, context, decision,
    status: decision.decision === 'WAIT' ? 'deferred' : 'notified',
    timeline: [{ at: new Date(), action: 'RECEIVED', reason: 'Simulated device event received.' }, { at: new Date(), action: decision.decision, reason: decision.reason, source: decision.source, policyReason: decision.policyReason }]
  });
}
export function listEvents() { return Record.find().sort({ createdAt: -1, _id: -1 }).lean(); }
export async function reevaluateDeferred(context) {
  if (context.availability !== 'available') return;
  const records = await Record.find({ status: 'deferred' }).lean();
  for (const record of records) {
    const decision = await evaluateDecision({ event: record.event, context, status: record.status });
    // The status condition and timeline update are one atomic write.
    await Record.updateOne({ id: record.id, status: 'deferred' }, {
      $set: { context, decision, status: 'notified' },
      $push: { timeline: { at: new Date(), action: 'NOTIFY', reason: decision.reason, source: decision.source, policyReason: decision.policyReason } }
    });
  }
}
export async function dismissEvent(id) {
  const updated = await Record.findOneAndUpdate({ id, status: { $ne: 'dismissed' } }, {
    $set: { status: 'dismissed' },
    $push: { timeline: { at: new Date(), action: 'DISMISSED', reason: 'Dismissed by you.' } }
  }, { new: true }).lean();
  return updated || Record.findOne({ id }).lean();
}
