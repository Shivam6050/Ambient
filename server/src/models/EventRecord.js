import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  event: { type: mongoose.Schema.Types.Mixed, required: true },
  context: { type: mongoose.Schema.Types.Mixed, required: true },
  decision: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['deferred', 'notified', 'dismissed'], required: true, index: true },
  timeline: [{ _id: false, at: { type: Date, required: true }, action: { type: String, enum: ['RECEIVED', 'WAIT', 'NOTIFY', 'DISMISSED'], required: true }, reason: { type: String, required: true } }]
}, { timestamps: true });
export default mongoose.model('EventRecord', schema);
