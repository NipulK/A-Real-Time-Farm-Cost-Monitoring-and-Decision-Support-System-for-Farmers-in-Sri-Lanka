import { requireUser, fail } from "@/lib/auth";
import { snapshot } from "@/lib/service";
import { csv } from "@/lib/domain";
export async function GET(request: Request) {
  try {
    const data = snapshot(await requireUser());
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") || "ledger",
      cid = params.get("cultivation");
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
        area_acres: c.acres,
        budget_LKR: c.budget / 100,
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
    return new Response(csv(rows), {
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
