import { deliverAlexaAction } from './alexaAdapter.js';

const adapters = {
  alexa: { name: 'Alexa+ integration boundary', capabilities: ['notify', 'show_details'] },
  ambient: { name: 'Ambient memory', capabilities: ['store', 'defer'] }
};

export async function routeAction({ decision, event }) {
  if (decision.decision === 'WAIT') return { channel: 'ambient', mode: 'memory', status: 'deferred', next: 're_evaluate_on_context_change' };
  if (decision.decision === 'IGNORE') return { channel: 'ambient', mode: 'memory', status: 'ignored' };
  if (decision.decision === 'ASK') return { channel: 'alexa', mode: 'simulated-alexa-plus', status: 'pending_user_input', message: 'Ambient needs your confirmation before acting.' };
  if (decision.decision === 'ESCALATE') return { channel: 'ambient', mode: 'policy-escalation-simulation', status: 'pending_user_input' };
  return deliverAlexaAction({ decision, event });
}

export function getActionCapabilities() {
  return Object.entries(adapters).map(([id, adapter]) => ({ id, ...adapter }));
}