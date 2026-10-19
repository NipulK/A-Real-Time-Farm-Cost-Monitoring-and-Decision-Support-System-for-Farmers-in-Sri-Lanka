import { jsonBody } from "@/lib/http";
import { checkOrigin, fail, requireUser } from "@/lib/auth";
import { mutate, snapshot } from "@/lib/service";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(snapshot(await requireUser()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    return Response.json({
      ok: true,
      ...mutate(user, await jsonBody(request)),
    });
  } catch (e) {
    return fail(e);
  }
}
