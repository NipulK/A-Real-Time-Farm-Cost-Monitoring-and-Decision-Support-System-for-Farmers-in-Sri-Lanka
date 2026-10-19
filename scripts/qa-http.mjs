// Integration QA runs only against its own disposable storage, never the real workspace.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const keep = process.argv.includes("--keep");
const port = Number(process.env.QA_PORT || 3107),
  base = `http://127.0.0.1:${port}`;
const storage = mkdtempSync(path.join(os.tmpdir(), "farmwise-http-qa-"));
const report = { started: new Date().toISOString(), checks: [], storage, base };
let logs = "";
let server;
function start() {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, FARMWISE_STORAGE: storage },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (b) => {
    logs += b;
  });
  server.stderr.on("data", (b) => {
    logs += b;
    writeFileSync(path.join(storage, "server.log"), logs);
  });
}
async function ready() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(base);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("QA server failed to start: " + logs);
}
async function stop() {
  const p = server;
  const ended = new Promise((r) => p.once("exit", r));
  p.kill("SIGTERM");
  await ended;
}
function client() {
  let cookie = "";
  return {
    async request(
      url,
      { method = "GET", body, origin = base, raw, headers = {} } = {},
    ) {
      const r = await fetch(base + url, {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(method !== "GET" ? { origin } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        body: raw || (body ? JSON.stringify(body) : undefined),
      });
      const set = r.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      const ct = r.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await r.json()
        : await r.text();
      return { status: r.status, data, headers: r.headers };
    },
    async auth(body) {
      return this.request("/api/auth", { method: "POST", body });
    },
    async write(body) {
      return this.request("/api/data", { method: "POST", body });
    },
    async snapshot() {
      const r = await this.request("/api/data");
      assert.equal(r.status, 200, JSON.stringify(r.data));
      return r.data;
    },
  };
}
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      report.checks.push({ name, pass: true });
      console.log("PASS " + name);
    });
}
const password = "Local-QA-only-2026!";
const admin = client(),
  independent = client(),
  owner = client(),
  otherOwner = client(),
  supervisor = client(),
  farmerA = client(),
  farmerB = client(),
  anonymous = client();
const ids = {};
const sketch = readFileSync('tests/fixtures/land-outline.png');
const initialLand = {
  name: "QA first land",
  district: "QA District",
  village: "Test village",
  location: "QA northern boundary near the test road",
  area: 2,
  unit: "acres",
};
const orgDetails = {
  name: "QA Growers Company",
  type: "company",
  registration_number: "QA-REG-001",
  address: "QA business address",
  district: "QA District",
  phone: "+94770000002",
  email: "qa-business@example.test",
  responsible_position: "Director",
};
function account(name, email, mobile) {
  return {
    name,
    email,
    mobile,
    password,
    district: "QA District",
    village: "Test village",
  };
}
async function registration(as, kind, acc, org, opts = {}) {
  const f = new FormData();
  f.set("kind", kind);
  f.set(
    "data",
    JSON.stringify({
      account: acc,
      organization: org,
      land: opts.land || initialLand,
    }),
  );
  if (!opts.noSketch)
    f.set(
      "sketch",
      new Blob([opts.badSketch ? "invalid-image" : sketch], {
        type: "image/png",
      }),
      "land-outline.png",
    );
  if (org?.type === "company" && !opts.noVerification)
    f.set(
      "verification",
      new Blob(["%PDF-1.4\nQA registration document"], {
        type: "application/pdf",
      }),
      "registration.pdf",
    );
  return as.request("/api/registration", { method: "POST", raw: f });
}
async function reg(as, body) {
  return as.request("/api/registration", { method: "POST", body });
}
async function create(as, kind, data, cid, date = "2026-10-01") {
  const r = await as.write({ kind, data, cultivation_id: cid, date });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.id;
}
async function land(as, data, extra = {}) {
  const f = new FormData();
  f.set("data", JSON.stringify(data));
  if (extra.id) f.set("id", extra.id);
  f.set("action", extra.id ? "edit" : "create");
  f.set(
    "sketch",
    new Blob([sketch], { type: "image/png" }),
    "another-land.png",
  );
  return as.request("/api/lands", { method: "POST", raw: f });
}
async function member(type, name, email, mobile) {
  const r = await reg(owner, {
    action: "addMember",
    data: {
      ...account(name, email, mobile),
      account_type: type,
      reference_number: "INTERNAL-" + name,
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.id;
}
async function uploadReceipt(as, entry, bytes = "%PDF-1.4\nQA receipt") {
  const f = new FormData();
  f.set("entry_id", entry);
  f.set(
    "file",
    new Blob([bytes], { type: "application/pdf" }),
    "qa-receipt.pdf",
  );
  return as.request("/api/receipts", { method: "POST", raw: f });
}
try {
  start();
  await ready();
  await check(
    "Anonymous protected routes and bootstrap registration guard",
    async () => {
      for (const url of [
        "/api/data",
        "/api/export",
        "/api/documents?id=none",
        "/api/receipts?id=none",
      ])
        assert.equal((await anonymous.request(url)).status, 401);
      assert.equal(
        (
          await registration(
            anonymous,
            "independent",
            account("Early", "early@example.test", "0770000010"),
          )
        ).status,
        409,
      );
    },
  );
  await check("One-time system administrator setup", async () => {
    const r = await admin.auth({
      action: "setup",
      name: "QA Administrator",
      email: "qa-admin@example.test",
      password,
    });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("set-cookie"), /httponly/i);
    assert.match(r.headers.get("set-cookie"), /samesite=strict/i);
    assert.equal(
      (
        await anonymous.auth({
          action: "setup",
          name: "Other",
          email: "other@example.test",
          password,
        })
      ).status,
      409,
    );
  });
  await check(
    "Independent self-registration activates immediately with first land",
    async () => {
      const r = await registration(
        independent,
        "independent",
        account("QA Independent", "qa-independent@example.test", "0770000011"),
      );
      assert.equal(r.status, 200, JSON.stringify(r.data));
      const s = await independent.snapshot();
      assert.equal(s.user.account_type, "independent");
      assert.equal(s.lands.length, 1);
      assert.equal(s.fields.length, 1);
      assert.equal(s.lands[0].area, 2);
      ids.independent = s.user.id;
      ids.independentLand = s.lands[0].id;
      ids.independentSketch = s.documents[0].id;
      assert.equal((await independent.request("/")).status, 200);
    },
  );
  await check(
    "Independent login accepts normalized mobile and registered email",
    async () => {
      const a = client(),
        b = client();
      assert.equal(
        (
          await a.auth({
            action: "login",
            identifier: "+94770000011",
            password,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await b.auth({
            action: "login",
            identifier: "qa-independent@example.test",
            password,
          })
        ).status,
        200,
      );
      assert.equal((await a.snapshot()).user.id, (await b.snapshot()).user.id);
    },
  );
  await check("Independent language preference persists, is account-scoped and denies other roles", async () => {
    assert.equal((await independent.snapshot()).user.language, "en");
    const save = (as, language, extra = {}) => as.request("/api/preferences", { method: "POST", body: { language, ...extra } });
    assert.equal((await save(independent, "si", { user_id: (await admin.snapshot()).user.id })).status, 200);
    assert.equal((await independent.snapshot()).user.language, "si");
    const again = client();
    assert.equal((await again.auth({action:"login",identifier:"qa-independent@example.test",password})).status,200);
    assert.equal((await again.snapshot()).user.language,"si");
    assert.equal((await save(independent,"ta")).status,400);
    assert.equal((await independent.snapshot()).user.language,"si");
    assert.equal((await save(admin,"si")).status,403);
    assert.equal((await save(anonymous,"si")).status,401);
    assert.equal((await independent.request("/api/preferences",{method:"POST",body:{language:"en"},origin:"https://invalid.example"})).status,403);
    assert.equal((await admin.snapshot()).user.language,"en");
    assert.equal((await save(independent,"en")).status,200);
  });
  await check(
    "Missing sketch, invalid content and duplicate mobile/email are rejected",
    async () => {
      assert.equal(
        (
          await registration(
            anonymous,
            "independent",
            account("Missing", "missing@example.test", "0770000012"),
            null,
            { noSketch: true },
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await registration(
            anonymous,
            "independent",
            account("Bad image", "bad@example.test", "0770000013"),
            null,
            { badSketch: true },
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await registration(
            anonymous,
            "independent",
            account("Duplicate", "duplicate@example.test", "+94770000011"),
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await registration(
            anonymous,
            "independent",
            account(
              "Duplicate email",
              "qa-independent@example.test",
              "0770000014",
            ),
          )
        ).status,
        409,
      );
    },
  );
  await check(
    "Mobile-only independent account has no invented visible email",
    async () => {
      const c = client();
      assert.equal(
        (
          await registration(
            c,
            "independent",
            account("Mobile only", "", "0770000015"),
          )
        ).status,
        200,
      );
      assert.equal((await c.snapshot()).user.email, "");
      const adminContact = (await admin.snapshot()).users.find(u => u.mobile === "+94770000015");
      assert(adminContact, "Administrator can identify mobile-only account by its registered mobile");
      assert.equal(adminContact.email, "");
      assert.equal(adminContact.account_type, "independent");
      assert.equal(
        (await c.auth({ action: "login", identifier: "0770000015", password }))
          .status,
        200,
      );
    },
  );
  await check(
    "Company application requires registration evidence and remains pending",
    async () => {
      assert.equal(
        (
          await registration(
            anonymous,
            "organization",
            account("No evidence", "no-evidence@example.test", "0770000020"),
            orgDetails,
            { noVerification: true },
          )
        ).status,
        400,
      );
      const r = await registration(
        owner,
        "organization",
        account("QA Organization Owner", "qa-owner@example.test", "0770000021"),
        orgDetails,
      );
      assert.equal(r.status, 200, JSON.stringify(r.data));
      const s = await owner.snapshot();
      assert.equal(s.user.organization_status, "pending");
      assert.equal(s.restricted, true);
      ids.org = s.user.organization_id;
      ids.owner = s.user.id;
      ids.orgLand = s.lands[0].id;
      ids.orgSketch = s.documents.find((d) => d.purpose === "sketch").id;
      assert.equal((await owner.request("/")).status, 200);
    },
  );
  await check(
    "Pending organizations cannot operate or register members",
    async () => {
      assert.equal(
        (
          await owner.write({
            kind: "farm",
            data: { name: "Bypass", district: "QA", owner_id: ids.owner },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await reg(owner, {
            action: "addMember",
            data: {
              ...account("Bypass", "bypass@example.test", "0770000022"),
              account_type: "organization_farmer",
            },
          })
        ).status,
        403,
      );
      assert.equal(
        (await owner.request("/api/export?kind=ledger")).status,
        403,
      );
      assert.equal(
        (
          await reg(independent, {
            action: "reviewOrganization",
            id: ids.org,
            status: "approved",
            note: "Bypass",
          })
        ).status,
        403,
      );
    },
  );
  await check(
    "Multiple lands retain units, exact conversion, locations and private sketches",
    async () => {
      assert.equal(
        (
          await land(independent, {
            ...initialLand,
            name: "QA second land",
            area: 160,
            unit: "perches",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await land(owner, {
            ...initialLand,
            name: "QA organization second land",
            area: 1,
            unit: "hectares",
          })
        ).status,
        200,
      );
      const s = await independent.snapshot();
      assert.equal(s.lands.length, 2);
      assert.equal(s.lands.find((l) => l.unit === "perches").acres, 1);
      assert.equal(s.lands[0].location, initialLand.location);
      const o = await owner.snapshot();
      assert.equal(o.lands.length, 2);
      assert(
        Math.abs(
          o.lands.find((l) => l.unit === "hectares").acres - 2.4710538147,
        ) < 1e-8,
      );
      assert.equal(
        (await independent.request("/api/documents?id=" + ids.orgSketch))
          .status,
        403,
      );
      assert.equal(
        (await admin.request("/api/documents?id=" + ids.orgSketch)).status,
        200,
      );
      assert.equal(
        (await owner.request("/api/documents?id=" + ids.orgSketch)).status,
        200,
      );
      const preview = await owner.request(
        "/api/documents?id=" + ids.orgSketch + "&view=1",
      );
      assert.equal(preview.status, 200);
      assert.match(preview.headers.get("content-disposition"), /^inline/);
      assert.equal(
        (
          await independent.request(
            "/api/documents?id=" + ids.orgSketch + "&view=1",
          )
        ).status,
        403,
      );
    },
  );
  await check(
    "Admin rejection, feedback, resubmission and more-information flow",
    async () => {
      assert.equal(
        (
          await reg(admin, {
            action: "reviewOrganization",
            id: ids.org,
            status: "rejected",
            note: "Please confirm business details",
          })
        ).status,
        200,
      );
      assert.equal(
        (await owner.snapshot()).organizations[0].review_note,
        "Please confirm business details",
      );
      assert.equal(
        (await reg(owner, { action: "resubmitOrganization", data: orgDetails }))
          .status,
        200,
      );
      assert.equal(
        (await owner.snapshot()).user.organization_status,
        "pending",
      );
      assert.equal(
        (
          await reg(admin, {
            action: "reviewOrganization",
            id: ids.org,
            status: "needs_info",
            note: "Land sketch reviewed; confirm contact",
          })
        ).status,
        200,
      );
      assert.equal(
        (await owner.snapshot()).user.organization_status,
        "needs_info",
      );
      await reg(owner, { action: "resubmitOrganization", data: orgDetails });
    },
  );
  await check(
    "Admin approval unlocks organization operations without re-registering",
    async () => {
      assert.equal(
        (
          await reg(admin, {
            action: "reviewOrganization",
            id: ids.org,
            status: "approved",
            note: "Verified company document and land sketch",
          })
        ).status,
        200,
      );
      const s = await owner.snapshot();
      assert.equal(s.user.organization_status, "approved");
      assert(!s.restricted);
      assert.equal(s.lands.length, 2);
      ids.orgField = s.fields.find((f) => f.farm_id === ids.orgLand).id;
      assert.equal((await owner.request("/")).status, 200);
    },
  );
  await check(
    "Approved organization registers two farmers and one supervisor",
    async () => {
      ids.farmerA = await member(
        "organization_farmer",
        "QA Farmer A",
        "qa-farmer-a@example.test",
        "0770000031",
      );
      ids.farmerB = await member(
        "organization_farmer",
        "QA Farmer B",
        "qa-farmer-b@example.test",
        "0770000032",
      );
      ids.supervisor = await member(
        "supervisor",
        "QA Supervisor",
        "qa-supervisor@example.test",
        "0770000033",
      );
      for (const [c, email] of [
        [farmerA, "qa-farmer-a@example.test"],
        [farmerB, "qa-farmer-b@example.test"],
        [supervisor, "qa-supervisor@example.test"],
      ])
        assert.equal(
          (await c.auth({ action: "login", identifier: email, password }))
            .status,
          200,
        );
      const s = await owner.snapshot();
      assert.equal(s.members.length, 3);
      assert.equal(new Set(s.members.map((m) => m.public_id)).size, 3);
      assert.equal(
        (
          await reg(independent, {
            action: "addMember",
            data: {
              ...account("X", "x@example.test", "0770000034"),
              account_type: "supervisor",
            },
          })
        ).status,
        403,
      );
    },
  );
  await check("New organization farmer receives a header-only expense CSV before any costs", async () => {
    const state = await farmerA.snapshot();
    assert.equal(state.entries.length, 0);
    const exported = await farmerA.request("/api/export?kind=ledger");
    assert.equal(exported.status, 200);
    assert.equal(exported.data.trim(), '"expense_id","date","cultivation","description","category","basis","amount_LKR","voided","recorded_by"');
    assert(!exported.data.includes("qa-farmer-b"));
  });
  await check(
    "Organization cultivation, farmer and supervisor assignments",
    async () => {
      ids.cultivation = await create(owner, "cultivation", {
        name: "QA Organization Watermelon",
        field_id: ids.orgField,
        crop_id: "watermelon",
        variety: "Crimson Sweet",
        planted: "2026-09-01",
        harvest_date: "2026-11-01",
        acres: 1,
        budget: 10000,
        forecast_kg: 1000,
      });
      assert.equal(
        (
          await owner.write({
            action: "assign",
            cultivation_id: ids.cultivation,
            user_id: ids.supervisor,
          })
        ).status,
        200,
      );
      for (const farmer_id of [ids.farmerA, ids.farmerB])
        assert.equal(
          (
            await reg(owner, {
              action: "assignFarmer",
              cultivation_id: ids.cultivation,
              farmer_id,
            })
          ).status,
          200,
        );
      assert.equal((await supervisor.snapshot()).cultivations.length, 1);
      assert.equal(
        (
          await reg(supervisor, {
            action: "assignFarmer",
            cultivation_id: ids.cultivation,
            farmer_id: ids.farmerA,
          })
        ).status,
        403,
      );
    },
  );
  await check(
    "Supervisor attributes every organization expense to a valid assigned farmer",
    async () => {
      ids.activity = await create(
        supervisor,
        "activity",
        {
          description: "QA labour",
          category: "Labour",
          quantity: 2,
          unit: "worker-days",
        },
        ids.cultivation,
      );
      assert.equal(
        (
          await supervisor.write({
            kind: "expense",
            cultivation_id: ids.cultivation,
            date: "2026-10-01",
            data: {
              description: "Missing farmer",
              category: "Labour",
              basis: "cash",
              amount: 1,
            },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await owner.write({
            kind: "expense",
            cultivation_id: ids.cultivation,
            date: "2026-10-01",
            data: {
              description: "Owner bypass",
              category: "Labour",
              basis: "cash",
              amount: 1,
              farmer_id: ids.farmerA,
            },
          })
        ).status,
        403,
      );
      ids.expenseA = await create(
        supervisor,
        "expense",
        {
          description: "Only Farmer A expense",
          category: "Labour",
          basis: "cash",
          amount: 1000,
          activity_id: ids.activity,
          farmer_id: ids.farmerA,
        },
        ids.cultivation,
      );
      ids.expenseB = await create(
        supervisor,
        "expense",
        {
          description: "Only Farmer B expense",
          category: "Fertilizer",
          basis: "cash",
          amount: 2000,
          farmer_id: ids.farmerB,
        },
        ids.cultivation,
      );
      await create(
        supervisor,
        "expense",
        {
          description: "Farmer A family labour",
          category: "Labour",
          basis: "imputed",
          amount: 500,
          farmer_id: ids.farmerA,
        },
        ids.cultivation,
      );
    },
  );
  await check(
    "Organization farmers receive only their own expense details",
    async () => {
      const a = await farmerA.snapshot(),
        b = await farmerB.snapshot();
      assert.equal(a.user.account_type, "organization_farmer");
      assert.equal(a.entries.length, 2);
      assert.equal(b.entries.length, 1);
      assert(!JSON.stringify(a).includes("Only Farmer B expense"));
      for (const key of [
        "cultivations",
        "farms",
        "lands",
        "members",
        "audit",
        "benchmarks",
        "organizations",
      ])
        assert.equal(a[key], undefined);
      assert(a.entries.every((e) => e.kind === "expense"));
      assert.equal((await farmerA.request("/")).status, 200);
    },
  );
  await check(
    "Organization farmers cannot create, correct, approve, assign or upload",
    async () => {
      for (const body of [
        {
          kind: "expense",
          cultivation_id: ids.cultivation,
          date: "2026-10-01",
          data: {
            description: "Bypass",
            category: "Other",
            basis: "cash",
            amount: 1,
            farmer_id: ids.farmerA,
          },
        },
        { action: "void", id: ids.expenseA, reason: "Bypass" },
        {
          action: "updateCultivation",
          cultivation_id: ids.cultivation,
          budget: 1,
          forecast_kg: 1,
          status: "active",
        },
        {
          kind: "farm",
          data: { name: "Bypass", district: "QA", owner_id: ids.farmerA },
        },
      ])
        assert.equal((await farmerA.write(body)).status, 403);
      assert.equal((await land(farmerA, initialLand)).status, 403);
      assert.equal(
        (
          await reg(farmerA, {
            action: "reviewOrganization",
            id: ids.org,
            status: "approved",
            note: "Bypass",
          })
        ).status,
        403,
      );
      assert.equal((await uploadReceipt(farmerA, ids.expenseA)).status, 403);
    },
  );
  await check(
    "Receipts and CSV exports cannot bypass farmer isolation",
    async () => {
      const a = await uploadReceipt(supervisor, ids.expenseA),
        b = await uploadReceipt(supervisor, ids.expenseB);
      assert.equal(a.status, 200, JSON.stringify(a.data));
      assert.equal(b.status, 200);
      ids.receiptA = a.data.id;
      ids.receiptB = b.data.id;
      assert.equal(
        (await farmerA.request("/api/receipts?id=" + ids.receiptA)).status,
        200,
      );
      assert.equal(
        (await farmerA.request("/api/receipts?id=" + ids.receiptB)).status,
        403,
      );
      assert.equal(
        (await farmerB.request("/api/receipts?id=" + ids.receiptA)).status,
        403,
      );
      assert.equal(
        (await farmerA.request("/api/documents?id=" + ids.orgSketch)).status,
        403,
      );
      const csv = await farmerA.request("/api/export?kind=ledger");
      assert.equal(csv.status, 200);
      assert(csv.data.includes("Only Farmer A expense"));
      assert(!csv.data.includes("Only Farmer B expense"));
      for (const kind of ["summary", "audit"])
        assert.equal(
          (await farmerA.request("/api/export?kind=" + kind)).status,
          403,
        );
      assert.equal(
        (await uploadReceipt(supervisor, ids.expenseA, "fake-pdf")).status,
        400,
      );
    },
  );
  await check(
    "Owner sees all organization records, farmer attributions and totals",
    async () => {
      const s = await owner.snapshot();
      assert.equal(s.cultivations[0].summary.cash, 300000);
      assert.equal(s.cultivations[0].summary.imputed, 50000);
      assert.equal(s.expenseFarmers.length, 3);
      assert(
        s.entries.some((e) => e.id === ids.expenseA) &&
          s.entries.some((e) => e.id === ids.expenseB),
      );
      assert(!JSON.stringify(s.lands).includes(ids.independentLand));
    },
  );
  await check(
    "Independent farmer can record own costs without a supervisor or farmer attribution",
    async () => {
      const s = await independent.snapshot();
      ids.independentCult = await create(independent, "cultivation", {
        name: "QA Independent Season",
        field_id: s.fields[0].id,
        crop_id: "carrot",
        variety: "Common",
        planted: "2026-09-01",
        harvest_date: "2026-11-01",
        acres: 0.5,
        budget: 1000,
        forecast_kg: 100,
      });
      await create(
        independent,
        "expense",
        {
          description: "Independent own cost",
          category: "Seeds",
          basis: "cash",
          amount: 100,
        },
        ids.independentCult,
      );
      assert.equal(
        (await independent.snapshot()).cultivations[0].summary.cash,
        10000,
      );
      assert.equal(
        (
          await independent.write({
            action: "assign",
            cultivation_id: ids.independentCult,
            user_id: ids.supervisor,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await supervisor.write({
            kind: "expense",
            cultivation_id: ids.independentCult,
            date: "2026-10-01",
            data: {
              description: "Bypass",
              category: "Seeds",
              basis: "cash",
              amount: 1,
            },
          })
        ).status,
        403,
      );
    },
  );
  await check(
    "Different organizations cannot see or assign one another’s members or data",
    async () => {
      const org = {
        ...orgDetails,
        name: "QA Other Investor",
        type: "investor",
        registration_number: "",
        email: "qa-other-business@example.test",
      };
      assert.equal(
        (
          await registration(
            otherOwner,
            "organization",
            account(
              "QA Other Owner",
              "qa-other-owner@example.test",
              "0770000041",
            ),
            org,
          )
        ).status,
        200,
      );
      ids.otherOrg = (await otherOwner.snapshot()).user.organization_id;
      assert.equal(
        (
          await reg(admin, {
            action: "reviewOrganization",
            id: ids.otherOrg,
            status: "approved",
            note: "Investor identity reviewed",
          })
        ).status,
        200,
      );
      assert.equal((await otherOwner.snapshot()).entries.length, 0);
      assert.equal(
        (await otherOwner.request("/api/documents?id=" + ids.orgSketch)).status,
        403,
      );
      assert.equal(
        (
          await reg(otherOwner, {
            action: "assignFarmer",
            cultivation_id: ids.cultivation,
            farmer_id: ids.farmerA,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await reg(otherOwner, {
            action: "memberActive",
            id: ids.farmerA,
            active: false,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await otherOwner.write({
            action: "assign",
            cultivation_id: ids.cultivation,
            user_id: ids.supervisor,
          })
        ).status,
        403,
      );
    },
  );
  await check("Self-registration stores Sinhala preference without translating record data", async () => {
    const si = client();
    const response = await registration(si,"independent",{...account("සිංහල API QA","qa-language@example.test","0770000099"),language:"si"});
    assert.equal(response.status,200);
    const snapshot = await si.snapshot();
    assert.equal(snapshot.user.language,"si");
    assert.equal(snapshot.user.name,"සිංහල API QA");
    assert.equal(snapshot.lands[0].unit,"acres");
    assert.equal((await independent.snapshot()).user.language,"en");
  });
  await check("Language endpoint rejects organization owners, supervisors and organization farmers", async () => {
    for (const as of [owner,supervisor,farmerA,farmerB]) {
      assert.equal((await as.request("/api/preferences",{method:"POST",body:{language:"si"}})).status,403);
      assert.equal((await as.snapshot()).user.language,"en");
    }
  });
  await check("Authenticated pages load for all five roles; restricted farmer page hides member registration", async () => {
    for (const [role, as] of [
      ["administrator", admin],
      ["independent", independent],
      ["organization owner", owner],
      ["supervisor", supervisor],
      ["organization farmer", farmerA],
    ]) {
      const page = await as.request("/");
      assert.equal(page.status, 200, role);
      if (role === "organization farmer") {
        assert(page.data.includes("My expenses"));
        assert(!page.data.includes("Register member"));
      }
      if (role === "administrator") assert(!page.data.includes("Register member"));
    }
  });
  await check("Independent farmer completes own funding, harvest, sale, payment, correction and closure", async () => {
    const cid=ids.independentCult;
    await create(independent,"investment",{description:"Independent funding",investor:"Self",amount:1000},cid);
    const harvest=await create(independent,"harvest",{description:"Independent harvest",grade:"A",total:20,saleable:18,loss:2},cid);
    const sale=await create(independent,"sale",{harvest_id:harvest,buyer:"Independent buyer",kg:10,price:50},cid);
    const payment=await create(independent,"payment",{sale_id:sale,amount:200,method:"Cash"},cid);
    let c=(await independent.snapshot()).cultivations.find(c=>c.id===cid);
    assert.equal(c.summary.cash,10000);
    assert.equal(c.summary.revenue,50000);
    assert.equal(c.summary.receivable,30000);
    assert.equal(c.summary.profit,40000);
    assert.equal(c.summary.cashPosition,110000);
    assert.equal((await independent.write({action:"void",id:sale,reason:"Cannot void before payment"})).status,409);
    assert.equal((await independent.write({action:"void",id:payment,reason:"Correct test payment"})).status,200);
    await create(independent,"payment",{sale_id:sale,amount:250,method:"Cash"},cid);
    c=(await independent.snapshot()).cultivations.find(c=>c.id===cid);
    assert.equal(c.summary.receivable,25000);
    assert.equal((await independent.request("/api/export?type=ledger")).status,200);
    assert.equal((await independent.write({action:"updateCultivation",cultivation_id:cid,budget:1000,forecast_kg:100,status:"closed"})).status,200);
    assert.equal((await independent.write({kind:"activity",cultivation_id:cid,date:"2026-10-01",data:{description:"Closed season",category:"Labour",quantity:1,unit:"day"}})).status,409);
    assert.equal((await independent.write({action:"validate",cultivation_id:cid,validated:true})).status,403);
    assert.equal((await admin.write({action:"validate",cultivation_id:cid,validated:true})).status,200);
  });
  await check("Administrator maintains crop catalogue and reference-area policy", async () => {
    const crop=await create(admin,"crop",{name:"QA Catalogue Crop",varieties:"QA One, QA Two"});
    assert.equal((await admin.write({action:"editCrop",id:crop,data:{name:"QA Updated Catalogue Crop",varieties:"QA Three"}})).status,200);
    await create(admin,"area",{crop_id:crop,district:"QA Policy District",approved:true});
    const state=await admin.snapshot();
    assert(state.crops.some(c=>c.id===crop && c.name==="QA Updated Catalogue Crop"));
    assert(state.areas.some(a=>a.crop_id===crop && a.approved));
  });
  await check("Supervisor cannot manage funding, budgets, accounts, policies or assignments", async () => {
    for (const body of [
      {kind:"investment", cultivation_id:ids.cultivation, date:"2026-10-01", data:{description:"Forbidden capital",investor:"QA",amount:1}},
      {action:"updateCultivation",cultivation_id:ids.cultivation,budget:1,forecast_kg:1,status:"active"},
      {action:"assign",cultivation_id:ids.cultivation,user_id:ids.supervisor},
      {action:"userActive",id:ids.independent,active:false},
      {kind:"area",data:{crop_id:"watermelon",district:"QA District",approved:true}},
      {kind:"crop",data:{name:"Unauthorized crop",varieties:"QA"}},
    ]) assert.equal((await supervisor.write(body)).status,403,JSON.stringify(body));
    assert.equal((await land(supervisor,initialLand)).status,403);
    assert.equal((await supervisor.auth({action:"resetPassword",user_id:ids.independent,password})).status,403);
    assert.equal((await reg(supervisor,{action:"memberActive",id:ids.farmerA,active:false})).status,403);
  });
  await check("Independent and organization owners cannot grant administrator privileges or approve organizations", async () => {
    for (const as of [independent,owner]) {
      assert.equal((await as.write({kind:"user",data:{name:"Escalation",email:"escalation@example.test",password,role:"admin"}})).status,403);
      assert.equal((await reg(as,{action:"reviewOrganization",id:ids.org,status:"approved",note:"Self approval"})).status,403);
      assert.equal((await as.auth({action:"resetPassword",user_id:ids.supervisor,password})).status,403);
    }
  });
  await check("Removing supervisor assignment revokes operational and receipt access immediately", async () => {
    const before=await supervisor.snapshot();
    assert(before.cultivations.some(c=>c.id===ids.cultivation));
    assert.equal((await owner.write({action:"assign",cultivation_id:ids.cultivation,user_id:ids.supervisor,remove:true})).status,200);
    assert(!(await supervisor.snapshot()).cultivations.some(c=>c.id===ids.cultivation));
    assert.equal((await supervisor.write({kind:"activity",cultivation_id:ids.cultivation,date:"2026-10-01",data:{description:"Unassigned",category:"Labour",quantity:1,unit:"days"}})).status,403);
    assert.equal((await uploadReceipt(supervisor,ids.expenseA)).status,403);
    assert.equal((await owner.write({action:"assign",cultivation_id:ids.cultivation,user_id:ids.supervisor})).status,200);
    assert((await supervisor.snapshot()).cultivations.some(c=>c.id===ids.cultivation));
  });
  await check("Organization farmer password change revokes old sessions and preserves own-expense access", async () => {
    const old=client();
    assert.equal((await old.auth({action:"login",identifier:"0770000031",password})).status,200);
    const replacement="QA-farmer-replacement-2026!";
    assert.equal((await farmerA.auth({action:"changePassword",currentPassword:password,password:replacement})).status,200);
    assert.equal((await old.request("/api/data")).status,401);
    const fresh=client();
    assert.equal((await fresh.auth({action:"login",identifier:"0770000031",password})).status,401);
    assert.equal((await fresh.auth({action:"login",identifier:"0770000031",password:replacement})).status,200);
    assert((await fresh.snapshot()).entries.every(e=>e.kind==="expense"));
    assert.equal((await farmerA.auth({action:"changePassword",currentPassword:replacement,password})).status,200);
  });
  await check(
    "Removing farmer assignment prevents new attribution without hiding historical expenses",
    async () => {
      assert.equal(
        (
          await reg(owner, {
            action: "assignFarmer",
            cultivation_id: ids.cultivation,
            farmer_id: ids.farmerA,
            remove: true,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await supervisor.write({
            kind: "expense",
            cultivation_id: ids.cultivation,
            date: "2026-10-01",
            data: {
              description: "After unassignment",
              category: "Other",
              basis: "cash",
              amount: 1,
              farmer_id: ids.farmerA,
            },
          })
        ).status,
        400,
      );
      assert.equal((await farmerA.snapshot()).entries.length, 2);
      await reg(owner, {
        action: "assignFarmer",
        cultivation_id: ids.cultivation,
        farmer_id: ids.farmerA,
      });
    },
  );
  await check(
    "Organization and member deactivation decisions immediately enforce access",
    async () => {
      assert.equal(
        (
          await reg(owner, {
            action: "memberActive",
            id: ids.farmerB,
            active: false,
          })
        ).status,
        200,
      );
      assert.equal((await farmerB.request("/api/data")).status, 401);
      await reg(owner, {
        action: "memberActive",
        id: ids.farmerB,
        active: true,
      });
      await farmerB.auth({
        action: "login",
        identifier: "qa-farmer-b@example.test",
        password,
      });
      await reg(admin, {
        action: "reviewOrganization",
        id: ids.org,
        status: "needs_info",
        note: "Recheck organization record",
      });
      assert.equal((await farmerA.snapshot()).entries.length, 0);
      assert.equal(
        (await farmerA.request("/api/receipts?id=" + ids.receiptA)).status,
        403,
      );
      assert.equal(
        (
          await supervisor.write({
            kind: "activity",
            cultivation_id: ids.cultivation,
            date: "2026-10-01",
            data: {
              description: "Bypass",
              category: "Other",
              quantity: 1,
              unit: "day",
            },
          })
        ).status,
        403,
      );
      await reg(admin, {
        action: "reviewOrganization",
        id: ids.org,
        status: "approved",
        note: "Organization review completed",
      });
    },
  );
  await check(
    "Harvest/sales/payment calculations, concurrent stock checks and partial payments",
    async () => {
      await create(
        owner,
        "investment",
        { description: "Capital", investor: "Owner", amount: 10000 },
        ids.cultivation,
      );
      ids.harvest = await create(
        supervisor,
        "harvest",
        {
          description: "First harvest",
          grade: "A",
          total: 100,
          saleable: 90,
          loss: 10,
        },
        ids.cultivation,
      );
      const results = await Promise.all(
        [1, 2].map(() =>
          supervisor.write({
            kind: "sale",
            cultivation_id: ids.cultivation,
            date: "2026-10-01",
            data: {
              harvest_id: ids.harvest,
              buyer: "QA Buyer",
              kg: 50,
              price: 100,
            },
          }),
        ),
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      ids.sale = results.find((r) => r.status === 200).data.id;
      await create(
        supervisor,
        "payment",
        { sale_id: ids.sale, amount: 2000, method: "Cash" },
        ids.cultivation,
      );
      assert.equal(
        (
          await supervisor.write({
            kind: "payment",
            cultivation_id: ids.cultivation,
            date: "2026-10-01",
            data: { sale_id: ids.sale, amount: 3001, method: "Cash" },
          })
        ).status,
        409,
      );
      const s = (await owner.snapshot()).cultivations[0].summary;
      assert.equal(s.revenue, 500000);
      assert.equal(s.receivable, 300000);
      assert.equal(s.profit, 150000);
      assert.equal(s.cashPosition, 900000);
    },
  );
  await check(
    "Corrections retain attribution and farmer totals exclude voided costs",
    async () => {
      const e = await create(
        supervisor,
        "expense",
        {
          description: "Duplicate Farmer A",
          category: "Other",
          basis: "cash",
          amount: 1,
          farmer_id: ids.farmerA,
        },
        ids.cultivation,
      );
      assert.equal(
        (
          await supervisor.write({
            action: "void",
            id: e,
            reason: "Duplicate invoice",
          })
        ).status,
        200,
      );
      const a = await farmerA.snapshot();
      assert(a.entries.find((x) => x.id === e).voided);
      assert.equal(
        a.entries
          .filter((x) => !x.voided)
          .reduce((n, e) => n + e.payload.amount, 0),
        150000,
      );
      assert.equal(
        (
          await supervisor.write({
            action: "void",
            id: ids.harvest,
            reason: "Dependency test",
          })
        ).status,
        409,
      );
    },
  );
  await check(
    "Request origin, size, malformed JSON and numeric precision guards",
    async () => {
      assert.equal(
        (
          await admin.request("/api/data", {
            method: "POST",
            origin: "https://untrusted.example",
            body: {},
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await admin.request("/api/data", {
            method: "POST",
            raw: "{",
            headers: { "Content-Type": "application/json" },
          })
        ).status,
        400,
      );
      assert.equal(
        (await admin.write({ large: "a".repeat(25000) })).status,
        400,
      );
      assert.equal(
        (
          await supervisor.write({
            kind: "expense",
            cultivation_id: ids.cultivation,
            date: "2026-10-01",
            data: {
              description: "Precision",
              category: "Other",
              basis: "cash",
              amount: 1.001,
              farmer_id: ids.farmerA,
            },
          })
        ).status,
        400,
      );
      const f = new FormData();
      f.set("data", JSON.stringify(initialLand));
      f.set(
        "sketch",
        new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" }),
        "large.png",
      );
      assert.equal(
        (await independent.request("/api/lands", { method: "POST", raw: f }))
          .status,
        400,
      );
    },
  );
  await check(
    "Password maintenance, session revocation and login throttling",
    async () => {
      const old = client();
      await old.auth({ action: "login", identifier: "0770000011", password });
      assert.equal(
        (
          await independent.auth({
            action: "changePassword",
            currentPassword: "wrong",
            password: "Replacement-password!",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await independent.auth({
            action: "changePassword",
            currentPassword: password,
            password: "Replacement-password!",
          })
        ).status,
        200,
      );
      assert.equal((await old.request("/api/data")).status, 401);
      await admin.auth({
        action: "resetPassword",
        user_id: ids.independent,
        password,
      });
      await independent.auth({
        action: "login",
        identifier: "0770000011",
        password,
      });
      const attacker = client();
      for (let i = 0; i < 10; i++)
        assert.equal(
          (
            await attacker.auth({
              action: "login",
              identifier: "notfound@example.test",
              password: "bad",
            })
          ).status,
          401,
        );
      assert.equal(
        (
          await attacker.auth({
            action: "login",
            identifier: "notfound@example.test",
            password: "bad",
          })
        ).status,
        429,
      );
    },
  );
  await check(
    "Land edits enforce ownership and allocated field area",
    async () => {
      const orgState = await owner.snapshot();
      const orgField = orgState.fields.find((f) => f.id === ids.orgField);
      assert.equal(
        (
          await owner.write({
            action: "editField",
            id: ids.orgField,
            data: { name: "Oversized field", acres: 3 },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await owner.write({
            kind: "field",
            data: {
              farm_id: orgField.farm_id,
              name: "Additional field",
              acres: 0.1,
            },
          })
        ).status,
        409,
      );

      const s = await independent.snapshot(),
        l = s.lands.find((x) => x.id === ids.independentLand);
      assert.equal(
        (await land(owner, { ...l, name: "Stolen edit" }, { id: l.id })).status,
        403,
      );
      assert.equal(
        (
          await land(
            independent,
            { ...l, name: "QA updated land" },
            { id: l.id },
          )
        ).status,
        200,
      );
      assert.equal(
        (await land(independent, { ...l, area: 0.1 }, { id: l.id })).status,
        409,
      );
      assert.equal(
        (await independent.snapshot()).lands.find((x) => x.id === l.id).name,
        "QA updated land",
      );
    },
  );
  await check(
    "Closure/validation and audit exports retain prior financial protections",
    async () => {
      assert.equal(
        (
          await owner.write({
            action: "updateCultivation",
            cultivation_id: ids.cultivation,
            budget: 10000,
            forecast_kg: 1000,
            status: "closed",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await supervisor.write({
            kind: "expense",
            cultivation_id: ids.cultivation,
            date: "2026-10-01",
            data: {
              description: "Closed",
              category: "Other",
              basis: "cash",
              amount: 1,
              farmer_id: ids.farmerA,
            },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await owner.write({
            action: "validate",
            cultivation_id: ids.cultivation,
            validated: true,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await admin.write({
            action: "validate",
            cultivation_id: ids.cultivation,
            validated: true,
          })
        ).status,
        200,
      );
      const audit = await admin.request("/api/export?kind=audit");
      assert.equal(audit.status, 200);
      assert(audit.data.includes("organization approved"));
      assert.equal(
        (await owner.request("/api/export?kind=summary")).status,
        200,
      );
    },
  );
  await check("Self-employed farmer edits own profile; updated identifiers work and duplicate/unsafe changes roll back", async () => {
    const as = client();
    assert.equal((await registration(as,"independent",account("QA Profile Farmer","qa-profile@example.test","0770000075"))).status,200);
    const initial=await as.snapshot();
    const original={name:initial.user.name,mobile:initial.user.mobile,email:initial.user.email,district:initial.user.district,village:initial.user.village};
    const save=body=>as.request("/api/profile",{method:"POST",body});
    for (const body of [{...original,role:"admin"},{...original,user_id:ids.independent},{...original,organization_id:ids.org},{...original,public_id:"CHANGED"},{...original,language:"si"},{...original,password:"not-allowed"}]) assert.equal((await save(body)).status,400);
    for (const body of [{...original,name:" "},{...original,email:"bad-address"},{...original,email:"private@mobile.invalid"},{...original,mobile:"invalid"},{...original,district:""},{...original,village:""}]) assert.equal((await save(body)).status,400);
    for (const body of [{...original,email:"QA-OWNER@EXAMPLE.TEST"},{...original,mobile:"0770000031"}]) assert.equal((await save(body)).status,409);
    assert.equal((await as.snapshot()).user.email,original.email);
    assert.equal((await as.request("/api/profile",{method:"POST",body:original,origin:"https://invalid.example"})).status,403);
    const edited={name:"QA Updated Profile Farmer",mobile:"0770000076",email:"QA-PROFILE-EDITED@EXAMPLE.TEST",district:"Updated district",village:"Updated village"};
    assert.equal((await save(edited)).status,200);
    const updated=await as.snapshot();
    assert.equal(updated.user.id,initial.user.id); assert.equal(updated.user.public_id,initial.user.public_id);
    assert.equal(updated.user.account_type,"independent"); assert.equal(updated.user.language,"en");
    assert.equal(updated.user.mobile,"+94770000076"); assert.equal(updated.user.email,"qa-profile-edited@example.test");
    assert.equal(updated.user.name,edited.name); assert.equal(updated.user.district,edited.district); assert.equal(updated.user.village,edited.village);
    assert.deepEqual(updated.lands.map(({owner_name,...land})=>land),initial.lands.map(({owner_name,...land})=>land));
    assert(updated.lands.every(land=>land.owner_name===edited.name));
    for (const identifier of ["0770000076","qa-profile-edited@example.test"]) {
      const login=client(); assert.equal((await login.auth({action:"login",identifier,password})).status,200);
      assert.equal((await login.snapshot()).user.name,edited.name);
    }
    for (const identifier of ["0770000075","qa-profile@example.test"]) assert.equal((await client().auth({action:"login",identifier,password})).status,401);
    assert(updated.audit.some(a=>a.event==="own profile updated"));
    assert.equal((await save({...edited,email:""})).status,200);
    assert.equal((await as.snapshot()).user.email,"");
    assert.equal((await client().auth({action:"login",identifier:"0770000076",password})).status,200);
    assert.equal((await save(original)).status,200);
  });
  await check("Profile endpoint denies every other role and anonymous requests", async () => {
    const profile={name:"Attempt",mobile:"0770000077",email:"",district:"Test",village:"Test"};
    for (const as of [admin,owner,supervisor,farmerA,farmerB]) {
      const before=(await as.snapshot()).user;
      assert.equal((await as.request("/api/profile",{method:"POST",body:profile})).status,403);
      assert.equal((await as.snapshot()).user.name,before.name);
    }
    assert.equal((await anonymous.request("/api/profile",{method:"POST",body:profile})).status,401);
  });
  await check(
    "Persistence preserves membership, approvals, expenses, sketches and language after restart",
    async () => {
      assert.equal((await independent.request("/api/preferences",{method:"POST",body:{language:"si"}})).status,200);
      await stop();
      start();
      await ready();
      assert.equal((await independent.snapshot()).user.language,"si");
      assert.equal((await independent.request("/api/preferences",{method:"POST",body:{language:"en"}})).status,200);
      const s = await owner.snapshot();
      assert.equal(s.user.organization_status, "approved");
      assert.equal(s.members.length, 3);
      assert.equal(
        (await farmerA.snapshot()).entries.filter((e) => !e.voided).length,
        2,
      );
      assert.equal(
        (
          await independent.request(
            "/api/documents?id=" + ids.independentSketch,
          )
        ).status,
        200,
      );
    },
  );
  await owner.write({
    action: "updateCultivation",
    cultivation_id: ids.cultivation,
    budget: 10000,
    forecast_kg: 1000,
    status: "active",
  });
  await check(
    "Pending applicant page remains separated from organization operations",
    async () => {
      const pending = client();
      const o = {
        ...orgDetails,
        name: "QA Pending Investor",
        type: "investor",
        registration_number: "",
        email: "qa-pending-business@example.test",
        status: "approved",
      };
      const r = await registration(
        pending,
        "organization",
        {
          ...account(
            "QA Pending Owner",
            "qa-pending-owner@example.test",
            "0770000049",
          ),
          role: "admin",
        },
        o,
      );
      assert.equal(r.status, 200);
      const html = await pending.request("/");
      assert.equal(html.status, 200);
      assert(html.data.includes("Organization application"));
      assert(!html.data.includes("A clearer view of your farm."));
      assert.equal(
        (await pending.snapshot()).user.organization_status,
        "pending",
      );
    },
  );
  await check("Dedicated administrator workspace and summary endpoint enforce administrator-only access", async () => {
    const anonymous = client();
    assert.equal((await anonymous.request('/api/admin')).status,401);
    for (const actor of [independent,owner,supervisor,farmerA]) assert.equal((await actor.request('/api/admin')).status,403);
    const dashboard = await admin.request('/api/admin');
    assert.equal(dashboard.status,200);
    assert.equal(dashboard.headers.get('cache-control'),'no-store');
    const d=dashboard.data, s=d.adminSummary;
    assert.equal(s.users,d.users.length);
    assert.equal(s.active+s.inactive,s.users);
    assert.equal(s.organizations,d.organizations.length);
    assert.equal(s.statuses.pending,d.organizations.filter(o=>o.status==='pending').length);
    const html=await admin.request('/');
    assert.equal(html.status,200);
    assert(html.data.includes('SYSTEM ADMINISTRATION'));
    assert(html.data.includes('Users by account category'));
    assert(!html.data.includes('Cash cultivation cost'));
    assert(!html.data.includes('Add record'));
    const target=d.users.find(u=>u.email==='qa-profile@example.test');
    assert(target);
    assert.equal((await admin.write({action:'userActive',id:target.id,active:false})).status,200);
    const after=(await admin.request('/api/admin')).data;
    assert.equal(after.adminSummary.inactive,s.inactive+1);
    assert.equal(after.adminSummary.active,s.active-1);
    assert.equal((await admin.write({action:'userActive',id:target.id,active:true})).status,200);
  });
  report.finished = new Date().toISOString();
  report.passed = report.checks.length;
  writeFileSync("docs/qa-http-results.json", JSON.stringify(report, null, 2));
  console.log(`\n${report.passed} integration groups passed. Server ${base}`);
  if (keep) {
    console.log("Disposable QA installation kept for browser checks.");
    await new Promise((resolve) => {
      process.once("SIGTERM", resolve);
      process.once("SIGINT", resolve);
    });
  }
  await stop();
  if (!keep) rmSync(storage, { recursive: true, force: true });
} catch (e) {
  console.error(e);
  console.error(logs.slice(-5000));
  report.error = String(e);
  writeFileSync("docs/qa-http-results.json", JSON.stringify(report, null, 2));
  if (server && !server.exitCode) await stop();
  process.exitCode = 1;
}
