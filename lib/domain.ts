export type Entry = {
  id: string;
  kind: string;
  date: string;
  payload: Record<string, any>;
  voided?: number;
};
export function totals(entries: Entry[]) {
  const live = entries.filter((e) => !e.voided);
  const sum = (kind: string, f: (p: Record<string, any>) => number) =>
    live.filter((e) => e.kind === kind).reduce((a, e) => a + f(e.payload), 0);
  const cash = sum("expense", (p) => (p.basis === "cash" ? p.amount : 0)),
    imputed = sum("expense", (p) => (p.basis === "imputed" ? p.amount : 0)),
    funding = sum("investment", (p) => p.amount),
    revenue = sum("sale", (p) => Math.round(p.kg * p.price)),
    payments = sum("payment", (p) => p.amount),
    saleable = sum("harvest", (p) => p.saleable),
    loss = sum("harvest", (p) => p.loss),
    sold = sum("sale", (p) => p.kg);
  return {
    cash,
    imputed,
    cost: cash + imputed,
    funding,
    revenue,
    payments,
    receivable: revenue - payments,
    profit: revenue - cash - imputed,
    cashPosition: funding + payments - cash,
    saleable,
    loss,
    sold,
    stock: saleable - sold,
    costPerKg: saleable > 0 ? (cash + imputed) / saleable : null,
  };
}
export function median(values: number[]) {
  if (!values.length) return null;
  const a = [...values].sort((a, b) => a - b),
    m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
export function scenario(
  cost: number,
  remaining: number,
  yieldKg: number,
  price: number,
) {
  return {
    revenue: Math.round(yieldKg * price),
    profit: Math.round(yieldKg * price) - cost - remaining,
    breakEven: yieldKg > 0 ? (cost + remaining) / yieldKg : null,
  };
}
export function eligibleBenchmark(rows: Record<string, any>[]) {
  const valid = rows.filter(
    (r) => r.status === "closed" && r.validated && r.approved && r.saleable > 0,
  );
  return {
    count: valid.length,
    owners: new Set(valid.map((r) => r.owner_id)).size,
    value:
      valid.length >= 3 && new Set(valid.map((r) => r.owner_id)).size >= 3
        ? median(valid.map((r) => r.cost / r.saleable))
        : null,
  };
}
export function priceEligible(p: Record<string, any>) {
  return (
    p.lower !== null &&
    p.upper !== null &&
    p.lower <= p.upper &&
    p.marketIdentity === "claimed"
  );
}
export function csv(rows: Record<string, any>[], columns?: string[]) {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: any) => {
    const s =
      v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return (
      '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
    );
  };
  return (
    "\ufeff" +
    [
      cols.map(cell).join(","),
      ...rows.map((r) => cols.map((c) => cell(r[c])).join(",")),
    ].join("\r\n")
  );
}
