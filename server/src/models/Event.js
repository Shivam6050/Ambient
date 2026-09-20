import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  userId: { type: String, default: 'demo-user', index: true },
  source: { type: String, required: true },
  type: { type: String, required: true },
  priority: { type: String, default: 'medium' },
  metadata: { type: Object, default: {} },
  status: { type: String, enum: ['pending', 'waiting', 'handled', 'ignored', 'deferred', 'notified', 'dismissed'], default: 'pending', index: true },
  occurredAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
