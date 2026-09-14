export function decide({ event, context }) {
  const urgentTypes = ['security_alert','emergency'];
  if (urgentTypes.includes(event.type)) return { decision:'NOTIFY', priority:'critical', reason:'Urgent event overrides availability.', target:'alexa' };
  if (context.availability === 'busy') return { decision:'WAIT', priority:event.priority || 'medium', reason:'User is currently busy; defer non-urgent events.', target:'ambient' };
  return { decision:'NOTIFY', priority:event.priority || 'medium', reason:'User is available and the event requires attention.', target:'alexa' };
}
