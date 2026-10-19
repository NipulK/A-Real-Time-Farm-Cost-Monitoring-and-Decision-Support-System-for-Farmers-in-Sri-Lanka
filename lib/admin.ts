import { admin } from './auth';
import { snapshot } from './service';
import { adminSummary } from './admin-summary';
import type { Row } from './db';
export function adminSnapshot(user: Row) {
  admin(user);
  const data = snapshot(user);
  return { ...data, adminSummary: adminSummary(data), refreshedAt: new Date().toISOString() };
}
