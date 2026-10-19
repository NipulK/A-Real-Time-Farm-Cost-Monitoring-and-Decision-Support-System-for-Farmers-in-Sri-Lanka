import { one, Row } from "./db";
export function hydrateUser(user: Row): Row {
  const profile = one("SELECT * FROM profiles WHERE user_id=?", user.id);
  const type =
    profile?.account_type ||
    (user.role === "farmer"
      ? "independent"
      : user.role === "grower"
        ? "organization_owner"
        : user.role);
  const organization = profile?.organization_id
    ? one("SELECT * FROM organizations WHERE id=?", profile.organization_id)
    : null;
  return {
    ...user,
    account_type: type,
    language: type === "independent" ? (one("SELECT language FROM user_preferences WHERE user_id=?", user.id)?.language || "en") : "en",
    public_id: profile?.public_id || user.id,
    mobile: profile?.mobile || "",
    district: profile?.district || "",
    village: profile?.village || "",
    organization_id: profile?.organization_id || null,
    organization_status:
      organization?.status ||
      (type === "organization_owner" ? "pending" : null),
    organization_name: organization?.name || null,
    email: user.email?.endsWith("@mobile.invalid") ? "" : user.email,
  };
}
export function assertOperational(input: Row) {
  const user = hydrateUser(input);
  if (!user.active && user.active !== undefined)
    throw new Error("403: This account is inactive.");
  if (
    (user.organization_id && user.organization_status !== "approved") ||
    (user.account_type === "organization_owner" &&
      user.organization_status !== "approved")
  )
    throw new Error(
      "403: Organization approval is required before operations.",
    );
  if (user.account_type === "organization_farmer")
    throw new Error(
      "403: Organization farmers have read-only access to their own expenses.",
    );
  return user;
}
export function requireOrganizationOwner(input: Row, organizationId?: string) {
  const user = hydrateUser(input);
  if (user.role === "admin" && organizationId) {
    const org = one("SELECT * FROM organizations WHERE id=?", organizationId);
    if (!org) throw new Error("404: Organization not found.");
    return org;
  }
  if (user.account_type !== "organization_owner" || !user.organization_id)
    throw new Error("403: Organization owner access required.");
  const org = one(
    "SELECT * FROM organizations WHERE id=?",
    user.organization_id,
  )!;
  return org;
}
export function canReadExpense(input: Row, entryId: string) {
  const user = hydrateUser(input),
    entry = one("SELECT * FROM entries WHERE id=? AND kind='expense'", entryId);
  if (!entry) throw new Error("404: Expense not found.");
  if (user.account_type === "organization_farmer") {
    if (
      user.organization_status !== "approved" ||
      !one(
        "SELECT 1 FROM expense_farmers ef JOIN cultivations c ON c.id=? JOIN profiles p ON p.user_id=c.owner_id WHERE ef.entry_id=? AND ef.farmer_id=? AND p.organization_id=?",
        entry.cultivation_id,
        entryId,
        user.id,
        user.organization_id,
      )
    )
      throw new Error("403: This expense is not yours.");
  }
  return { user, entry };
}
