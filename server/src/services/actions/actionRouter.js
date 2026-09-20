const adapters = {
  alexa: {
    name: 'Alexa+ simulation',
    capabilities: ['notify', 'show_details'],
    async notify({ event, decision }) {
      return {
        channel: 'alexa',
        mode: 'simulated-alexa-plus',
        status: 'ready',
        message: decision.decision === 'NOTIFY'
          ? `Your ${event.type.replaceAll('_', ' ')} needs your attention.`
          : null,
        presentation: 'notification_card'
      };
    }
  },
  ambient: {
    name: 'Ambient memory',
    capabilities: ['store', 'defer'],
    async notify() {
      return { channel: 'ambient', mode: 'memory', status: 'stored' };
    }
  }
};

export async function routeAction({ decision, event }) {
  if (decision.decision === 'WAIT') {
    return {
      channel: 'ambient',
      mode: 'memory',
      status: 'deferred',
      next: 're_evaluate_on_context_change'
    };
  }
  if (decision.decision === 'IGNORE') {
    return { channel: 'ambient', mode: 'memory', status: 'ignored' };
  }
  const adapter = adapters[decision.target] || adapters.alexa;
  if (decision.decision === 'NOTIFY') return adapter.notify({ event, decision });
  return {
    channel: adapter === adapters.alexa ? 'alexa' : 'ambient',
    mode: adapter.name,
    status: 'pending_user_input'
  };
}

export function getActionCapabilities() {
  return Object.entries(adapters).map(([id, adapter]) => ({
    id,
    name: adapter.name,
    capabilities: adapter.capabilities
  }));
}
