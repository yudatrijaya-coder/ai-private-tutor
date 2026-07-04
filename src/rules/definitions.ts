/**
 * Rule Definitions — actionable rule implementations extracted from docs/rules/*.md.
 *
 * Each rule maps to a specific requirement in the design docs and is registered
 * into the global RULES registry at import time.
 *
 * @module @/rules/definitions
 */

import { registerRule } from "./engine";
import { scanText, ESCALATION_CATEGORIES } from "./safety";
import type { RuleResult } from "./engine";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pass(): RuleResult {
  return { passed: true, violations: [] };
}

function fail(
  ruleId: string,
  message: string,
  severity: "ERROR" | "WARN" | "INFO" = "ERROR",
): RuleResult {
  return { passed: false, violations: [{ ruleId, message, severity }] };
}

function safe(val: unknown): string {
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val ?? "");
  } catch {
    return String(val ?? "");
  }
}

function extractText(
  output: unknown,
  input: unknown,
  extra?: Record<string, unknown>,
): string {
  // Check various places the text might live
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    if (typeof o.response === "string") return o.response;
    if (typeof o.text === "string") return o.text;
    if (typeof o.content === "string") return o.content;
    if (typeof o.message === "string") return o.message;
  }
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    const i = input as Record<string, unknown>;
    if (typeof i.text === "string") return i.text;
    if (typeof i.message === "string") return i.message;
    if (typeof i.content === "string") return i.content;
    if (typeof i.query === "string") return i.query;
  }
  if (extra?.text && typeof extra.text === "string") return extra.text;
  if (extra?.rawContent && typeof extra.rawContent === "string")
    return extra.rawContent;
  return "";
}

/* ================================================================== */
/*  TUTOR RULES  (docs/rules/tutor-rules.md)                           */
/* ================================================================== */

// ── 1.1 Sensitive Topic Detection ──────────────────────────────────

registerRule({
  id: "tutor-content-boundary",
  agentType: "TUTOR",
  description:
    "Tutor output must not contain sensitive topics (violence, adult, self-harm, bullying, drugs, gambling, radicalism). Block and redirect.",
  severity: "ERROR",
  check: (ctx) => {
    const text = extractText(ctx.output, ctx.input, ctx.extra);
    if (!text) return pass(); // nothing to check
    const result = scanText(text);
    if (result.blocked) {
      const cats = result.blockedCategories.join(", ");
      return fail(
        "tutor-content-boundary",
        `Tutor output mengandung konten sensitif: ${cats}. Harus dialihkan ke respons aman.`,
        "ERROR",
      );
    }
    return pass();
  },
});

// ── 1.2 Personal Data Request ──────────────────────────────────────

registerRule({
  id: "tutor-no-personal-data",
  agentType: "TUTOR",
  description:
    "Tutor must not request personal data from the student (address, phone, password, location, self-photo).",
  severity: "ERROR",
  check: (ctx) => {
    const text = extractText(ctx.output, ctx.input, ctx.extra);
    if (!text) return pass();
    const lower = text.toLowerCase();
    const forbiddenPatterns = [
      /alamat\s+(rumah|kamu|anda)/i,
      /nomor\s+(telepon|hp|wa|handphone)/i,
      /password/i,
      /pin\b/i,
      /lokasi\s+(kamu|anda|rumah)/i,
      /foto\s+(diri|kamu|anda)/i,
      /kirim\s+foto/i,
    ];
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(lower)) {
        return fail(
          "tutor-no-personal-data",
          "Tutor mencoba meminta data pribadi anak — dilarang.",
          "ERROR",
        );
      }
    }
    return pass();
  },
});

// ── 1.3 Medical Advice ─────────────────────────────────────────────

registerRule({
  id: "tutor-no-medical-advice",
  agentType: "TUTOR",
  description:
    "Tutor must not provide medical advice. Redirect to parents with sympathy.",
  severity: "WARN",
  check: (ctx) => {
    const text = extractText(ctx.output, ctx.input, ctx.extra);
    if (!text) return pass();
    const lower = text.toLowerCase();
    const medicalIndicators = [
      /minum\s+obat\s+\w+/i,
      /dosis/i,
      /kamu\s+(sakit|demam|pusing|mual)/i,
      /obat\s+(apa|ini|itu)/i,
      /suntik/i,
      /operasi/i,
    ];
    for (const pattern of medicalIndicators) {
      if (pattern.test(lower)) {
        return fail(
          "tutor-no-medical-advice",
          "Tutor memberikan nasihat medis — harus dialihkan ke orang tua.",
          "WARN",
        );
      }
    }
    return pass();
  },
});

// ── 2.1 Strict Persona Isolation ───────────────────────────────────

registerRule({
  id: "tutor-persona-isolation",
  agentType: "TUTOR",
  description:
    "Tutor must stay within persona boundaries — Kak Budi for SD, Kak Dewi for SMP, Kak Raka for SMA.",
  severity: "WARN",
  check: (ctx) => {
    const text = extractText(ctx.output, ctx.input, ctx.extra);
    if (!text) return pass();
    const persona = ctx.student?.persona ?? ctx.extra?.persona;
    const grade = ctx.student?.gradeLevel ?? ctx.extra?.gradeLevel;

    if (!persona || !grade) return pass(); // can't check without context

    const personaStr = safe(persona);
    const gradeStr = safe(grade);

    // Kak Budi should not discuss SMA-level topics
    if (
      personaStr.includes("KAK_BUDI") &&
      (gradeStr.includes("SMA") || gradeStr.includes("SMP"))
    ) {
      return fail(
        "tutor-persona-isolation",
        `Persona Kak Budi tidak cocok untuk grade ${gradeStr}. Persona harus sesuai jenjang.`,
        "WARN",
      );
    }

    // Kak Dewi shouldn't use excessively adult language
    if (personaStr.includes("KAK_DEWI") && gradeStr.includes("SD")) {
      const adultWords = [
        /dewasa/i,
        /hubungan\s+serius/i,
        /karir\s+masa\s+depan/i,
      ];
      for (const w of adultWords) {
        if (w.test(text)) {
          return fail(
            "tutor-persona-isolation",
            "Kak Dewi menggunakan bahasa terlalu dewasa untuk level SD.",
            "WARN",
          );
        }
      }
    }

    return pass();
  },
});

// ── 3.4 Session Time Limits ────────────────────────────────────────

registerRule({
  id: "tutor-session-time-limit",
  agentType: "TUTOR",
  description:
    "Max 30 min daily session, max 4h intensive with break every 45 min. Off-hours (22:00-05:00) limited response.",
  severity: "WARN",
  check: (ctx) => {
    const durationMin = ctx.extra?.sessionDurationMin;
    const sessionType = ctx.extra?.sessionType ?? "DAILY";
    const isOffHours = ctx.extra?.isOffHours === true;

    if (typeof durationMin === "number") {
      if (sessionType === "INTENSIVE" && durationMin > 240) {
        return fail(
          "tutor-session-time-limit",
          `Sesi intensif melebihi batas 4 jam (${durationMin} menit).`,
          "WARN",
        );
      }
      if (sessionType !== "INTENSIVE" && durationMin > 30) {
        return fail(
          "tutor-session-time-limit",
          `Sesi harian melebihi batas 30 menit (${durationMin} menit).`,
          "WARN",
        );
      }
    }

    if (isOffHours && ctx.extra?.isUrgent !== true) {
      return fail(
        "tutor-session-time-limit",
        "Di luar jam belajar (22:00-05:00) — respon terbatas. Kecuali urgent.",
        "INFO",
      );
    }

    return pass();
  },
});

// ── 4.1 No Direct Answers ──────────────────────────────────────────

registerRule({
  id: "tutor-no-direct-answers",
  agentType: "TUTOR",
  description:
    "Tutor must not provide direct answers during quizzes. Provide hints only.",
  severity: "ERROR",
  check: (ctx) => {
    const isQuizContext = ctx.extra?.isQuizContext === true;
    if (!isQuizContext) return pass();

    const text = extractText(ctx.output, ctx.input, ctx.extra);
    if (!text) return pass();
    const lower = text.toLowerCase();

    // Detect patterns that give away answers directly
    const answerPatterns = [
      /jawabannya\s+adalah\s+\w/i,
      /jawab\s+(a|b|c|d)/i,
      /pilih\s+(a|b|c|d)/i,
      /jawaban\s+yang\s+benar\s+adalah/i,
      /jawab\s+dengan\s+(a|b|c|d)/i,
    ];
    for (const p of answerPatterns) {
      if (p.test(lower)) {
        return fail(
          "tutor-no-direct-answers",
          "Tutor memberikan jawaban langsung saat kuis — hanya boleh hints.",
          "ERROR",
        );
      }
    }

    return pass();
  },
});

// ── 6. Escalation: Self-harm / Bullying ────────────────────────────

registerRule({
  id: "tutor-escalation-self-harm",
  agentType: "TUTOR",
  description:
    "Self-harm and bullying keywords in tutor input/output → immediate Guardian alert.",
  severity: "ERROR",
  check: (ctx) => {
    const text = extractText(ctx.input, ctx.output, ctx.extra);
    if (!text) return pass();

    const result = scanText(text);
    if (result.requiresEscalation) {
      const matches = result.matches
        .filter((m) => ESCALATION_CATEGORIES.has(m.category))
        .map((m) => m.matchedWord);
      return fail(
        "tutor-escalation-self-harm",
        `Terdeteksi kata kunci darurat: ${matches.join(", ")}. Harus segera escalate ke Guardian.`,
        "ERROR",
      );
    }

    return pass();
  },
});

// ── 3.3 Anti-Manipulation ──────────────────────────────────────────

registerRule({
  id: "tutor-anti-manipulation",
  agentType: "TUTOR",
  description:
    "Tutor must not guilt-trip, negatively compare, or promise unreal rewards.",
  severity: "ERROR",
  check: (ctx) => {
    const text = extractText(ctx.output, ctx.input, ctx.extra);
    if (!text) return pass();
    const lower = text.toLowerCase();

    const manipulationPatterns = [
      /(kalau|jika)\s+tidak\s+(belajar|mengerjakan).*(sedih|kecewa)/i,
      /mama.+sedih/i,
      /papa.+sedih/i,
      /anak\s+(lain|orang).*(sudah|lebih)/i,
      /kok\s+(kamu|lu)\s+(belum|tidak)/i,
      /beliin\s+(ps5|ps4|iphone|mobil|motor)/i,
      /bakal\s+(beli|kasih)\s+(ps5|ps4|iphone)/i,
    ];

    for (const p of manipulationPatterns) {
      if (p.test(lower)) {
        return fail(
          "tutor-anti-manipulation",
          "Tutor menggunakan bahasa manipulatif — dilarang.",
          "ERROR",
        );
      }
    }

    return pass();
  },
});

/* ================================================================== */
/*  CURRICULUM RULES  (docs/rules/curriculum-rules.md)                 */
/* ================================================================== */

// ── 1.1 Approved Sources ───────────────────────────────────────────

registerRule({
  id: "curriculum-approved-sources",
  agentType: "CURRICULUM",
  description:
    "Curriculum data must come only from approved Kemdikbud sources unless flagged unverified.",
  severity: "ERROR",
  check: (ctx) => {
    const source = ctx.extra?.sourceUrl;
    if (!source) return pass(); // no source to check

    const url = safe(source).toLowerCase();
    const approved = [
      "kemdikbud.go.id",
      "kurikulum.kemdikbud.go.id",
      "static.kemdikbud.go.id",
      "sibbelajar.kemdikbud.go.id",
    ];
    const isApproved = approved.some((a) => url.includes(a));

    if (!isApproved) {
      return fail(
        "curriculum-approved-sources",
        `Sumber "${url}" tidak ada di daftar approved Kemdikbud. Flag unverified_source.`,
        "WARN",
      );
    }
    return pass();
  },
});

// ── 1.2 No Non-Educational Content ─────────────────────────────────

registerRule({
  id: "curriculum-no-non-educational",
  agentType: "CURRICULUM",
  description:
    "Curriculum draft must not contain ads, political/religious extremism, pseudoscience, or adult content.",
  severity: "ERROR",
  check: (ctx) => {
    const text = extractText(ctx.output, ctx.input, ctx.extra);
    if (!text) return pass();
    const lower = text.toLowerCase();

    const nonEducational = [
      /iklan/i,
      /sponsor/i,
      /promo\s+produk/i,
      /beli\s+sekarang/i,
      /diskon\s+\d+/i,
      /flat\s+earth/i,
      /bumi\s+datar/i,
      /homeopati/i,
      /pseudosains/i,
    ];
    for (const p of nonEducational) {
      if (p.test(lower)) {
        return fail(
          "curriculum-no-non-educational",
          "Curriculum draft mengandung konten non-edukasi (iklan/pseudosains).",
          "ERROR",
        );
      }
    }

    return pass();
  },
});

// ── 2.1 Grade-Level Appropriateness ─────────────────────────────────

registerRule({
  id: "curriculum-grade-appropriate",
  agentType: "CURRICULUM",
  description:
    "Curriculum topics must match the student's grade level. No advanced topics for lower grades.",
  severity: "ERROR",
  check: (ctx) => {
    const grade = ctx.student?.gradeLevel ?? ctx.extra?.gradeLevel;
    const topic = ctx.material?.topic ?? ctx.extra?.topic;

    if (!grade || !topic) return pass();

    const gradeStr = safe(grade);
    const topicStr = safe(topic).toLowerCase();

    // Forbidden topics per grade (from curriculum-rules.md)
    const gradeForbidden: Record<string, string[]> = {
      SD_5: [
        "trigonometri",
        "fisika kuantum",
        "ekonomi makro",
        "reaksi kimia",
        "sejarah politik mendalam",
        "debat ideologi",
      ],
      SMP_1: ["kalkulus", "fisika nuklir", "ekonomi mikro"],
    };

    const forbidden = gradeForbidden[gradeStr];
    if (forbidden) {
      for (const f of forbidden) {
        if (topicStr.includes(f)) {
          return fail(
            "curriculum-grade-appropriate",
            `Topik "${f}" tidak sesuai untuk grade ${gradeStr}.`,
            "ERROR",
          );
        }
      }
    }

    return pass();
  },
});

// ── 2.2 Prerequisite Chain ─────────────────────────────────────────

registerRule({
  id: "curriculum-prerequisite-chain",
  agentType: "CURRICULUM",
  description:
    "Topic B must not be taught before topic A if A is a prerequisite.",
  severity: "ERROR",
  check: (ctx) => {
    const topic = ctx.material?.topic ?? ctx.extra?.topic;
    const prerequisites = ctx.extra?.prerequisites;
    const completedTopics = ctx.extra?.completedTopics;

    if (!topic || !prerequisites || !completedTopics) return pass();

    const prereqList = Array.isArray(prerequisites) ? prerequisites : [];
    const completedList = Array.isArray(completedTopics) ? completedTopics : [];
    const completedSet = new Set(
      completedList.map((c: unknown) => safe(c).toLowerCase()),
    );

    for (const prereq of prereqList) {
      const pStr = safe(prereq).toLowerCase();
      if (!completedSet.has(pStr)) {
        return fail(
          "curriculum-prerequisite-chain",
          `Topik "${safe(topic)}" memiliki prerequisite "${pStr}" yang belum dipelajari.`,
          "ERROR",
        );
      }
    }

    return pass();
  },
});

/* ================================================================== */
/*  CONTENT RULES  (docs/rules/content-rules.md)                       */
/* ================================================================== */

// ── 1.1 Domain Blocklist ───────────────────────────────────────────

registerRule({
  id: "content-domain-allowlist",
  agentType: "CONTENT",
  description:
    "Only scrape from approved educational domains. Block adult/porn/forum/wiki domains.",
  severity: "ERROR",
  check: (ctx) => {
    const url = ctx.extra?.url ?? ctx.material?.sourceUrl;
    if (!url) return pass();

    const urlStr = safe(url).toLowerCase();

    const blocklist = [
      ".porn.",
      ".xxx",
      "dewasa.",
      "forum.",
      "chat.",
      "social.",
      "blogspot.com",
      "wordpress.com",
    ];

    const allowlist = [
      "kemdikbud.go.id",
      "kemendikbud.go.id",
      "sch.id",
      "ac.id",
      "rumahbelajar.id",
      "sibbelajar.kemdikbud.go.id",
      "buku.kemdikbud.go.id",
    ];

    // Check blocklist first
    for (const b of blocklist) {
      if (urlStr.includes(b)) {
        return fail(
          "content-domain-allowlist",
          `Domain "${urlStr}" ada di blocklist — tolak scrape.`,
          "ERROR",
        );
      }
    }

    // Check allowlist
    const isAllowed = allowlist.some((a) => urlStr.includes(a));
    if (!isAllowed) {
      return fail(
        "content-domain-allowlist",
        `Domain "${urlStr}" tidak ada di allowlist — flag unreviewed_domain.`,
        "WARN",
      );
    }

    return pass();
  },
});

// ── 1.2 Post-Scrape Content Filter ─────────────────────────────────

registerRule({
  id: "content-post-scrape-filter",
  agentType: "CONTENT",
  description:
    "Scraped content must be filtered for adult/violence/gambling/drugs before saving.",
  severity: "ERROR",
  check: (ctx) => {
    const rawContent = ctx.extra?.rawContent ?? ctx.input;
    const text = extractText({}, {}, { text: safe(rawContent) });
    if (!text) return pass();

    const blockedSymbols = [
      "sex",
      "porn",
      "adult",
      "casino",
      "gambling",
      "pharmacy",
      "viagra",
      "crypto",
    ];
    const violations = blockedSymbols.filter((s) =>
      text.toLowerCase().includes(s),
    );

    if (violations.length > 0) {
      return fail(
        "content-post-scrape-filter",
        `Konten mengandung simbol terlarang: ${violations.join(", ")}. Tolak simpan.`,
        "ERROR",
      );
    }

    // Also run general safety scan
    const safetyResult = scanText(text);
    if (safetyResult.blocked) {
      return fail(
        "content-post-scrape-filter",
        `Konten mengandung topik sensitif: ${safetyResult.blockedCategories.join(", ")}.`,
        "ERROR",
      );
    }

    return pass();
  },
});

// ── 3.1 Multi-Source Verification ──────────────────────────────────

registerRule({
  id: "content-multi-source-verify",
  agentType: "CONTENT",
  description:
    "Each topic must have content from at least 2 different sources.",
  severity: "WARN",
  check: (ctx) => {
    const sources = ctx.extra?.sources;
    if (!sources) return pass();

    const sourceList = Array.isArray(sources) ? sources : [];
    if (sourceList.length < 2) {
      return fail(
        "content-multi-source-verify",
        `Topik hanya memiliki ${sourceList.length} sumber. Minimal 2 sumber berbeda.`,
        "WARN",
      );
    }

    // Check they're actually different
    const uniqueUrls = new Set(sourceList.map((s: unknown) => safe(s)));
    if (uniqueUrls.size < 2) {
      return fail(
        "content-multi-source-verify",
        `Hanya ${uniqueUrls.size} URL unik dari ${sourceList.length} sumber. Minimal 2 URL berbeda.`,
        "WARN",
      );
    }

    return pass();
  },
});

// ── 3.2 No Interpretation (No Hallucination) ────────────────────────

registerRule({
  id: "content-no-hallucination",
  agentType: "CONTENT",
  description:
    "Content Agent extracts only — must not add interpretation to raw content.",
  severity: "ERROR",
  check: (ctx) => {
    const raw = ctx.extra?.rawContent;
    const processed = ctx.output;

    if (!raw || !processed) return pass();
    const rawStr = safe(raw).toLowerCase();
    const procStr = safe(processed).toLowerCase();

    // Check that processed content doesn't introduce new factual claims
    // not present in the raw content. Simple check: warn if processed
    // has significantly different length ratio
    const rawWords = rawStr.split(/\s+/).length;
    const procWords = procStr.split(/\s+/).length;

    if (procWords > rawWords * 3 && rawWords > 20) {
      return fail(
        "content-no-hallucination",
        `Processed content (${procWords} kata) jauh lebih panjang dari raw (${rawWords} kata) — kemungkinan menambah interpretasi.`,
        "WARN",
      );
    }

    return pass();
  },
});

/* ================================================================== */
/*  MEDIA RULES  (docs/rules/media-rules.md)                           */
/* ================================================================== */

// ── 1.1 Character Approval ─────────────────────────────────────────

registerRule({
  id: "media-character-approval",
  agentType: "MEDIA",
  description:
    "Characters must be from approved types: athlete, kpop_idol, cartoon, mascot, generic.",
  severity: "ERROR",
  check: (ctx) => {
    const character = ctx.extra?.characterType ?? ctx.material?.characterPreference;
    if (!character) return pass();

    const charStr = safe(character).toLowerCase();
    const blockedTypes = [
      "political_figure",
      "religious_figure",
      "adult_entertainer",
      "controversial_figure",
      "horror_character",
      "weapon_mascot",
    ];

    if (blockedTypes.some((b) => charStr.includes(b))) {
      return fail(
        "media-character-approval",
        `Karakter "${charStr}" termasuk tipe terblokir.`,
        "ERROR",
      );
    }

    return pass();
  },
});

// ── 2.1 Script Review ──────────────────────────────────────────────

registerRule({
  id: "media-script-review",
  agentType: "MEDIA",
  description:
    "Video script must match processed content, contain no adult references, and be grade-appropriate.",
  severity: "ERROR",
  check: (ctx) => {
    const script = ctx.extra?.script;
    if (!script) return pass();

    const scriptStr = safe(script).toLowerCase();

    // Adult reference check
    const adultRefs = [
      /seks/i,
      /porno/i,
      /telanjang/i,
      /mesum/i,
      /dewasa\s+(foto|video|konten)/i,
    ];
    for (const p of adultRefs) {
      if (p.test(scriptStr)) {
        return fail(
          "media-script-review",
          "Script mengandung referensi dewasa/kasar.",
          "ERROR",
        );
      }
    }

    return pass();
  },
});

// ── 4.1 Resource Guard ─────────────────────────────────────────────

registerRule({
  id: "media-resource-guard",
  agentType: "MEDIA",
  description:
    "Max 1 concurrent render. Queue > 5 triggers Guardian notification.",
  severity: "WARN",
  check: (ctx) => {
    const concurrentRenders = ctx.extra?.concurrentRenders;
    const queueLength = ctx.extra?.renderQueueLength;

    if (typeof concurrentRenders === "number" && concurrentRenders > 1) {
      return fail(
        "media-resource-guard",
        `Ada ${concurrentRenders} render berjalan bersamaan. Maksimal 1.`,
        "ERROR",
      );
    }

    if (typeof queueLength === "number" && queueLength > 5) {
      return fail(
        "media-resource-guard",
        `Render queue (${queueLength}) melebihi 5 — Guardian perlu notifikasi.`,
        "WARN",
      );
    }

    return pass();
  },
});

/* ================================================================== */
/*  ASSESSMENT RULES  (docs/rules/assessment-rules.md)                 */
/* ================================================================== */

// ── 1.1 Question Validation ────────────────────────────────────────

registerRule({
  id: "assessment-question-validation",
  agentType: "ASSESSMENT",
  description:
    "Each question must pass validation: answer exists in material, plausible distractors, no trick questions, age-appropriate language, no negative wording.",
  severity: "ERROR",
  check: (ctx) => {
    const questions = ctx.extra?.questions;
    if (!questions) return pass();

    const qList = Array.isArray(questions) ? questions : [];
    for (const q of qList) {
      const qObj = q as Record<string, unknown>;
      const questionText = safe(qObj.question ?? qObj.text ?? "");

      // Check for negative wording (minimize "which is WRONG")
      const negativeCount = (
        questionText.match(/(salah|bukan|jangan|kecuali)/gi) || []
      ).length;
      if (negativeCount > 2) {
        return fail(
          "assessment-question-validation",
          `Soal "${questionText.slice(0, 60)}..." mengandung terlalu banyak kata negatif. Minimal use of negative wording.`,
          "WARN",
        );
      }
    }

    return pass();
  },
});

// ── 1.2 No Demoralizing Questions ──────────────────────────────────

registerRule({
  id: "assessment-no-demoralizing",
  agentType: "ASSESSMENT",
  description:
    "First question MUST be easy. Difficulty curve: easy → medium → hard. Drop difficulty after 3 consecutive wrong answers.",
  severity: "WARN",
  check: (ctx) => {
    const questions = ctx.extra?.questions;
    if (!questions) return pass();

    const qList = Array.isArray(questions) ? questions : [];
    if (qList.length === 0) return pass();

    const firstQuestion = qList[0] as Record<string, unknown>;
    const firstDifficulty = firstQuestion?.difficulty ?? firstQuestion?.level;

    if (firstDifficulty && safe(firstDifficulty).toLowerCase() !== "easy") {
      return fail(
        "assessment-no-demoralizing",
        `Soal pertama harus easy, tapi ditemukan "${safe(firstDifficulty)}".`,
        "WARN",
      );
    }

    return pass();
  },
});

// ── 2.1 Positive Reinforcement ─────────────────────────────────────

registerRule({
  id: "assessment-positive-reinforcement",
  agentType: "ASSESSMENT",
  description:
    "Feedback must use positive language matching score range. Never use negative/humiliating tone.",
  severity: "ERROR",
  check: (ctx) => {
    const feedback = ctx.extra?.feedback ?? ctx.output;
    if (!feedback) return pass();

    const fbStr = safe(feedback).toLowerCase();

    const prohibitedPhrases = [
      /bodoh/i,
      /dasar\s+\w+\s+(bodoh|bego|malas)/i,
      /anak\s+lain\s+bisa/i,
      /kok\s+kamu\s+(bodoh|bego|lemot)/i,
      /goblok/i,
      /tolol/i,
    ];

    for (const p of prohibitedPhrases) {
      if (p.test(fbStr)) {
        return fail(
          "assessment-positive-reinforcement",
          `Feedback mengandung bahasa negatif: ${p.source}. Dilarang.`,
          "ERROR",
        );
      }
    }

    return pass();
  },
});

// ── 3.1 Cheat Detection ────────────────────────────────────────────

registerRule({
  id: "assessment-cheat-detection",
  agentType: "ASSESSMENT",
  description:
    "Detect suspicious patterns: all correct too fast (<5s), perfect score always, same answer always. Flag for review without confrontation.",
  severity: "WARN",
  check: (ctx) => {
    const attempts = ctx.extra?.recentAttempts;
    const avgTimePerQuestion = ctx.extra?.avgTimePerQuestion;
    const sameAnswerRatio = ctx.extra?.sameAnswerRatio;

    if (typeof avgTimePerQuestion === "number" && avgTimePerQuestion < 5) {
      return fail(
        "assessment-cheat-detection",
        `Waktu rata-rata per soal ${avgTimePerQuestion}s (<5s) — pola mencurigakan. Random soal & flag.`,
        "WARN",
      );
    }

    if (typeof sameAnswerRatio === "number" && sameAnswerRatio > 0.8) {
      return fail(
        "assessment-cheat-detection",
        `Rasio jawaban sama ${(sameAnswerRatio * 100).toFixed(0)}% (>80%) — pola mencurigakan.`,
        "WARN",
      );
    }

    if (Array.isArray(attempts)) {
      const allPerfectTooFast = attempts.every(
        (a: unknown) =>
          (a as Record<string, unknown>).score === 100 &&
          (a as Record<string, unknown>).timePerQuestion &&
          Number((a as Record<string, unknown>).timePerQuestion) < 5,
      );
      if (allPerfectTooFast && attempts.length >= 3) {
        return fail(
          "assessment-cheat-detection",
          `${attempts.length} quiz berturut-turut sempurna dengan waktu <5s/soal — flag review.`,
          "WARN",
        );
      }
    }

    return pass();
  },
});

// ── 4.1 Exam Duration Limit ────────────────────────────────────────

registerRule({
  id: "assessment-exam-duration",
  agentType: "ASSESSMENT",
  description:
    "Max 60 min for exam of 20-30 questions. Reminders at 10, 5, 1 min. Auto-submit on timeout.",
  severity: "WARN",
  check: (ctx) => {
    const examDuration = ctx.extra?.examDurationMinutes;
    const questionCount = ctx.extra?.questionCount;

    if (typeof examDuration === "number" && examDuration > 60) {
      return fail(
        "assessment-exam-duration",
        `Durasi exam ${examDuration} menit melebihi batas 60 menit.`,
        "WARN",
      );
    }

    if (typeof questionCount === "number" && questionCount > 30) {
      return fail(
        "assessment-exam-duration",
        `Jumlah soal ${questionCount} melebihi batas 30 soal per exam.`,
        "WARN",
      );
    }

    return pass();
  },
});

// ── 4.2 Exam Frequency ─────────────────────────────────────────────

registerRule({
  id: "assessment-exam-frequency",
  agentType: "ASSESSMENT",
  description:
    "Max 1 exam per 2 weeks per student. Don't overload.",
  severity: "WARN",
  check: (ctx) => {
    const daysSinceLastExam = ctx.extra?.daysSinceLastExam;

    if (typeof daysSinceLastExam === "number" && daysSinceLastExam < 14) {
      return fail(
        "assessment-exam-frequency",
        `Hanya ${daysSinceLastExam} hari sejak exam terakhir. Minimal 14 hari antar exam.`,
        "WARN",
      );
    }

    return pass();
  },
});

/* ================================================================== */
/*  GUARDIAN RULES  (docs/rules/guardian-rules.md)                     */
/* ================================================================== */

// ── 1.1 No Data Sharing ────────────────────────────────────────────

registerRule({
  id: "guardian-no-data-sharing",
  agentType: "GUARDIAN",
  description:
    "Parent data (email, Telegram ID, WA) must not leave the system. Reports contain only own children data.",
  severity: "ERROR",
  check: (ctx) => {
    const reportData = ctx.extra?.reportData ?? ctx.output;
    if (!reportData) return pass();

    const rStr = safe(reportData).toLowerCase();

    // Check that report doesn't contain other parents' data
    const parentDataLeak = [
      /telegram\s+id/i,
      /\d{9,15}/, // phone number pattern
      /email\s+\w+@\w+/i,
    ];

    for (const p of parentDataLeak) {
      if (p.test(rStr)) {
        return fail(
          "guardian-no-data-sharing",
          "Report mengandung data parent lain (telegram ID / nomor WA / email).",
          "ERROR",
        );
      }
    }

    return pass();
  },
});

// ── 3.1 No Sibling Comparison ──────────────────────────────────────

registerRule({
  id: "guardian-no-sibling-comparison",
  agentType: "GUARDIAN",
  description:
    "Reports must not compare siblings. Only self comparison (this week vs last week) and comparison to target.",
  severity: "ERROR",
  check: (ctx) => {
    const report = ctx.extra?.reportText ?? ctx.output;
    if (!report) return pass();

    const rStr = safe(report).toLowerCase();

    const comparisonPatterns = [
      /adikmu\s+lebih/i,
      /kakakmu\s+lebih/i,
      /anak\s+(lain|orang)\s+/i,
      /dibanding\s+(adik|kakak|saudara)/i,
      /bandingkan\s+dengan\s+(adik|kakak)/i,
    ];

    for (const p of comparisonPatterns) {
      if (p.test(rStr)) {
        return fail(
          "guardian-no-sibling-comparison",
          "Report mengandung perbandingan antar saudara — dilarang.",
          "ERROR",
        );
      }
    }

    return pass();
  },
});

// ── 3.2 Constructive Tone ──────────────────────────────────────────

registerRule({
  id: "guardian-constructive-tone",
  agentType: "GUARDIAN",
  description:
    "Report tone must be neutral, constructive, solution-focused. Use 'rekomendasi' not 'intervensi'.",
  severity: "WARN",
  check: (ctx) => {
    const report = ctx.extra?.reportText ?? ctx.output;
    if (!report) return pass();

    const rStr = safe(report).toLowerCase();

    const negativePhrases = [
      /bermasalah/i,
      /gagal/i,
      /bodoh/i,
      /malas/i,
      /tidak\s+mampu/i,
      /pemalas/i,
    ];

    for (const p of negativePhrases) {
      if (p.test(rStr)) {
        return fail(
          "guardian-constructive-tone",
          `Report menggunakan bahasa negatif: "${p.source}". Gunakan bahasa konstruktif.`,
          "WARN",
        );
      }
    }

    return pass();
  },
});

// ── 4.1 No Circular Triggers ───────────────────────────────────────

registerRule({
  id: "guardian-no-circular-triggers",
  agentType: "GUARDIAN",
  description:
    "Max 3 levels of cross-agent trigger depth. Break loops.",
  severity: "ERROR",
  check: (ctx) => {
    const triggerDepth = ctx.extra?.triggerDepth;

    if (typeof triggerDepth === "number" && triggerDepth > 3) {
      return fail(
        "guardian-no-circular-triggers",
        `Trigger depth ${triggerDepth} melebihi batas 3. Loop terdeteksi.`,
        "ERROR",
      );
    }

    return pass();
  },
});

// ── 4.2 Rate Limit Orchestration ───────────────────────────────────

registerRule({
  id: "guardian-rate-limit-orchestration",
  agentType: "GUARDIAN",
  description:
    "Max 10 cross-agent triggers per hour. Reject excessive parent requests.",
  severity: "WARN",
  check: (ctx) => {
    const triggersThisHour = ctx.extra?.triggersThisHour;

    if (typeof triggersThisHour === "number" && triggersThisHour > 10) {
      return fail(
        "guardian-rate-limit-orchestration",
        `${triggersThisHour} trigger per jam melebihi batas 10.`,
        "WARN",
      );
    }

    return pass();
  },
});

/* ================================================================== */
/*  SCHEDULER RULES  (docs/rules/scheduler-rules.md)                   */
/* ================================================================== */

// ── 1.1 Max Study Load ─────────────────────────────────────────────

registerRule({
  id: "scheduler-max-study-load",
  agentType: "SCHEDULER",
  description:
    "Max 2 sessions per day, max 270 min/day, min 120 min break between sessions. Weekly: max 7 daily sessions, 3 intensive, 15 total hours.",
  severity: "WARN",
  check: (ctx) => {
    const sessionsPerDay = ctx.extra?.sessionsPerDay;
    const totalMinutesDay = ctx.extra?.totalMinutesDay;
    const intensiveSessionsWeek = ctx.extra?.intensiveSessionsWeek;
    const totalHoursWeek = ctx.extra?.totalHoursWeek;

    if (typeof sessionsPerDay === "number" && sessionsPerDay > 2) {
      return fail(
        "scheduler-max-study-load",
        `${sessionsPerDay} sesi per hari melebihi batas 2.`,
        "WARN",
      );
    }

    if (typeof totalMinutesDay === "number" && totalMinutesDay > 270) {
      return fail(
        "scheduler-max-study-load",
        `${totalMinutesDay} menit/hari melebihi batas 270 menit.`,
        "WARN",
      );
    }

    if (typeof intensiveSessionsWeek === "number" && intensiveSessionsWeek > 3) {
      return fail(
        "scheduler-max-study-load",
        `${intensiveSessionsWeek} sesi intensif/minggu melebihi batas 3.`,
        "WARN",
      );
    }

    if (typeof totalHoursWeek === "number" && totalHoursWeek > 15) {
      return fail(
        "scheduler-max-study-load",
        `${totalHoursWeek} jam/minggu melebihi batas 15 jam.`,
        "WARN",
      );
    }

    return pass();
  },
});

// ── 1.2 Rest Days ──────────────────────────────────────────────────

registerRule({
  id: "scheduler-rest-days",
  agentType: "SCHEDULER",
  description:
    "Min 1 day per week without schedule. Sunday default rest. If student wants to study on rest day, max 1 short daily session.",
  severity: "INFO",
  check: (ctx) => {
    const daysScheduled = ctx.extra?.daysScheduled;

    if (Array.isArray(daysScheduled) && daysScheduled.length > 6) {
      return fail(
        "scheduler-rest-days",
        `${daysScheduled.length} hari dijadwalkan — perlu minimal 1 hari libur.`,
        "INFO",
      );
    }

    return pass();
  },
});

// ── 2.1 No Reminder Spam ───────────────────────────────────────────

registerRule({
  id: "scheduler-no-reminder-spam",
  agentType: "SCHEDULER",
  description:
    "Max 3 reminders per session (H-1, 30min before, 5min missed). No reminders outside 06:00-21:00.",
  severity: "WARN",
  check: (ctx) => {
    const remindersSent = ctx.extra?.remindersSent;
    const reminderHour = ctx.extra?.reminderHour;

    if (typeof remindersSent === "number" && remindersSent > 3) {
      return fail(
        "scheduler-no-reminder-spam",
        `${remindersSent} reminder per sesi melebihi batas 3.`,
        "WARN",
      );
    }

    if (typeof reminderHour === "number" && (reminderHour < 6 || reminderHour > 21)) {
      return fail(
        "scheduler-no-reminder-spam",
        `Reminder jam ${reminderHour}:00 di luar jam 06:00-21:00.`,
        "WARN",
      );
    }

    return pass();
  },
});

// ── 3.1 Reschedule Limits ──────────────────────────────────────────

registerRule({
  id: "scheduler-reschedule-limits",
  agentType: "SCHEDULER",
  description:
    "Max 2 reschedules per session. Max 3 reschedules per week. >2 reschedule in 1 day → flag Guardian.",
  severity: "WARN",
  check: (ctx) => {
    const reschedulesThisSession = ctx.extra?.reschedulesThisSession;
    const reschedulesThisWeek = ctx.extra?.reschedulesThisWeek;
    const reschedulesToday = ctx.extra?.reschedulesToday;

    if (typeof reschedulesThisSession === "number" && reschedulesThisSession > 2) {
      return fail(
        "scheduler-reschedule-limits",
        `${reschedulesThisSession} reschedule per sesi melebihi batas 2.`,
        "WARN",
      );
    }

    if (typeof reschedulesThisWeek === "number" && reschedulesThisWeek > 3) {
      return fail(
        "scheduler-reschedule-limits",
        `${reschedulesThisWeek} reschedule/minggu melebihi batas 3.`,
        "WARN",
      );
    }

    if (typeof reschedulesToday === "number" && reschedulesToday > 2) {
      return fail(
        "scheduler-reschedule-limits",
        `${reschedulesToday} reschedule hari ini — flag Guardian: student appears avoidant.`,
        "WARN",
      );
    }

    return pass();
  },
});

// ── 3.2 Veto Rules ─────────────────────────────────────────────────

registerRule({
  id: "scheduler-veto-rules",
  agentType: "SCHEDULER",
  description:
    "Can veto: skip topic <30% mastery, schedule conflict (>2 sessions/day), prerequisite not met. Cannot veto: postpone 1-2h, same-level topic swap, 1 day off (<3 consecutive).",
  severity: "WARN",
  check: (ctx) => {
    const mastery = ctx.extra?.topicMastery;
    const skipTopic = ctx.extra?.skipTopic === true;
    const isSameLevelSwap = ctx.extra?.isSameLevelSwap === true;

    // Veto: skip topic with mastery < 30%
    if (
      skipTopic &&
      typeof mastery === "number" &&
      mastery < 0.3 &&
      !isSameLevelSwap
    ) {
      return fail(
        "scheduler-veto-rules",
        `Student minta skip topik dengan mastery ${(mastery * 100).toFixed(0)}% (<30%) — Scheduler berhak veto.`,
        "WARN",
      );
    }

    return pass();
  },
});
