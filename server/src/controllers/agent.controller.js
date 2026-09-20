import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { evaluateEvent } from '../services/agent/agent.service.js';
import { env } from '../config/env.js';

export const evaluateAgent = asyncHandler(async (req, res) => {
  const { event, context, userId } = req.body;
  if (!event?.source || !event?.type) {
    return res.status(400).json({ success: false, message: 'event.source and event.type are required' });
  }
  const result = await evaluateEvent(event, context, userId || 'demo-user');
  return ApiResponse(res, 200, result, 'Ambient evaluated the event');
});

export const getAgentStatus = asyncHandler(async (_req, res) => {
  const provider = env.aiProvider;
  const configured = provider === 'mock' || provider === 'rules' ||
    (provider === 'jev' && !!env.typesafeApiKey) ||
    (provider === 'bedrock' && !!env.awsRegion && !!env.bedrockModelId);

  return ApiResponse(res, 200, {
    provider,
    configured,
    model: provider === 'jev' ? env.jevModel : provider === 'bedrock' ? env.bedrockModelId : 'built-in',
    message: `AI Provider active: ${provider}`
  }, 'Agent status loaded');
});
