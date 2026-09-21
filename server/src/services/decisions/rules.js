export function deterministicDecision({ event, context }) {
  if (['security_alert', 'emergency'].includes(event.type) || event.priority === 'critical') {
    return { decision: 'NOTIFY', priority: 'critical', reason: 'Urgent event overrides availability.', target: 'alexa', confidence: 1, source: 'rules' };
  }
  if (context.availability === 'busy') {
    return { decision: 'WAIT', priority: event.priority || 'medium', reason: 'The user is busy, so the non-critical event should wait.', target: 'ambient', confidence: 1, source: 'rules' };
  }
  return { decision: 'NOTIFY', priority: event.priority || 'medium', reason: 'The user is available, so the event can be surfaced now.', target: 'alexa', confidence: 1, source: 'rules' };
}
