import mongoose from 'mongoose';
const contextSchema = new mongoose.Schema({
  _id: { type: String, default: 'local-user' },
  availability: { type: String, enum: ['busy', 'available'], default: 'available' },
  activity: { type: String, default: 'idle' },
  location: { type: String, default: 'home' }
}, { timestamps: true });
export default mongoose.model('Context', contextSchema);
