# AMBIENT

> **The assistant that knows when to act.**

Ambient is a context-aware agentic orchestration prototype for the Amazon Developer Hackathon. It demonstrates a simple product thesis: an assistant should reason about the user's current moment before deciding whether to interrupt, wait, ask, or ignore.

## v0.9.0 — MCP + integration boundaries

This version removes the remaining duplicate legacy service implementations and simplifies Vercel routing so /api/* requests reach the Express serverless entry point directly. The runtime path is now:

```text
Ring simulator / event
        ↓
Context + preferences
        ↓
Jev (primary bounded decision engine)
        ↓
Deterministic policy
        ↓
Confidence gate
        ↓
Action router
   ↙          ↘
Alexa+       Waiting memory
simulation       ↓
             context change
                  ↓
              re-evaluate
```

Amazon Bedrock is **not** the primary decision engine. It is an optional AWS Builder / explanation layer that receives an already-decided result and cannot modify it.

## What is real vs simulated?

| Component | Status |
|---|---|
| Ambient Express backend | Real local code |
| React dashboard | Real local code |
| MongoDB persistence | Optional real integration |
| In-memory fallback | Real local implementation |
| Jev API | Real integration when configured |
| Amazon Bedrock | Real SDK integration when enabled |
| Alexa+ experience | MCP-ready adapter + simulator fallback |
| Ring events/device | Partner API webhook boundary + simulator |
| Physical Ring device | Live access requires Ring partner onboarding |
| MCP server | Implemented — Streamable HTTP |

## MCP server

Start a second terminal with:

`npm.cmd run mcp`

The local Streamable HTTP endpoint is `http://127.0.0.1:5100/mcp`. It exposes Ambient evaluation, context, waiting-memory, decision-history, and action-capability tools. See `docs/mcp.md`.

## Ring partner boundary

Ambient v0.9 adds `POST /api/integrations/ring/webhook` with raw-body HMAC-SHA256 verification and a Ring API adapter. Live use still requires Ring developer onboarding, OAuth account linking, client credentials, HMAC key, and HTTPS endpoints. See `docs/ring-integration.md`.

## Zero-setup local run

Requirements: Node.js 20+.

```powershell
npm.cmd install
Copy-Item server/.env.example server/.env
npm.cmd run dev
```

Open **http://localhost:5173**.

The default configuration is:

```env
AI_PROVIDER=mock
MONGODB_URI=
AWS_BEDROCK_ENABLED=false
```

So the dashboard works without MongoDB, Jev, AWS credentials, or paid model calls.

## Demo path

1. Click **Start meeting**.
2. Click **Package delivered**.
3. Ambient chooses `WAIT` and stores the event.
4. Click **End meeting**.
5. Ambient re-evaluates the waiting event and surfaces a simulated Alexa+ notification.
6. While busy, click **Security alert** to demonstrate deterministic critical-event override.
7. Inspect the decision trace and typed Jev-style signals.
8. Optionally enable Bedrock and click **Generate AWS insight**.

## AI providers

### Mock — recommended for local development

```env
AI_PROVIDER=mock
```

No network calls. The mock returns typed decision/priority/interruption distributions so the UI can demonstrate the full decision pipeline.

### Jev

```env
AI_PROVIDER=jev
TYPESAFE_API_KEY=your_key
JEV_MODEL=jev-latest
JEV_BASE_URL=https://api.typesafe.ai/v1/systemone
```

Jev is the primary bounded decision provider. The server asks for a Choice, Score, and Noul output in one request. Fractional urgency score and probability distributions are preserved.

### Rules

```env
AI_PROVIDER=rules
```

Pure deterministic fallback for offline testing.

### Amazon Bedrock explanation layer

Keep the primary provider as `mock` or `jev` and enable only the explanation layer:

```env
AWS_BEDROCK_ENABLED=true
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

The AWS SDK uses the normal AWS credential chain. Do not commit credentials.

## Confidence gate

Thresholds are configurable:

```env
AMBIENT_AUTO_THRESHOLD=0.80
AMBIENT_REVIEW_THRESHOLD=0.55
```

- `>= auto`: AUTO
- `review..auto`: REVIEW → ASK
- `< review`: DEFER → WAIT
- Critical policy path: AUTO NOTIFY

These are application thresholds, not model guarantees. They should be empirically calibrated before making production claims.

## Persistence

Without `MONGODB_URI`, Ambient uses the single active user-scoped in-memory adapter at `server/src/services/events/memory.js`. This is the fastest local demo mode.

With MongoDB:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ambient
```

The app will attempt MongoDB and fall back to memory if the database is unavailable.

## Tests

```powershell
npm.cmd test
npm.cmd run build
```

The tests are deterministic and do not claim that live Jev or Bedrock inference has been verified. Live provider testing requires the corresponding credentials and should be recorded in the hackathon friction log.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health and storage/provider status |
| GET | `/api/agent/status` | Provider configuration status |
| POST | `/api/agent/evaluate` | Evaluate an event through the pipeline |
| POST | `/api/agent/insight` | Optional Bedrock explanation |
| GET | `/api/context` | Read current context/preferences |
| PATCH | `/api/context` | Change availability and trigger re-evaluation |
| GET | `/api/events/history` | Recent events, decisions, waiting queue |
| GET | `/api/events` | Event records |
| POST | `/api/events` | Submit an event |
| POST | `/api/events/:id/dismiss` | Dismiss a notification |
| GET | `/api/actions/capabilities` | Registered action adapters |

## Hackathon transparency

This repository intentionally documents the simulation boundary. The Alexa+ and Ring experiences are simulated for the allowed hackathon web/demo path. The product should not claim a physical Ring integration or a live Alexa+ skill when neither is present.

### Product feedback

See `docs/product-feedback.md`. Record actual feedback only after using the relevant Amazon/AWS tool.

### Friction log

See `docs/friction-log.md`. Record actual setup failures, latency, documentation gaps, or SDK issues; do not fabricate entries.

## License

MIT — see `LICENSE`.
