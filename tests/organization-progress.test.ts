import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrganizationRegistrationSteps, ApprovalDecisionDialog } from '../app/organization-registration-progress';
import { APPROVED_APPLICATION_MESSAGE, REJECTED_APPLICATION_MESSAGE } from '../lib/approval-feedback';
const render = (status: string, section?: string) => renderToStaticMarkup(createElement(OrganizationRegistrationSteps, { status, section }));
test('registration steps distinguish draft sections, review, action required and terminal outcomes', () => {
  const details = render('draft');
  assert.match(details, /aria-current="step"[^>]*><span[^>]*>1/);
  assert.match(render('draft', 'land'), /aria-current="step"[^>]*><span[^>]*>2/);
  assert.match(render('pending'), /Waiting for the administrator/);
  assert.match(render('needs_info'), /Action required/);
  assert.match(render('rejected'), /Application rejected/);
  assert.match(render('rejected'), /contact the system administrator/);
  assert.match(render('approved'), /Registration complete/);
  for (const status of ['draft','pending','needs_info','rejected','approved']) {
    assert.equal((render(status).match(/aria-current="step"/g)||[]).length, 1);
    assert.doesNotMatch(render(status), /\d+%/);
  }
});
test('Farmwise decision dialogs expose labeled messages and one OK action', () => {
  for (const message of [APPROVED_APPLICATION_MESSAGE, REJECTED_APPLICATION_MESSAGE]) {
    const html = renderToStaticMarkup(createElement(ApprovalDecisionDialog, { message, onConfirm: () => {} }));
    assert.match(html, /<dialog/);
    assert.match(html, /aria-labelledby="approval-dialog-title"/);
    assert.match(html, /aria-describedby="approval-dialog-message"/);
    assert.match(html, /FARMWISE/);
    assert.match(html, />OK<\/button>/);
    assert.equal((html.match(/<button/g)||[]).length, 1);
  }
});
