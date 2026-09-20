import UserContext from '../../models/UserContext.js';
import Preference from '../../models/Preference.js';

const contexts = new Map();
const preferencesByUser = new Map();

const defaultContext = () => ({ availability: 'available', activity: 'idle', location: 'home', updatedAt: new Date() });
const defaultPreferences = () => ({
  quietHours: { start: '22:00', end: '07:00' },
  doNotInterruptMeetings: true,
  allowTimeSensitiveInterruptions: false,
  allowCriticalInterruptions: true,
  preferredTarget: 'alexa'
});

export async function getContext(userId = 'demo-user') {
  if (UserContext.db?.readyState === 1) {
    const context = await UserContext.findOneAndUpdate({ userId }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
    const preferences = await Preference.findOneAndUpdate({ userId }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
    return { context: context.toObject(), preferences: preferences.toObject() };
  }
  if (!contexts.has(userId)) contexts.set(userId, defaultContext());
  if (!preferencesByUser.has(userId)) preferencesByUser.set(userId, defaultPreferences());
  return { context: contexts.get(userId), preferences: preferencesByUser.get(userId) };
}

export async function updateContext(patch, userId = 'demo-user') {
  const next = { ...patch, updatedAt: new Date() };
  if (UserContext.db?.readyState === 1) {
    const context = await UserContext.findOneAndUpdate({ userId }, next, { upsert: true, new: true, setDefaultsOnInsert: true });
    return context.toObject();
  }
  const current = contexts.get(userId) || defaultContext();
  const updated = { ...current, ...next };
  contexts.set(userId, updated);
  return updated;
}

export async function updateContextAndReEvaluate(patch, userId = 'demo-user') {
  const previous = await getContext(userId);
  const updated = await updateContext(patch, userId);
  const availabilityChanged = patch.availability && patch.availability !== previous.context?.availability;
  if (availabilityChanged) {
    const { reEvaluateWaitingEvents } = await import('../events/reEvaluation.service.js');
    return { context: updated, ...(await reEvaluateWaitingEvents(userId)) };
  }
  return { context: updated, reEvaluated: 0, results: [] };
}
