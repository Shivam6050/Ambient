import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getActionCapabilities } from '../services/actions/actionRouter.js';

export const getActionCapabilitiesController = asyncHandler(async (_req, res) =>
  ApiResponse(res, 200, getActionCapabilities(), 'Action capabilities loaded')
);
