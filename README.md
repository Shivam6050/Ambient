# Ambient

The assistant that knows when to act.

## Run locally in VS Code (Windows)
Requires Node.js 22.14 or newer. Open this `ambient` folder in VS Code.

```powershell
npm.cmd install
npm.cmd run setup
Copy-Item server/.env.example server/.env
```

Start the database in one terminal:

```powershell
npm.cmd run db --prefix server
```

The first run downloads the official MongoDB 8.0.12 binary (about 750 MB on Windows).
The development runner uses WiredTiger and saves data to `server/.local-mongo/`.
Keep that terminal running. Stop it with Ctrl+C. Running the same command again reuses the data.
If MongoDB is already running on port 27017, use that instance instead of starting another.
You can also set `MONGODB_URI` in `server/.env` to your own MongoDB database.

In another terminal:

```powershell
npm.cmd run dev
```

Open http://localhost:5173. The API health endpoint is http://localhost:5000/api/health.
VS Code also provides **Terminal > Run Task > Ambient: Run locally** and **Ambient: Start database**.
MongoDB must be running before the API starts. The API deliberately fails startup if storage is unavailable.

## Demo
1. Start a meeting.
2. Simulate a package delivery once: it becomes deferred.
3. Restart the API: the package and busy context are restored.
4. End the meeting: the original package becomes a notification automatically.
5. Show package details, then dismiss it.
6. Restart again: the dismissal and full timeline remain saved.
7. Security alerts notify immediately, including during meetings.

## Verification
With the local database running:

```powershell
node --test server/test/event-lifecycle.test.js
npm.cmd run build
```

The integration test runs an isolated API on port 5055 and a uniquely named test database.
It restarts that API repeatedly, checks duplicate transitions, and removes only its own test database.

## API
- `GET /api/context`: saved local-user context.
- `PATCH /api/context`: set availability to `busy` or `available`; reconsider deferred events.
- `POST /api/events`: submit `{ "event": { "source": "ring", "type": "package_delivered" } }`.
- `GET /api/events`: saved lifecycle records, newest first.
- `POST /api/events/:id/dismiss`: idempotent dismissal.

The dashboard refreshes every 1.5 seconds. Events use server-owned context.
All runtime lifecycle state now lives in MongoDB. Existing raw documents in the old `events` collection
are left untouched; they lack historical decision/dismissal data and are not automatically imported.
Previously memory-only demo state cannot be recovered after its old server process has stopped.

See [persistence implementation](docs/persistence.md) for what changed, why, how, and limitations.
