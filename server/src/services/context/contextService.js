import Context from '../../models/Context.js';
export async function readContext() {
  const existing = await Context.findById('local-user').lean();
  if (existing) return existing;
  return Context.findByIdAndUpdate('local-user', { $setOnInsert: { availability: 'available', activity: 'idle', location: 'home' } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
}
export async function changeContext(input) {
  if (!['busy', 'available'].includes(input?.availability)) throw new Error('Availability must be busy or available.');
  return Context.findByIdAndUpdate('local-user', { $set: { availability: input.availability, activity: input.availability === 'busy' ? 'meeting' : 'idle' } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).lean();
}
