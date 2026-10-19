import { assertOperational, canReadExpense } from "@/lib/access";
import { limitedBody } from "@/lib/http";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { checkOrigin, requireUser, fail } from "@/lib/auth";
import { storage, one, run, transaction } from "@/lib/db";
import { cultivation, audit } from "@/lib/service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id");
    const r = one(
      "SELECT r.*,e.cultivation_id FROM receipts r JOIN entries e ON e.id=r.entry_id WHERE r.id=?",
      id || "",
    );
    if (!r) throw new Error("404: Receipt not found.");
    const checked = canReadExpense(user, r.entry_id);
    if (checked.user.account_type !== "organization_farmer")
      cultivation(user, r.cultivation_id);
    return new Response(readFileSync(r.path), {
      headers: {
        "Content-Type": r.mime,
        "Content-Disposition": `attachment; filename="receipt-${r.id}.${r.mime === "application/pdf" ? "pdf" : r.mime === "image/png" ? "png" : "jpg"}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  let saved: string | undefined;
  try {
    checkOrigin(request);
    const user = assertOperational(await requireUser());
    if (user.account_type === "organization_owner")
      throw new Error(
        "403: Organization expense receipts must be entered by a supervisor.",
      );
    const raw = await limitedBody(request, 5300000);
    const form = await new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": request.headers.get("content-type") || "" },
        body: raw,
      }).formData(),
      file = form.get("file"),
      entry = String(form.get("entry_id") || "");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !file.size)
      throw new Error("400: Choose a PDF, JPEG or PNG up to 5 MB.");
    const e = one(
      "SELECT * FROM entries WHERE id=? AND kind='expense' AND voided=0",
      entry,
    );
    if (!e) throw new Error("404: Active expense not found.");
    const c = cultivation(user, e.cultivation_id);
    if (c.status === "closed")
      throw new Error("409: Reopen the cultivation to attach a receipt.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime =
      bytes.subarray(0, 5).toString() === "%PDF-"
        ? "application/pdf"
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? "image/jpeg"
            : "";
    if (!mime) throw new Error("400: File content must be PDF, PNG or JPEG.");
    mkdirSync(path.join(storage, "receipts"), { recursive: true });
    const id = randomUUID();
    saved = path.join(storage, "receipts", id);
    writeFileSync(saved, bytes, { mode: 0o600 });
    transaction(() => {
      run(
        "INSERT INTO receipts VALUES(?,?,?,?,?,?,?)",
        id,
        entry,
        file.name.slice(0, 200),
        mime,
        file.size,
        saved!,
        user.id,
      );
      audit(user, "attach receipt", id, e.cultivation_id, null, {
        name: file.name,
        entry_id: entry,
      });
    });
    return Response.json({ ok: true, id });
  } catch (e) {
    if (saved)
      try {
        unlinkSync(saved);
      } catch {}
    return fail(e);
  }
}
