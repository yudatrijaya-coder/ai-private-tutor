/**
 * Regression test for sendMonthlyGuardianReports — NO real Telegram sends.
 *
 * Recording transport + `test-` claim prefix: claims are namespaced away from
 * production, nothing can be delivered. Run twice: first must send, second
 * must skip everything (idempotency). Cleans up its claims afterwards.
 *
 * Run: npx tsx scripts/test-guardian-monthly.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { sendMonthlyGuardianReports } from "../src/services/guardian-monthly-report";

async function main() {
  const sends: Array<{ chatId: string; text: string }> = [];
  const now = new Date();

  const r1 = await sendMonthlyGuardianReports({
    now,
    claimPrefix: "test-",
    sendMessage: async (chatId, text) => {
      sends.push({ chatId, text });
      return true;
    },
  });
  const r2 = await sendMonthlyGuardianReports({
    now,
    claimPrefix: "test-",
    sendMessage: async () => {
      sends.push({ chatId: "SHOULD-NOT-HAPPEN", text: "" });
      return true;
    },
  });

  console.log(`=== run1 sent=${r1.sent} failed=${r1.failed} skipped=${r1.skipped}`);
  console.log(`=== run2 sent=${r2.sent} failed=${r2.failed} skipped=${r2.skipped}`);

  for (const s of sends) {
    const facts = /Laporan Bulanan/.test(s.text) && /Total quiz bulan ini: <b>\d+<\/b>/.test(s.text);
    const bad = /undefined|NaN/.test(s.text);
    console.log(`=== message chat=${s.chatId} facts=${facts} bad=${bad} len=${s.text.length}`);
  }
  // show first message for eyeballing
  if (sends[0]) console.log("--- sample ---\n" + sends[0].text);

  const pass =
    r1.failed === 0 &&
    r2.sent === 0 &&
    sends.every((s) => !/undefined|NaN/.test(s.text));
  console.log(`=== RESULT: ${pass ? "PASS" : "FAIL"}`);

  // cleanup test claims
  const del = await prisma.cronClaim.deleteMany({ where: { key: { startsWith: "test-guardian-monthly-report:" } } });
  console.log(`=== cleaned ${del.count} test claims`);
  await prisma.$disconnect();
  process.exit(pass ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
