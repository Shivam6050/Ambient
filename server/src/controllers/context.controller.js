import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getContext, updateContext } from '../services/context/context.service.js';
import { reEvaluateWaitingEvents } from '../services/events/reEvaluation.service.js';

export const getContextController = asyncHandler(async (req, res) => {
  const userId = req.query.userId || 'demo-user';
  return ApiResponse(res, 200, await getContext(userId), 'Context loaded');
});

export const patchContext = asyncHandler(async (req, res) => {
  const userId = req.body?.userId || req.query?.userId || 'demo-user';
  const previous = await getContext(userId);
  const next = await updateContext(req.body || {}, userId);
  const changedToAvailable = previous.context.availability !== 'available' && next.availability === 'available';
  const reevaluation = changedToAvailable ? await reEvaluateWaitingEvents(userId) : { context: next, reEvaluated: 0, results: [] };
  return ApiResponse(res, 200, { context: next, reEvaluated: reevaluation.reEvaluated, results: reevaluation.results }, 'Context updated');
});
