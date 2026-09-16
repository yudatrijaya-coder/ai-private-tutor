import "dotenv/config";
import { SignJWT, jwtVerify } from "jose";
import { requireStudentSecret } from "../src/lib/auth/student-secret";
import { evaluateStudentAccess } from "../src/lib/auth/access";
import { signGuardianToken, verifyGuardianToken } from "../src/lib/auth/guardian-link";

/**
 * Empirical check of the two security claims in guardian-link.ts:
 *   A. a guardian token cannot be used as a student session
 *   B. a student session token cannot be used as a guardian token
 */
(async () => {
  const secret = requireStudentSecret();
  const results: Record<string, unknown> = {};

  // ── A: guardian token → student session path ──
  const { token: guardian } = await signGuardianToken("student-uuid-123");

  // The student path verifies with the same key but no issuer/audience options.
  const { payload: asStudent } = await jwtVerify(guardian, secret);
  const access = evaluateStudentAccess(asStudent as never);
  results.A_guardianAsStudent = {
    jwtVerifies: true,
    accessAllowed: access.allowed,
    reason: access.reason,
    hasStatusClaim: "status" in asStudent,
  };

  // ── A2: student session token → guardian verifier ──
  const studentToken = await new SignJWT({
    studentId: "student-uuid-123",
    studentIdentifier: "ANDI001",
    name: "Andi",
    status: "ACTIVE",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  results.B_studentAsGuardian = {
    accepted: (await verifyGuardianToken(studentToken)) !== null,
  };

  // ── C: happy path still works ──
  const claims = await verifyGuardianToken(guardian);
  results.C_guardianRoundTrip = {
    studentId: claims?.studentId ?? null,
    ok: claims?.studentId === "student-uuid-123",
  };

  // ── D: tampered token rejected ──
  const tampered = guardian.slice(0, -3) + "aaa";
  results.D_tamperedRejected = (await verifyGuardianToken(tampered)) === null;

  // ── E: garbage rejected ──
  results.E_garbageRejected = (await verifyGuardianToken("not.a.jwt")) === null;

  console.log(JSON.stringify(results, null, 2));

  const pass =
    results.A_guardianAsStudent &&
    !(results.A_guardianAsStudent as { accessAllowed: boolean }).accessAllowed &&
    (results.A_guardianAsStudent as { reason: string }).reason === "MISSING_STATUS" &&
    (results.B_studentAsGuardian as { accepted: boolean }).accepted === false &&
    (results.C_guardianRoundTrip as { ok: boolean }).ok === true &&
    results.D_tamperedRejected === true &&
    results.E_garbageRejected === true;

  console.log(pass ? "\nALL SECURITY CHECKS PASS" : "\nSECURITY CHECK FAILED");
  process.exit(pass ? 0 : 1);
})();
