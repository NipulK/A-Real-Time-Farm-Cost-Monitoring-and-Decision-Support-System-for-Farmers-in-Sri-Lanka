import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {TeamOverview,FarmerExpenseOverview} from '../app/role-dashboards';
import {RestrictedPortal} from '../app/registration-ui';
const noop=()=>{};
function team(user:any,cs:any[]=[],extra:any={}) {return renderToStaticMarkup(createElement(TeamOverview,{data:{user,...extra},cultivations:cs,onPeople:noop,onCultivations:noop,onExpense:noop}));}
test('role overview keeps team management exclusive to organization owners',()=>{
 const owner=team({role:'grower',account_type:'organization_owner',name:'Owner'});
 assert(owner.includes('Manage farmers &amp; supervisors'));assert(!owner.includes('Record farmer expense'));
 const supervisor=team({role:'supervisor',name:'Supervisor'},[{id:'assigned',status:'active'}]);
 assert(supervisor.includes('Record farmer expense'));assert(supervisor.includes('View assigned cultivations'));assert(!supervisor.includes('Manage farmers'));
 assert.equal(team({role:'farmer',account_type:'independent'}),'');
 assert(team({role:'supervisor',name:'Unassigned'}).includes('disabled=""'));
});
test('supervisor summary counts only selected assigned cultivations and nonvoided expenses',()=>{
 const html=team({role:'supervisor',name:'Supervisor'},[{id:'assigned',status:'active'}],{farmerAssignments:[{cultivation_id:'assigned',farmer_id:'A'},{cultivation_id:'other',farmer_id:'B'}],entries:[{kind:'expense',cultivation_id:'assigned',voided:0},{kind:'expense',cultivation_id:'assigned',voided:1},{kind:'expense',cultivation_id:'other',voided:0}]});
 assert(html.includes('Assigned farmers in view</span><strong>1</strong>'));assert(html.includes('Current expense records in view</span><strong>1</strong>'));
});
test('organization farmer breakdown excludes voids and portal provides no writing controls',()=>{
 const user={role:'farmer',account_type:'organization_farmer',name:'Test farmer',public_id:'FR-test',organization_name:'Organization',organization_status:'approved'};
 const expenses=[{id:'one',cultivation_id:'one',date:'2026-10-01',payload:{category:'Seeds',amount:15000,basis:'cash',description:'Seeds'},recorded_by:'Supervisor'},{id:'void',cultivation_id:'one',voided:1,date:'2026-10-01',payload:{category:'Voided category',amount:900000,basis:'cash',description:'Old expense'}}];
 const chart=renderToStaticMarkup(createElement(FarmerExpenseOverview,{user,expenses}));assert(!chart.includes('Voided category'));assert(chart.includes('150.00'));assert(!chart.includes('9,000'));
 const html=renderToStaticMarkup(createElement(RestrictedPortal,{initial:{user,entries:expenses,receipts:[]}}));
 assert(html.includes('Search my expenses'));assert(html.includes('Refresh expenses'));assert(html.includes('Download my expenses'));assert(!html.includes('Add expense'));assert(!html.includes('Manage farmers'));assert(!html.includes('Sales revenue'));
 const pending=renderToStaticMarkup(createElement(RestrictedPortal,{initial:{user:{...user,organization_status:'pending'},entries:[],receipts:[]}}));assert(!pending.includes('Expense breakdown'));assert(!pending.includes('Download my expenses'));
});
