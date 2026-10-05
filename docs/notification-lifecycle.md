# Notification lifecycle repair

The v0.9 event flow now saves dismissals to the memory record as well as the event, and repeated dismissals add only one timeline entry. MongoDB dismissal uses a conditional record update and never falls through to unrelated memory state.

Re-evaluation appends to the original timeline instead of replacing RECEIVED/WAIT history. The record stores the action and final event status. Evaluation and dismissal share a single-process mutation queue; stale waiting-list entries cannot redeliver a handled or dismissed event.

The dashboard reloads the newest saved, ready notification from GET /api/events, including after page refresh. Dismissing it reveals the next ready notification on the next load. ASK and remote handoff actions are not treated as delivered notifications.

Also repaired a malformed quote in the root npm dev script that prevented package.json parsing.

Validation: 11 focused tests across decision.test.js, lifecycle.test.js, and notification-lifecycle.test.js. New lifecycle coverage uses the mock provider and memory adapter; MongoDB behavior and live Jev/AWS/device integrations were not exercised. Single-process serialization is not a distributed lock. Memory mode still resets on backend restart.
