// Physical-host recovery for a forgotten LOCAL administrator password.
// No passwords in arguments, environment variables, files or logs.
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import path from "node:path";
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !process.stdin.isTTY) {
  console.error(
    "Run in an interactive terminal: npm run recover-admin -- your-admin-email",
  );
  process.exit(1);
}
const db = new DatabaseSync(
  path.resolve(process.env.FARMWISE_STORAGE || "storage", "farmwise.sqlite"),
  { timeout: 5000 },
);
const user = db
  .prepare(
    "SELECT id,email FROM users WHERE email=? AND role='admin' AND active=1",
  )
  .get(email);
if (!user) {
  console.error("No active local administrator has that email.");
  db.close();
  process.exit(1);
}
function hidden(question) {
  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    let input = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    function done() {
      process.stdin.off("data", handle);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    }
    function handle(chunk) {
      for (const c of chunk.toString()) {
        if (c === "\u0003") {
          done();
          reject(new Error("Cancelled"));
          return;
        }
        if (c === "\r" || c === "\n") {
          done();
          resolve(input);
          return;
        }
        if (c === "\u007f" || c === "\b") input = input.slice(0, -1);
        else if (c >= " ") input += c;
      }
    }
    process.stdin.on("data", handle);
  });
}
try {
  console.log(
    "Local administrator recovery for " +
      user.email +
      ". All existing sessions for this account will be revoked.",
  );
  const password = await hidden("New password (hidden, 12+ characters): ");
  const repeated = await hidden("Repeat new password (hidden): ");
  if (password !== repeated || password.length < 12 || password.length > 256)
    throw new Error("Passwords must match and contain 12–256 characters.");
  const salt = randomBytes(16).toString("hex"),
    hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE users SET password=? WHERE id=?").run(hash, user.id);
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
    db.prepare("INSERT INTO audit VALUES(?,?,?,?,?,?,?,?)").run(
      randomUUID(),
      user.id,
      null,
      "local administrator recovery",
      user.id,
      null,
      JSON.stringify({ method: "physical host CLI", sessionsRevoked: true }),
      new Date().toISOString(),
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  console.log("Password reset. Sign in with the new password.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  db.close();
}
