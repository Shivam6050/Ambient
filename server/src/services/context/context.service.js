import UserContext from '../../models/UserContext.js';
import Preference from '../../models/Preference.js';
import { getContextMemory, setContextMemory } from '../events/memory.js';
import { isDBConnected } from '../../config/db.js';

export const defaultPreferences = Object.freeze({
  doNotInterruptMeetings: true,
  allowTimeSensitiveInterruptions: false,
  allowCriticalInterruptions: true,
  preferredTarget: 'alexa'
});

export async function getContext(userId = 'demo-user') {
  if (isDBConnected()) {
    const context = await UserContext.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    const preferences = await Preference.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    return { context, preferences };
  }
  return getContextMemory(userId);
}

export async function updateContext(patch, userId = 'demo-user') {
  const allowed = {};
  for (const key of ['availability', 'activity', 'location']) if (patch[key] !== undefined) allowed[key] = patch[key];
  if (!['available', 'busy'].includes(allowed.availability)) throw Object.assign(new Error('Availability must be available or busy.'), { statusCode: 400 });
  if (isDBConnected()) return UserContext.findOneAndUpdate({ userId }, { $set: allowed }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }).lean();
  return setContextMemory(userId, allowed);
}
