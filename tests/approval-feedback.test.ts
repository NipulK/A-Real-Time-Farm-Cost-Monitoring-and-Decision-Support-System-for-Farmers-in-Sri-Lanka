import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeApproval, APPROVED_APPLICATION_MESSAGE, REJECTED_APPLICATION_MESSAGE } from '../lib/approval-feedback';

test('approved application is acknowledged before opening dashboard', async () => {
  const calls: string[] = [];
  assert.equal(await acknowledgeApproval('approved', {
    notify: message => { assert.equal(message, APPROVED_APPLICATION_MESSAGE); calls.push('OK'); },
    openDashboard: () => { calls.push('dashboard'); },
    signOut: async () => { calls.push('logout'); },
  }), true);
  assert.deepEqual(calls, ['OK', 'dashboard']);
});

test('rejected application contact message precedes sign out without dashboard access', async () => {
  const calls: string[] = [];
  assert.equal(await acknowledgeApproval('rejected', {
    notify: message => { assert.equal(message, REJECTED_APPLICATION_MESSAGE); assert.match(message, /contact the system administrator/); calls.push('OK'); },
    openDashboard: () => { calls.push('dashboard'); },
    signOut: async () => { calls.push('logout'); },
  }), true);
  assert.deepEqual(calls, ['OK', 'logout']);
});

test('pending and needs-information refreshes preserve application without terminal popup', async () => {
  for (const status of ['pending', 'needs_info']) {
    const unexpected = () => { assert.fail('Non-final decision must retain application'); };
    assert.equal(await acknowledgeApproval(status, { notify: unexpected, openDashboard: unexpected, signOut: async () => unexpected() }), false);
  }
});

test('themed popup acknowledgment must complete before navigation', async () => {
  let confirm!: () => void;
  let navigated = false;
  const pending = acknowledgeApproval('approved', {
    notify: () => new Promise<void>(resolve => { confirm = resolve; }),
    openDashboard: () => { navigated = true; },
    signOut: async () => assert.fail('Approved owner must stay signed in'),
  });
  assert.equal(navigated, false);
  confirm();
  await pending;
  assert.equal(navigated, true);
});
