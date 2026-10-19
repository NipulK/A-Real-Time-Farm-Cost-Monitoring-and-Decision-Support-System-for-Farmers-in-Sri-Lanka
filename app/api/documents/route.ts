import { readFileSync } from "node:fs";
import { requireUser, fail } from "@/lib/auth";
import { hydrateUser } from "@/lib/access";
import { one } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = hydrateUser(await requireUser()),
      id = new URL(request.url).searchParams.get("id") || "",
      d = one("SELECT * FROM documents WHERE id=?", id);
    if (!d) throw new Error("404: Document not found.");
    if (
      user.role !== "admin" &&
      (!["independent", "organization_owner"].includes(user.account_type) ||
        d.owner_id !== user.id)
    )
      throw new Error("403: This document does not belong to you.");
    const inline =
      new URL(request.url).searchParams.get("view") === "1" &&
      d.mime.startsWith("image/");
    return new Response(readFileSync(d.path), {
      headers: {
        "Content-Type": d.mime,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${d.purpose}-${d.id}.${d.mime === "application/pdf" ? "pdf" : d.mime === "image/png" ? "png" : "jpg"}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
