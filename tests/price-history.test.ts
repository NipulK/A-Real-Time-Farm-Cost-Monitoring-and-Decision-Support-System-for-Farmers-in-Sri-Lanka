import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultHistoricalProduct, historySelection, matchesCrop, priceChartGeometry, historicalProductOptions } from "../lib/price-history";
import { totals } from "../lib/domain";
const prices = JSON.parse(readFileSync(new URL('../data/prices.json', import.meta.url), 'utf8'));
const point = (extra: Record<string, any> = {}) => ({id:'one',product:'Carrot',canonicalProduct:'Carrot',originalLabel:'Carrot',claimedMarket:'Dambulla',marketIdentity:'claimed',date:'2026-10-01',lower:100,upper:100,...extra});
test("unit cost needs positive saleable harvest and follows corrections", () => {
  const expense = {id:'e',kind:'expense',date:'2026-10-01',payload:{basis:'cash',amount:100000}};
  const harvest = {id:'h',kind:'harvest',date:'2026-10-01',payload:{total:12,saleable:10,loss:2}};
  assert.equal(totals([expense]).costPerKg,null);
  assert.equal(totals([expense,harvest]).costPerKg,10000);
  assert.equal(totals([expense,{...harvest,voided:1}]).costPerKg,null);
  assert.equal(totals([expense,{...harvest,payload:{total:12,saleable:0,loss:12}}]).costPerKg,null);
});
test("selected crop maps source aliases to usable variants without relabelling source data", () => {
  const before = JSON.stringify(prices);
  for (const crop of ['Watermelon','Guava','Carrot','Potato','Leeks']) {
    const product=defaultHistoricalProduct(prices,crop);
    assert(historySelection(prices,product).usable.length>0,`${crop}: ${product}`);
    assert(prices.some((p: any)=>p.product===product && matchesCrop(p,crop)));
  }
  assert.equal(defaultHistoricalProduct(prices,'Grapes'),'Grapes');
  assert.equal(matchesCrop(point({product:'Sweet Potato',canonicalProduct:'Potato'}),'Potato'),false);
  assert.equal(matchesCrop(point({product:'Wild Baby Potato',canonicalProduct:'Potato'}),'Potato'),false);
  assert.equal(JSON.stringify(prices),before);
});
test("missing and excluded histories explain why a chart is unavailable", () => {
  assert.match(historySelection(prices,'Grapes').reason,/No historical price records/);
  const invalid=[point({lower:null}),point({id:'two',lower:150,upper:100}),point({id:'three',marketIdentity:'uncertain'})];
  const result=historySelection(invalid,'Carrot');
  assert.equal(result.records.length,3);
  assert.equal(result.usable.length,0);
  assert.match(result.reason,/missing, incomplete, reversed/);
  assert.equal(priceChartGeometry(invalid),null);
});
test("single observations and flat prices have visible finite chart coordinates", () => {
  const row=point();
  const chart=priceChartGeometry([row])!;
  assert.equal(chart.x(row),440);
  assert(chart.y(100)>40 && chart.y(100)<185);
  assert(chart.high>chart.low);
  assert.match(historySelection([row],'Carrot').reason,/point, not a price trend/);
  const flat=priceChartGeometry([row,point({id:'two',date:'2026-10-02'})])!;
  assert(flat.x(row)<flat.x(point({date:'2026-10-02'})));
  assert(Number.isFinite(flat.y(100)));
  const zero=priceChartGeometry([point({lower:0,upper:0})])!;
  assert(Number.isFinite(zero.y(0)));
});
test("price lines never connect different markets or original variants", () => {
  const chart=priceChartGeometry([point(),point({id:'two',claimedMarket:'Thabuththegama'}),point({id:'three',originalLabel:'Carrot imported'})])!;
  assert.equal(chart.series.length,3);
  assert(chart.series.every(s=>s.points.length===1));
});
test("every imported product/market with usable observations has a finite drawable chart", () => {
  const keys = new Set<string>(prices.map((p: any)=>JSON.stringify([p.product,p.claimedMarket])));
  for (const key of keys) {
    const [product,market]=JSON.parse(key);
    const selection=historySelection(prices,product,market);
    const chart=priceChartGeometry(selection.usable);
    assert.equal(!!chart,selection.usable.length>0,key);
    if(chart) for(const series of chart.series) for(const row of series.points) {
      assert(Number.isFinite(chart.x(row)),key);
      assert(Number.isFinite(chart.y(row.lower)),key);
      assert(Number.isFinite(chart.y(row.upper)),key);
    }
  }
});

test("a cultivation with no imported prices stays selectable after exploring another product", () => {
  const options=historicalProductOptions(prices,'Grapes','all','Gram');
  assert(options.includes('Grapes'));
  assert(options.includes('Gram'));
  assert(!historicalProductOptions(prices,'Potato','all','Gram').includes('Potato'));
});
