import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { evaluateEvent } from '../services/agent/agent.service.js';
import { getContext, updateContext } from '../services/context/context.service.js';
import { getWaitingEvents, reEvaluateWaitingEvents } from '../services/events/reEvaluation.service.js';
import { getDecisions } from '../services/events/memory.js';
import { getActionCapabilities } from '../services/actions/actionRouter.js';
import { getAlexaAdapterStatus } from '../services/actions/alexaAdapter.js';
import { getRingAdapterStatus } from '../services/actions/ringAdapter.js';

const json = value => JSON.stringify(value, null, 2);
const result = value => ({ content: [{ type: 'text', text: json(value) }] });

export const mcpHandler = createMcpHandler(() => {
  const server = new McpServer({
    name: 'ambient-orchestrator',
    version: '0.9.0'
  });

  server.registerTool('ambient_evaluate_event', {
    description: 'Send a device event through Ambient. Jev proposes; deterministic policy and confidence gating remain authoritative.',
    inputSchema: z.object({
      userId: z.string().default('demo-user'),
      source: z.string(),
      type: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
  }, async ({ userId, source, type, priority, metadata }) =>
    result(await evaluateEvent({ source, type, priority, metadata }, null, userId))
  );

  server.registerTool('ambient_get_context', {
    description: 'Read Ambient context and interruption preferences for a user.',
    inputSchema: z.object({ userId: z.string().default('demo-user') })
  }, async ({ userId }) => result(await getContext(userId)));

  server.registerTool('ambient_set_context', {
    description: 'Change availability, activity, or location. Becoming available automatically re-evaluates waiting events.',
    inputSchema: z.object({
      userId: z.string().default('demo-user'),
      availability: z.enum(['available', 'busy']),
      activity: z.string().optional(),
      location: z.string().optional()
    })
  }, async ({ userId, availability, activity, location }) => {
    const next = await updateContext({ availability, activity, location }, userId);
    const reevaluation = availability === 'available'
      ? await reEvaluateWaitingEvents(userId)
      : { reEvaluated: 0, results: [] };
    return result({ context: next, ...reevaluation });
  });

  server.registerTool('ambient_get_waiting_events', {
    description: 'List events Ambient deferred until the user becomes available.',
    inputSchema: z.object({ userId: z.string().default('demo-user') })
  }, async ({ userId }) => result(await getWaitingEvents(userId)));

  server.registerTool('ambient_get_decision_history', {
    description: 'Read recent Ambient decisions for a user.',
    inputSchema: z.object({ userId: z.string().default('demo-user') })
  }, async ({ userId }) => result(getDecisions(userId)));

  server.registerTool('ambient_get_action_capabilities', {
    description: 'List available action adapters and whether Alexa+ or Ring integrations are configured.',
    inputSchema: z.object({})
  }, async () => result({
    actions: getActionCapabilities(),
    alexa: getAlexaAdapterStatus(),
    ring: getRingAdapterStatus()
  }));

  return server;
});
