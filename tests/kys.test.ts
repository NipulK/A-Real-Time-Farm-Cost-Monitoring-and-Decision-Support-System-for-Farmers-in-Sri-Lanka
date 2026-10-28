import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluateKys } from "../lib/kys";
import type { Entry } from "../lib/domain";
import { KysStatusPanel } from "../app/kys-status";
import { LanguageProvider } from "../app/language";
const expense: Entry = { id: "cost", kind: "expense", date: "2026-10-01", payload: { amount: 800000, basis: "cash" } };
const imputed: Entry = { id: "imputed", kind: "expense", date: "2026-10-01", payload: { amount: 200000, basis: "imputed" } };
const harvest: Entry = { id: "harvest", kind: "harvest", date: "2026-10-02", payload: { total: 110, saleable: 100, loss: 10 } };
const sale = (price: number): Entry => ({ id: "sale", kind: "sale", date: "2026-10-03", payload: { kg: 100, price } });
for (const [name, price, difference] of [["profit",12000,200000],["loss",8000,-200000],["break_even",10000,0]] as const) {
  test(`KYS ${name}: expenses plus imputed cost, actual saleable harvest and sales`, () => {
    const result = evaluateKys([expense, imputed, harvest, sale(price)]);
    assert.equal(result.status, name); assert.equal(result.financialResult, difference);
    assert.equal(result.costPerKg, 10000); assert.deepEqual(result.missing, []);
  });
}
test("empty and incomplete records never become break-even or premature profit/loss", () => {
  assert.deepEqual(evaluateKys([]).missing, ["expenses", "saleable_harvest", "sales"]);
  for (const [records, missing] of [
    [[expense], ["saleable_harvest", "sales"]],
    [[expense, harvest], ["sales"]],
    [[harvest, sale(12000)], ["expenses"]],
    [[expense, { ...harvest, payload: { total: 110, saleable: 0, loss: 110 } }], ["saleable_harvest", "sales"]],
  ] as [Entry[], string[]][]) {
    const result = evaluateKys(records); assert.equal(result.status, "insufficient_information");
    assert.equal(result.financialResult, null); assert.deepEqual(result.missing, missing);
  }
});
test("funding, payment, activity and forecast values cannot create KYS profit or complete missing sales", () => {
  const unrelated: Entry[] = [{ id: "fund", kind: "investment", date: "2026-10-01", payload: { amount: 50000000 } }, { id: "payment", kind: "payment", date: "2026-10-01", payload: { amount: 10000000 } }, { id: "activity", kind: "activity", date: "2026-10-01", payload: { amount: 10000000, forecast_kg: 100000 } }];
  assert.equal(evaluateKys([expense, imputed, harvest, sale(8000), ...unrelated]).status, "loss");
  assert.equal(evaluateKys([expense, harvest, ...unrelated]).status, "insufficient_information");
});
test("voided expenses and sales no longer establish completeness; replacement changes classification", () => {
  assert.deepEqual(evaluateKys([{ ...expense, voided: 1 }, harvest, sale(12000)]).missing, ["expenses"]);
  assert.deepEqual(evaluateKys([expense, harvest, { ...sale(12000), voided: 1 }]).missing, ["sales"]);
  assert.equal(evaluateKys([expense, imputed, harvest, { ...sale(12000), voided: 1 }, { ...sale(8000), id: "replacement" }]).status, "loss");
});
test("break-even uses agreed sales rounded to cents, not displayed rounded kilograms or cash position", () => {
  const result = evaluateKys([{ ...expense, payload: { amount: 10001, basis: "cash" } }, { ...harvest, payload: { total: 0.003, saleable: 0.003, loss: 0 } }, { ...sale(3333667), payload: { kg: 0.003, price: 3333667 } }]);
  assert.equal(result.status, "break_even"); assert.equal(result.financialResult, 0);
  for (const [amount, expected] of [[9999, "profit"], [10001, "loss"]] as const) {
    const boundary = evaluateKys([{ ...expense, payload: { amount, basis: "cash" } }, harvest, sale(100)]);
    assert.equal(boundary.status, expected);
    assert.equal(Math.abs(boundary.financialResult!), 1);
  }
});
const render = (cultivations: any[], entries: any[], si = false) => renderToStaticMarkup(createElement(LanguageProvider, { enabled: true, initial: si ? "si" : "en", children: createElement(KysStatusPanel, { cultivations, entries }) }));
test("rendered status shows all four labels with explanations; open results remain provisional", () => {
  const names = ["Profit", "Loss", "Break-even", "Insufficient information"];
  const rows = [12000, 8000, 10000, null].map((price, index) => ({ id: String(index), name: `KYS ${names[index]}`, status: "active", records: price === null ? [] : [expense, imputed, harvest, sale(price)] }));
  const html = render(rows, rows.flatMap(row => row.records.map(record => ({ ...record, cultivation_id: row.id }))));
  for (const label of names) assert(html.includes(label));
  assert(html.includes("LKR 2,000.00")); assert(html.includes("Record cultivation expenses."));
  assert(html.includes("Provisional")); assert(!html.includes("NaN")); assert(!html.includes("Infinity"));
});
test("complete and incomplete cultivations stay separate, even with identical names", () => {
  const rows = [{ id: "a", name: "Same name", status: "active" }, { id: "b", name: "Same name", status: "active" }];
  const html = render(rows, [expense, imputed, harvest, sale(12000)].map(e => ({ ...e, cultivation_id: "a" })));
  assert.equal((html.match(/data-kys-status="profit"/g)||[]).length, 1);
  assert.equal((html.match(/data-kys-status="insufficient_information"/g)||[]).length, 1);
});
test("closed status and Sinhala copy preserve user names and actual financial evidence", () => {
  const html = render([{ id: "a", name: "Original farmer record", status: "closed" }], [expense, harvest, sale(12000)].map(e => ({ ...e, cultivation_id: "a" })), true);
  assert(html.includes("Original farmer record")); assert(html.includes("ලාභය"));
  assert(html.includes("අවසන් කළ වගාව")); assert(!html.includes("Provisional"));
});
