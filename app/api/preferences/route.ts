import { checkOrigin, fail, requireUser } from "@/lib/auth";
import { hydrateUser } from "@/lib/access";
import { jsonBody } from "@/lib/http";
import { run, transaction } from "@/lib/db";
import { event } from "@/lib/registration";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = hydrateUser(await requireUser());
    if (user.account_type !== "independent")
      throw new Error("403: Language selection is available only to independent farmers.");
    const body = await jsonBody(request, 1000);
    if (body.language !== "en" && body.language !== "si")
      throw new Error("400: Choose English or Sinhala.");
    transaction(() => {
      run("INSERT INTO user_preferences(user_id,language) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET language=excluded.language", user.id, body.language);
      event(user.id, "language preference updated", user.id, { language: body.language }, { language: user.language });
    });
    return Response.json({ language: body.language });
  } catch (e) { return fail(e); }
}
