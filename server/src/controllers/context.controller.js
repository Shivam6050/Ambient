import { readContext, changeContext } from '../services/context/contextService.js';
import { reevaluateDeferred } from '../services/events/eventService.js';
import { serialize } from '../services/serialize.js';
export async function getContext(_, res) { res.json({ success: true, data: await readContext() }); }
export async function updateContext(req, res) {
  if (!['busy', 'available'].includes(req.body?.availability)) return res.status(400).json({ success: false, message: 'Availability must be busy or available.' });
  const context = await serialize(async () => {
    const next = await changeContext(req.body);
    await reevaluateDeferred(next);
    return next;
  });
  res.json({ success: true, data: context });
}
