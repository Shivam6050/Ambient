import { processEvent } from '../services/events/eventService.js';
export async function createEvent(req,res){
  try { const result = await processEvent(req.body.event, req.body.context || {availability:'available'}); res.status(201).json({success:true,data:result}); }
  catch(error){ res.status(400).json({success:false,message:error.message}); }
}
