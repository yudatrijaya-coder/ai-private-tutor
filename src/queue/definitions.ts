import type { AgentType } from "../generated/prisma/client";

/** Maximum attempts before a job moves to the Dead Letter Queue. */
export const MAX_RETRIES = 3;

/** Queue definitions with name and default concurrency. */
export const QUEUES = {
  CONTENT_SCRAPE: { name: "content-scrape", concurrency: 2 },
  CURRICULUM_REVIEW: { name: "curriculum-review", concurrency: 2 },
  MEDIA_RENDER: { name: "media-render", concurrency: 1 },
  MEDIA_YT_FALLBACK: { name: "media-yt-fallback", concurrency: 2 },
  ASSESSMENT_GENERATE: { name: "assessment-generate", concurrency: 3 },
  ASSESSMENT_EVALUATE: { name: "assessment-evaluate", concurrency: 2 },
  GUARDIAN_REPORT: { name: "guardian-report", concurrency: 1 },
  SCHEDULER_ASSIGN: { name: "scheduler-assign", concurrency: 1 },
  SCHEDULER_REMINDER: { name: "scheduler-reminder", concurrency: 3 },
} as const;

/** Union type of all queue name strings. */
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]["name"];

/* ------------------------------------------------------------------ */
/*  Job payload types                                                  */
/* ------------------------------------------------------------------ */

export interface ScrapeJobPayload {
  materialId: string;
  topic: string;
  subTopic?: string;
  gradeLevel: string;
  sources: string[];
}

export interface CurriculumReviewJobPayload {
  materialId: string;
  topic: string;
  gradeLevel: string;
  subTopic?: string;
}

export interface RenderJobPayload {
  materialId: string;
  characterPreference: string;
  script: string;
}

export interface YtFallbackJobPayload {
  materialId: string;
  topic: string;
  gradeLevel: string;
}

export interface AssessmentGenerateJobPayload {
  studentId: string;
  topic: string;
  gradeLevel: string;
  questionCount?: number;
}

export interface AssessmentEvaluateJobPayload {
  studentId: string;
  assessmentId: string;
  answers: Record<string, unknown>;
}

export interface GuardianReportJobPayload {
  studentId: string;
  periodStart: string;
  periodEnd: string;
}

export interface SchedulerAssignJobPayload {
  studentId: string;
  /** ISO date string */
  weekStart: string;
}

export interface SchedulerReminderJobPayload {
  studentId: string;
  sessionId: string;
}

/** Discriminated union of every job payload — used for type-safe processors. */
export type JobPayload =
  | { queue: typeof QUEUES.CONTENT_SCRAPE; data: ScrapeJobPayload }
  | { queue: typeof QUEUES.CURRICULUM_REVIEW; data: CurriculumReviewJobPayload }
  | { queue: typeof QUEUES.MEDIA_RENDER; data: RenderJobPayload }
  | { queue: typeof QUEUES.MEDIA_YT_FALLBACK; data: YtFallbackJobPayload }
  | { queue: typeof QUEUES.ASSESSMENT_GENERATE; data: AssessmentGenerateJobPayload }
  | { queue: typeof QUEUES.ASSESSMENT_EVALUATE; data: AssessmentEvaluateJobPayload }
  | { queue: typeof QUEUES.GUARDIAN_REPORT; data: GuardianReportJobPayload }
  | { queue: typeof QUEUES.SCHEDULER_ASSIGN; data: SchedulerAssignJobPayload }
  | { queue: typeof QUEUES.SCHEDULER_REMINDER; data: SchedulerReminderJobPayload };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Map a BullMQ queue name to the corresponding Prisma AgentType enum value.
 * Used when writing AgentLog entries from the worker factory.
 */
export function queueNameToAgentType(queueName: QueueName): AgentType {
  const map: Record<QueueName, AgentType> = {
    "content-scrape": "CONTENT" as AgentType,
    "curriculum-review": "CURRICULUM" as AgentType,
    "media-render": "MEDIA" as AgentType,
    "media-yt-fallback": "MEDIA" as AgentType,
    "assessment-generate": "ASSESSMENT" as AgentType,
    "assessment-evaluate": "ASSESSMENT" as AgentType,
    "guardian-report": "GUARDIAN" as AgentType,
    "scheduler-assign": "SCHEDULER" as AgentType,
    "scheduler-reminder": "SCHEDULER" as AgentType,
  };
  return map[queueName];
}

/** Return default concurrency for a given queue name. */
export function defaultConcurrency(queueName: QueueName): number {
  for (const q of Object.values(QUEUES)) {
    if (q.name === queueName) return q.concurrency;
  }
  return 1;
}
