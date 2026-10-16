import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../', import.meta.url));
let child, base;
async function freePort() {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function start(uri, review = false) {
  const port = await freePort(); base = `http://127.0.0.1:${port}/api`;
  child = spawn(process.execPath, ['src/app.js'], { cwd, env: { ...process.env, NODE_ENV: 'development', VERCEL: '', PORT: String(port), MONGODB_URI: uri, AI_PROVIDER: 'mock', AMBIENT_AUTO_THRESHOLD: review ? '0.97' : '0.80', AMBIENT_REVIEW_THRESHOLD: '0.55', ALEXA_PLUS_MODE: 'simulator' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', d => { output += d; }); child.stderr.on('data', d => { output += d; });
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try { const response = await fetch(base + '/health', { signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('API readiness timeout: ' + output);
}
async function stop() { if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } }
async function api(path, method = 'GET', body) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  const json = await res.json(); assert.equal(res.ok, true, JSON.stringify(json)); return json.data;
}
const deliver = () => api('/events', 'POST', { event: { source: 'ring', type: 'package_delivered', priority: 'medium' } });
test('MongoDB preserves context, delivery history, approvals and declines across API restarts', { timeout: 180000 }, async () => {
  let mongo;
  try {
    mongo = await MongoMemoryServer.create({ binary: { version: '8.0.12' }, instance: { storageEngine: 'wiredTiger' } });
    const uri = mongo.getUri('ambient_restart_test');
    await start(uri);
    await api('/context', 'PATCH', { availability: 'busy' });
    const delivery = await deliver(); const id = String(delivery.event._id);
    assert.equal(delivery.decision.decision, 'WAIT');
    await stop(); await start(uri);
    assert.equal((await api('/context')).context.availability, 'busy');
    assert.equal((await api('/events')).find(r => r.id === id).status, 'deferred');
    await api('/context', 'PATCH', { availability: 'available' });
    let record = (await api('/events')).find(r => r.id === id);
    assert.deepEqual(record.timeline.map(s => s.action), ['RECEIVED', 'WAIT', 'NOTIFY']);
    await api(`/events/${id}/dismiss`, 'POST');
    await stop(); await start(uri, true);
    assert.equal((await api('/events')).find(r => r.id === id).status, 'dismissed');
    const review = await deliver(); const reviewId = String(review.event._id);
    assert.equal(review.decision.decision, 'ASK');
    await api(`/events/${reviewId}/resolve`, 'POST', { choice: 'approve' });
    const declined = await deliver(); const declinedId = String(declined.event._id);
    await api(`/events/${declinedId}/resolve`, 'POST', { choice: 'decline' });
    await stop(); await start(uri, true);
    const records = await api('/events');
    assert.equal(records.find(r => r.id === reviewId).resolution.choice, 'approve');
    assert.equal(records.find(r => r.id === reviewId).action.status, 'ready');
    assert.equal(records.find(r => r.id === declinedId).status, 'dismissed');
    await api(`/events/${reviewId}/resolve`, 'POST', { choice: 'approve' });
    assert.equal((await api('/events')).find(r => r.id === reviewId).timeline.filter(s => s.action === 'APPROVED').length, 1);
    // Connection loss must reject writes rather than silently creating memory-only events.
    await mongo.stop({ doCleanup: false });
    const failed = await fetch(base + '/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: { source: 'ring', type: 'package_delivered' } }), signal: AbortSignal.timeout(20000) });
    assert.equal(failed.status, 503);
  } finally { await stop(); if (mongo) await mongo.stop({ doCleanup: true, force: true }); }
});
