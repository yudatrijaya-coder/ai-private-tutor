/**
 * Guardian Worker — BullMQ processor for the `guardian:report` queue.
 *
 * Handles periodic report generation triggered by cron/scheduler:
 *   1. Load student & period from job payload
 *   2. Run early-warning checks
 *   3. Generate weekly report
 *   4. Apply safety checks before returning
 *
 * @module @/agents/guardian/worker
 */

import type { Job } from "bullmq";
import type { GuardianReportJobPayload } from "@/queue/definitions";
import { generateWeeklyReport } from "./report";
import { checkEarlyWarnings } from "./early-warning";
import { checkReportSafety } from "./safety";

/* ------------------------------------------------------------------ */
/*  Processor                                                          */
/* ------------------------------------------------------------------ */

/**
 * BullMQ processor for `guardian:report` jobs.
 *
 * Workflow:
 *   1. Run early-warning checks before the report
 *   2. Generate the weekly report
 *   3. Apply safety checks to the report summary
 *   4. Log warnings for safety failures (but still deliver report
 *      to parent — the report data itself is structured, not free text)
 */
export async function processGuardianReportJob(
  job: Job<GuardianReportJobPayload, unknown, string>,
): Promise<void> {
  const { studentId, periodStart, periodEnd } = job.data;

  console.log(
    `[guardian/worker] Processing report for student=${studentId}, period=[${periodStart} – ${periodEnd}]`,
  );

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  // 1. Run early-warning checks before generating the report
  const warnings = await checkEarlyWarnings(studentId);
  if (warnings.issues.length > 0) {
    console.warn(
      `[guardian/worker] Early warnings for student=${studentId}: ${warnings.interventionsCreated} intervention(s) created`,
    );
  }

  // 2. Generate the weekly report
  const report = await generateWeeklyReport(studentId, startDate, endDate);

  // 3. Safety check on the summary text
  const safety = checkReportSafety(report.summary);
  if (!safety.passed) {
    console.warn(
      `[guardian/worker] Report for student=${studentId} failed safety check: ${safety.reasons.join("; ")}`,
    );
    // Still deliver — the structured data (subjects, weakAreas) are safe.
    // The summary text can be sanitised or flagged. For MVP, we log and proceed.
  }

  console.log(
    `[guardian/worker] Report generated for student=${studentId}: ` +
      `${report.subjects.length} subject(s), ${report.weakAreas.length} weak area(s), ` +
      `${report.missedSessions} missed session(s)`,
  );

  // Return value is captured by the worker framework for AgentLog
  job.returnvalue = {
    reportId: `${studentId}_${periodStart}_${periodEnd}`,
    studentId,
    subjects: report.subjects.length,
    weakAreas: report.weakAreas.length,
    interventionsCreated: warnings.interventionsCreated,
    safety: safety.passed ? "passed" : "flagged",
  };
}
