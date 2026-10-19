import { checkOrigin, fail, requireUser } from "@/lib/auth";
import { hydrateUser } from "@/lib/access";
import { limitedBody } from "@/lib/http";
import { one, run, transaction } from "@/lib/db";
import { createLand, landSchema, event } from "@/lib/registration";
import { checkedFile, storeDocument, removeCreated } from "@/lib/documents";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const paths: string[] = [];
  try {
    checkOrigin(request);
    const user = hydrateUser(await requireUser());
    if (
      !["independent", "organization_owner", "admin"].includes(
        user.account_type,
      )
    )
      throw new Error("403: Only land owners can manage land records.");
    const raw = await limitedBody(request, 5300000),
      form = await new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": request.headers.get("content-type") || "" },
        body: raw,
      }).formData();
    let input;
    try {
      input = JSON.parse(String(form.get("data") || "{}"));
    } catch {
      throw new Error("400: Invalid land details.");
    }
    const id = String(form.get("id") || ""),
      action = String(form.get("action") || "create");
    const old = id ? one("SELECT * FROM lands WHERE id=?", id) : null;
    if (id && (!old || (user.role !== "admin" && old.owner_id !== user.id)))
      throw new Error("403: This land does not belong to you.");
    if (action === "verification") {
      if (!user.organization_id || user.account_type !== "organization_owner")
        throw new Error("403: Organization owner access required.");
      const file = await checkedFile(form.get("file"), true);
      transaction(() => {
        storeDocument(
          file!,
          user.id,
          user.organization_id,
          null,
          "verification",
          paths,
        );
        event(
          user.id,
          "upload organization verification",
          user.organization_id,
          { name: file!.name },
        );
      });
      return Response.json({ ok: true });
    }
    if (!["create", "edit"].includes(action))
      throw new Error("400: Unknown land action.");
    const p = landSchema.safeParse(input);
    if (!p.success)
      throw new Error(
        "400: " +
          p.error.issues
            .map((i) => i.path.join(" ") + ": " + i.message)
            .join("; "),
      );
    const file = await checkedFile(form.get("sketch"), !old);
    const result = transaction(() => {
      let landId = id;
      if (action === "edit") {
        if (!old) throw new Error("404: Land not found.");
        const acres =
          p.data.area *
          (p.data.unit === "hectares"
            ? 2.4710538147
            : p.data.unit === "perches"
              ? 1 / 160
              : 1);
        const link = one("SELECT farm_id FROM farm_lands WHERE land_id=?", id);
        if (link) {
          const used = one(
            "SELECT COALESCE(SUM(acres),0) n FROM fields WHERE farm_id=?",
            link.farm_id,
          )!.n;
          if (acres + 1e-7 < used)
            throw new Error(
              "409: Land area cannot be smaller than its registered fields. Adjust field areas first.",
            );
          run(
            "UPDATE farms SET name=?,district=? WHERE id=?",
            p.data.name,
            p.data.district,
            link.farm_id,
          );
          run(
            "UPDATE cultivations SET validated=0 WHERE field_id IN (SELECT id FROM fields WHERE farm_id=?)",
            link.farm_id,
          );
        }
        run(
          "UPDATE lands SET name=?,district=?,village=?,location=?,area=?,unit=?,acres=? WHERE id=?",
          p.data.name,
          p.data.district,
          p.data.village,
          p.data.location,
          p.data.area,
          p.data.unit,
          acres,
          id,
        );
        event(user.id, "edit land", id, p.data, old);
      } else {
        if (id)
          throw new Error("400: New land must not specify an existing ID.");
        landId = createLand(user.id, user.organization_id, input);
      }
      if (file)
        storeDocument(
          file,
          old?.owner_id || user.id,
          old?.organization_id || user.organization_id,
          landId,
          "sketch",
          paths,
        );
      return landId;
    });
    return Response.json({ ok: true, id: result });
  } catch (e) {
    removeCreated(paths);
    return fail(e);
  }
}
