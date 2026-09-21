import { env } from '../../config/env.js';

export function applyConfidenceGate(proposal, { event } = {}) {
  if (proposal.priority === 'critical' && proposal.decision === 'NOTIFY') {
    return { ...proposal, gate: { mode: 'AUTO', threshold: env.autoThreshold, reason: 'Critical policy path.' } };
  }
  const confidence = Number(proposal.confidence) || 0;
  if (confidence >= env.autoThreshold) {
    return { ...proposal, gate: { mode: 'AUTO', threshold: env.autoThreshold, reason: 'Confidence is high enough for automatic execution.' } };
  }
  if (confidence >= env.reviewThreshold) {
    return { ...proposal, decision: 'ASK', target: 'alexa', suggestedAction: 'Ask the user to confirm before acting.',
      reason: `Confidence (${Math.round(confidence * 100)}%) is in the review band, so Ambient asks before acting.`,
      source: `${proposal.source}+confidence-gate`, gate: { mode: 'REVIEW', threshold: env.reviewThreshold, reason: 'Confidence is below the automatic-action threshold.' } };
  }
  return { ...proposal, decision: 'WAIT', target: 'ambient', suggestedAction: 'Defer the event and reconsider it when context changes.',
    reason: `Confidence (${Math.round(confidence * 100)}%) is low, so Ambient defers instead of acting automatically.`,
    source: `${proposal.source}+confidence-gate`, gate: { mode: 'DEFER', threshold: env.reviewThreshold, reason: 'Confidence is below the review threshold.' },
    deferredFrom: proposal.decision, deferredEvent: event?.type || null };
}

export const confidenceThresholds = () => ({ auto: env.autoThreshold, review: env.reviewThreshold });
