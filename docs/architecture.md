# Ambient architecture

Core loop: Event -> saved context -> decision -> saved lifecycle -> dashboard action.

- React/Vite dashboard polls Express every 1.5 seconds.
- Express uses server-owned MongoDB context for its deterministic decisions.
- MongoDB `contexts` stores the local-user state.
- MongoDB `eventrecords` stores each event, decision, status, and history.
- Conditional atomic writes prevent duplicate NOTIFY and DISMISSED history entries.
- Startup and periodic recovery release deferred events if saved context is available.
- One API process serializes mutations; multiple API replicas are not supported yet.
- The local WiredTiger development database stores files under `server/.local-mongo/`.

The current UI simulates Ring inputs and displays notifications. It does not deliver to Alexa or other external devices.
Next: structured AI proposals with policy validation, followed by the Alexa+ simulation and AWS integration.
See persistence.md for implementation details, test coverage, and limitations.
