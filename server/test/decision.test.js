import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPolicy } from '../src/services/decisions/policy.service.js';
import { applyConfidenceGate } from '../src/services/decisions/confidenceGate.service.js';
import { validateProposal } from '../src/services/decisions/decision.schema.js';

const prefs = { doNotInterruptMeetings: true, allowTimeSensitiveInterruptions: false, allowCriticalInterruptions: true, preferredTarget: 'alexa' };
const event = { type: 'package_delivered', priority: 'medium', metadata: {} };

test('routine events wait during meetings', () => {
  const result = applyPolicy({ decision: 'NOTIFY', priority: 'medium', reason: 'x', confidence: .9, suggestedAction: 'x', target: 'alexa', source: 'test' }, event, { availability: 'busy' }, prefs);
  assert.equal(result.decision, 'WAIT');
  assert.equal(result.policyReason, 'meeting_protection');
});

test('urgent events override meeting protection', () => {
  const result = applyPolicy({ decision: 'WAIT', priority: 'medium', reason: 'x', confidence: .4, suggestedAction: 'x', target: 'ambient', source: 'test' }, { ...event, type: 'security_alert', priority: 'critical' }, { availability: 'busy' }, prefs);
  assert.equal(result.decision, 'NOTIFY');
  assert.equal(result.priority, 'critical');
});

test('waiting cannot survive an available context', () => {
  const result = applyPolicy({ decision: 'WAIT', priority: 'medium', reason: 'x', confidence: .9, suggestedAction: 'x', target: 'ambient', source: 'test' }, event, { availability: 'available' }, prefs);
  assert.equal(result.decision, 'NOTIFY');
});

test('fractional urgency score is preserved', () => {
  const proposal = { decision: 'NOTIFY', priority: 'high', priorityScore: 2.7, reason: 'x', confidence: .91, suggestedAction: 'x', target: 'alexa', source: 'jev' };
  assert.equal(validateProposal(proposal).priorityScore, 2.7);
});

test('high confidence becomes AUTO', () => {
  assert.equal(applyConfidenceGate({ decision: 'NOTIFY', priority: 'medium', confidence: .9, reason: 'x', suggestedAction: 'x', target: 'alexa', source: 'test' }).gate.mode, 'AUTO');
});

test('review confidence becomes ASK', () => {
  const r = applyConfidenceGate({ decision: 'NOTIFY', priority: 'medium', confidence: .7, reason: 'x', suggestedAction: 'x', target: 'alexa', source: 'test' });
  assert.equal(r.decision, 'ASK');
  assert.equal(r.gate.mode, 'REVIEW');
});

test('low confidence becomes WAIT', () => {
  const r = applyConfidenceGate({ decision: 'NOTIFY', priority: 'medium', confidence: .4, reason: 'x', suggestedAction: 'x', target: 'alexa', source: 'test' }, { event });
  assert.equal(r.decision, 'WAIT');
  assert.equal(r.gate.mode, 'DEFER');
});
