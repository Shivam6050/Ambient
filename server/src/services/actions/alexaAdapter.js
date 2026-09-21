export function getAlexaAdapterStatus() {
  return {
    id: 'alexa',
    name: 'Alexa+ MCP add-on',
    mode: process.env.ALEXA_PLUS_MODE || 'simulator',
    configured: Boolean(process.env.ALEXA_PLUS_ADDON_ID)
  };
}

export async function deliverAlexaAction({ decision, event }) {
  const mode = process.env.ALEXA_PLUS_MODE || 'simulator';

  if (mode !== 'remote') {
    return {
      channel: 'alexa',
      mode: 'simulated-alexa-plus',
      status: 'ready',
      message: `Your ${String(event.type).replaceAll('_', ' ')} needs your attention.`,
      presentation: 'notification_card',
      integration: 'mcp-ready'
    };
  }

  if (!process.env.ALEXA_PLUS_ADDON_ID) {
    throw Object.assign(new Error('Alexa+ remote mode requires ALEXA_PLUS_ADDON_ID after Alexa AI CLI add-on deployment.'), { code: 'ALEXA_NOT_CONFIGURED' });
  }

  return {
    channel: 'alexa',
    mode: 'alexa-plus-addon',
    status: 'handoff_ready',
    addonId: process.env.ALEXA_PLUS_ADDON_ID,
    message: `Ambient authorized an Alexa+ add-on action for ${String(event.type).replaceAll('_', ' ')}.`,
    decision: decision.decision
  };
}
