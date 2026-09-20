# AMBIENT

> **The assistant that knows when to act.**

Ambient is a context-aware agentic orchestration system. It receives events, reads the user's current moment, requests bounded decisions from AI models (TypeSafe AI Jev, AWS Bedrock, or deterministic rules), validates proposals with deterministic policies, and routes resulting actions through device adapters.

---

## The Core Idea

```text
Event → Context → AI Model → Policy → Confidence Gate → Action
            ↑                                             ↓
            └──────── Memory (WAIT Queue) ←───────────────┘
                               ↓
                        Context Changes
                               ↓
                          Re-Evaluation
```

The key product behavior is **deferred intelligence**: when the user is busy, Ambient remembers non-critical events rather than interrupting. When context changes back to available, waiting events are automatically reconsidered.

---

## Product Surfaces

The dashboard provides a complete, transparent view of the agentic loop:

1. **Moment** — Live user context (Available vs. In a meeting).
2. **Event Simulator** — Trigger simulated Ring device events (routine package delivery vs. critical security alert).
3. **Simulated Alexa+ Card** — User-facing notification experience with action details and dismissal controls.
4. **Waiting Memory** — Deferred events queued until an opportune moment.
5. **Decision Brain** — AI decision, confidence rating, gate mode, and suggested action.
6. **Decision Trace** — Transparent pipeline audit (`Event → Context → Model → Policy → Action`).
7. **Decision Signals** — Probability distributions for action, urgency score, and immediate interruption probability.
8. **Decision History** — Timeline of recent decisions with inspection and idempotent dismissal.

---

## Quick Start

### Prerequisites
- Node.js 20+ (Node.js 22+ recommended)

### One-Command Startup
Install dependencies and run both backend and frontend concurrently:

```powershell
# From the ambient/ root directory:
npm.cmd run setup
npm.cmd run dev
```

Open **http://localhost:5173**. The API will be available at **http://localhost:5000/api/health**.

> [!NOTE]
> Ambient runs out of the box in offline `mock` AI provider mode with in-memory persistence. No external API keys or database servers are required for local evaluation.

---

## AI Providers

Ambient supports multiple pluggable decision providers configured via `server/.env`:

```env
# Choose: mock, jev, bedrock, or rules
AI_PROVIDER=mock
```

### 1. Mock Provider (`AI_PROVIDER=mock`)
Default mode. Simulates typed Jev distributions, urgency scores, and interruption probabilities locally without network calls.

### 2. TypeSafe AI Jev (`AI_PROVIDER=jev`)
Calls Jev SystemOne API for bounded typed choices, scores, and noul interrupt probabilities:
```env
AI_PROVIDER=jev
TYPESAFE_API_KEY=your_typesafe_api_key
JEV_MODEL=jev-latest
JEV_BASE_URL=https://api.typesafe.ai/v1/systemone
```

### 3. AWS Bedrock (`AI_PROVIDER=bedrock`)
Calls AWS Bedrock via the official JavaScript SDK v3 ConverseCommand API:
```env
AI_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```
Configure standard AWS credentials in your environment. See [AI decision layer](docs/ai-decisions.md) for details.

### 4. Deterministic Rules (`AI_PROVIDER=rules`)
Pure deterministic rule engine based on context availability and event priority.

---

## Persistence Modes

1. **In-Memory Fallback (Default)**: If `MONGODB_URI` is blank, demo state is kept safely in memory with user-scoped isolation.
2. **Local MongoDB Runner**: Run `npm.cmd run db` (or VS Code Task `Ambient: Start database`). This launches a local MongoDB 8.x WiredTiger instance on port 27017 saving data to `server/.local-mongo/`.
3. **External MongoDB / Atlas**: Set `MONGODB_URI=mongodb://...` in `server/.env`.

See [Persistence documentation](docs/persistence.md) for details.

---

## Demo Script

### The Hero Path (Deferred Delivery)
1. Click **Start meeting** (Moment switches to BUSY).
2. Click **Package delivered** (Ring Simulator).
3. The event is evaluated: because the user is in a meeting, Ambient chooses `WAIT`.
4. The event appears in **Waiting for the right moment**.
5. Click **End meeting** (Moment switches to AVAILABLE).
6. Ambient automatically detects the transition, re-evaluates the waiting event, and transitions to `NOTIFY`.
7. The **Simulated Alexa+ Card** illuminates with the notification!
8. Click **Show details** to inspect event metadata, then click **Dismiss**.

### The Contrast Path (Urgent Security Override)
1. While in a meeting, click **Security alert**.
2. Deterministic policy immediately overrides the meeting protection, marking the event as critical `NOTIFY`.
3. The notification surfaces immediately without delay.

---

## Verification & Tests

Run all unit and policy integration tests:

```powershell
npm.cmd test
```

Or run individual suites:

```powershell
# Policy & boundary scenarios (9 tests)
node --test server/test/agent-decision.test.js

# Build client bundle
npm.cmd run build
```

---

## API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check, active storage mode, and AI provider |
| `/api/agent/status` | `GET` | AI provider configuration and readiness |
| `/api/agent/evaluate` | `POST` | Evaluate event payload through the agentic pipeline |
| `/api/context` | `GET` | Get current user context and preferences |
| `/api/context` | `PATCH` | Update context availability (triggers re-evaluation) |
| `/api/events` | `POST` | Submit event and return lifecycle record |
| `/api/events` | `GET` | List persisted event records |
| `/api/events/history` | `GET` | Retrieve recent events, decisions, and waiting queue |
| `/api/events/:id/dismiss` | `POST` | Idempotently dismiss an active notification |
| `/api/actions/capabilities` | `GET` | List registered action adapter capabilities |

---

## Documentation Index

- [Architecture Guide](docs/architecture.md)
- [Persistence Implementation](docs/persistence.md)
- [AI Decision Layer & AWS Bedrock](docs/ai-decisions.md)
- [Friction Log](docs/friction-log.md)
- [Product Feedback](docs/product-feedback.md)
