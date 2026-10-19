import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Workspace from "../app/workspace";
import { LanguageProvider } from "../app/language";
import { totals } from "../lib/domain";
function render(harvest: boolean, closed = false, sinhala = false) {
  const entries: any[] = [{id:'cost',kind:'expense',date:'2026-10-01',cultivation_id:'season',payload:{description:'Seeds entry',category:'Seeds',basis:'cash',amount:100000}}];
  if (harvest) entries.push({id:'harvest',kind:'harvest',date:'2026-10-02',cultivation_id:'season',payload:{description:'Actual harvest',total:12,saleable:10,loss:2}});
  const summary=totals(entries);
  const initial={user:{id:'farmer',name:'Test Farmer',email:'test@example.test',role:'farmer',account_type:'independent'},cultivations:[{id:'season',name:'Carrot season',owner_id:'farmer',crop:'Carrot',crop_id:'carrot',field:'North',farm:'Test farm',status:closed?'closed':'active',acres:1,budget:200000,forecast_kg:100,summary}],entries,farms:[],fields:[],crops:[],users:[],audit:[],benchmarks:[],saleBenchmarks:[],receipts:[],expenseFarmers:[]};
  const historical=[{id:'price',canonicalProduct:'Carrot',product:'Carrots',originalLabel:'Original carrots',claimedMarket:'Test market',market:'Test market',marketIdentity:'claimed',date:'2026-10-01',lower:100,upper:100,state:'unverified',source:'test.xlsx',sheet:'Sheet1',cells:'A1:B1'}];
  return renderToStaticMarkup(createElement(LanguageProvider,{enabled:true,initial:sinhala?'si':'en',children:createElement(Workspace,{initial,setup:false,historical})}));
}
test("before harvest the farmer sees the correct crop history and no actual unit cost", () => {
  const html=render(false);
  assert(html.includes('Previous prices for your crop'));
  assert(html.includes('Original carrots'));
  assert(html.includes('Only one usable price observation'));
  assert(html.includes('<circle'));
  assert(!html.includes('Cost per kg so far'));
  assert(!html.includes('Final cost per kg'));
  assert(!html.includes('NaN'));
});
test("actual unit cost appears after saleable harvest and final label needs closure", () => {
  assert(render(true).includes('Cost per kg so far'));
  assert(!render(true).includes('Final cost per kg'));
  assert(render(true,true).includes('Final cost per kg'));
  assert(!render(false,true).includes('Final cost per kg'));
});
test("new history and unit-cost copy also renders in Sinhala", () => {
  const before=render(false,false,true), after=render(true,false,true);
  assert(before.includes('ඔබේ බෝගයේ පෙර මිල ගණන්'));
  assert(!before.includes('මෙතෙක් කිලෝවකට වියදම'));
  assert(after.includes('මෙතෙක් කිලෝවකට වියදම'));
  assert(before.includes('Original carrots'));
});
