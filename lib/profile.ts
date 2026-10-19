import { z } from "zod";
import { hydrateUser } from "./access";
import { one, run, transaction, Row } from "./db";
import { normalizeMobile } from "./phone";
import { event } from "./registration";
const text = z.string().trim().min(1).max(200);
const profileSchema = z.strictObject({
  name: text,
  mobile: z.string().trim().min(1).max(32).transform(normalizeMobile),
  email: z.string().trim().toLowerCase().max(254).refine(
    value => value === "" || (z.email().safeParse(value).success && !value.endsWith("@mobile.invalid")),
    "Enter a valid email address",
  ),
  district: text,
  village: text,
});
export function updateOwnProfile(input: Row, body: unknown) {
  const user = hydrateUser(input);
  if (user.account_type !== "independent")
    throw new Error("403: Profile editing is available only to self-employed farmers.");
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    if (parsed.error.issues.some(issue => issue.code === "unrecognized_keys"))
      throw new Error("400: Only name, mobile, email, district and village can be edited.");
    throw new Error("400: " + parsed.error.issues.map(issue => `${issue.path.join(" ")}: ${issue.message}`).join("; "));
  }
  const values = parsed.data;
  return transaction(() => {
    if (!one("SELECT 1 FROM profiles WHERE user_id=? AND account_type='independent'", user.id))
      throw new Error("403: Self-employed farmer profile required.");
    if (values.email && one("SELECT 1 FROM users WHERE lower(email)=? AND id<>?", values.email, user.id))
      throw new Error("409: This email or mobile number is already registered.");
    if (one("SELECT 1 FROM profiles WHERE mobile=? AND user_id<>?", values.mobile, user.id))
      throw new Error("409: This email or mobile number is already registered.");
    const before = {name:user.name,mobile:user.mobile,email:user.email,district:user.district,village:user.village};
    run("UPDATE users SET name=?,email=? WHERE id=?", values.name, values.email || user.id + "@mobile.invalid", user.id);
    run("UPDATE profiles SET mobile=?,district=?,village=? WHERE user_id=?", values.mobile, values.district, values.village, user.id);
    event(user.id, "own profile updated", user.id, values, before);
    return { ok: true };
  });
}
