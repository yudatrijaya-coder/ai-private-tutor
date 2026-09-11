#!/usr/bin/env node
/**
 * Mint a `student_session` JWT for smoke-testing authenticated pages.
 *
 * Usage:
 *   node scripts/mint-student-token.cjs <uuid> <identifier> <name> <grade> [status] [trialEndsAtISO]
 *
 * `status` and `trialEndsAt` are part of the token's contract — the middleware
 * and `getStudentSession()` both fail closed without them (ledger A-19). When
 * omitted, they are read from the database so the minted token mirrors what
 * `/api/auth/student-login` would actually issue. Pass them explicitly to
 * exercise the gate, e.g.:
 *
 *   node scripts/mint-student-token.cjs <uuid> X001 X SD_5 TRIAL 2020-01-01T00:00:00Z
 *
 * The token is written to stdout only — never logged.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { SignJWT } = require("jose");

const envRaw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
function envValue(key) {
  const m = envRaw.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "").replace(/\\\$/g, "$");
}

const secret = envValue("STUDENT_JWT_SECRET");
if (!secret || secret.length < 16) throw new Error("STUDENT_JWT_SECRET missing/too short");

const [studentId, studentIdentifier, name, gradeLevel, statusArg, trialArg] =
  process.argv.slice(2);
if (!studentId || !studentIdentifier) {
  console.error("usage: mint-student-token.cjs <uuid> <identifier> <name> <grade> [status] [trialEndsAtISO]");
  process.exit(2);
}

/** Read status/trialEndsAt straight from the DB so the token matches reality. */
function readClaimsFromDb() {
  const pgPassword = envValue("PGPASSWORD");
  if (!pgPassword) return null;
  const sql =
    `SELECT status, COALESCE("trialEndsAt"::text,'') FROM "Student" WHERE id='${studentId}';`;
  try {
    const out = execFileSync(
      "psql",
      ["-h", "127.0.0.1", "-U", "tutor", "-d", "ai_private_tutor", "-t", "-A", "-F", "|", "-c", sql],
      { env: { ...process.env, PGPASSWORD: pgPassword }, encoding: "utf8" },
    ).trim();
    if (!out) return null;
    const [status, trial] = out.split("|");
    return { status, trialEndsAt: trial ? new Date(trial).toISOString() : null };
  } catch {
    return null;
  }
}

(async () => {
  let status = statusArg;
  let trialEndsAt = trialArg;

  if (!status) {
    const db = readClaimsFromDb();
    if (db) {
      status = db.status;
      if (trialEndsAt === undefined) trialEndsAt = db.trialEndsAt;
    }
  }
  if (trialEndsAt === undefined || trialEndsAt === "" || trialEndsAt === "null") {
    trialEndsAt = null;
  }

  const token = await new SignJWT({
    studentId,
    studentIdentifier,
    name,
    gradeLevel,
    status: status ?? null,
    trialEndsAt,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
  process.stdout.write(token);
})();
