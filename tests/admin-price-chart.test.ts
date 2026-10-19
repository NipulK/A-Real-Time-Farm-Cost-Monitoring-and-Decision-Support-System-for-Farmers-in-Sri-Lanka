import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Chart from '../app/admin-price-chart';
const row=(extra:Record<string,any>={})=>({id:'one',product:'Carrots',canonicalProduct:'Carrot',originalLabel:'Original carrots',claimedMarket:'Test market',marketIdentity:'claimed',date:'2026-10-01',lower:100,upper:120,...extra});
const render=(rows:any[])=>renderToStaticMarkup(createElement(Chart,{rows}));
test('admin chart keeps unsafe source prices out of lines and presents keyboard-readable original ranges',()=>{
 const html=render([row(),row({id:'two',date:'2026-10-02',lower:140,upper:160}),row({id:'bad',lower:999,upper:5}),row({id:'uncertain',marketIdentity:'uncertain'})]);
 assert.equal((html.match(/<circle /g)||[]).length,2);
 assert.equal((html.match(/<polyline /g)||[]).length,1);
 assert(html.includes('original range 100 to 120'));assert(html.includes('tabindex="0"'));assert(html.includes('Historical · unverified'));assert(!html.includes('NaN'));
});
test('single observation is a point and absent or excluded histories explain unavailable chart',()=>{
 assert(!render([row()]).includes('<polyline'));
 assert(render([row()]).includes('Only one usable price observation'));
 const empty=render([]);assert(!empty.includes('<svg'));assert(empty.includes('No historical price records'));
 const excluded=render([row({lower:null})]);assert(!excluded.includes('<svg'));assert(excluded.includes('Records exist, but their prices are missing'));
});
test('chart starts with an available product even when the import has no carrot records',()=>{
 const html=render([row({product:'Guava',canonicalProduct:'Guava'})]);assert(html.includes('Historical price variation for Guava'));assert(html.includes('<circle'));
});
