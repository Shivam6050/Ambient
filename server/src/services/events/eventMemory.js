const memoryEvents = new Map();
const memoryDecisions = new Map();

function bucket(store, userId) {
  if (!store.has(userId)) store.set(userId, []);
  return store.get(userId);
}

export function rememberEvent(event) {
  const events = bucket(memoryEvents, event.userId || 'demo-user');
  const existing = events.findIndex((item) => String(item._id) === String(event._id));
  if (existing >= 0) events[existing] = event;
  else events.push(event);
  return event;
}

export function updateRememberedEvent(eventId, patch, userId = 'demo-user') {
  const events = bucket(memoryEvents, userId);
  const index = events.findIndex((item) => String(item._id) === String(eventId));
  if (index < 0) return null;
  events[index] = { ...events[index], ...patch, updatedAt: new Date() };
  return events[index];
}

export function rememberDecision(decision) {
  const decisions = bucket(memoryDecisions, decision.userId || 'demo-user');
  decisions.push(decision);
  return decision;
}

export function getWaitingEvents(userId = 'demo-user') {
  return bucket(memoryEvents, userId).filter((event) => event.status === 'waiting' || event.status === 'deferred');
}

export function getRecentEvents(userId = 'demo-user', limit = 20) {
  return bucket(memoryEvents, userId).slice(-limit).reverse();
}

export function getRecentDecisions(userId = 'demo-user', limit = 20) {
  return bucket(memoryDecisions, userId).slice(-limit).reverse();
}

export function clearMemory(userId = 'demo-user') {
  memoryEvents.delete(userId);
  memoryDecisions.delete(userId);
}
