/**
 * Scheduler Worker — BullMQ worker for `scheduler:assign` and
 * `scheduler:reminder` queues.
 *
 * @module @/agents/scheduler/worker
 */

import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import {
  type SchedulerAssignJobPayload,
  type SchedulerReminderJobPayload,
} from "@/queue/definitions";
import { assignWeeklyTopics } from "./assigner";
import { runReminderSweep } from "./reminder";
import { checkMilestones, markMotivationSent } from "./motivation";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** How far ahead (in weeks) to assign sessions */
const ASSIGN_AHEAD_WEEKS = 1;

/* ------------------------------------------------------------------ */
/*  Processors                                                         */
/* ------------------------------------------------------------------ */

/**
 * Process `scheduler:assign` job.
 *
 * Runs the 60/30/10 algorithm for the given student's upcoming week,
 * then checks for any motivation milestones that should trigger a video.
 */
export async function processSchedulerAssign(
  job: Job<SchedulerAssignJobPayload, unknown, string>,
): Promise<void> {
  const { studentId, weekStart } = job.data;

  console.log(
    `[scheduler/worker] Assign job: student=${studentId}, weekStart=${weekStart}`,
  );

  // 1. Run topic assignment
  const assignResult = await assignWeeklyTopics(studentId, weekStart);

  console.log(
    `[scheduler/worker] Assign result: ${assignResult.sessionsCreated} session(s) created`,
    assignResult.summary,
  );

  // 2. Check motivation milestones
  const milestones = await checkMilestones(studentId);

  for (const trigger of milestones) {
    console.log(
      `[scheduler/worker] Milestone earned: student=${studentId}, milestone=${trigger.milestone}`,
    );
    await markMotivationSent(studentId, trigger.milestone);

    // If there's a Telegram bot and the student has a telegramId, send the video
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { telegramId: true },
    });

    if (student?.telegramId && trigger.videoUrl) {
      try {
        const { bot } = await import("@/bot/bot");
        if (bot) {
          await bot.telegram.sendMessage(
            student.telegramId,
            trigger.message,
            { parse_mode: "Markdown" },
          );
          if (trigger.videoUrl) {
            await bot.telegram.sendVideo(student.telegramId, trigger.videoUrl);
          }
        }
      } catch (err) {
        console.error(
          `[scheduler/worker] Failed to send motivation to student=${studentId}:`,
          err,
        );
      }
    }
  }
}

/**
 * Process `scheduler:reminder` job.
 *
 * Runs a full reminder sweep (H-1, T-30, MISSED detection).
 * Designed to be triggered by a cron job every 5 minutes.
 */
export async function processSchedulerReminder(
  _job: Job<SchedulerReminderJobPayload, unknown, string>,
): Promise<void> {
  console.log("[scheduler/worker] Reminder sweep starting");

  const result = await runReminderSweep();

  console.log(
    `[scheduler/worker] Reminder sweep complete: ` +
    `H-1=${result.h1Sent}, T-30=${result.t30Sent}, ` +
    `MISSED=${result.missedMarked}, errors=${result.errors.length}`,
  );

  if (result.errors.length > 0) {
    for (const err of result.errors.slice(0, 10)) {
      console.error(`[scheduler/worker] Reminder error: ${err}`);
    }
  }
}
