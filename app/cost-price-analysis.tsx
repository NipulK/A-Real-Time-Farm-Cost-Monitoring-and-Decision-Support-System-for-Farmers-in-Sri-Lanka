"use client";
import { costPriceAnalysis } from "../lib/cost-price";
import type { Entry } from "../lib/domain";
import { useLanguage } from "./language";

type Cultivation = { id: string; name: string; status: string };
export function CostPriceAnalysis({ cultivations, entries }: { cultivations: Cultivation[]; entries: (Entry & { cultivation_id: string })[] }) {
  const { t, language } = useLanguage();
  const number = (n: number) => new Intl.NumberFormat(language === "si" ? "si-LK" : "en-LK", { maximumFractionDigits: 2 }).format(n);
  const money = (n: number | null) => n === null ? t("Not available") : new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(n / 100);
  return <section className="panel cost-price-panel" aria-label={t("Cost and selling price comparison")}>
    <h2>{t("Cost and selling price comparison")}</h2>
    <p className="helper">{t("Actual agreed sales and recorded production costs, compared separately for each cultivation.")}</p>
    {!cultivations.length && <p>{t("Start a cultivation to record its costs, harvest and sales.")}</p>}
    {cultivations.map(c => {
      const a = costPriceAnalysis(entries.filter(e => e.cultivation_id === c.id));
      return <article key={c.id} className="cost-price-cultivation" data-cost-price-id={c.id}>
        <h3>{c.name}</h3>
        <p className="helper">{t(c.status === "closed" ? "Closed cultivation · based on recorded data only." : "Provisional · cultivation is still open; this is the result so far.")}</p>
        <div className="cost-price-metrics">
          <div><span>{t("Production cost per saleable kg")}</span><strong>{money(a.costPerKg)}</strong></div>
          <div><span>{t("Weighted average agreed selling price per kg")}</span><strong>{money(a.averageSellingPrice)}</strong></div>
          <div><span>{t("Selling price minus production cost per kg")}</span><strong>{money(a.gapPerKg)}</strong></div>
        </div>
        <p className="helper">{t("Average selling price = agreed sales revenue / quantity sold. Price difference = average selling price − total economic cost / saleable harvest. Figures are rounded for display.")}</p>
        {a.gapPerKg !== null && <p>{t(a.gapPerKg > 0 ? "Recorded average selling price is above production cost per kg." : a.gapPerKg < 0 ? "Recorded average selling price is below production cost per kg." : "Recorded average selling price equals production cost per kg.")}</p>}
        {!a.hasExpenses && <p className="notice">{t("Record cultivation expenses.")}</p>}
        {a.saleable <= 0 && <p className="notice">{t("Record a positive saleable harvest weight.")}</p>}
        {a.sold <= 0 && <p className="notice">{t("Record sales for this cultivation.")}</p>}
        {a.partialSales && <p className="notice">{t("Only part of the saleable harvest has been sold. This per-kg difference is not the whole cultivation profit; unsold harvest is not sales revenue.")}</p>}
        <h4>{t("Recovering recorded costs")}</h4>
        <div className="cost-price-metrics">
          <div><span>{t("Additional sales revenue needed to recover recorded economic cost")}</span><strong>{money(a.revenueNeededToRecoverCost)}</strong></div>
          <div><span>{t("Required average price on remaining stock (LKR/kg)")}</span><strong>{money(a.requiredPriceOnRemainingStock)}</strong></div>
        </div>
        <p className="helper">{t("Revenue needed = maximum of recorded economic cost minus agreed sales revenue and zero. Required price = revenue needed / unsold saleable stock, rounded up to the next cent. Assumes all remaining stock is sold and no further costs or losses occur; this is a calculation, not a market-price recommendation or a customer-payment forecast.")}</p>
        {a.revenueNeededToRecoverCost !== null && (a.revenueNeededToRecoverCost === 0
          ? <p>{t("Agreed sales already cover recorded economic costs. Outstanding customer payments are shown separately in reports.")}</p>
          : a.stock <= 0 && <p className="notice">{t("No unsold saleable stock remains. Recorded sales have not recovered all economic costs; no remaining-stock price can be calculated.")}</p>)}
        <h4>{t("Harvest and sales context")}</h4>
        <dl className="cost-price-context">
          {[["Total recorded harvest (kg)",number(a.totalHarvest)],["Saleable harvest (kg)",number(a.saleable)],["Harvest loss (kg)",number(a.loss)],["Harvest loss (%)",a.harvestLossPercent === null ? t("Not available") : number(a.harvestLossPercent)],["Quantity sold (kg)",number(a.sold)],["Unsold saleable stock (kg)",number(a.stock)]].map(([label,value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}
        </dl>
        <h4>{t("Expense contributions")}</h4>
        <div className="table-wrap"><table><thead><tr>{["Category","Cash cost (LKR)","Imputed cost (LKR)","Total cost (LKR)","Share of economic cost (%)","Contribution per saleable kg (LKR)"].map(label => <th key={label}>{t(label)}</th>)}</tr></thead>
          <tbody>{a.categories.map(row => <tr key={row.category}><td>{t(row.category)}</td><td>{money(row.cash)}</td><td>{money(row.imputed)}</td><td>{money(row.total)}</td><td>{row.sharePercent === null ? t("Not available") : number(row.sharePercent)}</td><td>{money(row.costPerKg)}</td></tr>)}
          {!a.categories.length && <tr><td colSpan={6}>{t("Record expenses to see how your cultivation costs are distributed.")}</td></tr>}</tbody></table></div>
        <p className="helper">{t("Expense shares describe recorded cost contributions, not proven causes of market prices. Funding, payments, forecasts and voided entries are excluded. Historical market prices remain separate.")}</p>
      </article>;
    })}
  </section>;
}
