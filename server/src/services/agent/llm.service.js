import { env } from '../../config/env.js';
import { evaluateWithJev } from './jev.service.js';
import { proposeWithBedrock } from './bedrock.js';
import { decide } from '../decisions/decisionEngine.js';

function mockDecision({ event, context }) {
  if (['security_alert', 'emergency'].includes(event.type) || event.priority === 'critical') {
    return {
      decision: 'NOTIFY',
      priority: 'critical',
      reason: 'This urgent event requires immediate user notification.',
      confidence: 0.99,
      suggestedAction: 'Notify the user immediately.',
      target: 'alexa',
      source: 'mock',
      jev: {
        model: 'mock-engine',
        interruptProbability: 0.98,
        probabilities: {
          decision: { NOTIFY: 0.98, WAIT: 0.01, IGNORE: 0.01 },
          priority: { low: 0.0, medium: 0.02, high: 0.08, critical: 0.90 }
        }
      }
    };
  }
  if (context.availability === 'busy') {
    return {
      decision: 'WAIT',
      priority: event.priority || 'medium',
      reason: 'The user is busy, so this non-critical event should wait.',
      confidence: 0.96,
      suggestedAction: 'Re-evaluate when the user becomes available.',
      target: 'ambient',
      source: 'mock',
      jev: {
        model: 'mock-engine',
        interruptProbability: 0.05,
        probabilities: {
          decision: { NOTIFY: 0.04, WAIT: 0.94, IGNORE: 0.02 },
          priority: { low: 0.15, medium: 0.80, high: 0.05, critical: 0.0 }
        }
      }
    };
  }
  return {
    decision: 'NOTIFY',
    priority: event.priority || 'medium',
    reason: 'The user is available, so the event can be surfaced now.',
    confidence: 0.95,
    suggestedAction: 'Notify the user and offer event details.',
    target: 'alexa',
    source: 'mock',
    jev: {
      model: 'mock-engine',
      interruptProbability: 0.85,
      probabilities: {
        decision: { NOTIFY: 0.95, WAIT: 0.03, IGNORE: 0.02 },
        priority: { low: 0.10, medium: 0.85, high: 0.05, critical: 0.0 }
      }
    }
  };
}

async function bedrockDecision(input) {
  const raw = await proposeWithBedrock(input);
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return {
    ...parsed,
    confidence: 0.92,
    suggestedAction: parsed.decision === 'NOTIFY' ? 'Notify the user.' : 'Store event in deferred memory.',
    source: 'bedrock'
  };
}

export async function generateDecision(input) {
  const provider = env.aiProvider;
  if (provider === 'mock') return mockDecision(input);
  if (provider === 'jev') return evaluateWithJev(input);
  if (provider === 'bedrock') return bedrockDecision(input);
  if (provider === 'rules') {
    const base = decide(input);
    return {
      ...base,
      confidence: 1.0,
      suggestedAction: base.decision === 'NOTIFY' ? 'Notify the user immediately.' : 'Store in deferred memory.',
      source: 'rules'
    };
  }
  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}
