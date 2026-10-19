import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
export const storage = path.resolve(
  /* turbopackIgnore: true */ process.env.FARMWISE_STORAGE || "storage",
);
mkdirSync(storage, { recursive: true });
export const db = new DatabaseSync(
  process.env.NEXT_PHASE === "phase-production-build"
    ? ":memory:"
    : path.join(storage, "farmwise.sqlite"),
  { timeout: 5000 },
);
db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('farmer','grower','supervisor','admin')),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS user_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id),language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en','si')));
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS farms(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,district TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fields(id TEXT PRIMARY KEY,farm_id TEXT NOT NULL REFERENCES farms(id),name TEXT NOT NULL,acres REAL NOT NULL CHECK(acres>0));
CREATE TABLE IF NOT EXISTS crops(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,varieties TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS cultivations(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),field_id TEXT NOT NULL REFERENCES fields(id),crop_id TEXT NOT NULL REFERENCES crops(id),name TEXT NOT NULL,variety TEXT NOT NULL,planted TEXT NOT NULL,harvest_date TEXT NOT NULL,acres REAL NOT NULL CHECK(acres>0),budget INTEGER NOT NULL CHECK(budget>=0),forecast_kg REAL NOT NULL CHECK(forecast_kg>=0),status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('planned','active','closed')),validated INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS assignments(cultivation_id TEXT NOT NULL REFERENCES cultivations(id),user_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(cultivation_id,user_id));
CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,cultivation_id TEXT NOT NULL REFERENCES cultivations(id),kind TEXT NOT NULL CHECK(kind IN ('activity','expense','investment','harvest','sale','payment')),date TEXT NOT NULL,payload TEXT NOT NULL CHECK(json_valid(payload)),created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,voided INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS entry_scope ON entries(cultivation_id,kind,voided);
CREATE TABLE IF NOT EXISTS areas(id TEXT PRIMARY KEY,crop_id TEXT NOT NULL REFERENCES crops(id),district TEXT NOT NULL,approved INTEGER NOT NULL DEFAULT 0,UNIQUE(crop_id,district));
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),cultivation_id TEXT,event TEXT NOT NULL,target_id TEXT NOT NULL,before_json TEXT,after_json TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY,entry_id TEXT NOT NULL REFERENCES entries(id),name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,path TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
`);
for (const name of [
  "Watermelon",
  "Grapes",
  "Guava",
  "Carrot",
  "Potato",
  "Leeks",
])
  db.prepare("INSERT OR IGNORE INTO crops(id,name) VALUES(?,?)").run(
    name.toLowerCase(),
    name,
  );
export type Row = Record<string, any>;
export function all(sql: string, ...params: any[]): Row[] {
  return (db.prepare(sql).all(...params) as Row[]).map((row) => ({ ...row }));
}
export function one(sql: string, ...params: any[]): Row | undefined {
  const row = db.prepare(sql).get(...params) as Row | undefined;
  return row ? { ...row } : undefined;
}
export function run(sql: string, ...params: any[]) {
  return db.prepare(sql).run(...params);
}
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function prices(): Row[] {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "data/prices.json"), "utf8"),
  );
}

// Audit records are append-only even if a future route accidentally issues SQL mutations.
db.exec(
  `CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END; CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;`,
);

// Additive registration migration. Existing business rows and password hashes stay intact.
db.exec(`
CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY,public_id TEXT NOT NULL UNIQUE,owner_id TEXT NOT NULL UNIQUE REFERENCES users(id),name TEXT NOT NULL,type TEXT NOT NULL CHECK(type IN ('company','organization','grower','investor')),registration_number TEXT NOT NULL DEFAULT '',address TEXT NOT NULL,district TEXT NOT NULL,phone TEXT NOT NULL,email TEXT NOT NULL,responsible_position TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','needs_info')),review_note TEXT NOT NULL DEFAULT '',reviewed_by TEXT REFERENCES users(id),reviewed_at TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),public_id TEXT NOT NULL UNIQUE,account_type TEXT NOT NULL CHECK(account_type IN ('independent','organization_owner','organization_farmer','supervisor','admin')),organization_id TEXT REFERENCES organizations(id),mobile TEXT UNIQUE,district TEXT NOT NULL DEFAULT '',village TEXT NOT NULL DEFAULT '',reference_number TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS lands(id TEXT PRIMARY KEY,public_id TEXT NOT NULL UNIQUE,owner_id TEXT NOT NULL REFERENCES users(id),organization_id TEXT REFERENCES organizations(id),name TEXT NOT NULL,district TEXT NOT NULL,village TEXT NOT NULL,location TEXT NOT NULL,area REAL NOT NULL CHECK(area>0),unit TEXT NOT NULL CHECK(unit IN ('acres','hectares','perches')),acres REAL NOT NULL CHECK(acres>0),created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS farm_lands(farm_id TEXT PRIMARY KEY REFERENCES farms(id),land_id TEXT NOT NULL UNIQUE REFERENCES lands(id));
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),organization_id TEXT REFERENCES organizations(id),land_id TEXT REFERENCES lands(id),purpose TEXT NOT NULL CHECK(purpose IN ('sketch','verification')),name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,path TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS farmer_assignments(cultivation_id TEXT NOT NULL REFERENCES cultivations(id),farmer_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(cultivation_id,farmer_id));
CREATE TABLE IF NOT EXISTS expense_farmers(entry_id TEXT PRIMARY KEY REFERENCES entries(id),farmer_id TEXT NOT NULL REFERENCES users(id));
CREATE INDEX IF NOT EXISTS expense_farmer_scope ON expense_farmers(farmer_id,entry_id);
`);
// Legacy owner accounts require review; no organization is silently approved.
transaction(() => {
  for (const u of all(
    "SELECT u.id,u.name,u.email,u.role FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE p.user_id IS NULL",
  )) {
    const type =
      u.role === "farmer"
        ? "independent"
        : u.role === "grower"
          ? "organization_owner"
          : u.role;
    let org: string | null = null;
    if (type === "organization_owner") {
      org = "legacy-" + u.id;
      run(
        "INSERT OR IGNORE INTO organizations(id,public_id,owner_id,name,type,address,district,phone,email,responsible_position,status,review_note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        org,
        "ORG-" + u.id,
        u.id,
        u.name,
        "grower",
        "",
        "",
        "",
        u.email,
        "",
        "needs_info",
        "Complete registration and submit land details for administrator approval.",
        new Date().toISOString(),
      );
    }
    run(
      "INSERT OR IGNORE INTO profiles VALUES(?,?,?,?,?,?,?,?)",
      u.id,
      "LEGACY-" + u.id,
      type,
      org,
      null,
      "",
      "",
      "",
    );
  }
});
