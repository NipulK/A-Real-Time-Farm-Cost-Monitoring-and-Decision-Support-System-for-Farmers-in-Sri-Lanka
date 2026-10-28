"use client";
import { evaluateKys, KYS_LABELS, KYS_MISSING_LABELS } from "../lib/kys";
import type { Entry } from "../lib/domain";
import { useLanguage } from "./language";
type ScopedEntry = Entry & { cultivation_id: string };
const money = (amount: number) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(amount / 100);
export function KysStatusPanel({ cultivations, entries }: {
  cultivations: { id: string; name: string; status: string }[];
  entries: ScopedEntry[];
}) {
  const { t } = useLanguage();
  return <section className="panel kys-panel" aria-label={t("Know Your Status (KYS)")}>
    <h2>{t("Know Your Status (KYS)")}</h2>
    <p className="helper">{t("Actual recorded sales minus cash and imputed expenses. Funding, payments and forecasts do not determine this status.")}</p>
    {!cultivations.length && <p className="notice">{t("Insufficient information")} · {t("Start a cultivation to record its costs, harvest and sales.")}</p>}
    {cultivations.map(cultivation => {
      const result = evaluateKys(entries.filter(entry => entry.cultivation_id === cultivation.id));
      return <article key={cultivation.id} className={`kys-result kys-${result.status}`} data-kys-status={result.status}>
        <div className="kys-heading"><h3>{cultivation.name}</h3><strong className="kys-label">{t(KYS_LABELS[result.status])}</strong></div>
        <p className="helper">{t(cultivation.status === "closed" ? "Closed cultivation · based on recorded data only." : "Provisional · cultivation is still open; this is the result so far.")}</p>
        {result.missing.length ? <ul>{result.missing.map(missing => <li key={missing}>{t(KYS_MISSING_LABELS[missing])}</li>)}</ul>
          : <>
            <p>{t(result.status === "profit" ? "Recorded sales revenue exceeds recorded economic cost." : result.status === "loss" ? "Recorded sales revenue is below recorded economic cost." : "Recorded sales revenue equals recorded economic cost.")}</p>
            <div className="kys-values"><span>{t("Sales revenue")}<strong>{money(result.revenue)}</strong></span><span>{t("Total economic cost")}<strong>{money(result.cost)}</strong></span><span>{t("Economic profit / loss")}<strong>{money(result.financialResult!)}</strong></span></div>
            <p className="helper">{t("Saleable harvest")}: {new Intl.NumberFormat("en-LK", { maximumFractionDigits: 3 }).format(result.saleable)} {t("kg")} · {t(cultivation.status === "closed" ? "Final cost per kg" : "Cost per kg so far")}: {money(result.costPerKg!)}</p>
          </>}
        <p className="helper">{t("This reflects entered records, not guaranteed profitability or a prediction of future prices.")}</p>
      </article>;
    })}
  </section>;
}
