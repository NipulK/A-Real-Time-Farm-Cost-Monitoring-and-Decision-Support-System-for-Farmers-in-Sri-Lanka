import { hydrateUser } from "./access";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { db, one, run, Row } from "./db";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password: string, hash: string) {
  try {
    const [salt, key] = hash.split(":");
    return timingSafeEqual(
      Buffer.from(key, "hex"),
      scryptSync(password, salt, 64),
    );
  } catch {
    return false;
  }
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentUser(): Promise<Row | null> {
  const token = (await cookies()).get("farmwise_session")?.value;
  if (!token) return null;
  const user = one(
    "SELECT u.id,u.name,u.email,u.role,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1",
    tokenHash(token),
    Date.now(),
  );
  return user ? hydrateUser(user) : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("401: Please sign in.");
  return user;
}
export async function startSession(id: string) {
  const token = randomBytes(32).toString("hex");
  run("DELETE FROM sessions WHERE expires<?", Date.now());
  run(
    "INSERT INTO sessions VALUES(?,?,?)",
    tokenHash(token),
    id,
    Date.now() + 7 * 86400000,
  );
  (await cookies()).set("farmwise_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.FARMWISE_HTTPS === "true",
    path: "/",
    maxAge: 604800,
  });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin"),
    host = request.headers.get("host") || new URL(request.url).host;
  // Next's internal request URL may use localhost even when the browser used 127.0.0.1.
  // Match the actual Host, and reject arbitrary hosts in local mode (DNS rebinding).
  const configured = process.env.FARMWISE_ORIGIN;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const expected =
    configured ||
    `${process.env.FARMWISE_HTTPS === "true" ? "https" : "http"}://${host}`;
  if ((!configured && !local) || !origin || origin !== expected)
    throw new Error("403: Request origin is not allowed.");
}
export function fail(e: unknown) {
  const msg = e instanceof Error ? e.message : "Unexpected error";
  const match = msg.match(/^(400|401|403|404|409|429): (.*)$/);
  if (!match) console.error(e);
  return Response.json(
    { error: match ? match[2] : "Unable to complete the request." },
    { status: match ? Number(match[1]) : 500 },
  );
}
export function admin(user: Row) {
  if (user.role !== "admin")
    throw new Error("403: Administrator access required.");
}
