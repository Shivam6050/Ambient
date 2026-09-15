import { decide } from '../decisions/decisionEngine.js';
import { proposeWithBedrock } from './bedrock.js';
export const defaultPreferences = Object.freeze({ doNotInterruptMeetings: true, allowTimeSensitiveInterruptions: false });
export function agentStatus() {
  const configured = process.env.AI_PROVIDER === 'bedrock' && !!process.env.AWS_REGION && !!process.env.BEDROCK_MODEL_ID;
  return { provider: configured ? 'bedrock' : 'rules', configured, message: configured ? 'Bedrock enabled; individual decisions may use fallback.' : 'Rules active. Bedrock requires AI_PROVIDER, AWS_REGION, BEDROCK_MODEL_ID and AWS credentials.' };
}
export function validateProposal(raw) {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'decision,priority,reason,target') throw new Error('invalid_schema');
  if (!['WAIT', 'NOTIFY'].includes(value.decision) || !['low', 'medium', 'high', 'critical'].includes(value.priority) || typeof value.reason !== 'string' || !value.reason.trim() || value.reason.length > 300 || value.target !== (value.decision === 'WAIT' ? 'ambient' : 'alexa')) throw new Error('invalid_schema');
  return { ...value, reason: value.reason.trim() };
}
export async function evaluateDecision({ event, context, status }, options = {}) {
  const preferences = { ...defaultPreferences, ...context.preferences };
  const base = decide({ event, context });
  const result = (decision, source, policyReason, extra = {}) => ({ ...decision, source, policyReason, policyVersion: '1', ...extra });
  if (status === 'dismissed') return result({ decision: 'IGNORE', priority: 'low', target: 'ambient', reason: 'Already dismissed.' }, 'policy', 'dismissed');
  if (['security_alert', 'emergency'].includes(event.type)) return result(base, 'policy', 'urgent_override');
  const safe = { ...base };
  const canInterrupt = preferences.doNotInterruptMeetings === false || (event.metadata?.temperatureSensitive === true && preferences.allowTimeSensitiveInterruptions === true);
  if (context.availability === 'busy' && canInterrupt) Object.assign(safe, { decision: 'NOTIFY', priority: 'high', target: 'alexa', reason: 'Your saved preferences permit this interruption.' });
  const provider = options.provider || (agentStatus().configured ? proposeWithBedrock : null);
  if (!provider) return result(safe, 'rules', 'provider_not_configured');
  const controller = new AbortController();
  let timer;
  try {
    const input = { event: { type: event.type, metadata: { temperatureSensitive: event.metadata?.temperatureSensitive === true } }, context: { availability: context.availability, activity: context.activity }, preferences };
    const raw = await Promise.race([
      Promise.resolve().then(() => provider(input, { signal: controller.signal })),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, options.timeoutMs ?? 4000); })
    ]);
    let proposed;
    try { proposed = validateProposal(raw); } catch { return result(safe, 'fallback', 'invalid_model_output'); }
    if (context.availability === 'busy' && !canInterrupt && proposed.decision === 'NOTIFY') return result(safe, 'policy', 'meeting_protection', { proposedDecision: proposed });
    if (context.availability === 'available' && proposed.decision === 'WAIT') return result(safe, 'policy', 'release_when_available', { proposedDecision: proposed });
    if (proposed.priority === 'critical') return result(safe, 'policy', 'critical_reserved_for_urgent_events', { proposedDecision: proposed });
    return result(proposed, 'ai', 'accepted', { modelId: process.env.BEDROCK_MODEL_ID || 'test-provider' });
  } catch (error) { return result(safe, 'fallback', error.message === 'timeout' ? 'model_timeout' : 'provider_error'); }
  finally { clearTimeout(timer); }
}
