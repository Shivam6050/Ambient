# AI decision layer

## Primary decision path

`AI_PROVIDER=jev` calls TypeSafe AI Jev SystemOne. `AI_PROVIDER=mock` is the default offline demo. `AI_PROVIDER=rules` is a deterministic provider used for testing.

The decision contract contains:

- Choice: `NOTIFY | WAIT | IGNORE | ASK | ESCALATE`
- Score: urgency across low/medium/high/critical
- Noul: interruption probability

Jev's output is normalized into an application decision but deterministic policy remains authoritative.

## AWS Builder / Bedrock

Amazon Bedrock is intentionally separate from the decision provider in v0.8.1. The dashboard sends the already-approved event, context, decision, confidence, and gate to Bedrock and asks for a concise explanation. The response is informational and cannot change the action.

Keep `AWS_BEDROCK_ENABLED=false` for local work to avoid unnecessary inference calls.

## Validation

Tests cover policy boundaries and confidence-gate behavior. They use deterministic fixtures and therefore do not measure live model quality.

Before claiming live provider success, configure credentials, run a real request, record the observed result, and update the friction/product-feedback documents with the actual experience.
