# Ambient Architecture

> **The assistant that knows when to act.**

Ambient is a context-aware agentic orchestration system. It receives device and ambient events, evaluates the user's current moment and availability, prompts a bounded decision model (TypeSafe AI Jev, AWS Bedrock, or deterministic rules), validates proposals against deterministic safety policies, applies confidence gating, and routes resulting actions to simulated device adapters or deferred ambient memory.

---

## 1. Decision Pipeline

```text
Ring event / Simulator
        ↓
Event Service
        ↓
Context Service + Preferences
        ↓
Decision Layer (Jev / Bedrock / Mock / Rules)
  ├─ Choice: action (NOTIFY / WAIT / IGNORE / ASK / ESCALATE)
  ├─ Score: urgency (low, medium, high, critical)
  └─ Noul: should interrupt immediately?
        ↓
Policy Validator (deterministic safety & meeting protection)
        ↓
Confidence Gate (AUTO / REVIEW / DEFER)
        ↓
Action Router
  ├─ Alexa+ simulation (notification card, voice prompt)
  └─ Ambient memory (deferred WAIT queue)
```

---

## 2. Re-Evaluation Loop

The cornerstone product behavior is **deferred intelligence**: when a user is busy in a meeting, Ambient remembers non-critical events instead of interrupting. When context transitions back to available, those events are automatically retrieved and re-evaluated.

```text
Event arrives during meeting
        ↓
Evaluated against busy context → WAIT
        ↓
Stored in Waiting Memory
        ↓
User availability transitions to 'available'
        ↓
Context service triggers re-evaluation sweep
        ↓
Event re-evaluated against new moment
        ↓
NOTIFY → Simulated Alexa+ card appears
```

---

## 3. Confidence Gate Service

After deterministic safety checks, `confidenceGate.service.js` controls automated execution based on model confidence scores:
- **>= 0.80 (AUTO)**: Automated action execution.
- **0.55 – 0.79 (REVIEW)**: Converts to `ASK` for user confirmation before acting.
- **< 0.55 (DEFER)**: Converts to `WAIT` to reconsider on future context changes.
- **Critical Safety Override**: Critical security events (`security_alert`, `emergency`) that pass policy always remain AUTO `NOTIFY`.

---

## 4. Separation of Responsibilities

**AI provides judgment. Application code controls policy and side effects.**

1. The AI model never directly invokes external device side effects.
2. Hard policies (meeting protection, urgent security overrides, dismissal enforcement) live in deterministic application logic.
3. The action router uses adapter interfaces, enabling seamless replacement of simulated device cards with real Smart Home skills / MCP tools.

---

## 5. Dual-Mode Persistence & Storage

- **MongoDB (Configured)**: When `MONGODB_URI` is provided, user context, preferences, events, decisions, and atomic lifecycle records (`EventRecord`) are persisted with journal acknowledgement.
- **In-Memory Fallback**: When MongoDB is not configured or offline, Ambient runs fully in-memory with user-scoped isolation (`eventMemory.js`), allowing instant offline demos.
- **Local Database Runner**: `npm.cmd run db` boots a standalone local MongoDB 8.x instance using WiredTiger on disk (`server/.local-mongo/`).
