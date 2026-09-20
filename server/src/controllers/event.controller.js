import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { evaluateEvent } from '../services/agent/agent.service.js';
import { listEvents, dismissEvent } from '../services/events/eventService.js';
import { getRecentEvents, getRecentDecisions, getWaitingEvents } from '../services/events/eventMemory.js';
import Event from '../models/Event.js';
import Decision from '../models/Decision.js';
import EventRecord from '../models/EventRecord.js';

export const createEvent = asyncHandler(async (req, res) => {
  const eventPayload = req.body?.event || req.body;
  if (!eventPayload || !eventPayload.type) {
    return res.status(400).json({ success: false, message: 'Choose a supported demo event.' });
  }

  const userId = req.body?.userId || 'demo-user';
  const result = await evaluateEvent(eventPayload, null, userId);

  const id = String(result.event?._id || result.event?.id || `evt-${Date.now()}`);
  const status = result.decision?.decision === 'WAIT' ? 'deferred' : 'notified';

  const responseData = {
    id,
    _id: id,
    event: result.event,
    context: result.context,
    decision: result.decision,
    status,
    timeline: [
      { at: new Date(), action: 'RECEIVED', reason: 'Simulated device event received.' },
      { at: new Date(), action: result.decision?.decision || 'NOTIFY', reason: result.decision?.reason, source: result.decision?.source, policyReason: result.decision?.policyReason }
    ],
    action: result.action
  };

  // If EventRecord is available, fetch the persisted document for exact representation
  if (EventRecord.db?.readyState === 1) {
    const record = await EventRecord.findOne({ id }).lean();
    if (record) {
      return res.status(201).json({ success: true, data: record });
    }
  }

  return res.status(201).json({ success: true, data: responseData });
});

export const getEventsList = asyncHandler(async (req, res) => {
  const userId = req.query?.userId || 'demo-user';
  const records = await listEvents(userId);
  return res.status(200).json({ success: true, data: records });
});

export const getEventHistory = asyncHandler(async (req, res) => {
  const userId = req.query.userId || 'demo-user';
  if (Event.db?.readyState === 1) {
    const [events, decisions, waiting] = await Promise.all([
      Event.find({ userId }).sort({ occurredAt: -1 }).limit(20).lean(),
      Decision.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
      Event.find({ userId, status: { $in: ['waiting', 'deferred'] } }).sort({ occurredAt: 1 }).lean()
    ]);
    return ApiResponse(res, 200, { events, decisions, waiting }, 'Ambient history loaded');
  }
  return ApiResponse(res, 200, {
    events: getRecentEvents(userId),
    decisions: getRecentDecisions(userId),
    waiting: getWaitingEvents(userId)
  }, 'Ambient history loaded');
});

export const dismiss = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.query?.userId || 'demo-user';
  const record = await dismissEvent(id, userId);
  if (!record) return res.status(404).json({ success: false, message: 'Event not found.' });
  return res.status(200).json({ success: true, data: record });
});
