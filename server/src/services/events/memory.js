const events = new Map();
const decisions = new Map();
const contexts = new Map();
const preferences = new Map();
const records = new Map();

const get = (map, userId) => {
  if (!map.has(userId)) map.set(userId, []);
  return map.get(userId);
};

export const defaults = {
  context: () => ({ availability: 'available', activity: 'idle', location: 'home', updatedAt: new Date() }),
  preferences: () => ({ doNotInterruptMeetings: true, allowTimeSensitiveInterruptions: false, allowCriticalInterruptions: true, preferredTarget: 'alexa' })
};

export function getContextMemory(userId) {
  if (!contexts.has(userId)) contexts.set(userId, defaults.context());
  if (!preferences.has(userId)) preferences.set(userId, defaults.preferences());
  return { context: contexts.get(userId), preferences: preferences.get(userId) };
}

export function setContextMemory(userId, patch) {
  const current = getContextMemory(userId).context;
  const next = { ...current, ...patch, updatedAt: new Date() };
  contexts.set(userId, next);
  return next;
}

export function saveEvent(event) {
  const list = get(events, event.userId);
  const index = list.findIndex((item) => String(item._id) === String(event._id));
  if (index >= 0) list[index] = { ...list[index], ...event };
  else list.push(event);
  return event;
}

export function patchEvent(userId, id, patch) {
  const list = get(events, userId);
  const index = list.findIndex((item) => String(item._id) === String(id));
  if (index < 0) return null;
  list[index] = { ...list[index], ...patch, updatedAt: new Date() };
  return list[index];
}

export const getEvent = (userId, id) => get(events, userId).find((item) => String(item._id) === String(id)) || null;
export const getWaiting = (userId) => get(events, userId).filter((e) => e.status === 'waiting');
export const getEvents = (userId) => [...get(events, userId)].reverse();

export function saveDecision(decision) {
  get(decisions, decision.userId).push(decision);
  return decision;
}
export const getDecisions = (userId) => [...get(decisions, userId)].reverse();

export function saveRecord(record) { records.set(`${record.userId}:${record.id}`, record); return record; }
export const getRecord = (userId, id) => records.get(`${userId}:${id}`) || null;
export const getRecords = (userId) => [...records.values()].filter((r) => r.userId === userId).reverse();
