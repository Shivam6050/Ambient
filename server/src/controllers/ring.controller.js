import { evaluateEvent } from '../services/agent/agent.service.js';
import { getRingAdapterStatus, normalizeRingWebhook, verifyRingWebhook } from '../services/actions/ringAdapter.js';

export async function ringWebhook(req, res) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const signature = req.get('x-signature');
  const key = process.env.RING_HMAC_KEY;

  if (!key || !verifyRingWebhook(rawBody, signature, key)) {
    return res.status(401).json({ success: false, message: 'Invalid Ring webhook signature.' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload.' });
  }

  const event = normalizeRingWebhook(payload);
  const userId = payload?.meta?.account_id || 'demo-user';
  const result = await evaluateEvent(event, null, userId);
  return res.status(200).json({ success: true, requestId: payload?.meta?.request_id || null, data: result });
}

export function ringStatus(_req, res) {
  return res.json({ success: true, data: getRingAdapterStatus() });
}
