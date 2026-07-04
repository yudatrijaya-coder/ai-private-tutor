import { prisma } from "@/lib/prisma";

/**
 * Blocked content categories and their keyword patterns.
 * Used to screen LLM responses before sending to children.
 */
const BLOCKED_PATTERNS: Record<string, RegExp[]> = {
  violence: [
    /bunuh/i,
    /memukul/i,
    /berkelahi/i,
    /senjata/i,
    /tampar/i,
    /tendang/i,
    /pukul/i,
    /tortur/i,
    /menyakiti\s+secara\s+fisik/i,
    /darah/i,
    /kekerasan/i,
    /menganiaya/i,
    /pembunuhan/i,
    /melukai/i,
  ],
  adult: [
    /seks/i,
    /telanjang/i,
    /mesum/i,
    /porno/i,
    /vulgar/i,
    /bercumbu/i,
    /ranjang/i,
    /bugil/i,
    /pelecehan\s+seksual/i,
    /hubungan\s+suami\s+istri/i,
  ],
  bullying: [
    /bodoh\s+sekali/i,
    /dasar\s+ bodoh/i,
    /anak\s+nakal/i,
    /pembully/i,
    /mengejek/i,
    /merendahkan/i,
    /bego/i,
  ],
  self_harm: [
    /bunuh\s+diri/i,
    /menyakiti\s+diri/i,
    /luka/i,
    /putus\s+asa/i,
    /nggak\s+ada\s+gunanya/i,
    /menyerah\s+saja/i,
  ],
};

/** Encouraging fallback message when blocked content is detected */
const FALLBACK_MESSAGE =
  "Wah, Kakak lagi mikir... Lebih baik kita bahas yang lain ya! 😊 Semangat terus belajarnya! 💪";

/**
 * Scan an LLM response for blocked content.
 * Returns `null` if the response is safe, or a fallback message if blocked.
 * Logs blocked attempts to AgentLog with category and count (no original text).
 */
export async function scanResponse(
  studentId: string,
  response: string,
): Promise<string | null> {
  const blocked: string[] = [];

  for (const [category, patterns] of Object.entries(BLOCKED_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(response)) {
        blocked.push(category);
        break; // one match per category is enough
      }
    }
  }

  if (blocked.length === 0) return null; // safe

  // Log to AgentLog — count + category only, no original content
  await prisma.agentLog.create({
    data: {
      agentType: "TUTOR",
      action: "safety_block",
      studentId,
      status: "COMPLETED",
      metadata: {
        categories: blocked,
        blockedCount: blocked.length,
        timestamp: new Date().toISOString(),
      },
    },
  }).catch((err) => {
    console.error("[safety] Failed to log blocked content:", err);
  });

  return FALLBACK_MESSAGE;
}
