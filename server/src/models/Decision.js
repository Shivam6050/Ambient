import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  decision: { type: String, enum: ['NOTIFY', 'WAIT', 'IGNORE', 'ASK', 'ESCALATE'], required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  priorityScore: { type: Number, default: null },
  reason: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },
  suggestedAction: { type: String, required: true },
  target: { type: String, required: true },
  source: { type: String, required: true },
  policyReason: { type: String, default: null },
  policyVersion: { type: String, default: '1' },
  gate: { type: mongoose.Schema.Types.Mixed, default: null },
  jev: { type: mongoose.Schema.Types.Mixed, default: null },
  proposedDecision: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

export default mongoose.model('Decision', schema);
