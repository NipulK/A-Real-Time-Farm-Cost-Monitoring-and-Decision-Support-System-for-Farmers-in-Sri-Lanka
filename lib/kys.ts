import { totals, type Entry } from "./domain";

export type KysStatus = "profit" | "loss" | "break_even" | "insufficient_information";
export type MissingKysRecord = "expenses" | "saleable_harvest" | "sales";
export const KYS_LABELS: Record<KysStatus, string> = {
  profit: "Profit", loss: "Loss", break_even: "Break-even", insufficient_information: "Insufficient information",
};
export const KYS_MISSING_LABELS: Record<MissingKysRecord, string> = {
  expenses: "Record cultivation expenses.",
  saleable_harvest: "Record a positive saleable harvest weight.",
  sales: "Record sales for this cultivation.",
};

/** Classify actual records only. A zero balance on an empty ledger is not break-even. */
export function evaluateKys(entries: Entry[]) {
  const live = entries.filter(entry => !entry.voided);
  const summary = totals(live);
  const missing: MissingKysRecord[] = [];
  if (!live.some(entry => entry.kind === "expense")) missing.push("expenses");
  if (!(summary.saleable > 0)) missing.push("saleable_harvest");
  if (!live.some(entry => entry.kind === "sale")) missing.push("sales");
  const status: KysStatus = missing.length ? "insufficient_information"
    : summary.profit > 0 ? "profit" : summary.profit < 0 ? "loss" : "break_even";
  return { status, missing, cost: summary.cost, revenue: summary.revenue,
    saleable: summary.saleable, costPerKg: summary.costPerKg,
    financialResult: missing.length ? null : summary.profit };
}
