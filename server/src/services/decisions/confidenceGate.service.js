const AUTO_ACT_THRESHOLD = 0.80;
const REVIEW_THRESHOLD = 0.55;

/**
 * Confidence-aware gate.
 * The AI proposes a decision; this service decides whether the application
 * should execute it automatically, ask for confirmation, or defer it.
 * Hard safety/policy overrides are handled before this gate.
 */
export function applyConfidenceGate(proposal, { event } = {}) {
  // Critical events that passed deterministic policy validation remain AUTO NOTIFY.
  if (proposal.priority === 'critical' && proposal.decision === 'NOTIFY') {
    return {
      ...proposal,
      gate: { mode: 'AUTO', threshold: AUTO_ACT_THRESHOLD, reason: 'Critical policy path.' }
    };
  }

  const confidence = Number(proposal.confidence) || 0;

  if (confidence >= AUTO_ACT_THRESHOLD) {
    return {
      ...proposal,
      gate: { mode: 'AUTO', threshold: AUTO_ACT_THRESHOLD, reason: 'Confidence is high enough for automatic execution.' }
    };
  }

  if (confidence >= REVIEW_THRESHOLD) {
    return {
      ...proposal,
      decision: 'ASK',
      target: 'alexa',
      suggestedAction: 'Ask the user to confirm before taking the proposed action.',
      reason: `Confidence (${Math.round(confidence * 100)}%) is in the review band, so Ambient asks before acting.`,
      source: `${proposal.source}+confidence-gate`,
      gate: { mode: 'REVIEW', threshold: REVIEW_THRESHOLD, reason: 'Confidence is below the automatic-action threshold.' }
    };
  }

  return {
    ...proposal,
    decision: 'WAIT',
    target: 'ambient',
    suggestedAction: 'Defer the event and reconsider it when context changes.',
    reason: `Confidence (${Math.round(confidence * 100)}%) is low, so Ambient defers instead of acting automatically.`,
    source: `${proposal.source}+confidence-gate`,
    gate: { mode: 'DEFER', threshold: REVIEW_THRESHOLD, reason: 'Confidence is below the review threshold.' },
    deferredFrom: proposal.decision,
    deferredEvent: event?.type || null
  };
}

export const confidenceThresholds = {
  auto: AUTO_ACT_THRESHOLD,
  review: REVIEW_THRESHOLD
};
