import mongoose from 'mongoose';

const contextSchema = new mongoose.Schema({
  userId: { type: String, default: 'demo-user', unique: true, index: true },
  availability: { type: String, enum: ['available', 'busy'], default: 'available' },
  activity: { type: String, default: 'idle' },
  location: { type: String, default: 'home' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('UserContext', contextSchema);
