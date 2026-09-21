const URGENT_TYPES = new Set(['security_alert', 'emergency']);

export function applyPolicy(proposal, event, context, preferences) {
  const urgent = URGENT_TYPES.has(event.type) || event.priority === 'critical';
  if (urgent && preferences.allowCriticalInterruptions !== false) {
    return {
      ...proposal,
      decision: 'NOTIFY', priority: 'critical', target: preferences.preferredTarget || 'alexa',
      reason: 'Critical events can interrupt the current activity.',
      suggestedAction: 'Notify the user immediately.', confidence: Math.max(proposal.confidence ?? 0, 0.98),
      source: `${proposal.source}+policy`, policyReason: 'urgent_override'
    };
  }

  const canInterrupt = preferences.doNotInterruptMeetings === false ||
    (event.metadata?.temperatureSensitive === true && preferences.allowTimeSensitiveInterruptions === true);

  if (context.availability === 'busy' && !canInterrupt && proposal.decision === 'NOTIFY') {
    return { ...proposal, decision: 'WAIT', target: 'ambient', priority: event.priority || proposal.priority,
      reason: 'Policy deferred a non-critical interruption because the user is busy.',
      suggestedAction: 'Re-evaluate when the user becomes available.', source: `${proposal.source}+policy`, policyReason: 'meeting_protection' };
  }

  if (context.availability === 'available' && proposal.decision === 'WAIT') {
    return { ...proposal, decision: 'NOTIFY', target: preferences.preferredTarget || 'alexa',
      priority: event.priority || proposal.priority, reason: 'The user is available, so the deferred event can be delivered.',
      suggestedAction: 'Notify the user now.', source: `${proposal.source}+policy`, policyReason: 'release_when_available' };
  }

  if (proposal.priority === 'critical' && !urgent) {
    return { ...proposal, priority: event.priority || 'medium', policyReason: 'critical_priority_reserved' };
  }

  return proposal;
}
