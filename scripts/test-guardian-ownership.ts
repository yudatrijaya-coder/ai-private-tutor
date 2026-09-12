/**
 * Data-isolation matrix for the Guardian privacy helpers.
 *
 * Run: npx tsx scripts/test-guardian-ownership.ts
 *
 * Both helpers used to be placeholders that granted everything:
 * `verifyStudentOwnership()` returned `true` unconditionally and
 * `filterVisibleStudents()` returned its input untouched. They were dead code
 * at the time (no callers), so nothing leaked — but the first caller would
 * have silently exposed every family's data. These cases pin the fail-closed
 * behaviour so that regression cannot come back unnoticed.
 *
 * Fixtures are read from the real DB, not invented: RAIHAN001 / SHOFI001 /
 * SYIFA001 share parentTelegramId 640765830, and TIUMU001 has no parent
 * linked. Read-only — nothing is written or deleted.
 */
import { prisma } from "../src/lib/prisma";
import {
  verifyStudentOwnership,
  filterVisibleStudents,
} from "../src/agents/guardian/safety";

const SHARED_PARENT = "640765830";
const OTHER_PARENT = "999999999";
const UNKNOWN_STUDENT = "NO-SUCH-STUDENT";
const UNKNOWN_UUID = "00000000-0000-0000-0000-000000000000";

type Case = [string, () => Promise<boolean>, boolean];

let failed = 0;
let total = 0;

async function check(label: string, fn: () => Promise<boolean>, expected: boolean) {
  total++;
  let got: boolean;
  try {
    got = await fn();
  } catch (err) {
    got = false;
    console.log(`FAIL  ${label.padEnd(56)} threw: ${(err as Error).message}`);
    failed++;
    return;
  }
  const ok = got === expected;
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(56)} got=${String(got).padEnd(5)}` +
      (ok ? "" : ` expected=${expected}`),
  );
}

async function main() {
  const raihan = await prisma.student.findUnique({
    where: { studentId: "RAIHAN001" },
    select: { id: true, studentId: true, parentTelegramId: true },
  });
  const tiumu = await prisma.student.findUnique({
    where: { studentId: "TIUMU001" },
    select: { id: true, studentId: true, parentTelegramId: true },
  });

  if (!raihan || !tiumu) {
    console.error("Fixture tidak ditemukan (RAIHAN001 / TIUMU001). Hentikan.");
    process.exit(2);
  }
  if (raihan.parentTelegramId !== SHARED_PARENT) {
    console.error(
      `Fixture drift: RAIHAN001.parentTelegramId=${raihan.parentTelegramId}, ` +
        `skrip mengharapkan ${SHARED_PARENT}. Perbarui konstanta.`,
    );
    process.exit(2);
  }
  if (tiumu.parentTelegramId !== null) {
    console.error(
      `Fixture drift: TIUMU001.parentTelegramId=${tiumu.parentTelegramId}, ` +
        `skrip mengharapkan NULL (kasus "tidak ada orang tua tertaut").`,
    );
    process.exit(2);
  }

  console.log("=== verifyStudentOwnership ===");
  const cases: Case[] = [
    ["login id + parent benar", () => verifyStudentOwnership("RAIHAN001", SHARED_PARENT), true],
    ["uuid + parent benar", () => verifyStudentOwnership(raihan.id, SHARED_PARENT), true],
    ["login id + parent LAIN", () => verifyStudentOwnership("RAIHAN001", OTHER_PARENT), false],
    ["uuid + parent LAIN", () => verifyStudentOwnership(raihan.id, OTHER_PARENT), false],
    ["tanpa orang tua tertaut", () => verifyStudentOwnership("TIUMU001", SHARED_PARENT), false],
    ["siswa tidak dikenal", () => verifyStudentOwnership(UNKNOWN_STUDENT, SHARED_PARENT), false],
    ["uuid tidak dikenal", () => verifyStudentOwnership(UNKNOWN_UUID, SHARED_PARENT), false],
    ["studentId kosong", () => verifyStudentOwnership("", SHARED_PARENT), false],
    ["parentUserId kosong", () => verifyStudentOwnership("RAIHAN001", ""), false],
  ];
  for (const [label, fn, expected] of cases) await check(label, fn, expected);

  console.log("\n=== filterVisibleStudents ===");
  const filterCases: [string, () => Promise<string[]>, string[]][] = [
    [
      "hanya milik parent ini yang lolos",
      () => filterVisibleStudents(["RAIHAN001", "TIUMU001", UNKNOWN_STUDENT], SHARED_PARENT),
      ["RAIHAN001"],
    ],
    [
      "parent lain → kosong",
      () => filterVisibleStudents(["RAIHAN001", "SHOFI001"], OTHER_PARENT),
      [],
    ],
    ["parent kosong → kosong", () => filterVisibleStudents(["RAIHAN001"], ""), []],
    ["daftar kosong → kosong", () => filterVisibleStudents([], SHARED_PARENT), []],
    [
      "urutan masukan dipertahankan",
      () => filterVisibleStudents(["SYIFA001", "RAIHAN001", "SHOFI001"], SHARED_PARENT),
      ["SYIFA001", "RAIHAN001", "SHOFI001"],
    ],
    [
      "namespace uuid diterima",
      () => filterVisibleStudents([raihan.id, UNKNOWN_UUID], SHARED_PARENT),
      [raihan.id],
    ],
  ];
  for (const [label, fn, expected] of filterCases) {
    total++;
    const got = await fn();
    const ok = JSON.stringify(got) === JSON.stringify(expected);
    if (!ok) failed++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${label.padEnd(56)} got=${JSON.stringify(got)}` +
        (ok ? "" : ` expected=${JSON.stringify(expected)}`),
    );
  }

  console.log(`\n${total - failed}/${total} passed`);
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

void main();
