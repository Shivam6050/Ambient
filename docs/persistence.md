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

## In-memory fallback

When MongoDB is not configured or unavailable, Ambient uses the single active memory adapter at:

`server/src/services/events/memory.js`

The adapter keeps user-scoped context, preferences, events, decisions, and lifecycle records in process memory. This is intended for local development, demos, and tests.

## Re-evaluation

A waiting event is persisted with a waiting/deferred state. When the user's context changes from busy to available, the re-evaluation service loads the waiting events and sends each one back through the same decision pipeline.

This preserves the core Ambient loop:

`event -> context -> decision provider -> policy -> confidence gate -> action -> memory -> re-evaluation`

## Local MongoDB

`server/scripts/local-db.js` can start a local MongoDB instance when the required MongoDB binary is available. MongoDB is optional for the default demo mode.
