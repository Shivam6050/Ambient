import test from 'node:test';
import assert from 'node:assert/strict';
import { changeContext, readContext } from '../src/services/context/contextService.js';
import { processEvent, reevaluateDeferred, dismissEvent, listEvents } from '../src/services/events/eventService.js';

test('deferred delivery is released once, dismissal survives context changes, urgent events bypass busy state', async () => {
  delete process.env.MONGODB_URI;
  changeContext({ availability: 'busy' });
  const delivery = await processEvent({ source: 'ring', type: 'package_delivered' });
  assert.equal(delivery.status, 'deferred');
  const urgent = await processEvent({ source: 'ring', type: 'security_alert' });
  assert.equal(urgent.status, 'notified');
  reevaluateDeferred(changeContext({ availability: 'available' }));
  assert.equal(delivery.status, 'notified');
  reevaluateDeferred(readContext());
  assert.equal(delivery.timeline.filter(step => step.action === 'NOTIFY').length, 1);
  dismissEvent(delivery.id);
  dismissEvent(delivery.id);
  changeContext({ availability: 'busy' });
  reevaluateDeferred(changeContext({ availability: 'available' }));
  assert.equal(delivery.status, 'dismissed');
  assert.equal(delivery.timeline.filter(step => step.action === 'DISMISSED').length, 1);
  assert.equal(listEvents().find(item => item.id === delivery.id).status, 'dismissed');
  assert.equal(dismissEvent('missing'), null);
  assert.throws(() => changeContext({ availability: 'invalid' }));
  await assert.rejects(processEvent({ source: 'ring', type: 'unsupported' }));
});
