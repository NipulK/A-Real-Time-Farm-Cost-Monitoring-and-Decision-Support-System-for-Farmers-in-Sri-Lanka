import { totals, type Entry } from "./domain";

/** Descriptive comparison of recorded costs and agreed sales, never a market forecast. Amounts are cents. */
export function costPriceAnalysis(entries: Entry[]) {
  const live = entries.filter(e => !e.voided);
  const summary = totals(live);
  const expenses = live.filter(e => e.kind === "expense");
  const costPerKg = expenses.length && summary.saleable > 0 ? summary.costPerKg : null;
  const averageSellingPrice = summary.sold > 0 ? summary.revenue / summary.sold : null;
  const gapPerKg = costPerKg !== null && averageSellingPrice !== null ? averageSellingPrice - costPerKg : null;
  const byCategory = new Map<string, { category: string; cash: number; imputed: number }>();
  for (const e of expenses) {
    const category = String(e.payload.category || "Other");
    const row = byCategory.get(category) || { category, cash: 0, imputed: 0 };
    if (e.payload.basis === "cash") row.cash += e.payload.amount;
    if (e.payload.basis === "imputed") row.imputed += e.payload.amount;
    byCategory.set(category, row);
  }
  const categories = [...byCategory.values()].map(row => ({ ...row, total: row.cash + row.imputed,
    sharePercent: summary.cost > 0 ? (row.cash + row.imputed) / summary.cost * 100 : null,
    costPerKg: summary.saleable > 0 ? (row.cash + row.imputed) / summary.saleable : null,
  })).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
  const totalHarvest = summary.saleable + summary.loss;
  const revenueNeededToRecoverCost = expenses.length && summary.saleable > 0 ? Math.max(0, summary.cost - summary.revenue) : null;
  const requiredPriceOnRemainingStock = revenueNeededToRecoverCost !== null && summary.stock > 0
    ? Math.ceil(revenueNeededToRecoverCost / summary.stock) : null;
  return { ...summary, revenueNeededToRecoverCost, requiredPriceOnRemainingStock, costPerKg, averageSellingPrice, gapPerKg, categories,
    hasExpenses: expenses.length > 0,
    partialSales: summary.sold > 0 && summary.stock > 0,
    totalHarvest, harvestLossPercent: totalHarvest > 0 ? summary.loss / totalHarvest * 100 : null,
  };
}
