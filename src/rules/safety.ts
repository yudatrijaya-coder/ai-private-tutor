/**
 * Safety Content Filter — keyword-based sensitive topic detection and blocking.
 *
 * Based on docs/rules/tutor-rules.md §1.1, §3.1, §3.2 and §6.
 *
 * Categories: VIOLENCE, ADULT, SELF_HARM, BULLYING, DRUGS
 * - BLOCK action: replace with safe response, log to AgentLog
 * - ESCALATE action: SELF_HARM → immediate parent alert (Guardian agent)
 *
 * @module @/rules/safety
 */

import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SafetyCategory =
  | "VIOLENCE"
  | "ADULT"
  | "SELF_HARM"
  | "BULLYING"
  | "DRUGS"
  | "GAMBLING"
  | "RADICALISM";

export interface SafetyMatch {
  category: SafetyCategory;
  matchedWord: string;
  index: number;
}

export interface SafetyResult {
  blocked: boolean;
  /** Categories that triggered a block */
  blockedCategories: SafetyCategory[];
  /** Individual keyword matches (for logging) */
  matches: SafetyMatch[];
  /** Whether this requires immediate escalation to Guardian */
  requiresEscalation: boolean;
  /** Safe fallback message if blocked */
  fallbackMessage: string;
}

/* ------------------------------------------------------------------ */
/*  Keyword definitions (from docs)                                    */
/* ------------------------------------------------------------------ */

/**
 * Sensitive topic keywords — from tutor-rules.md §1.1 and content-rules.md §1.2.
 */
export const SENSITIVE_KEYWORDS: Record<SafetyCategory, string[]> = {
  VIOLENCE: [
    "kekerasan ekstrim",
    "senjata",
    "bunuh",
    "memukul",
    "berkelahi",
    "tampar",
    "tendang",
    "pukul",
    "tortur",
    "menyakiti secara fisik",
    "darah",
    "menganiaya",
    "pembunuhan",
    "melukai",
    "mutilasi",
  ],
  ADULT: [
    "seks",
    "seksualitas",
    "porno",
    "telanjang",
    "mesum",
    "vulgar",
    "bercumbu",
    "ranjang",
    "bugil",
    "pelecehan seksual",
    "hubungan suami istri",
    "dewasa",
    "bokep",
  ],
  SELF_HARM: [
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
    "menyerah saja",
    "nggak ada gunanya",
    "putus asa",
    "luka",
  ],
  BULLYING: [
    "bodoh sekali",
    "dasar bodoh",
    "anak nakal",
    "pembully",
    "mengejek",
    "merendahkan",
    "bego",
    "diejek",
    "di-bully",
    "dibully",
    "diolok-olok",
    "dipukul teman",
    "diancam",
    "diintimidasi",
    "ga punya teman",
    "dikucilkan",
    "dipaksa",
    "takut ke sekolah",
  ],
  DRUGS: [
    "narkoba",
    "obat terlarang",
    "narkotika",
    "psikotropika",
    "ganja",
    "ekstasi",
    "sabu",
    "shabu",
    "morfin",
    "heroin",
    "lem",
    "napza",
  ],
  GAMBLING: [
    "perjudian",
    "judi online",
    "judi",
    "slot online",
    "togel",
    "kasino",
    "casino",
    "toto",
    "poker uang",
  ],
  RADICALISM: [
    "radikalisme",
    "terorisme",
    "satanisme",
    "kultus",
    "ekstrimisme",
    "ideologi ekstrim",
    "mayat hidup",
  ],
};

/**
 * Categories that require immediate escalation to the Guardian agent.
 * Per tutor-rules.md §6: self-harm and bullying permanently flagged,
 * violence at home also escalated.
 */
export const ESCALATION_CATEGORIES: ReadonlySet<SafetyCategory> = new Set<SafetyCategory>([
  "SELF_HARM",
  "BULLYING",
]);

/* ------------------------------------------------------------------ */
/*  Persona-level fallback messages (from tutor-rules.md §1.1)         */
/* ------------------------------------------------------------------ */

export const PERSONA_FALLBACK_MESSAGES: Record<string, string> = {
  "kak-budi":
    "Wah, Kak Budi kurang paham soal itu. Coba tanya Papa/Mama ya! 😊",
  "kak-dewi":
    "Kayaknya ini lebih cocok ditanya ke orang tua. Kak Dewi fokus ke pelajaran aja ya 💪",
  "kak-raka":
    "Topik itu di luar ranah belajar kita. Silakan diskusi dengan orang tua.",
};

export const DEFAULT_FALLBACK =
  "Wah, Kakak lagi mikir... Lebih baik kita bahas yang lain ya! 😊 Semangat terus belajarnya! 💪";

/* ------------------------------------------------------------------ */
/*  Scanner                                                            */
/* ------------------------------------------------------------------ */

/**
 * Scan text for sensitive content keywords across all categories.
 *
 * @returns SafetyResult with all matches found
 */
export function scanText(text: string): SafetyResult {
  const lower = text.toLowerCase();
  const matches: SafetyMatch[] = [];
  const blockedCategories = new Set<SafetyCategory>();
  let requiresEscalation = false;

  for (const [category, keywords] of Object.entries(SENSITIVE_KEYWORDS)) {
    for (const keyword of keywords) {
      const idx = lower.indexOf(keyword);
      if (idx !== -1) {
        matches.push({
          category: category as SafetyCategory,
          matchedWord: keyword,
          index: idx,
        });
        blockedCategories.add(category as SafetyCategory);
        if (ESCALATION_CATEGORIES.has(category as SafetyCategory)) {
          requiresEscalation = true;
        }
      }
    }
  }

  return {
    blocked: matches.length > 0,
    blockedCategories: Array.from(blockedCategories),
    matches,
    requiresEscalation,
    fallbackMessage: DEFAULT_FALLBACK,
  };
}

/**
 * Get the appropriate fallback message for a persona.
 */
export function getFallbackForPersona(persona?: string | null): string {
  if (persona && persona in PERSONA_FALLBACK_MESSAGES) {
    return PERSONA_FALLBACK_MESSAGES[persona];
  }
  return DEFAULT_FALLBACK;
}

/* ------------------------------------------------------------------ */
/*  Block action — replace with safe response and log                  */
/* ------------------------------------------------------------------ */

/**
 * Process a blocked response: log to AgentLog and return a safe fallback.
 *
 * @returns The fallback message that should be sent to the student
 */
export async function blockAndLog(
  studentId: string | undefined,
  safetyResult: SafetyResult,
  persona?: string | null,
  source?: string,
): Promise<string> {
  // Log to AgentLog (category + count only, never the original text)
  if (studentId) {
    await prisma.agentLog
      .create({
        data: {
          agentType: "TUTOR",
          action: "safety_block",
          studentId,
          status: "COMPLETED",
          metadata: {
            categories: safetyResult.blockedCategories,
            blockedCount: safetyResult.blockedCategories.length,
            requiresEscalation: safetyResult.requiresEscalation,
            source: source ?? "unknown",
            timestamp: new Date().toISOString(),
          },
        },
      })
      .catch((err) => {
        console.error("[rules/safety] Failed to log blocked content:", err);
      });
  }

  return getFallbackForPersona(persona);
}

/* ------------------------------------------------------------------ */
/*  Escalation action — immediate Guardian alert for SELF_HARM         */
/* ------------------------------------------------------------------ */

/**
 * Escalate to Guardian: create an EMERGENCY Intervention record
 * for parent notification.
 *
 * Per tutor-rules.md §6 and guardian-rules.md §5.1:
 * SELF_HARM / BULLYING keywords → immediate parent alert via Guardian.
 */
export async function escalateToGuardian(
  studentId: string,
  category: SafetyCategory,
  matchedWord: string,
  source: string,
  context: string,
): Promise<string> {
  const intervention = await prisma.intervention.create({
    data: {
      studentId,
      issueType: "emergency",
      severity: "EMERGENCY",
      description: `[${category}] Terdeteksi kata kunci "${matchedWord}" di ${source}. Segera hubungi orang tua. Konteks: ${context.slice(0, 500)}`,
      status: "OPEN",
      actions: [
        {
          agent: "guardian",
          action: "parent_notification",
          status: "pending",
        },
        {
          agent: "guardian",
          action: "content_review",
          status: "pending",
        },
      ],
    },
  });

  // Also log as emergency escalation
  await prisma.agentLog
    .create({
      data: {
        agentType: "GUARDIAN",
        action: "emergency_escalation",
        studentId,
        status: "COMPLETED",
        input: { category, matchedWord, source },
        output: { interventionId: intervention.id },
      },
    })
    .catch((err) => {
      console.error(
        "[rules/safety] Failed to log escalation:",
        err,
      );
    });

  console.warn(
    `[rules/safety] EMERGENCY escalation: intervention=${intervention.id} student=${studentId} category=${category}`,
  );

  return intervention.id;
}

/**
 * High-level hook: scan → block/log → escalate if needed.
 *
 * Call this before delivering any tutor output to a student.
 *
 * @returns The safe response string (fallback if blocked, original if safe)
 */
export async function checkSafety(
  studentId: string | undefined,
  text: string,
  source: string,
  persona?: string | null,
): Promise<{ safeText: string; wasBlocked: boolean; wasEscalated: boolean }> {
  const result = scanText(text);

  if (!result.blocked) {
    return { safeText: text, wasBlocked: false, wasEscalated: false };
  }

  let wasEscalated = false;

  // Escalate SELF_HARM / BULLYING immediately
  if (result.requiresEscalation && studentId) {
    const worstMatch = result.matches.find((m) =>
      ESCALATION_CATEGORIES.has(m.category),
    );
    if (worstMatch) {
      await escalateToGuardian(
        studentId,
        worstMatch.category,
        worstMatch.matchedWord,
        source,
        text,
      );
      wasEscalated = true;
    }
  }

  const safeText = await blockAndLog(studentId, result, persona, source);

  return { safeText, wasBlocked: true, wasEscalated };
}
