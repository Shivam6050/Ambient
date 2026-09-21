import { env } from '../../config/env.js';
import { evaluateWithJev } from './jev.service.js';
import { mockDecision } from './mock.service.js';
import { deterministicDecision } from '../decisions/rules.js';

export async function proposeDecision(input) {
  if (env.aiProvider === 'mock') return mockDecision(input);
  if (env.aiProvider === 'rules') return deterministicDecision(input);
  if (env.aiProvider === 'jev') return evaluateWithJev(input);
  throw new Error(`Unsupported AI_PROVIDER: ${env.aiProvider}. Use mock, rules, or jev.`);
}
