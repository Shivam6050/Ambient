import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const dbName = 'ambient_test_' + randomUUID().replaceAll('-', '');
const uri = 'mongodb://127.0.0.1:27017/' + dbName;
const base = 'http://127.0.0.1:5055/api';
let child;
let output = '';
async function start() {
  child = spawn(process.execPath, ['src/app.js'], { cwd, env: { ...process.env, PORT: '5055', MONGODB_URI: uri }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(output);
    try { if ((await fetch(base + '/health')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Server did not start: ' + output);
}
async function stop() {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
}
async function api(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  assert.equal(response.ok, true, JSON.stringify(result));
  return result.data;
}
const change = availability => api('/context', 'PATCH', { availability });
const deliver = () => api('/events', 'POST', { event: { source: 'ring', type: 'package_delivered' }, context: { availability: 'available' } });
test('real MongoDB survives server restarts and prevents duplicate transitions', { timeout: 60000 }, async () => {
  try {
    await mongoose.connect(uri);
    await start();
    await change('busy');
    const delivery = await deliver();
    assert.equal(delivery.status, 'deferred', 'server context overrides client-supplied context');
    await stop(); await start();
    assert.equal((await api('/context')).availability, 'busy');
    assert.equal((await api('/events')).find(item => item.id === delivery.id).status, 'deferred');
    await Promise.all([change('available'), change('available')]);
    let restored = (await api('/events')).find(item => item.id === delivery.id);
    assert.equal(restored.status, 'notified');
    assert.equal(restored.timeline.filter(step => step.action === 'NOTIFY').length, 1);
    await Promise.all([api('/events/' + delivery.id + '/dismiss', 'POST'), api('/events/' + delivery.id + '/dismiss', 'POST')]);
    await stop(); await start();
    restored = (await api('/events')).find(item => item.id === delivery.id);
    assert.equal(restored.status, 'dismissed');
    assert.equal(restored.timeline.filter(step => step.action === 'DISMISSED').length, 1);
    await change('busy');
    const urgent = await api('/events', 'POST', { event: { source: 'ring', type: 'security_alert' } });
    assert.equal(urgent.status, 'notified');
    const interrupted = await deliver();
    await stop();
    // Simulate a crash after context was persisted but before deferred records were released.
    await mongoose.connection.collection('contexts').updateOne({ _id: 'local-user' }, { $set: { availability: 'available', activity: 'idle' } });
    await start();
    restored = (await api('/events')).find(item => item.id === interrupted.id);
    assert.equal(restored.status, 'notified');
    assert.equal(restored.timeline.filter(step => step.action === 'NOTIFY').length, 1);
    const invalid = await fetch(base + '/context', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"availability":"invalid"}' });
    assert.equal(invalid.status, 400);
  } finally {
    await stop();
    if (mongoose.connection.name === dbName && /^ambient_test_[a-f0-9]{32}$/.test(dbName)) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('local WiredTiger data survives stopping and restarting MongoDB itself', { timeout: 60000 }, async () => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dbPath = await mkdtemp(join(tmpdir(), 'ambient-disk-test-'));
  let mongo;
  try {
    mongo = await MongoMemoryServer.create({ binary: { version: '8.0.12' }, instance: { dbPath, storageEngine: 'wiredTiger' } });
    await mongoose.connect(mongo.getUri('disk_test'), { writeConcern: { w: 1, j: true } });
    await mongoose.connection.collection('proof').insertOne({ _id: 'dismissed-event', status: 'dismissed' });
    await mongoose.disconnect();
    await mongo.stop({ doCleanup: false });
    mongo = await MongoMemoryServer.create({ binary: { version: '8.0.12' }, instance: { dbPath, storageEngine: 'wiredTiger' } });
    await mongoose.connect(mongo.getUri('disk_test'));
    assert.equal((await mongoose.connection.collection('proof').findOne({ _id: 'dismissed-event' })).status, 'dismissed');
  } finally {
    await mongoose.disconnect();
    if (mongo) await mongo.stop({ doCleanup: true, force: true });
  }
});
