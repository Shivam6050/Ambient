import { processEvent, listEvents, dismissEvent } from '../services/events/eventService.js';
import { serialize } from '../services/serialize.js';
export async function createEvent(req, res, next) {
  try { res.status(201).json({ success: true, data: await serialize(() => processEvent(req.body?.event)) }); }
  catch (error) {
    if (error.name === 'ValidationError' || error.message === 'Choose a supported demo event.') return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
}
export async function getEvents(_, res) { res.json({ success: true, data: await listEvents() }); }
export async function dismiss(req, res) {
  const record = await serialize(() => dismissEvent(req.params.id));
  if (!record) return res.status(404).json({ success: false, message: 'Event not found.' });
  res.json({ success: true, data: record });
}
