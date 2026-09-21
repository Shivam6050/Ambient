import mongoose from 'mongoose';

const timelineEntry = new mongoose.Schema({
  at: { type: Date, required: true },
  action: { type: String, required: true },
  reason: { type: String, required: true },
  source: String,
  policyReason: String
}, { _id: false });

const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  event: { type: mongoose.Schema.Types.Mixed, required: true },
  context: { type: mongoose.Schema.Types.Mixed, required: true },
  decision: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['deferred', 'notified', 'ignored', 'dismissed'], required: true },
  timeline: { type: [timelineEntry], default: [] }
}, { timestamps: true });

export default mongoose.model('EventRecord', schema);
