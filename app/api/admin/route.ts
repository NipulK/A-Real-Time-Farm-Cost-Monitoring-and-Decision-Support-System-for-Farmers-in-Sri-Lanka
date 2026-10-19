import { requireUser, fail } from '@/lib/auth';
import { adminSnapshot } from '@/lib/admin';
export const runtime = 'nodejs';
export async function GET() {
  try { return Response.json(adminSnapshot(await requireUser()), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (e) { return fail(e); }
}
