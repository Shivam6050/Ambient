import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  availability: { type: String, enum: ['available', 'busy'], default: 'available' },
  activity: { type: String, default: 'idle' },
  location: { type: String, default: 'home' }
}, { timestamps: true });

export default mongoose.model('UserContext', schema);
