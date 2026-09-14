# Ambient

> The assistant that knows when to act.

Ambient is an agentic orchestration prototype for the Amazon Developer Hackathon. It receives device events, combines them with user context, and decides whether to act now, wait, or ignore.

## MVP loop
**Event → Context → Decision → Action**

## Run locally

### Server
```bash
cd server
npm install
copy .env.example .env
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

Server defaults to `http://localhost:5000`, client to Vite's local URL.

## Current demo
1. Open the dashboard.
2. Click **Start meeting**.
3. Simulate **Package delivered**.
4. Observe `WAIT`.
5. Click **End meeting**.
6. Simulate **Package delivered** again.
7. Observe `NOTIFY`.

This is the deterministic backbone. AI/MCP/Amazon integrations will be layered on top after the core loop is stable.

## Hackathon docs
See `docs/architecture.md`, `docs/product-feedback.md`, and `docs/friction-log.md`.

## VS Code quick start (Windows)
Open the `ambient` folder in VS Code. In its terminal, run:

```powershell
npm.cmd install
npm.cmd run setup
Copy-Item server/.env.example server/.env
npm.cmd run dev
```

Open http://localhost:5173. The API runs at http://localhost:5000/api/health.
You can also use **Terminal > Run Task > Ambient: Run locally**.
Stop both services with Ctrl+C. Run `npm.cmd run build` to verify the production client build.

The demo works without MongoDB: events are validated and processed but are not persisted.
To enable persistence, set `MONGODB_URI` in `server/.env` to a running MongoDB instance and restart.
Context is kept in memory and resets on server restart.
