import crypto from 'node:crypto';

const RING_API_BASE = process.env.RING_API_BASE_URL || 'https://api.amazonvision.com';

export function getRingAdapterStatus() {
  return {
    id: 'ring',
    name: 'Ring Partner API',
    mode: process.env.RING_MODE || 'simulator',
    configured: Boolean(process.env.RING_ACCESS_TOKEN && process.env.RING_HMAC_KEY)
  };
}

export function verifyRingWebhook(rawBody, signature, signingKey) {
  if (!signingKey) return false;
  const received = String(signature || '').replace(/^sha256=/, '');
  const expected = crypto.createHmac('sha256', signingKey).update(rawBody).digest('hex');
  if (!received || received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function normalizeRingWebhook(payload) {
  const type = payload?.data?.type;
  const attributes = payload?.data?.attributes || {};
  const criticalTypes = new Set(['security_alert']);
  const mappedType = type === 'motion_detected' ? 'motion_detected'
    : type === 'button_press' ? 'doorbell_press'
    : type || 'ring_event';

  return {
    source: 'ring',
    type: mappedType,
    priority: criticalTypes.has(mappedType) ? 'critical' : 'medium',
    metadata: {
      ringEventId: payload?.data?.id,
      requestId: payload?.meta?.request_id,
      accountId: payload?.meta?.account_id,
      deviceId: attributes.source,
      rawType: type
    }
  };
}

export async function ringApi(path, options = {}) {
  if (!process.env.RING_ACCESS_TOKEN) {
    throw Object.assign(new Error('RING_ACCESS_TOKEN is not configured.'), { code: 'RING_NOT_CONFIGURED' });
  }

  const response = await fetch(`${RING_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.RING_ACCESS_TOKEN}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(body?.errors?.[0]?.detail || `Ring API request failed (${response.status})`), { statusCode: response.status });
  }
  return body;
}
