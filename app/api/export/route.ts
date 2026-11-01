import { costPriceAnalysis } from "@/lib/cost-price";
import { requireUser, fail } from "@/lib/auth";
import { snapshot } from "@/lib/service";
import { csv } from "@/lib/domain";
export async function GET(request: Request) {
  try {
    const data = snapshot(await requireUser());
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") || "ledger",
      cid = params.get("cultivation");
    if (!["summary", "ledger", "audit", "cost-breakdown"].includes(kind))
      throw new Error("400: Choose summary, ledger, audit or cost-breakdown export.");
    if (data.restricted) {
      if (
        data.user.account_type !== "organization_farmer" ||
        data.user.organization_status !== "approved" ||
        kind !== "ledger"
      )
        throw new Error("403: Only your own expense ledger is available.");
      const rows = data.entries.map((e: Record<string, any>) => ({
        expense_id: e.id,
        date: e.date,
        cultivation: e.cultivation_name,
        description: e.payload.description,
        category: e.payload.category,
        basis: e.payload.basis,
        amount_LKR: e.payload.amount / 100,
        voided: !!e.voided,
        recorded_by: e.recorded_by,
      }));
      return new Response(csv(rows, [
        "expense_id", "date", "cultivation", "description", "category",
        "basis", "amount_LKR", "voided", "recorded_by",
      ]), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="my-expenses.csv"',
          "Cache-Control": "no-store",
        },
      });
    }
    const cs: Record<string, any>[] = data.cultivations.filter(
      (c: Record<string, any>) => !cid || c.id === cid,
    );
    const ids = new Set(cs.map((c) => c.id));
    let rows: Record<string, any>[] = [];
    if (kind === "summary")
      rows = cs.map((c) => ({
        cultivation: c.name,
        crop: c.crop,
        district: c.district,
        status: c.status,
        kys_status: c.kys.status,
        kys_missing_records: c.kys.missing.join("; "),
        area_acres: c.acres,
        budget_LKR: c.budget / 100,
        ...(() => {
          const a = costPriceAnalysis(data.entries.filter((e: Record<string, any>) => e.cultivation_id === c.id));
          return {
            weighted_average_agreed_selling_price_LKR_per_kg: a.averageSellingPrice === null ? null : a.averageSellingPrice / 100,
            production_cost_LKR_per_saleable_kg: a.costPerKg === null ? null : a.costPerKg / 100,
            selling_price_minus_production_cost_LKR_per_kg: a.gapPerKg === null ? null : a.gapPerKg / 100,
            additional_revenue_to_recover_cost_LKR: a.revenueNeededToRecoverCost === null ? null : a.revenueNeededToRecoverCost / 100,
            required_average_price_remaining_stock_LKR_per_kg: a.requiredPriceOnRemainingStock === null ? null : a.requiredPriceOnRemainingStock / 100,
            total_harvest_kg: a.totalHarvest,
            harvest_loss_percent: a.harvestLossPercent,
            partial_sales: a.partialSales,
            result_basis: c.status === "closed" ? "closed_recorded_data" : "provisional",
          };
        })(),
        ...Object.fromEntries(
          Object.entries(c.summary).map(([k, v]) => [
            k +
              (["saleable", "loss", "sold", "stock"].includes(k)
                ? "_kg"
                : "_LKR"),
            v === null
              ? null
              : Number(v) /
                (["saleable", "loss", "sold", "stock"].includes(k) ? 1 : 100),
          ]),
        ),
      }));
    else if (kind === "cost-breakdown")
      rows = cs.flatMap(c => costPriceAnalysis(data.entries.filter((e: Record<string, any>) => e.cultivation_id === c.id)).categories.map(row => ({
        cultivation: c.name, cultivation_id: c.id, crop: c.crop, category: row.category,
        cash_cost_LKR: row.cash / 100, imputed_cost_LKR: row.imputed / 100,
        total_cost_LKR: row.total / 100, share_of_economic_cost_percent: row.sharePercent,
        contribution_per_saleable_kg_LKR: row.costPerKg === null ? null : row.costPerKg / 100,
      })));
    else if (kind === "audit")
      rows = data.audit.filter(
        (a: Record<string, any>) => !cid || a.cultivation_id === cid,
      );
    else
      rows = data.entries
        .filter((e: Record<string, any>) => ids.has(e.cultivation_id))
        .map((e: Record<string, any>) => ({
          id: e.id,
          cultivation: cs.find((c) => c.id === e.cultivation_id)?.name,
          kind: e.kind,
          date: e.date,
          voided: !!e.voided,
          ...e.payload,
          amount:
            e.payload.amount === undefined ? undefined : e.payload.amount / 100,
          price:
            e.payload.price === undefined ? undefined : e.payload.price / 100,
          currency: "LKR",
          created_at: e.created_at,
          created_by: e.created_by,
        }));
    return new Response(csv(rows, kind === "cost-breakdown" ? ["cultivation", "cultivation_id", "crop", "category", "cash_cost_LKR", "imputed_cost_LKR", "total_cost_LKR", "share_of_economic_cost_percent", "contribution_per_saleable_kg_LKR"] : undefined), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="farmwise-${kind}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
