#!/usr/bin/env node
// Mint a student_session JWT for smoke-testing authenticated pages.
// Usage: node scripts/mint-student-token.cjs <uuid> <identifier> <name> <grade>
const fs = require("fs");
const path = require("path");
const { SignJWT } = require("jose");

const envRaw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const m = envRaw.match(/^STUDENT_JWT_SECRET=(.+)$/m);
const secret = (m ? m[1].trim() : "").replace(/^["']|["']$/g, "").replace(/\\\$/g, "$");
if (!secret || secret.length < 16) throw new Error("STUDENT_JWT_SECRET missing/too short");

const [studentId, studentIdentifier, name, gradeLevel] = process.argv.slice(2);

(async () => {
  const token = await new SignJWT({ studentId, studentIdentifier, name, gradeLevel })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
  process.stdout.write(token);
})();
