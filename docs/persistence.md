# Persistence: what, why, and how

## What changed
- Added a `contexts` collection for the local user's availability, activity, location, and timestamps.
- Added `eventrecords` for the original event, context snapshot, latest decision, lifecycle status, and timestamped timeline.
- Replaced the in-memory context and Map with asynchronous Mongoose reads/writes.
- Added startup recovery and a five-second recovery sweep.
- Added a persistent local MongoDB development runner and VS Code database task.
- Replaced the earlier in-memory regression test with an HTTP integration test using real MongoDB and separate API processes.

## Why
A deferred event is a promise to notify later. Losing that event on restart breaks the product's core behavior.
Remembering dismissals prevents repeated interruptions. Keeping decision history makes the behavior inspectable.
Storage failures must be visible instead of silently switching to temporary memory.

## How
An event is validated, evaluated using saved server context, and inserted with its initial history in one lifecycle document.
When availability changes, the context is saved first. Deferred records are then conditionally updated from `deferred` to `notified`.
The status and NOTIFY timeline entry are written atomically in the same MongoDB update.
A second attempt cannot match an already-notified or dismissed event, so it cannot append a duplicate notification.
Dismissal uses the same pattern: only a non-dismissed record can gain the DISMISSED entry.
Writes request journal acknowledgement. The API responds after the database write completes.

The API serializes mutations within its one process to avoid event/context races. If a crash occurs between saving availability
and processing all deferred records, startup rereads context and finishes the remaining work. A periodic sweep also repairs this
case after a temporary database failure. This is recovery across separate documents, not a multi-document transaction.
The browser reads persisted records, so refreshes and API restarts do not reset the experience.

## Local storage
`npm.cmd run db --prefix server` launches a real MongoDB binary through mongodb-memory-server.
Despite the package name, this configuration uses WiredTiger with an explicit disk path and disables cleanup on shutdown.
Data lives in `server/.local-mongo/`, ignored by Git. The binary is downloaded on first use.
A normal MongoDB service or Atlas database can replace this runner through MONGODB_URI.
The runner is development tooling, not a production database service or automatic Windows startup service.

## Verification
The integration test checks a deferred delivery across API restart, saved busy context, release after a meeting,
concurrent repeated availability updates, concurrent dismissals, dismissal across another restart, urgent alerts,
invalid context rejection, and recovery from an interrupted context-to-event transition.
It uses an isolated database and port, leaving the user's demo records untouched.

## Boundaries
This is a single-user, single-API-process prototype. Multi-instance context ordering and user authentication are not implemented.
NOTIFY means a saved dashboard notification; this does not claim exactly-once delivery to external Alexa, email, or push services.
External delivery will need a durable outbox and provider-aware retries.
History currently loads in full; pagination and retention are future work. Database backups are not yet configured.
The old raw `events` collection is preserved without invented history. Earlier memory-only events cannot be reconstructed.

A second test stops and restarts an isolated MongoDB process on the same WiredTiger data directory and verifies the stored record survives. Both restart tests and the frontend production build passed.
