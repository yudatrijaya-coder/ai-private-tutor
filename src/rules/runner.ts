/**
 * Rules Runner — entry points that call the rules engine at the right
 * points in each agent's lifecycle.
 *
 * Each runner function:
 *  1. Assembles a RuleContext with the relevant data
 *  2. Calls validateAgainstRules()
 *  3. Handles violations (log, block, escalate)
 *
 * @module @/rules/runner
 */

import { validateAgainstRules, type RuleContext } from "./engine";
import { checkSafety, escalateToGuardian, scanText } from "./safety";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

async function logViolations(
  agentType: string,
  studentId: string | undefined,
  violations: Array<{ ruleId: string; message: string; severity: string }>,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (violations.length === 0) return;
  await prisma.agentLog
    .create({
      data: {
        agentType: agentType as any,
        action: "rule_violation",
        studentId,
        status: "COMPLETED",
        metadata: {
          violations: violations.map((v) => ({
            ruleId: v.ruleId,
            severity: v.severity,
            message: v.message,
          })),
          ...meta,
          timestamp: new Date().toISOString(),
        },
      },
    })
    .catch((err) => {
      console.error(`[rules/runner] Failed to log violations for ${agentType}:`, err);
    });
}

/* ------------------------------------------------------------------ */
/*  Tutor Runner                                                       */
/* ------------------------------------------------------------------ */

export interface TutorRulesInput {
  output: string;
  studentId?: string;
  student?: Record<string, unknown>;
  persona?: string;
  sessionDurationMin?: number;
  sessionType?: string;
  isOffHours?: boolean;
  isUrgent?: boolean;
  isQuizContext?: boolean;
}

export interface TutorRulesResult {
  allowed: boolean;
  safeResponse?: string;
  violations: Array<{ ruleId: string; message: string; severity: string }>;
  wasEscalated: boolean;
}

/**
 * Run all tutor rules before sending a response to the student.
 *
 * Steps:
 *  1. Safety scan the output text (keyword-based block + escalation)
 *  2. Run all registered TUTOR rules
 *  3. If violations found, log and determine if the response should be blocked
 */
export async function runTutorRules(
  input: TutorRulesInput,
): Promise<TutorRulesResult> {
  const violations: Array<{ ruleId: string; message: string; severity: string }> = [];
  let wasEscalated = false;

  // 1. Safety scan (always first — most critical)
  const safetyResult = await checkSafety(
    input.studentId,
    input.output,
    "tutor_output",
    input.persona,
  );

  if (safetyResult.wasBlocked) {
    violations.push({
      ruleId: "tutor-content-boundary",
      message: "Safety filter blocked output due to sensitive content.",
      severity: "ERROR",
    });
  }

  if (safetyResult.wasEscalated) {
    wasEscalated = true;
    violations.push({
      ruleId: "tutor-escalation-self-harm",
      message: "Self-harm/bullying keywords detected. Guardian notified.",
      severity: "ERROR",
    });
  }

  // 2. Run engine rules
  const context: RuleContext = {
    agentType: "TUTOR",
    output: input.output,
    student: input.student as Record<string, unknown> | undefined,
    extra: {
      persona: input.persona,
      sessionDurationMin: input.sessionDurationMin,
      sessionType: input.sessionType,
      isOffHours: input.isOffHours,
      isUrgent: input.isUrgent,
      isQuizContext: input.isQuizContext,
    },
  };

  const engineResult = validateAgainstRules(context);
  violations.push(...engineResult.violations);

  // 3. Log violations
  if (violations.length > 0) {
    await logViolations("TUTOR", input.studentId, violations, {
      hasSafetyBlock: safetyResult.wasBlocked,
      hasEscalation: wasEscalated,
    });
  }

  // 4. Determine if allowed
  const hasError = violations.some((v) => v.severity === "ERROR");
  const allowed = !hasError && !safetyResult.wasBlocked;

  return {
    allowed,
    safeResponse: safetyResult.wasBlocked ? safetyResult.safeText : undefined,
    violations,
    wasEscalated,
  };
}

/* ------------------------------------------------------------------ */
/*  Content Runner                                                     */
/* ------------------------------------------------------------------ */

export interface ContentRulesInput {
  url: string;
  rawContent: string;
  sources?: string[];
  studentId?: string;
}

export interface ContentRulesResult {
  allowed: boolean;
  violations: Array<{ ruleId: string; message: string; severity: string }>;
}

/**
 * Run content rules before saving scraped content.
 */
export async function runContentRules(
  input: ContentRulesInput,
): Promise<ContentRulesResult> {
  const context: RuleContext = {
    agentType: "CONTENT",
    extra: {
      url: input.url,
      rawContent: input.rawContent,
      sources: input.sources ?? [],
    },
  };

  const engineResult = validateAgainstRules(context);

  if (engineResult.violations.length > 0) {
    await logViolations("CONTENT", input.studentId, engineResult.violations, {
      url: input.url,
    });
  }

  const hasError = engineResult.violations.some((v) => v.severity === "ERROR");
  return {
    allowed: !hasError,
    violations: engineResult.violations,
  };
}

/* ------------------------------------------------------------------ */
/*  Assessment Runner                                                  */
/* ------------------------------------------------------------------ */

export interface AssessmentRulesInput {
  questions?: unknown[];
  feedback?: string;
  studentId?: string;
  avgTimePerQuestion?: number;
  sameAnswerRatio?: number;
  examDurationMinutes?: number;
  questionCount?: number;
  daysSinceLastExam?: number;
  recentAttempts?: unknown[];
}

export interface AssessmentRulesResult {
  allowed: boolean;
  violations: Array<{ ruleId: string; message: string; severity: string }>;
  needsDifficultyAdjustment?: boolean;
}

/**
 * Run assessment rules before saving a quiz.
 */
export async function runAssessmentRules(
  input: AssessmentRulesInput,
): Promise<AssessmentRulesResult> {
  const context: RuleContext = {
    agentType: "ASSESSMENT",
    extra: {
      questions: input.questions,
      feedback: input.feedback,
      avgTimePerQuestion: input.avgTimePerQuestion,
      sameAnswerRatio: input.sameAnswerRatio,
      examDurationMinutes: input.examDurationMinutes,
      questionCount: input.questionCount,
      daysSinceLastExam: input.daysSinceLastExam,
      recentAttempts: input.recentAttempts,
    },
  };

  const engineResult = validateAgainstRules(context);

  if (engineResult.violations.length > 0) {
    await logViolations("ASSESSMENT", input.studentId, engineResult.violations);
  }

  const hasError = engineResult.violations.some((v) => v.severity === "ERROR");
  const needsDifficultyAdjustment = engineResult.violations.some(
    (v) => v.ruleId === "assessment-cheat-detection",
  );

  return {
    allowed: !hasError,
    violations: engineResult.violations,
    needsDifficultyAdjustment,
  };
}

/* ------------------------------------------------------------------ */
/*  Guardian Runner                                                    */
/* ------------------------------------------------------------------ */

export interface GuardianRulesInput {
  reportText?: string;
  reportData?: unknown;
  studentId?: string;
  triggerDepth?: number;
  triggersThisHour?: number;
}

export interface GuardianRulesResult {
  allowed: boolean;
  violations: Array<{ ruleId: string; message: string; severity: string }>;
  needsSanitisation: boolean;
}

/**
 * Run guardian rules before generating a report.
 */
export async function runGuardianRules(
  input: GuardianRulesInput,
): Promise<GuardianRulesResult> {
  const context: RuleContext = {
    agentType: "GUARDIAN",
    extra: {
      reportText: input.reportText,
      reportData: input.reportData,
      triggerDepth: input.triggerDepth,
      triggersThisHour: input.triggersThisHour,
    },
  };

  const engineResult = validateAgainstRules(context);

  if (engineResult.violations.length > 0) {
    await logViolations("GUARDIAN", input.studentId, engineResult.violations);
  }

  const hasError = engineResult.violations.some((v) => v.severity === "ERROR");
  const needsSanitisation = engineResult.violations.some(
    (v) =>
      v.ruleId === "guardian-no-sibling-comparison" ||
      v.ruleId === "guardian-constructive-tone",
  );

  return {
    allowed: !hasError,
    violations: engineResult.violations,
    needsSanitisation,
  };
}

/* ------------------------------------------------------------------ */
/*  Scheduler Runner                                                   */
/* ------------------------------------------------------------------ */

export interface SchedulerRulesInput {
  sessionsPerDay?: number;
  totalMinutesDay?: number;
  intensiveSessionsWeek?: number;
  totalHoursWeek?: number;
  daysScheduled?: string[];
  remindersSent?: number;
  reminderHour?: number;
  reschedulesThisSession?: number;
  reschedulesThisWeek?: number;
  reschedulesToday?: number;
  topicMastery?: number;
  skipTopic?: boolean;
  isSameLevelSwap?: boolean;
  studentId?: string;
}

export interface SchedulerRulesResult {
  allowed: boolean;
  violations: Array<{ ruleId: string; message: string; severity: string }>;
  canVeto?: boolean;
}

/**
 * Run scheduler rules before assigning sessions.
 */
export async function runSchedulerRules(
  input: SchedulerRulesInput,
): Promise<SchedulerRulesResult> {
  const context: RuleContext = {
    agentType: "SCHEDULER",
    extra: {
      sessionsPerDay: input.sessionsPerDay,
      totalMinutesDay: input.totalMinutesDay,
      intensiveSessionsWeek: input.intensiveSessionsWeek,
      totalHoursWeek: input.totalHoursWeek,
      daysScheduled: input.daysScheduled,
      remindersSent: input.remindersSent,
      reminderHour: input.reminderHour,
      reschedulesThisSession: input.reschedulesThisSession,
      reschedulesThisWeek: input.reschedulesThisWeek,
      reschedulesToday: input.reschedulesToday,
      topicMastery: input.topicMastery,
      skipTopic: input.skipTopic,
      isSameLevelSwap: input.isSameLevelSwap,
    },
  };

  const engineResult = validateAgainstRules(context);

  if (engineResult.violations.length > 0) {
    await logViolations("SCHEDULER", input.studentId, engineResult.violations);
  }

  const hasError = engineResult.violations.some((v) => v.severity === "ERROR");
  const canVeto = engineResult.violations.some(
    (v) => v.ruleId === "scheduler-veto-rules",
  );

  return {
    allowed: !hasError,
    violations: engineResult.violations,
    canVeto,
  };
}

/* ------------------------------------------------------------------ */
/*  Curriculum Runner                                                  */
/* ------------------------------------------------------------------ */

export interface CurriculumRulesInput {
  topic?: string;
  sourceUrl?: string;
  gradeLevel?: string;
  prerequisites?: string[];
  completedTopics?: string[];
  studentId?: string;
}

export interface CurriculumRulesResult {
  allowed: boolean;
  violations: Array<{ ruleId: string; message: string; severity: string }>;
}

export async function runCurriculumRules(
  input: CurriculumRulesInput,
): Promise<CurriculumRulesResult> {
  const context: RuleContext = {
    agentType: "CURRICULUM",
    extra: {
      topic: input.topic,
      sourceUrl: input.sourceUrl,
      gradeLevel: input.gradeLevel,
      prerequisites: input.prerequisites,
      completedTopics: input.completedTopics,
    },
  };

  const engineResult = validateAgainstRules(context);

  if (engineResult.violations.length > 0) {
    await logViolations("CURRICULUM", input.studentId, engineResult.violations);
  }

  const hasError = engineResult.violations.some((v) => v.severity === "ERROR");
  return {
    allowed: !hasError,
    violations: engineResult.violations,
  };
}

/* ------------------------------------------------------------------ */
/*  Media Runner                                                       */
/* ------------------------------------------------------------------ */

export interface MediaRulesInput {
  characterType?: string;
  script?: string;
  concurrentRenders?: number;
  renderQueueLength?: number;
  studentId?: string;
}

export interface MediaRulesResult {
  allowed: boolean;
  violations: Array<{ ruleId: string; message: string; severity: string }>;
}

export async function runMediaRules(
  input: MediaRulesInput,
): Promise<MediaRulesResult> {
  const context: RuleContext = {
    agentType: "MEDIA",
    extra: {
      characterType: input.characterType,
      script: input.script,
      concurrentRenders: input.concurrentRenders,
      renderQueueLength: input.renderQueueLength,
    },
  };

  const engineResult = validateAgainstRules(context);

  if (engineResult.violations.length > 0) {
    await logViolations("MEDIA", input.studentId, engineResult.violations);
  }

  const hasError = engineResult.violations.some((v) => v.severity === "ERROR");
  return {
    allowed: !hasError,
    violations: engineResult.violations,
  };
}
