import { readContext, changeContext } from '../services/context/contextService.js';
import { reevaluateDeferred } from '../services/events/eventService.js';
export function getContext(_, res) { res.json({ success: true, data: readContext() }); }
export function updateContext(req, res) {
  try {
    const context = changeContext(req.body);
    reevaluateDeferred(context);
    res.json({ success: true, data: context });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
}
