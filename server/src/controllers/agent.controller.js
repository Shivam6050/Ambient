import { env } from '../config/env.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { evaluateEvent } from '../services/agent/agent.service.js';
import { generateAmbientInsight } from '../services/agent/bedrock.service.js';

export const evaluateAgent = asyncHandler(async (req, res) => {
  const { event, context, userId = 'demo-user' } = req.body || {};
  if (!event?.source || !event?.type) return res.status(400).json({ success: false, message: 'event.source and event.type are required' });
  return ApiResponse(res, 200, await evaluateEvent(event, context, userId), 'Ambient evaluated the event');
});

export const generateInsight = asyncHandler(async (req, res) => {
  const { event, context, decision } = req.body || {};
  if (!event || !context || !decision) return res.status(400).json({ success: false, message: 'event, context and decision are required' });
  return ApiResponse(res, 200, await generateAmbientInsight({ event, context, decision }), 'AWS Bedrock insight generated');
});

export const getAgentStatus = asyncHandler(async (_req, res) => {
  const configured = env.aiProvider === 'mock' || env.aiProvider === 'rules' || (env.aiProvider === 'jev' && Boolean(env.typesafeApiKey));
  return ApiResponse(res, 200, {
    provider: env.aiProvider,
    configured,
    model: env.aiProvider === 'jev' ? env.jevModel : 'built-in',
    bedrockExplanationEnabled: env.awsBedrockEnabled,
    thresholds: { auto: env.autoThreshold, review: env.reviewThreshold }
  }, 'Agent status loaded');
});
