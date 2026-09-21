import test from 'node:test';
import assert from 'node:assert/strict';
import { mockDecision } from '../src/services/agent/mock.service.js';
import { deterministicDecision } from '../src/services/decisions/rules.js';

test('mock provider has deterministic demo behavior', () => {
  assert.equal(mockDecision({ event: { type: 'package_delivered', priority: 'medium' }, context: { availability: 'busy' } }).decision, 'WAIT');
  assert.equal(mockDecision({ event: { type: 'package_delivered', priority: 'medium' }, context: { availability: 'available' } }).decision, 'NOTIFY');
  assert.equal(mockDecision({ event: { type: 'security_alert', priority: 'critical' }, context: { availability: 'busy' } }).decision, 'NOTIFY');
});

test('rules provider is independent of external AI', () => {
  assert.equal(deterministicDecision({ event: { type: 'package_delivered', priority: 'medium' }, context: { availability: 'busy' } }).decision, 'WAIT');
});
