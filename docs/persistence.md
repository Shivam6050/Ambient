# Ambient persistence

Ambient supports two storage modes.

## MongoDB

When `MONGODB_URI` is configured and the connection succeeds, Ambient stores:

- user context
- user preferences
- events
- decisions
- event lifecycle records

The application checks the connection state before choosing MongoDB operations, so local development can still start without a database.

## In-memory demo mode

When MongoDB is not configured, Ambient uses the single active memory adapter at:

`server/src/services/events/memory.js`

The adapter keeps user-scoped context, preferences, events, decisions, and lifecycle records in process memory. This is intended for local development, demos, and tests.

## Re-evaluation

A waiting event is persisted with a waiting/deferred state. When the user's context changes from busy to available, the re-evaluation service loads the waiting events and sends each one back through the same decision pipeline.

This preserves the core Ambient loop:

`event -> context -> decision provider -> policy -> confidence gate -> action -> memory -> re-evaluation`

## Local MongoDB

`server/scripts/local-db.js` can start a local MongoDB instance when the required MongoDB binary is available. MongoDB is optional for the default demo mode.

## Connection checks

Run `npm run db:check` from the repository root. It checks SRV DNS where applicable, connects using `server/.env`, and pings MongoDB without modifying application records or printing credentials. A successful ping does not verify write permissions.

When a configured database is unavailable, the API returns HTTP 503 and never switches to temporary memory. Health reports storage readiness; the dashboard labels temporary sessions explicitly.

For TLS handshake failures, check that your current public IP is allowed under Atlas Project > Network Access, that the cluster is running, and that your VPN/firewall permits the connection. Do not disable TLS verification. After correcting access, rerun `npm run db:check`; the API retries connections automatically.

Official guidance: https://www.mongodb.com/docs/atlas/troubleshoot-connection/
