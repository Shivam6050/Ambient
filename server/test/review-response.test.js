import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { saveEvent, saveRecord, getRecord } from '../src/services/events/memory.js';
import { resolveReview, dismissEvent } from '../src/services/events/event.service.js';
function seed(status = 'review') {
  const id = randomUUID(); const userId = randomUUID();
  const event = { _id: id, userId, type: 'package_delivered', status: 'handled' };
  saveEvent(event);
  saveRecord({ id, userId, event, context: { availability: 'busy' }, status, decision: { decision: 'ASK' }, action: { status: 'pending_user_input' }, timeline: [{ action: 'ASK', at: new Date(), reason: 'Needs confirmation' }] });
  return { id, userId };
}
test('approval saves one response and a simulated notification', async () => {
  const { id, userId } = seed();
  await Promise.all([resolveReview(id, 'approve', userId), resolveReview(id, 'approve', userId)]);
  const record = getRecord(userId, id);
  assert.equal(record.action.status, 'ready');
  assert.equal(record.action.mode, 'simulated-alexa-plus');
  assert.equal(record.decision.decision, 'ASK');
  assert.equal(record.resolution.choice, 'approve');
  assert.equal(record.timeline.filter(step => step.action === 'APPROVED').length, 1);
  await assert.rejects(resolveReview(id, 'decline', userId), error => error.statusCode === 409);
});
test('decline persists and cannot be reversed by a stale click', async () => {
  const { id, userId } = seed();
  await resolveReview(id, 'decline', userId);
  assert.equal(getRecord(userId, id).status, 'dismissed');
  await assert.rejects(resolveReview(id, 'approve', userId), error => error.statusCode === 409);
});
test('invalid input, wrong user, and dismissed requests are rejected', async () => {
  const { id, userId } = seed();
  assert.throws(() => resolveReview(id, 'invalid', userId), error => error.statusCode === 400);
  await assert.rejects(resolveReview(id, 'approve', 'other-user'), error => error.statusCode === 404);
  await dismissEvent(id, userId);
  await assert.rejects(resolveReview(id, 'approve', userId), error => error.statusCode === 409);
});
test('legacy ASK records marked notified can still be resolved', async () => {
  const { id, userId } = seed('notified');
  assert.equal((await resolveReview(id, 'approve', userId)).resolution.choice, 'approve');
});
