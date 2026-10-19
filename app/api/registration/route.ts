import { checkOrigin, fail, requireUser, startSession } from "@/lib/auth";
import { limitedBody, jsonBody } from "@/lib/http";
import { one, transaction } from "@/lib/db";
import { register, registrationAction } from "@/lib/registration";
import { checkedFile, storeDocument, removeCreated } from "@/lib/documents";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const created: string[] = [];
  try {
    checkOrigin(request);
    if (
      request.headers.get("content-type")?.startsWith("multipart/form-data")
    ) {
      if (!one("SELECT id FROM users WHERE role='admin' AND active=1"))
        throw new Error(
          "409: The administrator must finish workspace setup first.",
        );
      const raw = await limitedBody(request, 11000000);
      const form = await new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": request.headers.get("content-type")! },
        body: raw,
      }).formData();
      let data;
      try {
        data = JSON.parse(String(form.get("data") || ""));
      } catch {
        throw new Error("400: Invalid registration details.");
      }
      const sketch = await checkedFile(form.get("sketch"), true),
        verification = await checkedFile(form.get("verification"), false);
      const result = transaction(() => {
        const r = register(String(form.get("kind")), data, !!verification);
        storeDocument(
          sketch!,
          r.userId,
          r.organizationId,
          r.landId,
          "sketch",
          created,
        );
        if (verification)
          storeDocument(
            verification,
            r.userId,
            r.organizationId,
            null,
            "verification",
            created,
          );
        return r;
      });
      await startSession(result.userId);
      return Response.json({ ok: true });
    }
    const user = await requireUser(),
      body = await jsonBody(request);
    const result = transaction(() => registrationAction(user, body));
    return Response.json({ ok: true, ...result });
  } catch (e) {
    removeCreated(created);
    return fail(e);
  }
}
