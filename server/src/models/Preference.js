import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  doNotInterruptMeetings: { type: Boolean, default: true },
  allowTimeSensitiveInterruptions: { type: Boolean, default: false },
  allowCriticalInterruptions: { type: Boolean, default: true },
  preferredTarget: { type: String, default: 'alexa' }
}, { timestamps: true });

export default mongoose.model('Preference', schema);
