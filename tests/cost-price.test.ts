import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { costPriceAnalysis } from "../lib/cost-price";
import { CostPriceAnalysis } from "../app/cost-price-analysis";
import { LanguageProvider } from "../app/language";
import type { Entry } from "../lib/domain";
const entry = (id: string, kind: string, payload: Record<string, any>): Entry => ({id,kind,date:"2026-10-01",payload});
const expenses = [entry("cash","expense",{category:"Seeds",basis:"cash",amount:800000}),entry("labour","expense",{category:"Labour",basis:"imputed",amount:200000})];
const harvest = entry("harvest","harvest",{total:110,saleable:100,loss:10});
const sale = (id: string,kg: number,price: number) => entry(id,"sale",{kg,price});
for (const [price,gap] of [[12000,2000],[8000,-2000],[10000,0]]) test(`cost-price comparison at ${price} cents/kg`,()=>{
 const a=costPriceAnalysis([...expenses,harvest,sale("sale",100,price)]);
 assert.equal(a.costPerKg,10000);assert.equal(a.averageSellingPrice,price);assert.equal(a.gapPerKg,gap);assert.equal(a.partialSales,false);
 assert.deepEqual(a.categories.map(c=>[c.category,c.total,c.sharePercent,c.costPerKg]),[["Seeds",800000,80,8000],["Labour",200000,20,2000]]);
 assert.equal(a.totalHarvest,110);assert.equal(a.harvestLossPercent,10/110*100);
});
test("weighted prices reflect quantities, partial sales do not imply whole-season profit",()=>{
 const a=costPriceAnalysis([...expenses,harvest,sale("one",10,20000),sale("two",30,10000)]);
 assert.equal(a.averageSellingPrice,12500);assert.equal(a.gapPerKg,2500);assert.equal(a.stock,60);assert.equal(a.profit,-500000);assert.equal(a.partialSales,true);
});
test("missing expenses, output or sales withhold the relevant unit values",()=>{
 const blank=costPriceAnalysis([]);assert.equal(blank.costPerKg,null);assert.equal(blank.gapPerKg,null);assert.equal(blank.averageSellingPrice,null);
 assert.equal(costPriceAnalysis([harvest,sale("s",100,12000)]).gapPerKg,null);
 assert.equal(costPriceAnalysis([...expenses]).costPerKg,null);
 assert.equal(costPriceAnalysis([...expenses,harvest]).averageSellingPrice,null);
 assert.equal(costPriceAnalysis([...expenses,entry("h","harvest",{saleable:0,loss:10})]).categories[0].costPerKg,null);
 const zero=costPriceAnalysis([entry("zero","expense",{basis:"cash",category:"Seeds",amount:0}),harvest,sale("s",100,12000)]);assert.equal(zero.costPerKg,0);assert.equal(zero.categories[0].sharePercent,null);
});
test("voids, funding, payments and activities cannot distort the comparison",()=>{
 const a=costPriceAnalysis([...expenses,harvest,{...sale("old",100,50000),voided:1},sale("new",100,12000),{...entry("oldcost","expense",{category:"Seeds",basis:"cash",amount:900000}),voided:1},entry("i","investment",{amount:90000000}),entry("p","payment",{amount:100000}),entry("act","activity",{amount:10000000})]);
 assert.equal(a.cost,1000000);assert.equal(a.averageSellingPrice,12000);assert.equal(a.gapPerKg,2000);assert.equal(a.categories.length,2);
});
test("category contributions combine cash and imputed amounts and retain unknown categories",()=>{
 const a=costPriceAnalysis([...expenses,entry("extra","expense",{category:"Seeds",basis:"imputed",amount:100000}),entry("other","expense",{category:"Special cost",basis:"cash",amount:100000}),harvest]);
 assert.equal(a.categories[0].cash,800000);assert.equal(a.categories[0].imputed,100000);assert(a.categories.some(c=>c.category==="Special cost"));assert.equal(a.categories.reduce((s,c)=>s+c.total,0),a.cost);
});
test("fractional quantities retain calculation precision before presentation rounding",()=>{
 const a=costPriceAnalysis([entry("e","expense",{category:"Seeds",basis:"cash",amount:100}),entry("h","harvest",{saleable:3,loss:0}),sale("s",0.3,101)]);
 assert.equal(a.revenue,30);assert.equal(a.averageSellingPrice,100);assert.equal(a.costPerKg,100/3);assert.equal(a.gapPerKg,100-100/3);
});
test("rendering scopes same-name cultivations and translates English/Sinhala without changing records",()=>{
 const cultivations=[{id:"a",name:"Record name",status:"active"},{id:"b",name:"Record name",status:"closed"}];
 const entries=[...expenses,harvest,sale("s",40,12000)].map(e=>({...e,cultivation_id:"a"}));
 const render=(language:"en"|"si")=>renderToStaticMarkup(createElement(LanguageProvider,{enabled:true,initial:language,children:createElement(CostPriceAnalysis,{cultivations,entries})}));
 const en=render("en");assert.equal((en.match(/data-cost-price-id=/g)||[]).length,2);assert(en.includes("Only part of the saleable harvest"));assert(en.includes("Not available"));assert(en.includes("80"));assert(!en.includes("NaN"));assert(!en.includes("Infinity"));
 const si=render("si");assert(si.includes("පිරිවැය සහ විකුණුම් මිල සැසඳීම"));assert(si.includes("වියදම් දායකත්වය"));assert(si.includes("Record name"));assert(!si.includes("Weighted average agreed selling price per kg"));
});

test("remaining-stock cost recovery uses agreed revenue, not payment or funding",()=>{
 const a=costPriceAnalysis([...expenses,harvest,sale("s",40,12500),entry("fund","investment",{amount:10000000}),entry("pay","payment",{amount:0})]);
 assert.equal(a.revenueNeededToRecoverCost,500000);assert.equal(a.requiredPriceOnRemainingStock,8334);
 assert.equal(a.requiredPriceOnRemainingStock!*a.stock>=a.revenueNeededToRecoverCost!,true);
});
test("cost recovery handles unsold, fully sold, covered costs and missing records",()=>{
 const beforeSales=costPriceAnalysis([...expenses,harvest]);assert.equal(beforeSales.requiredPriceOnRemainingStock,10000);
 const covered=costPriceAnalysis([...expenses,harvest,sale("s",80,15000)]);assert.equal(covered.revenueNeededToRecoverCost,0);assert.equal(covered.requiredPriceOnRemainingStock,0);
 const loss=costPriceAnalysis([...expenses,harvest,sale("s",100,8000)]);assert.equal(loss.revenueNeededToRecoverCost,200000);assert.equal(loss.requiredPriceOnRemainingStock,null);
 assert.equal(costPriceAnalysis([]).revenueNeededToRecoverCost,null);assert.equal(costPriceAnalysis([harvest]).requiredPriceOnRemainingStock,null);
});
