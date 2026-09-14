import { processEvent, listEvents, dismissEvent } from '../services/events/eventService.js';
export async function createEvent(req, res) {
  try { res.status(201).json({ success: true, data: await processEvent(req.body?.event) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
}
export function getEvents(_, res) { res.json({ success: true, data: listEvents() }); }
export function dismiss(req, res) {
  const record = dismissEvent(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Event not found.' });
  res.json({ success: true, data: record });
}
