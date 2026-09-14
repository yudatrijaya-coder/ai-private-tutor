/**
 * Regression test for runMotivationNudge — NO real Telegram sends.
 * Uses a recording transport + test claim prefix so the run cannot collide
 * with production claims and cannot message anyone.
 * Run: npx tsx scripts/test-motivation-nudge.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runMotivationNudge } from "../src/services/motivation-nudge";

async function main() {
  const sends: Array<{ chatId: string; text: string }> = [];
  const prefix = "test-";

  for (const type of ["monday", "friday"] as const) {
    sends.length = 0;
    const r1 = await runMotivationNudge(type, {
      claimPrefix: prefix,
      sendMessage: async (chatId, text) => {
        sends.push({ chatId, text });
        return true;
      },
    });
    // Second run must be fully suppressed by the claims.
    const r2 = await runMotivationNudge(type, {
      claimPrefix: prefix,
      sendMessage: async (chatId, text) => {
        sends.push({ chatId, text });
        return true;
      },
    });

    console.log(`=== ${type} ===`);
    console.log(`run1 sent=${r1.sent} failed=${r1.failed} skipped=${r1.skipped}`);
    console.log(`run2 sent=${r2.sent} (must be 0) failed=${r2.failed} skipped=${r2.skipped}`);

    let pass = r1.sent > 0 && r1.failed === 0 && r2.sent === 0;
    // Message content checks — monday carries the week badge, friday the
    // check-in header; both must carry progress facts.
    for (const s of sends) {
      const okFacts =
        (/minggu ke-\d+/.test(s.text) || /Weekend check-in/.test(s.text)) &&
        /Progres jadwal/.test(s.text);
      const okNoLeak = !s.text.includes("undefined") && !s.text.includes("NaN");
      console.log(`  msg ${s.chatId}: facts=${okFacts} clean=${okNoLeak} len=${s.text.length}`);
      if (!okFacts || !okNoLeak) pass = false;
      // Print one sample
      if (sends.indexOf(s) === 0) console.log("  --- sample ---\n" + s.text.replace(/<[^>]+>/g, "").slice(0, 500));
    }
    console.log(pass ? "  PASS" : "  FAIL");
  }

  // Cleanup test claims
  const del = await prisma.cronClaim.deleteMany({ where: { key: { startsWith: "test-motivation-" } } });
  console.log(`cleaned ${del.count} test claims`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
