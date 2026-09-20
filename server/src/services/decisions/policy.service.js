const URGENT_TYPES = new Set(['security_alert', 'emergency']);

export function validateDecision(proposal, event, context, preferences = {}) {
  const urgent = URGENT_TYPES.has(event.type) || event.priority === 'critical';
  if (urgent && preferences.allowCriticalInterruptions !== false) {
    return {
      ...proposal,
      decision: 'NOTIFY',
      priority: 'critical',
      reason: 'Critical events can interrupt the current activity.',
      suggestedAction: 'Notify the user immediately.',
      target: preferences.preferredTarget || 'alexa',
      confidence: Math.max(proposal.confidence ?? 0, 0.98),
      source: `${proposal.source}+policy`,
      policyReason: 'urgent_override'
    };
  }

  const canInterrupt = preferences.doNotInterruptMeetings === false ||
    (event.metadata?.temperatureSensitive === true && preferences.allowTimeSensitiveInterruptions === true);

  if (context.availability === 'busy' && !canInterrupt && proposal.decision === 'NOTIFY') {
    return {
      ...proposal,
      decision: 'WAIT',
      priority: event.priority || proposal.priority || 'medium',
      reason: 'Policy deferred a non-critical interruption because the user is busy.',
      suggestedAction: 'Re-evaluate when the user becomes available.',
      target: 'ambient',
      source: `${proposal.source}+policy`,
      policyReason: 'meeting_protection'
    };
  }

  if (context.availability === 'available' && proposal.decision === 'WAIT') {
    return {
      ...proposal,
      decision: 'NOTIFY',
      priority: event.priority || proposal.priority || 'medium',
      reason: 'User is available, so deferred event can be delivered.',
      suggestedAction: 'Notify the user now.',
      target: preferences.preferredTarget || 'alexa',
      source: `${proposal.source}+policy`,
      policyReason: 'release_when_available'
    };
  }

  return proposal;
}
