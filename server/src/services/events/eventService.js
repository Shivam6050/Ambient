import Event from '../../models/Event.js';
import { decide } from '../decisions/decisionEngine.js';
export async function processEvent(payload, context) {
  const document = new Event(payload);
  await document.validate();
  const event = process.env.MONGODB_URI
    ? await document.save()
    : document.toObject();
  const decision = decide({ event, context });
  return { event, context, decision };
}
