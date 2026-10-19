import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Overview from '../app/independent-overview';
import {LanguageProvider} from '../app/language';
const noop=()=>{};
function render(language:'en'|'si',active=true,type='independent'){
 const child=createElement(Overview,{data:{user:{name:'Farmer දිනුක',account_type:type},lands:[{},{}],entries:[{kind:'expense',cultivation_id:'selected'},{kind:'expense',cultivation_id:'selected',voided:1},{kind:'expense',cultivation_id:'other'}]},cultivations:[{id:'selected',status:active?'active':'closed'}],onExpense:noop,onLands:noop,onCultivations:noop});
 return renderToStaticMarkup(createElement(LanguageProvider,{enabled:true,initial:language,children:child}));
}
test('independent overview translates new controls while preserving farmer identity and scoped counts',()=>{
 const en=render('en'),si=render('si');
 assert(en.includes('Record an expense'));assert(en.includes('My registered lands</span><strong>2</strong>'));assert(en.includes('Current expense records in view</span><strong>1</strong>'));
 assert(si.includes('වියදමක් සටහන් කරන්න'));assert(si.includes('මගේ වගාවන් බලන්න'));assert(si.includes('මගේ ඉඩම් කළමනාකරණය'));assert(si.includes('Farmer දිනුක'));assert(!si.includes('Keep your lands, daily work'));assert(!si.includes('MY FARM WORKSPACE'));
});
test('expense shortcut needs an active cultivation and the independent overview excludes organization roles',()=>{
 assert(render('en',false).includes('disabled=""'));assert.equal(render('en',true,'organization_farmer'),'');assert.equal(render('en',true,'organization_owner'),'');assert(!render('en').includes('Manage farmers'));
});
