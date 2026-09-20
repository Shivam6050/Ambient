import { getContext as getStoredContext, updateContextAndReEvaluate } from '../services/context/context.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getContext = asyncHandler(async (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const data = await getStoredContext(userId);
  return ApiResponse(res, 200, data.context || data, 'Context loaded');
});

export const patchContext = asyncHandler(async (req, res) => {
  if (req.body?.availability && !['busy', 'available'].includes(req.body.availability)) {
    return res.status(400).json({ success: false, message: 'Availability must be busy or available.' });
  }
  const userId = req.body?.userId || req.query?.userId || 'demo-user';
  const result = await updateContextAndReEvaluate(req.body, userId);
  return ApiResponse(res, 200, result, 'Context updated');
});
