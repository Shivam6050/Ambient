export function mockDecision({ event, context }) {
  if (['security_alert', 'emergency'].includes(event.type) || event.priority === 'critical') {
    return {
      decision: 'NOTIFY', priority: 'critical', priorityScore: 3, confidence: 0.99,
      reason: 'The event is urgent and should be surfaced immediately.',
      suggestedAction: 'Notify the user immediately.', target: 'alexa', source: 'mock',
      jev: { model: 'mock-typed-engine', interruptProbability: 0.98, probabilities: {
        decision: { NOTIFY: 0.98, WAIT: 0.01, IGNORE: 0.01 }, priority: { low: 0, medium: 0.01, high: 0.03, critical: 0.96 }
      }}
    };
  }
  if (context.availability === 'busy') {
    return {
      decision: 'WAIT', priority: event.priority || 'medium', priorityScore: event.priority === 'high' ? 2 : 1, confidence: 0.96,
      reason: 'The user is currently in a meeting, so this non-critical event should wait.',
      suggestedAction: 'Re-evaluate when the user becomes available.', target: 'ambient', source: 'mock',
      jev: { model: 'mock-typed-engine', interruptProbability: 0.05, probabilities: {
        decision: { NOTIFY: 0.04, WAIT: 0.94, IGNORE: 0.02 }, priority: { low: 0.15, medium: 0.80, high: 0.05, critical: 0 }
      }}
    };
  }
  return {
    decision: 'NOTIFY', priority: event.priority || 'medium', priorityScore: event.priority === 'high' ? 2 : 1, confidence: 0.95,
    reason: 'The user is available, so the event can be surfaced now.',
    suggestedAction: 'Notify the user and offer event details.', target: 'alexa', source: 'mock',
    jev: { model: 'mock-typed-engine', interruptProbability: 0.85, probabilities: {
      decision: { NOTIFY: 0.95, WAIT: 0.03, IGNORE: 0.02 }, priority: { low: 0.10, medium: 0.85, high: 0.05, critical: 0 }
    }}
  };
}
