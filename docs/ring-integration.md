# Ring Partner API integration

Ambient v0.9 adds a real Ring webhook boundary and API adapter.

## Webhook

`POST /api/integrations/ring/webhook`

The endpoint accepts Ring's JSON webhook payload and verifies the `X-Signature` HMAC-SHA256 header against `RING_HMAC_KEY` before parsing or evaluating the event.

Ring webhook events are normalized into Ambient events and sent through the normal pipeline:

`Ring → webhook → Context → Jev → Policy → Confidence Gate → Action`

The handler uses `meta.request_id` as an idempotency identifier at the payload boundary; production deployments should persist processed request IDs before performing non-idempotent actions.

## API adapter

The Ring adapter can call the Ring Partner API with `RING_ACCESS_TOKEN`. The current helper uses the documented API base URL and Bearer authentication.

Real Ring access still requires Ring developer onboarding, OAuth account linking, credentials, HTTPS webhook deployment, and eligible staging/production accounts. Ambient does not fabricate those credentials.

## Environment

```env
RING_MODE=live
RING_API_BASE_URL=https://api.amazonvision.com
RING_ACCESS_TOKEN=
RING_HMAC_KEY=
```

Ring credentials belong on the server only.
