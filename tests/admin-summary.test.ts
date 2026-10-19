import test from 'node:test';
import assert from 'node:assert/strict';
import { adminSummary } from '../lib/admin-summary';
test('administrator summaries distinguish account access, application decisions and validation work',()=>{
 const result=adminSummary({users:[{account_type:'independent',active:1},{account_type:'organization_farmer',active:0},{role:'admin',active:1}],organizations:[{status:'pending'},{status:'approved'},{status:'rejected'},{status:'needs_info'}],lands:[{}],cultivations:[{status:'active',validated:0},{status:'closed',validated:0},{status:'closed',validated:1}],entries:[{voided:0},{voided:1}]});
 assert.equal(result.users,3);assert.equal(result.active,2);assert.equal(result.inactive,1);assert.equal(result.roles.independent,1);assert.equal(result.roles.organization_farmer,1);assert.equal(result.roles.admin,1);assert.deepEqual(result.statuses,{pending:1,approved:1,needs_info:1,rejected:1});assert.equal(result.awaitingValidation,1);assert.equal(result.validated,1);assert.equal(result.records,1);
});
test('empty installation shows zero real records without synthetic chart data',()=>{const s=adminSummary({});assert.equal(s.users,0);assert.equal(s.organizations,0);assert.equal(s.lands,0);assert.equal(s.awaitingValidation,0);assert.equal(Object.values(s.roles).reduce((a,b)=>a+b,0),0);});
