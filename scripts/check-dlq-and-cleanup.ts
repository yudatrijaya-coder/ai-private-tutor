/**
 * Prove the dead-letter reader works and then remove the C-10 verification rows.
 *
 * `getDeadLetteredJobs()` had never returned anything in production: the worker
 * wrote no row carrying the "Dead-lettered" marker it searches for, so the DLQ
 * viewer and manual retry were permanently empty. This calls the real function
 * against the real database, then cleans up the rows the verification created.
 *
 * USAGE
 *   npx tsx scripts/check-dlq-and-cleanup.ts [--apply]
 */
import "dotenv/config";

const APPLY = process.argv.includes("--apply");

async function main() {
  const { getDeadLetteredJobs } = await import("../src/queue/dlq");
  const { prisma } = await import("../src/lib/prisma");

  const dead = await getDeadLetteredJobs(50, 0);
  console.log(`getDeadLetteredJobs() -> ${dead.length} baris`);
  for (const d of dead.slice(0, 10)) {
    console.log(
      `  ${d.createdAt.toISOString()}  ${d.agentType}  ${d.jobId}  ${d.error}`,
    );
  }
  console.log("");

  // Only the rows this session's verification created.
  const where = { jobId: { startsWith: "verify-c10-" } };
  const found = await prisma.agentLog.findMany({
    where,
    select: { jobId: true, status: true },
  });
  console.log(`baris verifikasi C-10 tersisa: ${found.length}`);
  for (const f of found) console.log(`  ${f.jobId}  ${f.status}`);

  if (!APPLY) {
    console.log("\ndry-run — tambahkan --apply untuk menghapus baris verifikasi");
    await prisma.$disconnect();
    return;
  }

  const del = await prisma.agentLog.deleteMany({ where });
  console.log(`\n${del.count} baris verifikasi dihapus`);

  const after = await prisma.agentLog.findMany({
    where,
    select: { id: true },
  });
  console.log(`verifikasi ulang dari DB: ${after.length} baris tersisa`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
