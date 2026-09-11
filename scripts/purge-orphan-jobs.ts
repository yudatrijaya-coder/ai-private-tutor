/**
 * Purge failed BullMQ jobs that are provably unrecoverable.
 *
 * Context (findings ledger §C-01): 540 `assessment-generate` jobs failed in a
 * single 4.6-minute burst on 2026-07-10 with
 *   "Material not found or not processed: <uuid>"
 * Every job targeted a material belonging to student a80cbfa5-…, which no
 * longer exists in the DB (0 materials, 0 curriculum rows). They can never
 * succeed — the referenced rows are gone — and the 540 stale entries mask real
 * failures in /api/queues.
 *
 * Safety: removes a job only when BOTH hold:
 *   1. failedReason matches the known-orphan signature, AND
 *   2. its materialId does not resolve to a live Material row.
 * Anything else is left untouched and reported.
 *
 * Usage: npx tsx scripts/purge-orphan-jobs.ts [--dry-run]
 */
import { Queue } from "bullmq";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const DRY_RUN = process.argv.includes("--dry-run");
const QUEUE_NAME = "assessment-generate";
const ORPHAN_SIGNATURE = /^Material not found or not processed: /;

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "ai_private_tutor",
  user: process.env.PGUSER || "tutor",
  password: process.env.PGPASSWORD,
});
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const queue = new Queue(QUEUE_NAME, {
    connection: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
    },
  });

  const failed = await queue.getJobs(["failed"], 0, -1);
  console.log(`queue=${QUEUE_NAME} failed=${failed.length}`);

  const orphans: string[] = [];
  const keep: Array<{ id: string; why: string }> = [];

  for (const job of failed) {
    const reason = String(job.failedReason || "");
    const materialId = (job.data as { materialId?: string } | undefined)
      ?.materialId;

    if (!ORPHAN_SIGNATURE.test(reason) || !materialId) {
      keep.push({ id: String(job.id), why: reason.slice(0, 70) });
      continue;
    }

    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { id: true },
    });
    if (material) {
      keep.push({ id: String(job.id), why: "material still exists" });
      continue;
    }
    orphans.push(String(job.id));
  }

  console.log(`orphans (material gone) = ${orphans.length}`);
  console.log(`kept                    = ${keep.length}`);
  if (keep.length) console.log("kept sample:", JSON.stringify(keep.slice(0, 5)));

  if (DRY_RUN) {
    console.log("dry-run: nothing removed");
  } else if (orphans.length) {
    let removed = 0;
    for (const id of orphans) {
      await queue.remove(id);
      removed++;
    }
    console.log(`removed ${removed} orphaned failed jobs`);
  }

  console.log(`failed count after = ${await queue.getFailedCount()}`);
  await queue.close();
}

main()
  .catch((err) => {
    console.error("purge failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
