# AI decision layer

## What and why
The backend now has a provider-independent decision service: event + saved context/preferences -> proposal -> schema validation -> policy -> persisted result.
This separates model suggestions from executable decisions while preserving the working deterministic demo.

## Bedrock integration
The optional adapter uses the official AWS JavaScript SDK v3 ConverseCommand API.
It sends only event type, a temperature-sensitive flag, availability, activity, and interruption preferences.
Arbitrary metadata, personal location, and event history are excluded. Input is described as data, not instructions.
The prompt requests strict JSON; local validation rejects extra keys, invalid actions/priorities/targets, and empty or overly long reasons.
This is application-level schema validation, not a claim of model-enforced structured output.
Requests have a four-second deadline, an abort signal, and no SDK retries. Invalid output, access failures, or timeouts use deterministic fallback.

## Policy
- Dismissed events cannot reappear; urgent events bypass the model.
- Routine deliveries cannot interrupt protected meetings.
- Available users receive their deferred events even if AI suggests continuing to wait.
- Critical priority is reserved for urgent event types.
- Temperature-sensitive interruption requires a saved allowTimeSensitiveInterruptions preference.
Preferences have persisted schema defaults; preference editing and a temperature-sensitive demo control are not yet exposed in the UI.
The current two-event demo mostly constrains AI to existing safe behavior. Quality improvements require live evaluation and richer scenarios.

## Transparency
Decisions store source (ai, rules, policy, fallback), policy reason/version, and model ID for accepted AI decisions.
Policy overrides also retain the validated proposal in the decision document.
Timeline entries retain the source and policy reason and display them in the dashboard.
Existing history without provenance remains unchanged.
GET /api/agent/status reports configuration only, not successful AWS authentication or inference.

## Enable live Bedrock
Set these in server/.env, then restart the API:

```dotenv
AI_PROVIDER=bedrock
AWS_REGION=your-enabled-region
BEDROCK_MODEL_ID=your-accessible-converse-model-or-inference-profile-id
```

Configure AWS credentials locally through the SDK's standard credential chain (for example an AWS profile).
The identity needs Bedrock invocation access to the selected model. Do not commit or paste credentials into chat.
No model is selected automatically: access, region, and cost need to match your AWS account.
AI_PROVIDER=rules keeps the demo offline and avoids model charges.

## Tests and current evidence
Run `node --test server/test/agent-decision.test.js` for deterministic policy/provider-boundary scenarios.
These use controlled model fixtures, not live model outputs, and do not measure model quality.
Run `node --test server/test/event-lifecycle.test.js` for MongoDB/API restart coverage (MongoDB must be running).
Run `npm.cmd run build` for the frontend.
Live Bedrock inference has not been verified: no local AWS profile/model was configured during this implementation.

## Next
Configure AWS access, run the same scenarios against a real selected model, and inspect acceptance/override/fallback rates and latency.
Then add preference controls and richer delivery cases before claiming that AI improves notification decisions.

Reference: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_bedrock-runtime_code_examples.html

Latest verification: all nine policy tests and the frontend build passed. The API restart integration test passed.
The separate isolated MongoDB restart test could not start its database (fassert); C: had approximately 52 MB free.
Free disk space and rerun the full persistence suite before relying on that additional verification. No live Bedrock call was made.
