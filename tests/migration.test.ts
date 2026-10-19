import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const temp = mkdtempSync(path.join(os.tmpdir(), "farmwise-migration-"));
process.env.FARMWISE_STORAGE = temp;
const legacy = new DatabaseSync(path.join(temp, "farmwise.sqlite"));
legacy.exec(
  "CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('farmer','grower','supervisor','admin')),active INTEGER NOT NULL DEFAULT 1); CREATE TABLE farms(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,district TEXT NOT NULL);",
);
legacy
  .prepare("INSERT INTO users VALUES(?,?,?,?,?,1)")
  .run(
    "old-farmer",
    "Existing farmer",
    "existing@example.test",
    "preserved-password-hash",
    "farmer",
  );
legacy
  .prepare("INSERT INTO users VALUES(?,?,?,?,?,1)")
  .run(
    "old-grower",
    "Existing grower",
    "grower@example.test",
    "other-preserved-hash",
    "grower",
  );
legacy
  .prepare("INSERT INTO farms VALUES(?,?,?,?)")
  .run("existing-farm", "old-farmer", "Existing farm", "Existing district");
legacy.close();
const { db, one, all } = await import("../lib/db");
const { hydrateUser } = await import("../lib/access");
after(() => {
  db.close();
  rmSync(temp, { recursive: true, force: true });
});
test("additive migration preserves existing accounts, passwords and farm ownership", () => {
  assert.equal(
    one("SELECT password FROM users WHERE id=?", "old-farmer")!.password,
    "preserved-password-hash",
  );
  assert.equal(
    one("SELECT owner_id FROM farms WHERE id=?", "existing-farm")!.owner_id,
    "old-farmer",
  );
  assert.equal(
    hydrateUser(one("SELECT id,role FROM users WHERE id=?", "old-farmer")!)
      .account_type,
    "independent",
  );
  assert.equal(all("SELECT * FROM lands").length, 0);
});
test("legacy growers are not silently approved and must complete an application", () => {
  const u = hydrateUser(
    one("SELECT id,role FROM users WHERE id=?", "old-grower")!,
  );
  assert.equal(u.account_type, "organization_owner");
  assert.equal(u.organization_status, "needs_info");
  assert(u.organization_id);
  assert.equal(
    one("SELECT password FROM users WHERE id=?", "old-grower")!.password,
    "other-preserved-hash",
  );
});
