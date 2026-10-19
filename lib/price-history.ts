import { priceEligible } from "./domain";
type Price = Record<string, any>;
/** Match imported aliases without merging the individual source variants. */
export function matchesCrop(row: Price, crop: string) {
  const name = crop.trim().toLowerCase();
  const product = String(row.product).trim().toLowerCase();
  // These are separate products despite provisional import categorisation.
  if (name === "potato" && /\b(sweet|wild)\b/.test(product)) return false;
  return product === name || String(row.canonicalProduct || "").toLowerCase() === name;
}
export function defaultHistoricalProduct(rows: Price[], crop: string, market = "all") {
  const matches = rows.filter(row => matchesCrop(row, crop) && (market === "all" || row.claimedMarket === market));
  const names = [...new Set(matches.map(row => row.product as string))];
  const score = (name: string) => matches.filter(row => row.product === name && priceEligible(row)).length;
  return names.sort((a, b) => score(b) - score(a) || Number(b === crop) - Number(a === crop) || a.localeCompare(b))[0] || crop;
}
export function historySelection(rows: Price[], product: string, market = "all") {
  const records = rows.filter(row => row.product === product && (market === "all" || row.claimedMarket === market))
    .sort((a,b) => b.date.localeCompare(a.date));
  const usable = records.filter(priceEligible).sort((a,b) => a.date.localeCompare(b.date));
  const reason = !records.length ? "No historical price records are available for this product and market. Try another market or product."
    : !usable.length ? "Records exist, but their prices are missing, incomplete, reversed or have uncertain market identity. Review the original records below; no prices have been invented."
    : usable.length === 1 ? "Only one usable price observation is available. It is shown as a point, not a price trend."
    : new Set(usable.map(row => row.date)).size === 1 ? "Only one historical date is available. These observations do not establish a price trend."
    : "";
  return { records, usable, reason };
}
/** Stable axes handle single dates, flat prices and separate market/variant series. */
export function priceChartGeometry(rows: Price[]) {
  const usable = rows.filter(row => priceEligible(row) && Number.isFinite(Date.parse(row.date)));
  if (!usable.length) return null;
  const min = Math.min(...usable.map(row => row.lower)), max = Math.max(...usable.map(row => row.upper));
  const pad = max === min ? Math.max(1, Math.abs(max) * 0.05) : (max - min) * 0.05;
  const low = Math.max(0, min - pad), high = Math.max(max + pad, low + 1);
  const first = Math.min(...usable.map(row => Date.parse(row.date))), last = Math.max(...usable.map(row => Date.parse(row.date)));
  const x = (row: Price) => last === first ? 440 : 65 + (Date.parse(row.date) - first) / (last - first) * 750;
  const y = (value: number) => 185 - (value - low) / (high - low) * 145;
  const grouped = new Map<string, Price[]>();
  for (const row of usable) {
    const key = row.claimedMarket + " · " + (row.originalLabel || row.product);
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }
  return { low, high, first, last, x, y, series: [...grouped].map(([label, points]) => ({label, points: points.sort((a,b) => a.date.localeCompare(b.date))})) };
}
/** Keep the selected cultivation's product available even when it has no imports. */
export function historicalProductOptions(rows: Price[], crop: string, market: string, choice: string) {
  return [...new Set([...rows.map(row => row.product as string), choice, defaultHistoricalProduct(rows, crop, market)])].sort();
}
