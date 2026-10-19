import { assertOperational, hydrateUser } from "./access";
import { registrationView } from "./registration";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { all, one, run, transaction, Row } from "./db";
import { admin, hashPassword } from "./auth";
import { eligibleBenchmark, totals, median } from "./domain";
const text = z.string().trim().min(1).max(200),
  id = z.string().min(1).max(100),
  positive = z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce
      .number()
      .positive()
      .max(1e8)
      .refine(
        (n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 0.00001,
        "Use at most three decimal places",
      ),
  ),
  nonnegative = z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce.number().min(0).max(1e10),
  ),
  money = nonnegative
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
      "Use at most two decimal places",
    )
    .refine(
      (n) => Number.isSafeInteger(Math.round(n * 100)),
      "Amount is too large",
    )
    .transform((n) => Math.round(n * 100));
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Invalid date",
  );
const pastDate = date.refine(
  (s) => s <= new Date(Date.now() + 19800000).toISOString().slice(0, 10),
  "Actual record dates cannot be in the future",
);
const quantity = nonnegative.refine(
  (n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 0.00001,
  "Use at most three decimal places",
);
const category = z.enum([
  "Seeds",
  "Fertilizer",
  "Chemicals",
  "Labour",
  "Irrigation",
  "Machinery",
  "Transport",
  "Harvesting",
  "Land",
  "Other",
]);
const schemas: Record<string, z.ZodType> = {
  farm: z.object({ name: text, district: text, owner_id: id }),
  field: z.object({ farm_id: id, name: text, acres: positive }),
  cultivation: z
    .object({
      field_id: id,
      crop_id: id,
      name: text,
      variety: text,
      planted: date,
      harvest_date: date,
      acres: positive,
      budget: money,
      forecast_kg: quantity,
    })
    .refine(
      (v) => v.harvest_date >= v.planted,
      "Harvest date must follow planting date",
    ),
  activity: z.object({
    description: text,
    category,
    quantity: quantity,
    unit: text,
    notes: z.string().max(1000).optional(),
  }),
  expense: z.object({
    description: text,
    category,
    amount: money.refine((n) => n > 0),
    basis: z.enum(["cash", "imputed"]),
    activity_id: z.string().max(100).optional(),
    farmer_id: z.string().max(100).optional(),
  }),
  investment: z.object({
    description: text,
    amount: money.refine((n) => n > 0),
    investor: text,
  }),
  harvest: z
    .object({
      description: text,
      grade: text,
      total: positive,
      saleable: quantity,
      loss: quantity,
    })
    .refine(
      (v) =>
        Math.round(v.total * 1000) ===
        Math.round(v.saleable * 1000) + Math.round(v.loss * 1000),
      "Total must equal saleable kg plus loss kg",
    ),
  sale: z.object({
    harvest_id: id,
    buyer: text,
    kg: positive,
    price: money.refine((n) => n > 0),
  }),
  payment: z.object({
    sale_id: id,
    amount: money.refine((n) => n > 0),
    method: z.enum(["Cash", "Bank transfer", "Cheque", "Other"]),
    reference: z.string().max(200).optional(),
  }),
  user: z.object({
    name: text,
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(12).max(256),
    role: z.enum(["farmer", "grower", "supervisor", "admin"]),
  }),
  crop: z.object({ name: text, varieties: z.string().max(1500) }),
  area: z.object({ crop_id: id, district: text, approved: z.boolean() }),
};
function parse(kind: string, data: any): Row {
  const schema = schemas[kind];
  if (!schema) throw new Error("400: Unknown record type.");
  const result = schema.safeParse(data);
  if (!result.success)
    throw new Error(
      "400: " +
        result.error.issues
          .map((i) => i.path.length ? `${i.path.join(" ")}: ${i.message}` : i.message)
          .join("; "),
    );
  return result.data as Row;
}
export function cultivation(user: Row, id: string, manage = false): Row {
  user = assertOperational(user);
  const c = one(
    "SELECT c.*,f.district,f.id farm_id FROM cultivations c JOIN fields fi ON fi.id=c.field_id JOIN farms f ON f.id=fi.farm_id WHERE c.id=?",
    id,
  );
  if (!c) throw new Error("404: Cultivation not found.");
  if (user.role === "supervisor") {
    const owner = hydrateUser(
      one("SELECT id,role FROM users WHERE id=?", c.owner_id)!,
    );
    if (owner.organization_id !== user.organization_id)
      throw new Error("403: This cultivation belongs to another organization.");
  }
  if (user.role === "admin" || c.owner_id === user.id) return c;
  if (
    !manage &&
    user.role === "supervisor" &&
    one(
      "SELECT 1 FROM assignments WHERE cultivation_id=? AND user_id=?",
      id,
      user.id,
    )
  )
    return c;
  throw new Error("403: This cultivation is not assigned to you.");
}
function ownedFarm(user: Row, id: string) {
  const f = one("SELECT * FROM farms WHERE id=?", id);
  if (!f) throw new Error("404: Farm not found.");
  if (user.role !== "admin" && f.owner_id !== user.id)
    throw new Error("403: Farm owner access required.");
  return f;
}
export function audit(
  user: Row,
  event: string,
  target: string,
  cid: string | null,
  before: any,
  after: any,
) {
  run(
    "INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)",
    randomUUID(),
    user.id,
    cid,
    event,
    target,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
    new Date().toISOString(),
  );
}
export function entriesFor(cid: string): Row[] {
  return all(
    "SELECT * FROM entries WHERE cultivation_id=? ORDER BY date DESC,created_at DESC",
    cid,
  ).map((e) => ({ ...e, payload: JSON.parse(e.payload) }));
}
export function snapshot(user: Row): Row {
  user = hydrateUser(user);
  if (user.account_type === "organization_farmer") {
    const entries =
      user.organization_status === "approved"
        ? all(
            "SELECT e.id,e.date,e.voided,e.payload,c.name cultivation_name,u.name recorded_by FROM entries e JOIN expense_farmers ef ON ef.entry_id=e.id JOIN cultivations c ON c.id=e.cultivation_id JOIN profiles p ON p.user_id=c.owner_id JOIN users u ON u.id=e.created_by WHERE e.kind='expense' AND ef.farmer_id=? AND p.organization_id=? ORDER BY e.date DESC,e.created_at DESC",
            user.id,
            user.organization_id,
          ).map((e) => {
            const p = JSON.parse(e.payload);
            return {
              id: e.id,
              kind: "expense",
              date: e.date,
              voided: e.voided,
              cultivation_name: e.cultivation_name,
              recorded_by: e.recorded_by,
              payload: {
                description: p.description,
                category: p.category,
                basis: p.basis,
                amount: p.amount,
              },
            };
          })
        : [];
    const ids = new Set(entries.map((e) => e.id));
    return {
      user,
      restricted: true,
      entries,
      receipts: all("SELECT id,entry_id,name,mime,size FROM receipts").filter(
        (r) => ids.has(r.entry_id),
      ),
    };
  }
  if (user.organization_status && user.organization_status !== "approved")
    return {
      user,
      restricted: true,
      entries: [],
      cultivations: [],
      ...registrationView(user),
    };

  const cs = all(
    "SELECT c.*,cr.name crop,f.district,fi.name field,f.name farm,op.organization_id owner_organization_id FROM cultivations c JOIN fields fi ON fi.id=c.field_id JOIN farms f ON f.id=fi.farm_id JOIN crops cr ON cr.id=c.crop_id LEFT JOIN profiles op ON op.user_id=c.owner_id",
  ).filter(
    (c) =>
      user.role === "admin" ||
      c.owner_id === user.id ||
      (user.role === "supervisor" &&
        (c.owner_organization_id || null) === user.organization_id &&
        one(
          "SELECT 1 FROM assignments WHERE cultivation_id=? AND user_id=?",
          c.id,
          user.id,
        )),
  );
  const cids = new Set(cs.map((c) => c.id)),
    fids = new Set(cs.map((c) => c.field_id));
  const fields = all(
    "SELECT fi.*,f.owner_id,f.name farm FROM fields fi JOIN farms f ON f.id=fi.farm_id",
  ).filter(
    (f) => user.role === "admin" || f.owner_id === user.id || fids.has(f.id),
  );
  const farmids = new Set(fields.map((f) => f.farm_id));
  const farms = all("SELECT * FROM farms").filter(
    (f) => user.role === "admin" || f.owner_id === user.id || farmids.has(f.id),
  );
  const entries: Row[] = all(
    "SELECT * FROM entries ORDER BY date DESC,created_at DESC",
  )
    .filter((e) => cids.has(e.cultivation_id))
    .map((e) => ({ ...e, payload: JSON.parse(e.payload) }));
  const eids = new Set(entries.map((e) => e.id));
  const benchmarks: Row[] = all(
    "SELECT c.*,f.district,COALESCE(a.approved,0) approved FROM cultivations c JOIN fields fi ON fi.id=c.field_id JOIN farms f ON f.id=fi.farm_id LEFT JOIN areas a ON a.crop_id=c.crop_id AND lower(a.district)=lower(f.district)",
  ).map((c) => ({ ...c, ...totals(entriesFor(c.id) as any) }));
  const areas = all("SELECT * FROM areas");
  const saleSamples = benchmarks
    .filter((c) => c.status === "closed" && c.validated && c.approved)
    .flatMap((c) => {
      const es = entriesFor(c.id).filter((e) => !e.voided);
      return es
        .filter((e) => e.kind === "sale")
        .map((e) => ({
          crop_id: c.crop_id,
          district: c.district,
          owner_id: c.owner_id,
          date: e.date,
          price: e.payload.price,
          grade:
            es.find((h) => h.id === e.payload.harvest_id)?.payload.grade ||
            "Unspecified",
        }));
    })
    .filter(
      (s) =>
        s.date >=
        new Date(Date.now() - 30 * 86400000 + 19800000)
          .toISOString()
          .slice(0, 10),
    );
  const saleGroups = [
    ...new Set(
      saleSamples.map((s) => JSON.stringify([s.crop_id, s.district, s.grade])),
    ),
  ].map((key) => {
    const [crop_id, district, grade] = JSON.parse(key);
    const samples = saleSamples.filter(
      (s) =>
        s.crop_id === crop_id && s.district === district && s.grade === grade,
    );
    const owners = new Set(samples.map((s) => s.owner_id)).size;
    return {
      crop_id,
      district,
      grade,
      count: samples.length,
      owners,
      median:
        owners >= 3 && samples.length >= 3
          ? median(samples.map((s) => s.price))
          : null,
      windowDays: 30,
    };
  });

  return {
    ...registrationView(user),
    farmerAssignments: all(
      "SELECT a.*,u.name,p.public_id FROM farmer_assignments a JOIN users u ON u.id=a.farmer_id JOIN profiles p ON p.user_id=u.id",
    ).filter((a) => cids.has(a.cultivation_id)),
    expenseFarmers: all(
      "SELECT ef.*,u.name,p.public_id,p.organization_id FROM expense_farmers ef JOIN users u ON u.id=ef.farmer_id JOIN profiles p ON p.user_id=u.id",
    ).filter((e) => eids.has(e.entry_id)),
    saleBenchmarks: saleGroups,
    user,
    farms,
    fields,
    cultivations: cs.map((c) => ({
      ...c,
      summary: totals(entries.filter((e) => e.cultivation_id === c.id) as any),
      approved: areas.some(
        (a) =>
          a.approved &&
          a.crop_id === c.crop_id &&
          a.district.toLowerCase() === c.district.toLowerCase(),
      ),
    })),
    entries,
    crops: all("SELECT * FROM crops ORDER BY name"),
    assignments: all(
      "SELECT a.*,u.name FROM assignments a JOIN users u ON u.id=a.user_id",
    ).filter((a) => cids.has(a.cultivation_id)),
    users:
      user.role === "admin"
        ? all(
            "SELECT u.id,u.name,CASE WHEN u.email LIKE '%@mobile.invalid' THEN '' ELSE u.email END email,u.role,u.active,p.account_type,p.public_id,p.organization_id,p.mobile FROM users u LEFT JOIN profiles p ON p.user_id=u.id",
          )
        : user.role === "supervisor"
          ? []
          : all(
              "SELECT u.id,u.name,u.role,p.public_id FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.active=1 AND u.role='supervisor' AND p.organization_id=?",
              user.organization_id,
            ),
    areas,
    receipts: all("SELECT id,entry_id,name,mime,size FROM receipts").filter(
      (r) => eids.has(r.entry_id),
    ),
    audit: all(
      "SELECT a.*,u.name actor FROM audit a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC",
    )
      .filter(
        (a) =>
          user.role === "admin" ||
          (a.cultivation_id && cids.has(a.cultivation_id)) ||
          a.actor_id === user.id,
      )
      .slice(0, 300),
    benchmarks: all("SELECT * FROM crops").flatMap((cr) =>
      [
        ...new Set(
          benchmarks.filter((c) => c.crop_id === cr.id).map((c) => c.district),
        ),
      ].map((district) => ({
        crop: cr.name,
        crop_id: cr.id,
        district,
        ...eligibleBenchmark(
          benchmarks.filter(
            (c) => c.crop_id === cr.id && c.district === district,
          ),
        ),
      })),
    ),
  };
}
export function mutate(user: Row, body: Row) {
  user = assertOperational(user);
  return transaction(() => {
    const { kind, action = "create" } = body;
    if (
      ![
        "create",
        "userActive",
        "assign",
        "updateCultivation",
        "validate",
        "void",
        "editFarm",
        "editField",
        "editCrop",
        "editCultivation",
      ].includes(action)
    )
      throw new Error("400: Unknown action.");
    let cid = body.cultivation_id;
    const newId = randomUUID();

    if (action === "editFarm") {
      const old = ownedFarm(user, body.id);
      if (one("SELECT 1 FROM farm_lands WHERE farm_id=?", old.id))
        throw new Error(
          "400: Edit this registered land through Land records to keep location details consistent.",
        );
      const p = z.object({ name: text, district: text }).safeParse(body.data);
      if (!p.success) throw new Error("400: Enter a farm name and district.");
      run(
        "UPDATE farms SET name=?,district=? WHERE id=?",
        p.data.name,
        p.data.district,
        old.id,
      );
      const affected = all(
        "SELECT c.id FROM cultivations c JOIN fields f ON f.id=c.field_id WHERE f.farm_id=?",
        old.id,
      );
      for (const c of affected) {
        run("UPDATE cultivations SET validated=0 WHERE id=?", c.id);
        audit(user, "edit farm", old.id, c.id, old, p.data);
      }
      if (!affected.length) audit(user, "edit farm", old.id, null, old, p.data);
      return;
    }
    if (action === "editField") {
      const old = one("SELECT * FROM fields WHERE id=?", body.id);
      if (!old) throw new Error("404: Field not found.");
      ownedFarm(user, old.farm_id);
      const p = z.object({ name: text, acres: positive }).safeParse(body.data);
      if (!p.success)
        throw new Error("400: Enter a field name and positive area.");
      const occupied = one(
        "SELECT COALESCE(SUM(acres),0) n FROM cultivations WHERE field_id=? AND status!='closed'",
        old.id,
      )!.n;
      if (p.data.acres < occupied)
        throw new Error(
          "409: Field area is smaller than allocated cultivation area.",
        );
      const land = one(
        "SELECT l.acres FROM farm_lands fl JOIN lands l ON l.id=fl.land_id WHERE fl.farm_id=?",
        old.farm_id,
      );
      if (land) {
        const others = one(
          "SELECT COALESCE(SUM(acres),0) n FROM fields WHERE farm_id=? AND id!=?",
          old.farm_id,
          old.id,
        )!.n;
        if (others + p.data.acres > land.acres + 1e-7)
          throw new Error(
            "409: Total field area exceeds the registered land area.",
          );
      }
      run(
        "UPDATE fields SET name=?,acres=? WHERE id=?",
        p.data.name,
        p.data.acres,
        old.id,
      );
      audit(user, "edit field", old.id, null, old, p.data);
      return;
    }
    if (action === "editCrop") {
      admin(user);
      const old = one("SELECT * FROM crops WHERE id=?", body.id);
      if (!old) throw new Error("404: Crop not found.");
      const p = parse("crop", body.data);
      if (
        one(
          "SELECT id FROM crops WHERE lower(name)=lower(?) AND id!=?",
          p.name,
          old.id,
        )
      )
        throw new Error("409: Crop name is already used.");
      run(
        "UPDATE crops SET name=?,varieties=? WHERE id=?",
        p.name,
        JSON.stringify(
          p.varieties
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
        ),
        old.id,
      );
      audit(user, "edit crop", old.id, null, old, p);
      return;
    }
    if (action === "editCultivation") {
      const old = cultivation(user, cid, true);
      const p = z
        .object({
          name: text,
          variety: text,
          planted: date,
          harvest_date: date,
          acres: positive,
        })
        .safeParse(body.data);
      if (!p.success || p.data.harvest_date < p.data.planted)
        throw new Error("400: Check cultivation details and dates.");
      if (old.status === "closed")
        throw new Error(
          "409: Reopen the cultivation before editing its details.",
        );
      const first = one(
        "SELECT MIN(date) date FROM entries WHERE cultivation_id=? AND voided=0",
        cid,
      )?.date;
      if (first && p.data.planted > first)
        throw new Error(
          "409: Start date cannot be later than existing actual records.",
        );
      const fi = one("SELECT acres FROM fields WHERE id=?", old.field_id)!;
      const used = one(
        "SELECT COALESCE(SUM(acres),0) n FROM cultivations WHERE field_id=? AND id!=? AND status!='closed'",
        old.field_id,
        cid,
      )!.n;
      if (used + p.data.acres > fi.acres + 0.00001)
        throw new Error("409: Cultivated area exceeds available field area.");
      run(
        "UPDATE cultivations SET name=?,variety=?,planted=?,harvest_date=?,acres=?,validated=0 WHERE id=?",
        p.data.name,
        p.data.variety,
        p.data.planted,
        p.data.harvest_date,
        p.data.acres,
        cid,
      );
      audit(user, "edit cultivation details", cid, cid, old, p.data);
      return;
    }

    if (action === "userActive") {
      admin(user);
      if (body.id === user.id)
        throw new Error("400: You cannot deactivate your own account.");
      const u = one("SELECT id,active FROM users WHERE id=?", body.id);
      if (!u) throw new Error("404: User not found.");
      run("UPDATE users SET active=? WHERE id=?", body.active ? 1 : 0, body.id);
      run("DELETE FROM sessions WHERE user_id=?", body.id);
      audit(user, "user activation", body.id, null, u, {
        active: !!body.active,
      });
      return;
    }
    if (action === "assign") {
      const current = cultivation(user, cid, true);
      const currentOwner = hydrateUser(
        one("SELECT id,role FROM users WHERE id=?", current.owner_id)!,
      );
      if (
        !currentOwner.organization_id ||
        currentOwner.organization_status !== "approved"
      )
        throw new Error("403: Only approved organizations assign supervisors.");
      const member = one(
        "SELECT * FROM profiles WHERE user_id=?",
        body.user_id,
      );
      if (member?.organization_id !== currentOwner.organization_id)
        throw new Error("403: Select a supervisor from this organization.");
      const u = one(
        "SELECT id FROM users WHERE id=? AND role='supervisor' AND active=1",
        body.user_id,
      );
      if (!u) throw new Error("400: Choose an active supervisor.");
      if (body.remove)
        run(
          "DELETE FROM assignments WHERE cultivation_id=? AND user_id=?",
          cid,
          body.user_id,
        );
      else
        run("INSERT OR IGNORE INTO assignments VALUES(?,?)", cid, body.user_id);
      audit(
        user,
        body.remove ? "unassign" : "assign",
        body.user_id,
        cid,
        null,
        { user_id: body.user_id },
      );
      return;
    }
    if (action === "updateCultivation") {
      const c = cultivation(user, cid, true);
      const p = z
        .object({
          budget: money,
          forecast_kg: quantity,
          status: z.enum(["planned", "active", "closed"]),
        })
        .safeParse(body);
      if (!p.success) throw new Error("400: Invalid budget, yield or status.");
      if (c.status === "closed" && p.data.status !== "closed") {
        const field = one("SELECT acres FROM fields WHERE id=?", c.field_id)!;
        const occupied = one(
          "SELECT COALESCE(SUM(acres),0) n FROM cultivations WHERE field_id=? AND id!=? AND status!='closed'",
          c.field_id,
          cid,
        )!.n;
        if (occupied + c.acres > field.acres + 0.00001)
          throw new Error("409: Reopening exceeds available field area.");
      }
      run(
        "UPDATE cultivations SET budget=?,forecast_kg=?,status=?,validated=0 WHERE id=?",
        p.data.budget,
        p.data.forecast_kg,
        p.data.status,
        cid,
      );
      audit(user, "update cultivation", cid, cid, c, p.data);
      return;
    }
    if (action === "validate") {
      admin(user);
      const c = cultivation(user, cid);
      if (c.status !== "closed")
        throw new Error("400: Close the cultivation before validating it.");
      run(
        "UPDATE cultivations SET validated=? WHERE id=?",
        body.validated ? 1 : 0,
        cid,
      );
      audit(user, "validation", cid, cid, c, { validated: !!body.validated });
      return;
    }
    if (action === "void") {
      const e = one("SELECT * FROM entries WHERE id=?", body.id);
      if (!e) throw new Error("404: Record not found.");
      cid = e.cultivation_id;
      if (e.kind === "expense" && user.account_type === "organization_owner")
        throw new Error(
          "403: Organization expense corrections require a supervisor or administrator.",
        );
      const c = cultivation(user, cid, e.kind === "investment");
      if (c.status === "closed")
        throw new Error(
          "409: Reopen the cultivation before correcting records.",
        );
      if (e.voided) throw new Error("409: Record is already voided.");
      const reason = text.safeParse(body.reason);
      if (!reason.success) throw new Error("400: Enter a correction reason.");
      const deps = entriesFor(cid).filter(
        (x) =>
          !x.voided &&
          [
            x.payload.harvest_id,
            x.payload.sale_id,
            x.payload.activity_id,
          ].includes(e.id),
      );
      if (deps.length)
        throw new Error("409: Void linked payments, sales or costs first.");
      run("UPDATE entries SET voided=1 WHERE id=?", e.id);
      run("UPDATE cultivations SET validated=0 WHERE id=?", cid);
      audit(user, "void", e.id, cid, e, { reason: reason.data });
      return;
    }
    const p = parse(kind, body.data);
    switch (kind) {
      case "farm": {
        if (user.role === "supervisor")
          throw new Error("403: Owners create farms.");
        const owner = user.role === "admin" ? p.owner_id : user.id;
        if (
          !one(
            "SELECT id FROM users WHERE id=? AND active=1 AND role IN ('farmer','grower','admin')",
            owner,
          )
        )
          throw new Error("400: Choose an active farmer or grower.");
        run(
          "INSERT INTO farms VALUES(?,?,?,?)",
          newId,
          owner,
          p.name,
          p.district,
        );
        break;
      }
      case "field": {
        ownedFarm(user, p.farm_id);
        const land = one(
          "SELECT l.acres FROM farm_lands fl JOIN lands l ON l.id=fl.land_id WHERE fl.farm_id=?",
          p.farm_id,
        );
        if (land) {
          const used = one(
            "SELECT COALESCE(SUM(acres),0) n FROM fields WHERE farm_id=?",
            p.farm_id,
          )!.n;
          if (used + p.acres > land.acres + 1e-7)
            throw new Error(
              "409: Total field area exceeds this registered land. Adjust the existing main field area first.",
            );
        }
        run(
          "INSERT INTO fields VALUES(?,?,?,?)",
          newId,
          p.farm_id,
          p.name,
          p.acres,
        );
        break;
      }
      case "cultivation": {
        const fi = one("SELECT * FROM fields WHERE id=?", p.field_id);
        if (!fi) throw new Error("400: Choose a field.");
        const farm = ownedFarm(user, fi.farm_id);
        if (!one("SELECT id FROM crops WHERE id=?", p.crop_id))
          throw new Error("400: Choose a crop.");
        const occupied = one(
          "SELECT COALESCE(SUM(acres),0) n FROM cultivations WHERE field_id=? AND status!='closed'",
          p.field_id,
        )!.n;
        if (p.acres + occupied > fi.acres + 0.00001)
          throw new Error(
            "400: Active and planned cultivated area exceeds this field.",
          );
        run(
          "INSERT INTO cultivations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)",
          newId,
          farm.owner_id,
          p.field_id,
          p.crop_id,
          p.name,
          p.variety,
          p.planted,
          p.harvest_date,
          p.acres,
          p.budget,
          p.forecast_kg,
          p.planted > new Date(Date.now() + 19800000).toISOString().slice(0, 10)
            ? "planned"
            : "active",
        );
        cid = newId;
        break;
      }
      case "user": {
        admin(user);
        if (p.role === "grower" || p.role === "supervisor")
          throw new Error(
            "400: Register organizations through approval and add supervisors through the organization member form.",
          );
        if (one("SELECT id FROM users WHERE email=?", p.email))
          throw new Error("409: Email is already registered.");
        run(
          "INSERT INTO users VALUES(?,?,?,?,?,1)",
          newId,
          p.name,
          p.email,
          hashPassword(p.password),
          p.role,
        );
        run(
          "INSERT INTO profiles VALUES(?,?,?,?,?,?,?,?)",
          newId,
          "FR-" + newId,
          p.role === "farmer" ? "independent" : p.role,
          null,
          null,
          "",
          "",
          "",
        );
        delete p.password;
        break;
      }
      case "crop": {
        admin(user);
        if (one("SELECT id FROM crops WHERE lower(name)=lower(?)", p.name))
          throw new Error("409: Crop already exists.");
        run(
          "INSERT INTO crops VALUES(?,?,?)",
          newId,
          p.name,
          JSON.stringify(
            p.varieties
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean),
          ),
        );
        break;
      }
      case "area": {
        admin(user);
        if (!one("SELECT id FROM crops WHERE id=?", p.crop_id))
          throw new Error("400: Crop not found.");
        const existing = one(
          "SELECT * FROM areas WHERE crop_id=? AND lower(district)=lower(?)",
          p.crop_id,
          p.district,
        );
        if (existing) {
          run(
            "UPDATE areas SET approved=? WHERE id=?",
            p.approved ? 1 : 0,
            existing.id,
          );
          audit(user, "reference area policy", existing.id, null, existing, p);
          return;
        }
        run(
          "INSERT INTO areas VALUES(?,?,?,?)",
          newId,
          p.crop_id,
          p.district,
          p.approved ? 1 : 0,
        );
        break;
      }
      default: {
        const c = cultivation(user, cid, kind === "investment");
        const orgOwner = hydrateUser(
          one("SELECT id,role FROM users WHERE id=?", c.owner_id)!,
        );
        if (kind === "expense") {
          if (orgOwner.organization_id) {
            if (user.role !== "supervisor" && user.role !== "admin")
              throw new Error(
                "403: Organization expenses must be entered by an assigned supervisor.",
              );
            const farmer = one(
              "SELECT p.user_id FROM profiles p JOIN users u ON u.id=p.user_id JOIN farmer_assignments fa ON fa.farmer_id=p.user_id AND fa.cultivation_id=? WHERE p.user_id=? AND p.organization_id=? AND p.account_type='organization_farmer' AND u.active=1",
              cid,
              p.farmer_id || "",
              orgOwner.organization_id,
            );
            if (!farmer)
              throw new Error(
                "400: Select an active organization farmer assigned to this cultivation.",
              );
          } else if (p.farmer_id)
            throw new Error(
              "400: Independent expenses cannot be assigned to another farmer.",
            );
        }
        if (c.status === "closed")
          throw new Error(
            "409: Reopen this cultivation before adding records.",
          );
        const d = pastDate.safeParse(body.date);
        if (!d.success)
          throw new Error("400: Enter a valid actual date, today or earlier.");
        if (d.data < c.planted)
          throw new Error("400: Record date precedes cultivation start.");
        const entries = entriesFor(cid).filter((e) => !e.voided);
        if (kind === "expense" && p.activity_id) {
          const a = entries.find(
            (e) => e.id === p.activity_id && e.kind === "activity",
          );
          if (!a)
            throw new Error(
              "400: Linked activity must belong to this cultivation.",
            );
        }
        if (kind === "sale") {
          const h = entries.find(
            (e) => e.id === p.harvest_id && e.kind === "harvest",
          );
          if (!h) throw new Error("400: Choose a harvest in this cultivation.");
          if (d.data < h.date)
            throw new Error("400: Sale date precedes harvest.");
          const sold = entries
            .filter((e) => e.kind === "sale" && e.payload.harvest_id === h.id)
            .reduce((s, e) => s + e.payload.kg, 0);
          if (sold + p.kg > h.payload.saleable + 0.00001)
            throw new Error(
              "409: Sale quantity exceeds available harvest stock.",
            );
          if (!Number.isSafeInteger(Math.round(p.kg * p.price)))
            throw new Error("400: Sale value is too large.");
        }
        if (kind === "payment") {
          const s = entries.find(
            (e) => e.id === p.sale_id && e.kind === "sale",
          );
          if (!s) throw new Error("400: Choose a sale in this cultivation.");
          if (d.data < s.date)
            throw new Error("400: Payment date precedes sale.");
          const paid = entries
            .filter((e) => e.kind === "payment" && e.payload.sale_id === s.id)
            .reduce((s, e) => s + e.payload.amount, 0);
          if (paid + p.amount > Math.round(s.payload.kg * s.payload.price))
            throw new Error("409: Payment exceeds outstanding sale balance.");
        }
        run(
          "INSERT INTO entries VALUES(?,?,?,?,?,?,?,0)",
          newId,
          cid,
          kind,
          d.data,
          JSON.stringify(p),
          user.id,
          new Date().toISOString(),
        );
        if (kind === "expense" && p.farmer_id)
          run("INSERT INTO expense_farmers VALUES(?,?)", newId, p.farmer_id);
        run("UPDATE cultivations SET validated=0 WHERE id=?", cid);
        break;
      }
    }
    audit(user, "create " + kind, newId, cid || null, null, p);
    return { id: newId };
  });
}
