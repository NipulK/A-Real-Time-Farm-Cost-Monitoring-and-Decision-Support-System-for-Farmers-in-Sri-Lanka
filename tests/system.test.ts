import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { totals, eligibleBenchmark, priceEligible, csv } from "../lib/domain";
const dir = mkdtempSync(path.join(os.tmpdir(), "farmwise-test-"));
process.env.FARMWISE_STORAGE = dir;
const { db, run, one } = await import("../lib/db");
const { mutate, snapshot, cultivation } = await import("../lib/service");
const { hashPassword, verifyPassword } = await import("../lib/auth");
const users = [
  { id: "admin", role: "admin" },
  { id: "alice", role: "grower" },
  { id: "bob", role: "grower" },
  { id: "sam", role: "supervisor" },
].map((u) => ({ ...u, name: u.id }));
for (const u of users)
  run(
    "INSERT INTO users VALUES(?,?,?,?,?,1)",
    u.id,
    u.name,
    u.id + "@test.local",
    hashPassword("test-only-password"),
    u.role,
  );
const [admin, alice, bob, sam] = users;
run(
  "INSERT INTO organizations(id,public_id,owner_id,name,type,address,district,phone,email,responsible_position,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
  "test-org",
  "ORG-TEST",
  "alice",
  "Test Organization",
  "grower",
  "Test address",
  "Example District",
  "+94771110000",
  "org@test.local",
  "Owner",
  "approved",
  new Date().toISOString(),
);
run(
  "INSERT INTO users VALUES(?,?,?,?,?,1)",
  "employee",
  "Employee",
  "employee@test.local",
  hashPassword("test-only-password"),
  "farmer",
);
for (const [uid, type] of [
  ["alice", "organization_owner"],
  ["sam", "supervisor"],
  ["employee", "organization_farmer"],
])
  run(
    "INSERT INTO profiles VALUES(?,?,?,?,?,?,?,?)",
    uid,
    "TEST-" + uid,
    type,
    "test-org",
    null,
    "",
    "",
    "",
  );

function create(
  user: any,
  kind: string,
  data: any,
  cid?: string,
  date = "2026-10-01",
) {
  if (
    kind === "expense" &&
    cid &&
    one("SELECT owner_id FROM cultivations WHERE id=?", cid)?.owner_id ===
      "alice"
  ) {
    run(
      "INSERT OR IGNORE INTO farmer_assignments VALUES(?,?)",
      cid,
      "employee",
    );
    data = { ...data, farmer_id: "employee" };
  }
  return mutate(user, { kind, data, cultivation_id: cid, date })!.id as string;
}
const farm = create(alice, "farm", {
    name: "Farm",
    district: "Example District",
    owner_id: "alice",
  }),
  field = create(alice, "field", { farm_id: farm, name: "Field", acres: 2 });
const cid = create(alice, "cultivation", {
  name: "Season",
  field_id: field,
  crop_id: "watermelon",
  variety: "Test",
  planted: "2026-09-01",
  harvest_date: "2026-11-01",
  acres: 1,
  budget: 10000,
  forecast_kg: 1000,
});
after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
test("passwords are salted and verified", () => {
  const h = hashPassword("a-long-password");
  assert(verifyPassword("a-long-password", h));
  assert(!verifyPassword("wrong", h));
  assert.notEqual(h, hashPassword("a-long-password"));
});
test("ownership and assignment are enforced server-side", () => {
  assert.throws(() => cultivation(bob, cid), /403/);
  assert.throws(() => cultivation(sam, cid), /403/);
  mutate(alice, { action: "assign", cultivation_id: cid, user_id: sam.id });
  assert.equal(cultivation(sam, cid).id, cid);
  assert.throws(
    () =>
      mutate(sam, {
        action: "updateCultivation",
        cultivation_id: cid,
        budget: 1,
        forecast_kg: 1,
        status: "active",
      }),
    /403/,
  );
  assert.equal(snapshot(bob).entries.length, 0);
  assert.equal(snapshot(sam).cultivations.length, 1);
  assert.throws(
    () =>
      create(
        sam,
        "investment",
        { description: "funds", investor: "x", amount: 20 },
        cid,
      ),
    /403/,
  );
});
test("cost, funding, sale and payment stay separate with inventory protection", () => {
  create(
    sam,
    "activity",
    { description: "Weeding", category: "Labour", quantity: 2, unit: "days" },
    cid,
  );
  create(
    sam,
    "expense",
    {
      description: "Labour cost",
      category: "Labour",
      basis: "cash",
      amount: 1000,
    },
    cid,
  );
  create(
    sam,
    "expense",
    {
      description: "Family labour",
      category: "Labour",
      basis: "imputed",
      amount: 500,
    },
    cid,
  );
  create(
    alice,
    "investment",
    { description: "Funding", investor: "Alice", amount: 2000 },
    cid,
  );
  const harvest = create(
    sam,
    "harvest",
    { description: "Grade A", grade: "A", total: 100, saleable: 90, loss: 10 },
    cid,
  );
  assert.throws(
    () =>
      create(
        sam,
        "sale",
        { harvest_id: harvest, buyer: "Buyer", kg: 91, price: 100 },
        cid,
      ),
    /stock/,
  );
  const sale = create(
    sam,
    "sale",
    { harvest_id: harvest, buyer: "Buyer", kg: 50, price: 100 },
    cid,
  );
  create(sam, "payment", { sale_id: sale, amount: 2000, method: "Cash" }, cid);
  assert.throws(
    () =>
      create(
        sam,
        "payment",
        { sale_id: sale, amount: 3001, method: "Cash" },
        cid,
      ),
    /balance/,
  );
  const s = snapshot(alice).cultivations[0].summary;
  assert.equal(s.cost, 150000);
  assert.equal(s.revenue, 500000);
  assert.equal(s.profit, 350000);
  assert.equal(s.cashPosition, 300000);
  assert.equal(s.receivable, 300000);
  assert.equal(s.stock, 40);
  assert.throws(
    () => mutate(sam, { action: "void", id: harvest, reason: "Correction" }),
    /linked/,
  );
  assert.throws(
    () =>
      create(
        sam,
        "sale",
        { harvest_id: "foreign-id", buyer: "Buyer", kg: 1, price: 1 },
        cid,
      ),
    /Choose a harvest/,
  );
});
test("voiding is audited and removes cost exactly once", () => {
  const e = create(
    sam,
    "expense",
    { description: "Correction", category: "Other", basis: "cash", amount: 1 },
    cid,
  );
  const before = snapshot(alice).cultivations[0].summary.cost;
  mutate(sam, { action: "void", id: e, reason: "Duplicate invoice" });
  assert.equal(snapshot(alice).cultivations[0].summary.cost, before - 100);
  assert(one("SELECT id FROM audit WHERE target_id=? AND event='void'", e));
  assert.throws(
    () => mutate(sam, { action: "void", id: e, reason: "Again" }),
    /already/,
  );
});
test("invalid harvest and dates are rejected transactionally", () => {
  assert.throws(
    () =>
      create(
        sam,
        "harvest",
        { description: "Invalid", grade: "B", total: 10, saleable: 9, loss: 9 },
        cid,
      ),
    /Total must equal/,
  );
  assert.throws(
    () =>
      create(
        sam,
        "activity",
        { description: "Future", category: "Other", quantity: 1, unit: "day" },
        cid,
        "2099-01-01",
      ),
    /today or earlier/,
  );
  assert.throws(
    () =>
      create(alice, "cultivation", {
        name: "Too big",
        field_id: field,
        crop_id: "watermelon",
        variety: "Test",
        planted: "2026-09-01",
        harvest_date: "2026-11-01",
        acres: 2,
        budget: 0,
        forecast_kg: 0,
      }),
    /exceeds/,
  );
});
test("closed cultivations lock entries and validation needs admin", () => {
  mutate(alice, {
    action: "updateCultivation",
    cultivation_id: cid,
    budget: 10000,
    forecast_kg: 1000,
    status: "closed",
  });
  assert.throws(
    () =>
      create(
        sam,
        "expense",
        { description: "Late", category: "Other", basis: "cash", amount: 1 },
        cid,
      ),
    /Reopen/,
  );
  assert.throws(
    () =>
      mutate(alice, {
        action: "validate",
        cultivation_id: cid,
        validated: true,
      }),
    /403/,
  );
  mutate(admin, { action: "validate", cultivation_id: cid, validated: true });
  assert.equal(snapshot(alice).cultivations[0].validated, 1);
});
test("benchmark excludes unapproved and insufficient independent data", () => {
  const base = {
    status: "closed",
    validated: 1,
    approved: 1,
    saleable: 10,
    cost: 1000,
  };
  assert.equal(eligibleBenchmark([{ ...base, owner_id: "a" }]).value, null);
  assert.equal(
    eligibleBenchmark(
      ["a", "b", "c"].map((owner_id) => ({ ...base, owner_id })),
    ).value,
    100,
  );
  assert.equal(
    eligibleBenchmark(
      ["a", "b", "c"].map((owner_id) => ({ ...base, owner_id, approved: 0 })),
    ).value,
    null,
  );
});
test("price flags never create midpoint and CSV neutralizes formulas", () => {
  assert(!priceEligible({ lower: 100, upper: 10, marketIdentity: "claimed" }));
  assert(!priceEligible({ lower: 10, upper: 20, marketIdentity: "uncertain" }));
  assert(!priceEligible({ lower: null, upper: 10, marketIdentity: "claimed" }));
  assert(csv([{ name: "=CMD()", amount: 1 }]).includes("'=CMD()"));
  assert.equal(totals([]).costPerKg, null);
});
test("metadata edits preserve ownership and reject unsafe area changes", () => {
  assert.throws(
    () =>
      mutate(bob, {
        action: "editFarm",
        id: farm,
        data: { name: "Wrong", district: "Other" },
      }),
    /403/,
  );
  mutate(alice, {
    action: "editFarm",
    id: farm,
    data: { name: "Renamed farm", district: "Other district" },
  });
  assert.equal(snapshot(alice).cultivations[0].validated, 0);
  assert.throws(
    () =>
      mutate(sam, {
        action: "editField",
        id: field,
        data: { name: "Wrong", acres: 2 },
      }),
    /403/,
  );
  mutate(admin, {
    action: "editCrop",
    id: "watermelon",
    data: { name: "Watermelon", varieties: "Crimson Sweet, Sugar Baby" },
  });
  assert.match(
    one("SELECT varieties FROM crops WHERE id=?", "watermelon")!.varieties,
    /Sugar Baby/,
  );
});
test("audit history is append-only at database level", () => {
  assert.throws(() => run("UPDATE audit SET event=?", "tampered"), /immutable/);
  assert.throws(() => run("DELETE FROM audit"), /immutable/);
});
test("unknown actions and excessive monetary precision are rejected", () => {
  assert.throws(() => mutate(alice, { action: "unknown" }), /Unknown action/);
  mutate(alice, {
    action: "updateCultivation",
    cultivation_id: cid,
    budget: 10000,
    forecast_kg: 1000,
    status: "active",
  });
  assert.throws(
    () =>
      create(
        alice,
        "expense",
        {
          description: "Fractions",
          category: "Other",
          basis: "cash",
          amount: 1.001,
        },
        cid,
      ),
    /two decimal/,
  );
  assert.throws(
    () =>
      create(
        alice,
        "expense",
        { description: "Blank", category: "Other", basis: "cash", amount: "" },
        cid,
      ),
    /amount/,
  );
});
test("HTTP body reader rejects malformed and oversized actual bytes", async () => {
  const { jsonBody } = await import("../lib/http");
  await assert.rejects(
    () =>
      jsonBody(new Request("http://localhost", { method: "POST", body: "{" })),
    /Invalid JSON/,
  );
  await assert.rejects(
    () =>
      jsonBody(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ data: "a".repeat(200) }),
        }),
        100,
      ),
    /too large/,
  );
});

test("only approved validated independent records produce cost and farm-sale medians", () => {
  const actualDate = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
  create(admin, "area", {
    crop_id: "guava",
    district: "Benchmark District",
    approved: true,
  });
  for (let i = 1; i <= 3; i++) {
    const uid = create(admin, "user", {
      name: "Benchmark " + i,
      email: `bench${i}@test.local`,
      password: "test-only-password",
      role: "farmer",
    });
    const u = { id: uid, role: "farmer" };
    const f = create(u, "farm", {
      name: "Benchmark Farm",
      district: "Benchmark District",
      owner_id: uid,
    });
    const fi = create(u, "field", { farm_id: f, name: "Field", acres: 1 });
    const c = create(u, "cultivation", {
      name: "Guava season",
      field_id: fi,
      crop_id: "guava",
      variety: "Common",
      planted: "2026-01-01",
      harvest_date: actualDate,
      acres: 1,
      budget: 10000,
      forecast_kg: 100,
    });
    create(
      u,
      "expense",
      {
        description: "Season cost",
        category: "Other",
        basis: "cash",
        amount: i * 1000,
      },
      c,
      actualDate,
    );
    const h = create(
      u,
      "harvest",
      {
        description: "Grade A",
        grade: "A",
        total: 100,
        saleable: 100,
        loss: 0,
      },
      c,
      actualDate,
    );
    create(
      u,
      "sale",
      { harvest_id: h, buyer: "Market", kg: 100, price: 50 + i * 50 },
      c,
      actualDate,
    );
    mutate(u, {
      action: "updateCultivation",
      cultivation_id: c,
      budget: 10000,
      forecast_kg: 100,
      status: "closed",
    });
    mutate(admin, { action: "validate", cultivation_id: c, validated: true });
  }
  const s = snapshot(alice);
  const costs = s.benchmarks.find((b: any) => b.crop_id === "guava");
  assert.equal(costs.value, 2000);
  assert.equal(costs.count, 3);
  assert.equal(costs.owners, 3);
  const sales = s.saleBenchmarks.find((b: any) => b.crop_id === "guava");
  assert.equal(sales.median, 15000);
  assert.equal(sales.owners, 3);
  assert.equal(
    s.cultivations.some((c: any) => c.crop_id === "guava"),
    false,
  );
});
test("historical import retains audit counts, missing bounds and original provenance", async () => {
  const { readFileSync } = await import("node:fs");
  const prices = JSON.parse(readFileSync("data/prices.json", "utf8"));
  assert.equal(prices.length, 1950);
  assert.equal(prices.filter((p: any) => p.state === "reversed").length, 8);
  assert.equal(prices.filter((p: any) => p.state === "partial").length, 297);
  assert.equal(
    prices.filter((p: any) => p.marketIdentity === "uncertain").length,
    362,
  );
  assert(
    prices.every(
      (p: any) =>
        p.verification === "unverified" &&
        p.originalLabel &&
        p.sourceHash.length === 64 &&
        p.cells &&
        p.sourceCategory,
    ),
  );
  assert(!prices.some((p: any) => p.canonicalProduct === "Grapes"));
});
