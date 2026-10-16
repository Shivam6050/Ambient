# User confirmation flow

ASK decisions now enter a review queue instead of appearing to be delivered notifications. The dashboard restores pending requests from saved records on reload.

POST /api/events/:id/resolve?userId=demo-user accepts {"choice":"approve"} or {"choice":"decline"}.
Approval creates a simulated Alexa-style dashboard update only; it does not invoke remote devices or model tools. Decline suppresses the update. The original AI decision is preserved, with a separate resolution choice, timestamp, and APPROVED/DECLINED timeline entry.

Repeated identical requests return the saved outcome. Conflicting responses, dismissed records, and non-review events return 409; missing/user-mismatched records return 404; invalid choices return 400. Legacy ASK records marked notified are supported when their action is still pending_user_input.

The implementation uses the existing single-process mutation queue and a conditional MongoDB record update. User IDs remain demo scoping, not authentication. Memory-mode responses survive browser reload but not backend restart. MongoDB support is implemented but not live-tested in this milestone. Tests cover memory behavior and existing policy/lifecycle flows.
