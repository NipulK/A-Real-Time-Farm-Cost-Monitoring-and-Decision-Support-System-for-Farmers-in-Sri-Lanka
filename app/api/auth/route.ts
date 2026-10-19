import { normalizeMobile } from "@/lib/phone";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { one, run, transaction } from "@/lib/db";
import {
  checkOrigin,
  fail,
  hashPassword,
  startSession,
  verifyPassword,
  tokenHash,
  requireUser,
  admin,
} from "@/lib/auth";
import { audit } from "@/lib/service";
import { jsonBody } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request, 5000);
    if (body.action === "logout") {
      const jar = await cookies();
      const token = jar.get("farmwise_session")?.value;
      if (token) run("DELETE FROM sessions WHERE token=?", tokenHash(token));
      jar.delete("farmwise_session");
      return Response.json({ ok: true });
    }
    if (body.action === "changePassword" || body.action === "resetPassword") {
      const actor = await requireUser();
      const password = String(body.password || "");
      if (password.length < 12 || password.length > 256)
        throw new Error(
          "400: Use a new password between 12 and 256 characters.",
        );
      const target =
        body.action === "resetPassword" ? String(body.user_id || "") : actor.id;
      if (body.action === "resetPassword") admin(actor);
      else {
        const old = one("SELECT password FROM users WHERE id=?", actor.id)!;
        if (!verifyPassword(String(body.currentPassword || ""), old.password))
          throw new Error("401: Current password is incorrect.");
      }
      if (!one("SELECT id FROM users WHERE id=?", target))
        throw new Error("404: Account not found.");
      transaction(() => {
        run(
          "UPDATE users SET password=? WHERE id=?",
          hashPassword(password),
          target,
        );
        run("DELETE FROM sessions WHERE user_id=?", target);
        audit(
          actor,
          body.action === "resetPassword"
            ? "administrator password reset"
            : "password changed",
          target,
          null,
          null,
          { sessionsRevoked: true },
        );
      });
      if (target === actor.id) await startSession(target);
      return Response.json({ ok: true });
    }
    if (!["setup", "login"].includes(body.action))
      throw new Error("400: Unknown authentication action.");
    const email = String(body.identifier || body.email || "")
        .trim()
        .toLowerCase(),
      password = String(body.password || "");
    if (
      email.length > 254 ||
      password.length > 256 ||
      (body.action === "setup" && !/^\S+@\S+\.\S+$/.test(email))
    )
      throw new Error("400: Enter a valid email and password.");
    if (body.action === "setup") {
      if (password.length < 12 || !String(body.name || "").trim())
        throw new Error(
          "400: Enter a name and a password of at least 12 characters.",
        );
      const id = randomUUID();
      transaction(() => {
        if (one("SELECT id FROM users LIMIT 1"))
          throw new Error("409: Setup is already complete. Please sign in.");
        run(
          "INSERT INTO users VALUES(?,?,?,?,?,1)",
          id,
          String(body.name).trim().slice(0, 100),
          email,
          hashPassword(password),
          "admin",
        );
        audit({ id }, "workspace setup", id, null, null, { role: "admin" });
      });
      await startSession(id);
      return Response.json({ ok: true });
    }
    const identifier = email.includes("@") ? email : normalizeMobile(email);
    const user = one(
      "SELECT * FROM users WHERE lower(email)=? OR id=(SELECT user_id FROM profiles WHERE mobile=?)",
      identifier,
      identifier,
    );
    const loginKey = user?.id || identifier;
    const attempt = one("SELECT * FROM login_attempts WHERE key=?", loginKey);
    if (attempt && attempt.until > Date.now() && attempt.count >= 10)
      throw new Error("429: Too many attempts. Try again in 15 minutes.");
    const valid = verifyPassword(
      password,
      user?.password || "0000000000000000:" + "00".repeat(64),
    );
    if (!valid || !user?.active) {
      run(
        "INSERT INTO login_attempts VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,until=excluded.until",
        loginKey,
        attempt && attempt.until > Date.now() ? attempt.count + 1 : 1,
        Date.now() + 900000,
      );
      throw new Error("401: Email or password is incorrect.");
    }
    run("DELETE FROM login_attempts WHERE key=?", loginKey);
    await startSession(user.id);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
