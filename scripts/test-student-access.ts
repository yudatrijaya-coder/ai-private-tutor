/**
 * Gate matrix for the student access check (ledger A-19).
 *
 * Run: npx tsx scripts/test-student-access.ts
 *
 * Covers the two holes the old middleware had:
 *   - both claims optional → a token without them passed vacuously
 *   - API calls never checked at all → only page navigations were gated
 */
import { evaluateStudentAccess } from "../src/lib/auth/access";

const NOW = new Date("2026-09-11T12:00:00Z");
const PAST = "2026-01-01T00:00:00Z";
const FUTURE = "2027-01-01T00:00:00Z";

type Case = [string, Parameters<typeof evaluateStudentAccess>[0], boolean, string];

const cases: Case[] = [
  ["ACTIVE, no trial date", { status: "ACTIVE", trialEndsAt: null }, true, "OK"],
  ["TRIAL, future end", { status: "TRIAL", trialEndsAt: FUTURE }, true, "OK"],
  ["TRIAL, past end", { status: "TRIAL", trialEndsAt: PAST }, false, "TRIAL_EXPIRED"],
  ["TRIAL, end exactly now", { status: "TRIAL", trialEndsAt: NOW.toISOString() }, false, "TRIAL_EXPIRED"],
  ["TRIAL, NULL end", { status: "TRIAL", trialEndsAt: null }, false, "TRIAL_NO_END"],
  ["TRIAL, unparseable end", { status: "TRIAL", trialEndsAt: "not-a-date" }, false, "TRIAL_NO_END"],
  ["status claim absent", { trialEndsAt: FUTURE }, false, "MISSING_STATUS"],
  ["status null", { status: null, trialEndsAt: FUTURE }, false, "MISSING_STATUS"],
  ["PAUSED", { status: "PAUSED" }, false, "NOT_ALLOWED"],
  ["ARCHIVED", { status: "ARCHIVED" }, false, "NOT_ALLOWED"],
  ["PENDING", { status: "PENDING" }, false, "NOT_ALLOWED"],
  ["unknown status", { status: "WHATEVER" }, false, "NOT_ALLOWED"],
  // Subscription window (admin-approved extension). NULL/absent keeps the
  // legacy unlimited behaviour so no existing student is locked out.
  ["ACTIVE, sub absent", { status: "ACTIVE" }, true, "OK"],
  ["ACTIVE, sub future", { status: "ACTIVE", subscriptionUntil: FUTURE }, true, "OK"],
  ["ACTIVE, sub past", { status: "ACTIVE", subscriptionUntil: PAST }, false, "SUBSCRIPTION_EXPIRED"],
  ["ACTIVE, sub exactly now", { status: "ACTIVE", subscriptionUntil: NOW.toISOString() }, false, "SUBSCRIPTION_EXPIRED"],
  ["ACTIVE, sub unparseable", { status: "ACTIVE", subscriptionUntil: "garbage" }, false, "SUBSCRIPTION_EXPIRED"],
  // Regression guard: the exact token the old mint script produced.
  ["old mint script token (no claims)", {}, false, "MISSING_STATUS"],
];

let failed = 0;
for (const [label, claims, expectAllowed, expectReason] of cases) {
  const got = evaluateStudentAccess(claims, NOW);
  const ok = got.allowed === expectAllowed && got.reason === expectReason;
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(34)} allowed=${String(got.allowed).padEnd(5)} reason=${got.reason}` +
      (ok ? "" : `   (expected allowed=${expectAllowed} reason=${expectReason})`),
  );
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed === 0 ? 0 : 1);
