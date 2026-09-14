import mongoose from 'mongoose';
const eventSchema = new mongoose.Schema({
  source:{type:String,required:true}, type:{type:String,required:true}, priority:{type:String,default:'medium'}, metadata:{type:Object,default:{}}, occurredAt:{type:Date,default:Date.now}
},{timestamps:true});
export default mongoose.model('Event', eventSchema);
