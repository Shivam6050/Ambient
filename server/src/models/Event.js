import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  source: { type: String, required: true },
  type: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'waiting', 'handled', 'ignored', 'dismissed'], default: 'pending', index: true },
  occurredAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Event', schema);
