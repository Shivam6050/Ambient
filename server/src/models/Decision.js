import mongoose from 'mongoose';

const decisionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: false, index: true },
  decision: { type: String, enum: ['NOTIFY', 'WAIT', 'IGNORE', 'ASK', 'ESCALATE'], required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  reason: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, default: 1 },
  suggestedAction: { type: String, required: false },
  target: { type: String, default: 'ambient' },
  source: { type: String, default: 'policy' },
  gate: { type: Object, default: null },
  jev: { type: Object, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Decision', decisionSchema);
