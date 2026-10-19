import { randomUUID } from "node:crypto";
import { z } from "zod";
import { all, one, run, transaction, Row } from "./db";
import { hydrateUser, requireOrganizationOwner } from "./access";
import { hashPassword } from "./auth";
const text = z.string().trim().min(1).max(200),
  optional = z.string().trim().max(200).default("");
import { normalizeMobile } from "./phone";
const phone = text.transform(normalizeMobile),
  email = z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine(
      (v) => v === "" || z.email().safeParse(v).success,
      "Enter a valid email address",
    );
const accountSchema = z.object({
  name: text,
  language: z.enum(["en", "si"]).default("en"),
  mobile: phone,
  email: email.default(""),
  password: z.string().min(12).max(256),
  district: text,
  village: text,
});
export const landSchema = z.object({
  name: text,
  district: text,
  village: text,
  location: z.string().trim().min(1).max(1000),
  area: z.coerce
    .number()
    .positive()
    .max(1e8)
    .refine(
      (v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 0.00001,
      "Use up to three decimal places",
    ),
  unit: z.enum(["acres", "hectares", "perches"]),
});
const organizationSchema = z.object({
  name: text,
  type: z.enum(["company", "organization", "grower", "investor"]),
  registration_number: optional,
  address: z.string().trim().min(1).max(1000),
  district: text,
  phone,
  email: z.email().trim().toLowerCase(),
  responsible_position: text,
});
function parsed<T>(schema: z.ZodType<T>, body: unknown): T {
  const p = schema.safeParse(body);
  if (!p.success)
    throw new Error(
      "400: " +
        p.error.issues
          .map((i) => `${i.path.join(" ")}: ${i.message}`)
          .join("; "),
    );
  return p.data;
}
export function event(
  actorId: string,
  event: string,
  targetId: string,
  after: unknown,
  before: unknown = null,
) {
  run(
    "INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)",
    randomUUID(),
    actorId,
    null,
    event,
    targetId,
    before ? JSON.stringify(before) : null,
    JSON.stringify(after),
    new Date().toISOString(),
  );
}
function publicId(prefix: string) {
  return (
    prefix + "-" + randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()
  );
}
function available(email: string, mobile: string) {
  if (
    (email && one("SELECT id FROM users WHERE lower(email)=?", email)) ||
    one("SELECT user_id FROM profiles WHERE mobile=?", mobile)
  )
    throw new Error("409: This email or mobile number is already registered.");
}
export function createLand(
  ownerId: string,
  orgId: string | null,
  data: unknown,
) {
  const p = parsed(landSchema, data),
    id = randomUUID(),
    acres =
      p.area *
      (p.unit === "hectares"
        ? 2.4710538147
        : p.unit === "perches"
          ? 1 / 160
          : 1);
  run(
    "INSERT INTO lands VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    id,
    publicId("LAND"),
    ownerId,
    orgId,
    p.name,
    p.district,
    p.village,
    p.location,
    p.area,
    p.unit,
    acres,
    new Date().toISOString(),
  );
  run("INSERT INTO farms VALUES(?,?,?,?)", id, ownerId, p.name, p.district);
  run(
    "INSERT INTO fields VALUES(?,?,?,?)",
    randomUUID(),
    id,
    p.name + " — main field",
    acres,
  );
  run("INSERT INTO farm_lands VALUES(?,?)", id, id);
  event(ownerId, "register land", id, p);
  return id;
}
export function register(kind: string, input: Row, hasVerification: boolean) {
  if (!["independent", "organization"].includes(kind))
    throw new Error(
      "400: Choose independent farmer or organization registration.",
    );
  const p = parsed(accountSchema, input.account),
    org =
      kind === "organization"
        ? parsed(organizationSchema, input.organization)
        : null;
  if (
    org &&
    ["company", "organization"].includes(org.type) &&
    (!org.registration_number || !hasVerification)
  )
    throw new Error(
      "400: Companies and organizations must provide a registration number and supporting registration document.",
    );
  parsed(landSchema, input.land);
  available(p.email, p.mobile);
  const uid = randomUUID(),
    orgId = org ? randomUUID() : null;
  run(
    "INSERT INTO users VALUES(?,?,?,?,?,1)",
    uid,
    p.name,
    p.email || uid + "@mobile.invalid",
    hashPassword(p.password),
    org ? "grower" : "farmer",
  );
  if (org)
    run(
      "INSERT INTO organizations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      orgId,
      publicId("ORG"),
      uid,
      org.name,
      org.type,
      org.registration_number,
      org.address,
      org.district,
      org.phone,
      org.email,
      org.responsible_position,
      "pending",
      "",
      null,
      null,
      new Date().toISOString(),
    );
  run(
    "INSERT INTO profiles VALUES(?,?,?,?,?,?,?,?)",
    uid,
    publicId(org ? "OWN" : "FR"),
    org ? "organization_owner" : "independent",
    orgId,
    p.mobile,
    p.district,
    p.village,
    "",
  );
  if (!org) run("INSERT INTO user_preferences(user_id,language) VALUES(?,?)", uid, p.language);
  const landId = createLand(uid, orgId, input.land);
  event(
    uid,
    org
      ? "organization application submitted"
      : "independent self-registration",
    orgId || uid,
    { status: org ? "pending" : "active" },
  );
  return { userId: uid, organizationId: orgId, landId };
}
export function registrationView(input: Row) {
  const user = hydrateUser(input),
    isAdmin = user.role === "admin";
  const organizations = isAdmin
    ? all(
        "SELECT o.*,u.name responsible_name FROM organizations o JOIN users u ON u.id=o.owner_id ORDER BY created_at DESC",
      )
    : user.account_type === "organization_owner"
      ? all(
          "SELECT o.*,u.name responsible_name FROM organizations o JOIN users u ON u.id=o.owner_id WHERE o.id=?",
          user.organization_id,
        )
      : [];
  const lands = isAdmin
    ? all(
        "SELECT l.*,u.name owner_name FROM lands l JOIN users u ON u.id=l.owner_id ORDER BY created_at DESC",
      )
    : ["independent", "organization_owner"].includes(user.account_type)
      ? all(
          "SELECT l.*,u.name owner_name FROM lands l JOIN users u ON u.id=l.owner_id WHERE l.owner_id=? ORDER BY created_at DESC",
          user.id,
        )
      : [];
  const ownerIds = new Set(organizations.map((o) => o.owner_id));
  ownerIds.add(user.id);
  const landIds = new Set(lands.map((l) => l.id));
  const docs = all(
    "SELECT id,owner_id,organization_id,land_id,purpose,name,mime,size,created_at FROM documents",
  ).filter(
    (d) =>
      isAdmin ||
      (user.account_type === "organization_owner" &&
        d.organization_id === user.organization_id) ||
      landIds.has(d.land_id),
  );
  const members = (
    isAdmin
      ? all(
          "SELECT u.id,u.name,u.email,u.role,u.active,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE p.organization_id IS NOT NULL AND p.account_type!='organization_owner'",
        )
      : user.account_type === "organization_owner" &&
          user.organization_status === "approved"
        ? all(
            "SELECT u.id,u.name,u.email,u.role,u.active,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE p.organization_id=? AND p.account_type!='organization_owner'",
            user.organization_id,
          )
        : []
  ).map((u) => ({
    ...u,
    email: u.email.endsWith("@mobile.invalid") ? "" : u.email,
  }));
  return { organizations, lands, documents: docs, members };
}
export function registrationAction(input: Row, body: Row) {
  const user = hydrateUser(input);
  if (body.action === "reviewOrganization") {
    if (user.role !== "admin")
      throw new Error(
        "403: Only the system administrator can review organizations.",
      );
    const org = one("SELECT * FROM organizations WHERE id=?", body.id);
    if (!org) throw new Error("404: Organization not found.");
    const status = parsed(
        z.enum(["approved", "rejected", "needs_info"]),
        body.status,
      ),
      note = parsed(text, body.note);
    if (status === "approved") {
      const p = parsed(organizationSchema, org);
      if (
        ["company", "organization"].includes(p.type) &&
        (!p.registration_number ||
          !one(
            "SELECT id FROM documents WHERE organization_id=? AND purpose='verification'",
            org.id,
          ))
      )
        throw new Error(
          "400: Registration verification information is incomplete.",
        );
      if (
        !one(
          "SELECT l.id FROM lands l JOIN documents d ON d.land_id=l.id AND d.purpose='sketch' WHERE l.organization_id=?",
          org.id,
        )
      )
        throw new Error(
          "400: At least one land and sketch is required before approval.",
        );
    }
    run(
      "UPDATE organizations SET status=?,review_note=?,reviewed_by=?,reviewed_at=? WHERE id=?",
      status,
      note,
      user.id,
      new Date().toISOString(),
      org.id,
    );
    event(user.id, "organization " + status, org.id, { status, note }, org);
    return;
  }
  if (body.action === "resubmitOrganization") {
    const org = requireOrganizationOwner(user);
    if (org.status === "approved")
      throw new Error(
        "409: An approved organization cannot resubmit an application.",
      );
    const p = parsed(organizationSchema, body.data);
    if (
      ["company", "organization"].includes(p.type) &&
      (!p.registration_number ||
        !one(
          "SELECT id FROM documents WHERE organization_id=? AND purpose='verification'",
          org.id,
        ))
    )
      throw new Error(
        "400: Provide a registration number and verification document.",
      );
    run(
      "UPDATE organizations SET name=?,type=?,registration_number=?,address=?,district=?,phone=?,email=?,responsible_position=?,status='pending',review_note='',reviewed_by=NULL,reviewed_at=NULL WHERE id=?",
      p.name,
      p.type,
      p.registration_number,
      p.address,
      p.district,
      p.phone,
      p.email,
      p.responsible_position,
      org.id,
    );
    event(user.id, "organization application resubmitted", org.id, p, org);
    return;
  }
  if (body.action === "addMember") {
    const org = requireOrganizationOwner(user, body.organization_id);
    if (org.status !== "approved")
      throw new Error(
        "403: Organization approval is required before registering members.",
      );
    const data = parsed(
      accountSchema.extend({
        account_type: z.enum(["organization_farmer", "supervisor"]),
        reference_number: optional,
      }),
      body.data,
    );
    available(data.email, data.mobile);
    const id = randomUUID();
    run(
      "INSERT INTO users VALUES(?,?,?,?,?,1)",
      id,
      data.name,
      data.email || id + "@mobile.invalid",
      hashPassword(data.password),
      data.account_type === "supervisor" ? "supervisor" : "farmer",
    );
    run(
      "INSERT INTO profiles VALUES(?,?,?,?,?,?,?,?)",
      id,
      publicId(data.account_type === "supervisor" ? "SUP" : "FR"),
      data.account_type,
      org.id,
      data.mobile,
      data.district,
      data.village,
      data.reference_number,
    );
    event(user.id, "register " + data.account_type, id, {
      organization_id: org.id,
      name: data.name,
    });
    return { id };
  }
  if (body.action === "assignFarmer") {
    const c = one("SELECT * FROM cultivations WHERE id=?", body.cultivation_id);
    if (!c) throw new Error("404: Cultivation not found.");
    const owner = hydrateUser(
      one("SELECT id,role FROM users WHERE id=?", c.owner_id)!,
    );
    const org = requireOrganizationOwner(user, owner.organization_id);
    if (org.status !== "approved" || org.owner_id !== c.owner_id)
      throw new Error("403: This cultivation is outside your organization.");
    const farmer = one(
      "SELECT p.* FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=? AND p.organization_id=? AND p.account_type='organization_farmer' AND u.active=1",
      body.farmer_id,
      org.id,
    );
    if (!farmer)
      throw new Error(
        "400: Select an active farmer registered under this organization.",
      );
    if (body.remove)
      run(
        "DELETE FROM farmer_assignments WHERE cultivation_id=? AND farmer_id=?",
        c.id,
        farmer.user_id,
      );
    else
      run(
        "INSERT OR IGNORE INTO farmer_assignments VALUES(?,?)",
        c.id,
        farmer.user_id,
      );
    event(
      user.id,
      body.remove ? "unassign farmer" : "assign farmer",
      farmer.user_id,
      { cultivation_id: c.id },
    );
    return;
  }
  if (body.action === "memberActive" || body.action === "resetMemberPassword") {
    const member = one("SELECT * FROM profiles WHERE user_id=?", body.id);
    if (!member || member.account_type === "organization_owner")
      throw new Error("404: Organization member not found.");
    const org = requireOrganizationOwner(user, member.organization_id);
    if (org.status !== "approved")
      throw new Error("403: Organization approval is required.");
    if (member.organization_id !== org.id)
      throw new Error("403: This member belongs to another organization.");
    if (body.action === "memberActive")
      run(
        "UPDATE users SET active=? WHERE id=?",
        body.active === true ? 1 : 0,
        body.id,
      );
    else {
      const pass = parsed(z.string().min(12).max(256), body.password);
      run(
        "UPDATE users SET password=? WHERE id=?",
        hashPassword(pass),
        body.id,
      );
    }
    run("DELETE FROM sessions WHERE user_id=?", body.id);
    event(user.id, body.action, body.id, { organization_id: org.id });
    return;
  }
  throw new Error("400: Unknown registration action.");
}
