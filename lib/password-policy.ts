import { z } from "zod";
export function demonstrationPasswordsEnabled() {
  if (process.env.FARMWISE_DEMO_PASSWORDS !== "true" || process.env.FARMWISE_HTTPS === "true") return false;
  const origin = process.env.FARMWISE_ORIGIN;
  if (!origin) return true;
  try { const u = new URL(origin); return u.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname); } catch { return false; }
}
export function passwordAccepted(value: string, demonstration: boolean) {
  return value.length >= 12 && value.length <= 256 || demonstration && /^[0-9]{4,5}$/.test(value);
}
export function passwordMessage(demonstration: boolean) {
  return demonstration ? "Use a 4–5 digit number or a password of 12–256 characters." : "Use a password between 12 and 256 characters.";
}
export const passwordSchema = z.string().max(256).superRefine((value, ctx) => {
  const demo = demonstrationPasswordsEnabled();
  if (!passwordAccepted(value, demo)) ctx.addIssue({ code: "custom", message: passwordMessage(demo) });
});
