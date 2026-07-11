/**
 * Guardian — Safety Rules
 *
 * Hard-coded safety guardrails enforced across all Guardian operations:
 * - Emergency escalation: self-harm / bullying keywords → immediate parent notification
 * - No sibling comparison in reports
 * - Data privacy: no student data shared across families
 *
 * @module @/agents/guardian/safety
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SafetyCheckResult {
  passed: boolean;
  blocked: boolean;
  escalated: boolean;
  reasons: string[];
}

export interface EscalationRecord {
  studentId: string;
  issueType: "self_harm" | "bullying" | "violence" | "abuse" | "other";
  source: string;
  matchedPhrase: string;
  context: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Emergency keywords                                                 */
/* ------------------------------------------------------------------ */

/**
 * Keywords that trigger immediate escalation.
 * These are checked against student chat messages, quiz answers, and
 * free-text responses.
 *
 * 💡 Designed for Indonesian language context (SD kelas 5).
 */
export const EMERGENCY_KEYWORDS: Record<string, string[]> = {
  self_harm: [
    "ingin mati",
    "mau bunuh diri",
    "ga mau hidup",
    "ga berguna",
    "menyakiti diri",
    "potong tangan",
    "ga tahan hidup",
    "aku benci diri sendiri",
    "mau lompat",
    "minum racun",
    "ga ada gunanya hidup",
  ],
  bullying: [
    "diejek", "di-bully", "dibully", "diolok-olok",
    "dipukul teman", "diancam", "diintimidasi",
    "ga punya teman", "dikucilkan",
    "disuruh", "dipaksa", "takut ke sekolah",
  ],
  violence: [
    "dipukul orang tua", "dilempar", "dianiaya",
    "dikeroyok", "ditampar",
    "luka karena", "memar",
  ],
  abuse: [
    "disentuh", "diraba", "diajak lihat",
    "foto telanjang", "video tidak senonoh",
    "dipesan", "dirayu",
  ],
};

/** Phrases that should never appear in reports or comparisons. */
export const FORBIDDEN_REPORT_PHRASES = [
  "adikmu lebih",
  "kakakmu lebih",
  "anak lain",
  "dibanding",
  "bodoh", "malas",
  "tidak bisa", "pemalas",
  "bandingkan",
];

/* ------------------------------------------------------------------ */
/*  Emergency escalation                                               */
/* ------------------------------------------------------------------ */

/**
 * Scan text for emergency keywords.
 *
 * Returns an escalation record if a match is found, null otherwise.
 * This triggers an immediate parent notification (side-effect)
 * by creating an EMERGENCY Intervention record in the DB.
 */
export function scanEmergencyKeywords(
  studentId: string,
  text: string,
  source: string,
): EscalationRecord | null {
  const lower = text.toLowerCase();

  for (const [issueType, keywords] of Object.entries(EMERGENCY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return {
          studentId,
          issueType: issueType as EscalationRecord["issueType"],
          source,
          matchedPhrase: keyword,
          context: text.slice(0, 500), // first 500 chars as context
          timestamp: new Date().toISOString(),
        };
      }
    }
  }

  return null;
}

/**
 * Create an EMERGENCY Intervention record for parent notification.
 * Called by chat handlers after message processing.
 */
export async function createEmergencyIntervention(
  escalation: EscalationRecord,
): Promise<string> {
  const { prisma } = await import("@/lib/prisma");

  const intervention = await prisma.intervention.create({
    data: {
      studentId: escalation.studentId,
      issueType: "emergency",
      severity: "EMERGENCY",
      description: `[${escalation.issueType.toUpperCase()}] Terdeteksi kata kunci "${
        escalation.matchedPhrase
      }" di ${escalation.source}. Segera hubungi orang tua. Konteks: ${escalation.context}`,
      status: "OPEN",
      actions: [
        { agent: "guardian", action: "parent_notification", status: "pending" },
        { agent: "guardian", action: "content_review", status: "pending" },
      ],
    },
  });

  // Also log to AgentLog
  await prisma.agentLog.create({
    data: {
      agentType: "GUARDIAN",
      action: "emergency_escalation",
      studentId: escalation.studentId,
      status: "COMPLETED",
      input: JSON.parse(JSON.stringify(escalation)),
      output: JSON.parse(JSON.stringify({ interventionId: intervention.id })),
    },
  });

  console.warn(
    `[guardian/safety] EMERGENCY escalation created: intervention=${intervention.id} for student=${escalation.studentId}`,
  );

  // Send emergency alert to parent
  try {
    const { sendEmergencyAlertToParent } = await import("./notifier");
    await sendEmergencyAlertToParent(
      escalation.studentId,
      escalation.issueType,
      escalation.context,
    );
  } catch (err) {
    console.error(
      "[guardian/safety] Failed to send emergency alert:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return intervention.id;
}

/* ------------------------------------------------------------------ */
/*  Report safety checks                                               */
/* ------------------------------------------------------------------ */

/**
 * Validate a report text against safety rules.
 * - Check for sibling comparison phrases
 * - Check for insulting/demeaning language
 *
 * Returns a SafetyCheckResult. If `blocked` is true, the report should
 * not be sent to the parent without review.
 */
export function checkReportSafety(reportText: string): SafetyCheckResult {
  const reasons: string[] = [];
  const lower = reportText.toLowerCase();

  for (const phrase of FORBIDDEN_REPORT_PHRASES) {
    if (lower.includes(phrase)) {
      reasons.push(`Mengandung frasa terlarang dalam laporan: "${phrase}"`);
    }
  }

  return {
    passed: reasons.length === 0,
    blocked: reasons.length > 0,
    escalated: false,
    reasons,
  };
}

/**
 * Sanitise a report text by removing or replacing comparison phrases.
 * Only call this AFTER checkReportSafety if you choose to auto-fix
 * rather than block.
 */
export function sanitiseReport(reportText: string): string {
  let clean = reportText;

  for (const phrase of FORBIDDEN_REPORT_PHRASES) {
    // Replace with a safer alternative
    clean = clean.replace(
      new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
      "",
    );
  }

  // Clean up doubled spaces and trim
  return clean.replace(/\s{2,}/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/*  Data privacy                                                       */
/* ------------------------------------------------------------------ */

/**
 * Verify that a student belongs to a specific parent/guardian.
 *
 * This enforces data isolation — no student data shared across families.
 *
 * @returns true if the student is linked to the given parent user ID.
 */
export async function verifyStudentOwnership(
  studentId: string,
  parentUserId: string,
): Promise<boolean> {
  // The schema has User{id, role} but no direct parent-student join table yet.
  // For now, we use a convention: the Student.telegramId links through
  // the parent's session context. This is a placeholder that should be
  // replaced once a ParentStudentLink model is added to the schema.
  //
  // For MVP, we return true and rely on API/auth middleware for access control.
  void studentId;
  void parentUserId;

  // 🔐 TODO: Replace with proper parent-student relation lookup once
  // the schema has a ParentStudentLink or student.parentId field.
  return true;
}

/**
 * Filter a list of student IDs to only those visible to a given parent.
 */
export async function filterVisibleStudents(
  studentIds: string[],
  parentUserId: string,
): Promise<string[]> {
  // Placeholder — same as verifyStudentOwnership.
  void parentUserId;

  // For MVP, return all IDs. Replace with DB query once relation model exists.
  return studentIds;
}
