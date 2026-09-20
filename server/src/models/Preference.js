import mongoose from 'mongoose';

const preferenceSchema = new mongoose.Schema({
  userId: { type: String, default: 'demo-user', unique: true, index: true },
  quietHours: {
    start: { type: String, default: '22:00' },
    end: { type: String, default: '07:00' }
  },
  doNotInterruptMeetings: { type: Boolean, default: true },
  allowTimeSensitiveInterruptions: { type: Boolean, default: false },
  allowCriticalInterruptions: { type: Boolean, default: true },
  preferredTarget: { type: String, default: 'alexa' }
}, { timestamps: true });

export default mongoose.model('Preference', preferenceSchema);
