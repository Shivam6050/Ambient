# Ambient — Architecture v0.1

Core loop: **Event → Context → Decision → Action**.

## MVP
- React/Vite dashboard
- Express API
- In-memory user context
- MongoDB event persistence
- Deterministic decision engine before adding an LLM
- Simulated Ring package/security events
- Alexa+-style interaction layer later

## Why deterministic first?
We need a reliable backbone before adding model reasoning. The LLM will eventually produce a structured decision proposal; policy/rules will validate and execute it.

## Planned evolution
1. Event + context backbone
2. Agent service with structured JSON output
3. MCP tool layer
4. Alexa+ simulation
5. AWS Builder integration
6. Real Amazon integrations where feasible
