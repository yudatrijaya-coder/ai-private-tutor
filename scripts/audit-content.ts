#!/usr/bin/env tsx
/**
 * Content audit + fix script for AI Private Tutor template materials.
 *
 * Usage:
 *   npx tsx scripts/audit-content.ts --grade SD_5 --dry-run --limit 5
 *   npx tsx scripts/audit-content.ts --grade SD_5 --apply
 *   AUDIT_ONLY_IDS=id1,id2 npx tsx scripts/audit-content.ts --grade SD_5 --apply
 */
import { prisma } from "../src/lib/prisma";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const NINE_ROUTER_URL = process.env.LLM_BASE_URL || "http://localhost:20128/v1/chat/completions";
const NINE_ROUTER_KEY = process.env.LLM_API_KEY || "sk-9router";

async function call9Router(
  messages: { role: string; content: string }[],
  maxTokens: number,
  temperature = 0.2,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600000);
    try {
      const res = await fetch(NINE_ROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NINE_ROUTER_KEY}`,
        },
        body: JSON.stringify({
          model: "hermes",
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: controller.signal,
      });
      const raw = await res.text();
      clearTimeout(timer);
      if (!raw.trim()) return null;

      let contentParts: string[] = [];
      const segments = raw.split(/(?=data:\s*)/);
      for (const seg of segments) {
        const trimmed = seg.replace(/^data:\s*/, "").trim();
        if (!trimmed || trimmed === "[DONE]") continue;
        try {
          const d = JSON.parse(trimmed);
          const payload = d.data ?? d;
          const delta = payload.choices?.[0]?.delta?.content;
          if (typeof delta === "string") { contentParts.push(delta); continue; }
          const msg = payload.choices?.[0]?.message?.content;
          if (typeof msg === "string") contentParts.push(msg);
        } catch {
          const lastClose = trimmed.lastIndexOf("}");
          if (lastClose > 0) {
            try {
              const d = JSON.parse(trimmed.slice(0, lastClose + 1));
              const payload = d.data ?? d;
              const delta = payload.choices?.[0]?.delta?.content;
              if (typeof delta === "string") contentParts.push(delta);
              const msg = payload.choices?.[0]?.message?.content;
              if (typeof msg === "string") contentParts.push(msg);
            } catch {}
          }
        }
      }

      const rawContent = contentParts.join("");
      if (!rawContent) {
        if (attempt < 2) { await sleep((attempt + 1) * 5000); continue; }
        return null;
      }

      const candidate = stripJsonFence(rawContent);
      if (!candidate) return null;
      try { JSON.parse(candidate); return candidate; } catch {}

      const recovered = recoverJson(candidate);
      if (recovered) {
        try { JSON.parse(recovered); return recovered; } catch {}
      }

      if (attempt < 2) {
        console.log(`  ⚠️  attempt ${attempt + 1}: invalid JSON, retry in ${(attempt + 1) * 5}s`);
        await sleep((attempt + 1) * 5000);
        continue;
      }
      return null;
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt < 2) {
        console.log(`  ⚠️  error: ${err.message?.slice(0, 80)}, retry in ${(attempt + 1) * 5}s`);
        await sleep((attempt + 1) * 5000);
        continue;
      }
      throw err;
    }
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripJsonFence(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function recoverJson(text: string): string | null {
  const lastClose = text.lastIndexOf("}");
  if (lastClose < 0) return null;
  return text.slice(0, lastClose + 1);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: string;
};

type Progress = {
  startedAt: string;
  total: number;
  done: number;
  applied: number;
  errors: number;
  highSev: number;
  running: boolean;
};

type QuizIssue = { questionIndex: number; severity: "low" | "medium" | "high"; issue: string; suggestedFix: string };
type SlideIssue = { severity: "low" | "medium" | "high"; issue: string; suggestedFix: string };

type AuditResult = {
  slideIssues: SlideIssue[];
  quizIssues: QuizIssue[];
  fixedSlide: string | null;
  fixedQuestions: Question[] | null;
  regenerateRecommended: boolean;
};

// ─── Progress helpers ──────────────────────────────────────────────────────────

function progressFile(grade: string) {
  return join(process.cwd(), "audit-reports", `${grade}-progress.json`);
}

function loadProgress(grade: string): Progress {
  const file = progressFile(grade);
  if (existsSync(file)) {
    try {
      const p = JSON.parse(readFileSync(file, "utf8"));
      if (p.running) return p;
    } catch {}
  }
  return { startedAt: "", total: 0, done: 0, applied: 0, errors: 0, highSev: 0, running: false };
}

function saveProgress(grade: string, p: Progress) {
  writeFileSync(progressFile(grade), JSON.stringify(p, null, 2));
}

function deleteProgress(grade: string) {
  const f = progressFile(grade);
  if (existsSync(f)) {
    try { require("fs").unlinkSync(f); } catch {}
  }
}

// ─── Audit functions ───────────────────────────────────────────────────────────

async function auditSlide(
  grade: string,
  subject: string,
  topic: string,
  slide: string,
): Promise<Pick<AuditResult, "slideIssues" | "fixedSlide" | "regenerateRecommended">> {
  const system = `You are a strict Indonesian educational content auditor for ${grade}.
Audit only the SLIDE markdown. Check factual correctness, grade-appropriate language, completeness, no hallucination, clear structure.
Return ONLY a JSON object (no markdown fences) with exact shape:
{"slideIssues":[{"severity":"low|medium|high","issue":"...","suggestedFix":"..."}],"fixedSlide":"full corrected markdown or null","regenerateRecommended":false}
fixedSlide is non-null only when you made changes.`;

  const raw = await call9Router(
    [
      { role: "system", content: system },
      { role: "user", content: `Subject: ${subject}\nTopic: ${topic}\n\nSLIDE:\n${slide}` },
    ],
    1500,
    0.2,
  );
  if (!raw) throw new Error("LLM returned null");
  return JSON.parse(stripJsonFence(raw));
}

async function auditQuiz(
  grade: string,
  subject: string,
  topic: string,
  questions: Question[],
): Promise<Pick<AuditResult, "quizIssues" | "fixedQuestions" | "regenerateRecommended">> {
  const system = `You are a strict Indonesian educational content auditor for ${grade}.
Audit only the QUIZ questions. Check: correctIndex truly correct, options distinct, explanation accurate/helpful, question matches topic.
Return ONLY a JSON object (no markdown fences) with exact shape:
{"quizIssues":[{"questionIndex":0,"severity":"low|medium|high","issue":"...","suggestedFix":"..."}],"fixedQuestions":[...] or null,"regenerateRecommended":false}
fixedQuestions is non-null only when you changed questions/explanations. Do not change a correct correctIndex unless factually wrong.`;

  const BATCH_SIZE = 5;
  const allQuizIssues: QuizIssue[] = [];
  let allFixedQuestions: Question[] | null = null;
  let regenerateRecommended = false;

  for (let b = 0; b < questions.length; b += BATCH_SIZE) {
    const batch = questions.slice(b, b + BATCH_SIZE);
    const raw = await call9Router(
      [
        { role: "system", content: system },
        { role: "user", content: `Subject: ${subject}\nTopic: ${topic}\n\nQUIZ QUESTIONS (batch ${b / BATCH_SIZE + 1}/${Math.ceil(questions.length / BATCH_SIZE)}):\n${JSON.stringify(batch, null, 2)}` },
      ],
      3000,
      0.2,
    );
    if (!raw) throw new Error(`LLM returned null on quiz batch ${b / BATCH_SIZE + 1}`);
    const parsed = JSON.parse(stripJsonFence(raw));
    if (parsed.quizIssues) {
      for (const issue of parsed.quizIssues) {
        issue.questionIndex += b;
        allQuizIssues.push(issue);
      }
    }
    if (parsed.fixedQuestions) {
      if (!allFixedQuestions) allFixedQuestions = [];
      allFixedQuestions.push(...parsed.fixedQuestions);
    }
    if (parsed.regenerateRecommended) regenerateRecommended = true;
  }

  // If any batch returned null fixedQuestions, preserve original for untouched items
  if (allFixedQuestions && allFixedQuestions.length < questions.length) {
    const preserved: Question[] = [];
    let fixedIdx = 0;
    for (let i = 0; i < questions.length; i++) {
      if (i >= allFixedQuestions.length) {
        preserved.push(questions[i]);
      } else {
        preserved.push(allFixedQuestions[i]);
      }
    }
    allFixedQuestions = preserved;
  }

  return { quizIssues: allQuizIssues, fixedQuestions: allFixedQuestions, regenerateRecommended };
}

function allLowOrMedium(issues: (SlideIssue | QuizIssue)[]): boolean {
  return issues.every((i) => i.severity === "low" || i.severity === "medium");
}

// ─── Args ─────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);
  return {
    grade: get("--grade"),
    limit: get("--limit") ? parseInt(get("--limit")!, 10) : 0,
    dryRun: has("--dry-run"),
    apply: has("--apply"),
    subject: get("--subject"),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { grade, limit, dryRun, apply, subject } = parseArgs();
  if (!grade) {
    console.error("Usage: npx tsx scripts/audit-content.ts --grade SD_5 [--apply] [--dry-run] [--limit N] [--subject X]");
    process.exit(1);
  }

  // Retry mode: AUDIT_ONLY_IDS env var
  const onlyIds = process.env.AUDIT_ONLY_IDS?.split(",").filter(Boolean);
  const isRetry = !!(onlyIds && onlyIds.length > 0);
  if (isRetry) {
    console.log(`[retry] AUDIT_ONLY_IDS: ${onlyIds!.length} materials`);
    deleteProgress(grade);
  }

  const template = await prisma.student.findFirst({
    where: { gradeLevel: grade as any, isTemplate: true },
  });
  if (!template) {
    console.error(`Template not found for grade ${grade}`);
    process.exit(1);
  }

  const prev = loadProgress(grade);
  let startIdx = 0;
  if (prev.running && prev.done > 0 && !isRetry) {
    console.log(`Resuming: ${prev.done}/${prev.total} done, ${prev.errors} errors so far`);
    startIdx = prev.done;
  }

  const materials = await prisma.material.findMany({
    where: {
      curriculum: { studentId: template.id },
      ...(subject ? { subject } : {}),
      ...(onlyIds ? { id: { in: onlyIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: isRetry ? undefined : (limit > 0 ? limit : undefined),
  });

  if (isRetry) {
    saveProgress(grade, {
      startedAt: new Date().toISOString(),
      total: materials.length,
      done: 0,
      applied: 0,
      errors: 0,
      highSev: 0,
      running: true,
    });
  }

  console.log(`Template: ${template.studentId} (${template.name})`);
  console.log(`Materials to audit: ${materials.length}${startIdx > 0 ? ` (from index ${startIdx})` : ""}`);

  const quizzes = await prisma.quiz.findMany({
    where: { studentId: template.id },
  });
  const quizByMaterial = new Map<string, typeof quizzes>();
  for (const q of quizzes) {
    const list = quizByMaterial.get(q.materialId) || [];
    list.push(q);
    quizByMaterial.set(q.materialId, list);
  }

  const results: any[] = [];
  let appliedFixes = isRetry ? 0 : prev.applied;
  let flaggedHigh = isRetry ? 0 : prev.highSev;
  let errors = isRetry ? 0 : prev.errors;
  const startTime = isRetry ? new Date().toISOString() : prev.startedAt || new Date().toISOString();

  const effectiveStart = isRetry ? 0 : startIdx;
  for (let i = effectiveStart; i < materials.length; i++) {
    const m = materials[i];
    const slide = (m.metadata as any)?.slide as string | undefined;
    const mq = quizByMaterial.get(m.id) || [];
    const questions = mq.flatMap((q) => ((q.questions as unknown as Question[]) || []));

    console.log(`[${i + 1}/${materials.length}] ${m.subject} / ${m.topic} — ${questions.length} questions`);

    if (!slide && questions.length === 0) {
      results.push({ materialId: m.id, subject: m.subject, topic: m.topic, skipped: true });
      if ((i + 1) % 10 === 0 || i === materials.length - 1) {
        saveProgress(grade, { startedAt: startTime, total: materials.length, done: i + 1, applied: appliedFixes, errors, highSev: flaggedHigh, running: true });
      }
      continue;
    }

    try {
      // Sequential (not parallel) to avoid 9Router overload causing double timeout
      const slideAudit = slide
        ? await auditSlide(grade, m.subject, m.topic, slide)
        : { slideIssues: [], fixedSlide: null, regenerateRecommended: false };
      const quizAudit = questions.length > 0
        ? await auditQuiz(grade, m.subject, m.topic, questions)
        : { quizIssues: [], fixedQuestions: null, regenerateRecommended: false };

      const audit: AuditResult = {
        slideIssues: slideAudit.slideIssues,
        quizIssues: quizAudit.quizIssues,
        fixedSlide: slideAudit.fixedSlide,
        fixedQuestions: quizAudit.fixedQuestions,
        regenerateRecommended: slideAudit.regenerateRecommended || quizAudit.regenerateRecommended,
      };

      const result = {
        materialId: m.id,
        subject: m.subject,
        topic: m.topic,
        slideIssueCount: audit.slideIssues.length,
        quizIssueCount: audit.quizIssues.length,
        slideIssues: audit.slideIssues,
        quizIssues: audit.quizIssues,
        fixedSlide: !!audit.fixedSlide,
        fixedQuestions: !!audit.fixedQuestions,
        regenerateRecommended: audit.regenerateRecommended,
      };

      const hasHigh =
        audit.slideIssues.some((x) => x.severity === "high") ||
        audit.quizIssues.some((x) => x.severity === "high");
      if (hasHigh) flaggedHigh++;

      if (apply && !dryRun) {
        const safeSlide = audit.fixedSlide && allLowOrMedium(audit.slideIssues);
        const safeQuestions =
          audit.fixedQuestions &&
          audit.fixedQuestions.length === questions.length &&
          allLowOrMedium(audit.quizIssues);

        if (safeSlide) {
          await prisma.material.update({
            where: { id: m.id },
            data: { metadata: { ...(m.metadata as any), slide: audit.fixedSlide } },
          });
          console.log("  → applied slide fix");
          appliedFixes++;
        }
        if (safeQuestions && mq.length === 1) {
          await prisma.quiz.update({
            where: { id: mq[0].id },
            data: { questions: audit.fixedQuestions as any },
          });
          console.log("  → applied quiz fix");
          appliedFixes++;
        }
      }

      results.push(result);
    } catch (err) {
      console.error(`  ERROR auditing ${m.id}:`, (err as Error).message);
      results.push({ materialId: m.id, subject: m.subject, topic: m.topic, error: (err as Error).message });
      errors++;
    }

    if ((i + 1) % 5 === 0 || i === materials.length - 1) {
      saveProgress(grade, { startedAt: startTime, total: materials.length, done: i + 1, applied: appliedFixes, errors, highSev: flaggedHigh, running: true });
    }
  }

  const reportDir = join(process.cwd(), "audit-reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `${new Date().toISOString().slice(0, 10)}-${grade}-audit.json`);
  writeFileSync(reportPath, JSON.stringify({
    grade,
    template: template.studentId,
    dryRun,
    apply,
    count: materials.length,
    flaggedHigh,
    appliedFixes,
    results,
  }, null, 2));

  saveProgress(grade, { startedAt: startTime, total: materials.length, done: materials.length, applied: appliedFixes, errors, highSev: flaggedHigh, running: false });

  console.log(`\n=== Summary ===`);
  console.log(`Audited: ${materials.length} (errors: ${errors}, high-sev: ${flaggedHigh})`);
  if (apply && !dryRun) console.log(`Applied fixes: ${appliedFixes}`);
  console.log(`Report: ${reportPath}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
