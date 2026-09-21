# Architecture

Ambient follows a strict separation of concerns:

```text
Event
  ↓
Context + preferences
  ↓
Jev / Mock / Rules proposal
  ↓
Policy validator
  ↓
Confidence gate
  ↓
Action router
  ↓
Memory / simulated Alexa+
  ↓
Context change
  ↓
Re-evaluation
```

## Responsibilities

- **Decision provider:** proposes bounded judgment.
- **Policy:** owns hard application rules and safety constraints.
- **Confidence gate:** decides whether a proposal may execute automatically.
- **Action router:** executes only application-approved simulated actions.
- **Memory:** the single active in-memory adapter for local fallback state.
- **MongoDB:** optional persistent adapter for context, preferences, events, decisions, and lifecycle records.
- **Bedrock:** optional explanation layer; never makes or changes the decision.

## Important policy examples

1. A routine package during a meeting is deferred.
2. A critical security event can override meeting protection.
3. A waiting event is reconsidered after the user becomes available.
4. A model cannot invent a critical priority for an ordinary event.
5. Low-confidence decisions are deferred rather than silently executed.

## Jev signal preservation

For Jev Score, the server keeps the fractional `priorityScore` and probability distribution. It also derives a human-readable priority bucket for application policy and UI display.

For Noul, Jev provides an interruption probability rather than a confidence field. Ambient therefore does not invent a Noul confidence value; it uses the probability directly and only derives certainty when combining it with other signals.
