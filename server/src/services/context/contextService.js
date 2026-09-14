let context = { availability: 'available', activity: 'idle', location: 'home', updatedAt: new Date().toISOString() };
export function readContext() { return { ...context }; }
export function changeContext(input) {
  if (!['busy', 'available'].includes(input?.availability)) throw new Error('Availability must be busy or available.');
  context = { ...context, availability: input.availability, activity: input.availability === 'busy' ? 'meeting' : 'idle', updatedAt: new Date().toISOString() };
  return readContext();
}
