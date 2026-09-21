import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { evaluateEvent } from '../services/agent/agent.service.js';
import { history, listEvents, dismissEvent } from '../services/events/event.service.js';

export const createEvent = asyncHandler(async (req, res) => {
  const event = req.body?.event || req.body;
  const userId = req.body?.userId || 'demo-user';
  if (!event?.source || !event?.type) return res.status(400).json({ success: false, message: 'event.source and event.type are required' });
  return res.status(201).json({ success: true, data: await evaluateEvent(event, null, userId) });
});

export const getEventsList = asyncHandler(async (req, res) => ApiResponse(res, 200, await listEvents(req.query.userId || 'demo-user'), 'Events loaded'));
export const getEventHistory = asyncHandler(async (req, res) => ApiResponse(res, 200, await history(req.query.userId || 'demo-user'), 'History loaded'));

export const dismiss = asyncHandler(async (req, res) => {
  const result = await dismissEvent(req.params.id, req.query.userId || 'demo-user');
  if (!result) return res.status(404).json({ success: false, message: 'Event not found' });
  return ApiResponse(res, 200, result, 'Event dismissed');
});
