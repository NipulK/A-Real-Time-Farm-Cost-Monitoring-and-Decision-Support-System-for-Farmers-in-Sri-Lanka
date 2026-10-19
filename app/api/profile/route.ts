import { checkOrigin, fail, requireUser } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { updateOwnProfile } from "@/lib/profile";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    return Response.json(updateOwnProfile(user, await jsonBody(request, 4000)));
  } catch (e) { return fail(e); }
}
