/**
 * Prosem coverage audit — which prosem sessions have no Material?
 *
 * The question this answers: "masih adakah topic/subtopic yang belum
 * di-generate, dengan merujuk ke prosem terbaru?"
 *
 * Method: for every prosem entry (one teaching session), find the best-matching
 * Material row in the student's ACTIVE curriculum and classify it:
 *
 *   COVERED  best score >= SIM_THRESHOLD (0.84) — a material exists
 *   NEAR     0.60 <= best < 0.84 — probably the same lesson under a different
 *            label; needs a human look, not a regeneration
 *   MISSING  best < 0.60 — no material corresponds to this session
 *   ABSENT   the subject has zero materials in the active curriculum
 *
 * Uses the SAME matcher as `sync-weekorder-prosem.ts` (imported from
 * `src/lib/prosem-match.ts`) so the coverage answer can never disagree with the
 * weekOrder assignments.
 *
 * Assessment-only sessions (penilaian sumatif, remedial, evaluasi, asas) are
 * excluded from the gap count — they are not content to generate. The count of
 * excluded rows is reported so the filter is auditable rather than silent.
 *
 * Usage:
 *   npx tsx scripts/prosem-coverage.ts            # report to stdout + JSON
 *   npx tsx scripts/prosem-coverage.ts --json-only
 */
import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { PROSEM_PLANS } from "../src/data/prosem-index";
import type { ProsemEntry, ProsemPlan } from "../src/lib/prosem";
import {
  GRADE_MAP,
  SKIP_SUBTOPIC,
  SUBJECT_ALIASES,
  SIM_THRESHOLD,
  CONTAINMENT_THRESHOLD,
  containmentScore,
  chapterScore,
  sessionCoveredByLabel,
  entryMaterialScore,
  subjectSatisfies,
} from "../src/lib/prosem-match";

const NEAR_THRESHOLD = 0.6;
const JSON_ONLY = process.argv.includes("--json-only");

/**
 * Prefix a material label with its curriculum subject, but only when that
 * differs from the prosem subject. A VII Physics audit that silently matched
 * an IPA row would hide where the content actually lives.
 */
function labelSubject(m: { subject: string }, planSubject: string): string {
  return m.subject.toLowerCase() === planSubject.toLowerCase() ? "" : `${m.subject} / `;
}

interface Row {
  student: string;
  gradeLevel: string;
  subject: string;
  semester: string;
  topic: string;
  subtopic: string;
  weeks: string;
  verdict: "COVERED" | "CONTAINED" | "CHAPTER" | "NEAR" | "MISSING" | "ABSENT";
  bestScore: number;
  bestLabel: string;
  containScore: number;
  containLabel: string;
}

async function main() {
  const students = await prisma.student.findMany({
    where: { isTemplate: true },
    select: { id: true, name: true, studentId: true, gradeLevel: true },
    orderBy: { gradeLevel: "asc" },
  });

  const rows: Row[] = [];
  const contained: {
    student: string;
    subject: string;
    semester: string;
    weeks: string;
    prosemSession: string;
    matchedLabel: string;
    containScore: number;
    fuzzyScore: number;
  }[] = [];
  const summary: Record<
    string,
    { covered: number; chapter: number; near: number; missing: number; absent: number; assessment: number }
  > = {};

  const chapters: {
    student: string;
    subject: string;
    semester: string;
    weeks: string;
    prosemSession: string;
    chapter: string;
    lessonsInChapter: string;
    fuzzyScore: number;
  }[] = [];

  for (const student of students) {
    const gradeKey = GRADE_MAP[student.gradeLevel];
    if (!gradeKey) {
      console.log(`# ${student.name} (${student.gradeLevel}) — tidak ada prosem untuk jenjang ini, dilewati`);
      continue;
    }
    const plans = PROSEM_PLANS.filter((p) => p.grade.toLowerCase() === gradeKey);
    if (plans.length === 0) continue;

    // active curriculum = highest version (same rule as sync-weekorder-prosem.ts)
    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId: student.id },
      orderBy: { version: "desc" },
      select: { id: true, version: true },
    });
    if (!curriculum) continue;

    const materials = await prisma.material.findMany({
      where: { curriculumId: curriculum.id },
      select: { id: true, subject: true, topic: true, subTopic: true },
    });

    console.log(
      `# ${student.name} (${student.studentId}, ${student.gradeLevel}) — kurikulum v${curriculum.version}, ${materials.length} material`
    );

    for (const plan of plans) {
      const key = `${student.studentId}|${plan.grade}|${plan.subject}|${plan.semester}`;
      const s = (summary[key] ??= { covered: 0, chapter: 0, near: 0, missing: 0, absent: 0, assessment: 0 });

      // SMP prosem names the specialist subject (Biologi/Fisika/Sejarah) while
      // the curriculum stores biology, physics and chemistry together under IPA
      // (and the social subjects under IPS).
      //
      // The pool is a UNION of the exact subject and its aliases — deliberately
      // not a fallback used only when the exact subject is empty. VII Physics
      // has real `Fisika` rows (Fluida, Gerak Lurus) *and* its thermal chapter
      // "Suhu dan Kalor" filed under IPA. A fallback pool therefore never saw
      // the chapter and reported all 11 thermal sessions as gaps, which is the
      // exact false negative this script exists to prevent.
      const aliasSubjects = SUBJECT_ALIASES[plan.subject.toLowerCase()] ?? [];
      // `subjectSatisfies` also enforces the course-variant boundary, so the
      // "Matematika" pool can never absorb "Matematika Tingkat Lanjut" rows —
      // `sim` rates those 0.850, one hundredth above SIM_THRESHOLD.
      const pool = materials.filter((m) => subjectSatisfies(plan.subject, m.subject));
      const usedAlias = pool.some((m) => m.subject.toLowerCase() !== plan.subject.toLowerCase());
      const entries = (plan.entries as ProsemEntry[]).filter((e) => e.weeks.length > 0);
      const content = entries.filter(
        (e) => !SKIP_SUBTOPIC.test(e.subtopic) && !SKIP_SUBTOPIC.test(e.topic)
      );
      s.assessment += entries.length - content.length;

      if (pool.length === 0) {
        for (const e of content) {
          s.absent++;
          rows.push({
            student: student.studentId,
            gradeLevel: student.gradeLevel,
            subject: plan.subject,
            semester: plan.semester,
            topic: e.topic,
            subtopic: e.subtopic,
            weeks: e.weeks.map((w) => w.week).join(","),
            verdict: "ABSENT",
            bestScore: 0,
            bestLabel: `(tidak ada material "${plan.subject}"${aliasSubjects.length ? ` maupun ${aliasSubjects.join("/")}` : ""} di kurikulum aktif)`,
            containScore: 0,
            containLabel: "-",
          });
        }
        continue;
      }
      if (usedAlias) {
        const sources = [...new Set(pool.map((m) => m.subject))].join(" + ");
        console.log(
          `  ! ${plan.subject}: pool = ${sources} (${pool.length} material) — mapel prosem disimpan terpisah di kurikulum`
        );
      }

      for (const e of content) {
        let bestScore = 0;
        let bestLabel = "";
        let bestContain = 0;
        let bestContainFuzzy = -1;
        let containLabel = "";
        let bestChapter = 0;
        let chapterLabel = "";
        let chapterMaterial: (typeof pool)[number] | null = null;
        for (const m of pool) {
          const sc = entryMaterialScore(e, m);
          if (sc > bestScore) {
            bestScore = sc;
            bestLabel = `${labelSubject(m, plan.subject)}${m.topic} / ${m.subTopic ?? "-"}`;
          }
          // a material's LESSON label spelled out inside the session text.
          // subTopic only — a chapter name in the sentence proves nothing.
          //
          // Evidence is chosen by fuzzy score, not by containment score: many
          // materials satisfy "every word present" (generic words like
          // "struktur", "fungsi", "sel"), and picking the first one named the
          // wrong lesson — a session about blood cells was credited to
          // "Struktur dan Fungsi Sel". The highest-fuzzy candidate is the one a
          // human would point at.
          const label = m.subTopic;
          if (label) {
            const cs = containmentScore(e.subtopic, label);
            const mirrored = sessionCoveredByLabel(e.subtopic, label);
            const full = Math.max(cs, mirrored ? 1 : 0);
            if (full >= 1 && sc >= bestContainFuzzy) {
              bestContainFuzzy = sc;
              bestContain = 1;
              containLabel = `${labelSubject(m, plan.subject)}${m.topic} / ${m.subTopic}`;
            } else if (full > bestContain) {
              bestContain = full;
              bestContainFuzzy = sc;
              containLabel = `${labelSubject(m, plan.subject)}${m.topic} / ${m.subTopic}`;
            }
          }
          // chapter-level: the session's content sits inside this chapter name
          const chs = chapterScore(e.subtopic, m.topic);
          if (chs > bestChapter) {
            bestChapter = chs;
            chapterLabel = `${labelSubject(m, plan.subject)}${m.topic}`;
            chapterMaterial = m;
          }
        }

        // The session is covered when either the fuzzy score clears the bar OR
        // the session text spells out an existing lesson label in full.
        const verdict: Row["verdict"] =
          bestScore >= SIM_THRESHOLD
            ? "COVERED"
            : bestContain >= CONTAINMENT_THRESHOLD
              ? "CONTAINED"
              : bestChapter === 1
                ? "CHAPTER"
                : bestScore >= NEAR_THRESHOLD
                  ? "NEAR"
                  : "MISSING";

        if (verdict === "COVERED" || verdict === "CONTAINED") s.covered++;
        else if (verdict === "CHAPTER") s.chapter++;
        else if (verdict === "NEAR") s.near++;
        else s.missing++;

        // CHAPTER means the session's chapter exists in the curriculum but no
        // lesson under it matched by name. The chapter may cover several
        // sessions, so each one is listed for a human to confirm the specific
        // lesson is really there — this is the verdict most likely to hide a
        // genuine gap.
        if (verdict === "CHAPTER" && chapterMaterial) {
          chapters.push({
            student: student.studentId,
            subject: plan.subject,
            semester: plan.semester,
            weeks: e.weeks.map((w) => w.week).join(","),
            prosemSession: `${e.topic} / ${e.subtopic}`,
            chapter: chapterLabel,
            lessonsInChapter: pool
              .filter((m) => m.topic === chapterMaterial!.topic)
              .map((m) => m.subTopic ?? "-")
              .join(" | "),
            fuzzyScore: Number(bestScore.toFixed(3)),
          });
        }

        // CONTAINED is inferred rather than scored, so every one of them is
        // recorded for human audit — a silent containment upgrade is exactly
        // the failure mode that would let a real gap hide.
        if (verdict === "CONTAINED") {
          contained.push({
            student: student.studentId,
            subject: plan.subject,
            semester: plan.semester,
            weeks: e.weeks.map((w) => w.week).join(","),
            prosemSession: `${e.topic} / ${e.subtopic}`,
            matchedLabel: containLabel,
            containScore: Number(bestContain.toFixed(3)),
            fuzzyScore: Number(bestScore.toFixed(3)),
          });
        }

        // only keep non-covered rows — COVERED is the boring majority
        if (verdict !== "COVERED" && verdict !== "CONTAINED") {
          rows.push({
            student: student.studentId,
            gradeLevel: student.gradeLevel,
            subject: plan.subject,
            semester: plan.semester,
            topic: e.topic,
            subtopic: e.subtopic,
            weeks: e.weeks.map((w) => w.week).join(","),
            verdict,
            bestScore: Number(bestScore.toFixed(3)),
            bestLabel: bestLabel || "(tidak ada kandidat)",
            containScore: Number(bestContain.toFixed(3)),
            containLabel: containLabel || "(tidak ada kandidat)",
          });
        }
      }
    }
  }

  // ---- report ----
  if (!JSON_ONLY) {
    console.log("\n## Ringkasan per mapel\n");
    console.log("| Student | Grade | Mapel | Sem | Sesi konten | Covered | Bab ada | Near | Missing | Absent | Sesi asesmen (dikecualikan) |");
    console.log("|---|---|---|---|---|---|---|---|---|---|---|");
    for (const [key, v] of Object.entries(summary)) {
      const [sid, g, subject, sem] = key.split("|");
      const total = v.covered + v.chapter + v.near + v.missing + v.absent;
      console.log(
        `| ${sid} | ${g} | ${subject} | ${sem} | ${total} | ${v.covered} | ${v.chapter} | ${v.near} | ${v.missing} | ${v.absent} | ${v.assessment} |`
      );
    }

    const gaps = rows.filter((r) => r.verdict === "MISSING" || r.verdict === "ABSENT");
    console.log(`\n## Celah: ${gaps.length} sesi tanpa material (fuzzy < ${NEAR_THRESHOLD} & tidak ada bab yang cocok)\n`);
    for (const r of gaps.sort((a, b) => a.student.localeCompare(b.student) || a.subject.localeCompare(b.subject) || a.subtopic.localeCompare(b.subtopic))) {
      console.log(
        `- [${r.verdict}] ${r.student} | ${r.subject} (${r.semester}) | w${r.weeks} | ${r.topic} / ${r.subtopic}\n    best=${r.bestScore} vs ${r.bestLabel}`
      );
    }

    console.log(
      `\n## Bab ada, pelajaran spesifik tidak ketemu: ${chapters.length} sesi (WAJIB diaudit)\n`
    );
    for (const c of chapters) {
      console.log(
        `- ${c.student} | ${c.subject} (${c.semester}) | w${c.weeks}\n    sesi : ${c.prosemSession}\n    bab  : ${c.chapter}\n    isi bab: ${c.lessonsInChapter}`
      );
    }

    const near = rows.filter((r) => r.verdict === "NEAR");
    console.log(`\n## Perlu tinjauan manusia: ${near.length} sesi (label berbeda, kemungkinan sudah ada)\n`);
    for (const r of near.sort((a, b) => b.bestScore - a.bestScore)) {
      console.log(
        `- ${r.student} | ${r.subject} (${r.semester}) | w${r.weeks} | ${r.topic} / ${r.subtopic}\n    best=${r.bestScore} vs ${r.bestLabel}`
      );
    }

    console.log(
      `\n## Ter-cover lewat pencocokan kata: ${contained.length} sesi (BUKAN fuzzy — wajib diaudit)\n`
    );
    for (const c of contained) {
      console.log(
        `- ${c.student} | ${c.subject} (${c.semester}) | w${c.weeks}\n    sesi : ${c.prosemSession}\n    cocok: ${c.matchedLabel} (contain=${c.containScore}, fuzzy=${c.fuzzyScore})`
      );
    }
  }

  mkdirSync("audit-reports", { recursive: true });
  const out = {
    generatedAt: new Date().toISOString(),
    thresholds: { covered: SIM_THRESHOLD, contained: CONTAINMENT_THRESHOLD, near: NEAR_THRESHOLD },
    summary,
    rows,
    contained,
    chapters,
  };
  writeFileSync("audit-reports/prosem-coverage.json", JSON.stringify(out, null, 2));
  const totals = Object.values(summary).reduce(
    (a, v) => ({
      covered: a.covered + v.covered,
      chapter: a.chapter + v.chapter,
      near: a.near + v.near,
      missing: a.missing + v.missing,
      absent: a.absent + v.absent,
      assessment: a.assessment + v.assessment,
    }),
    { covered: 0, chapter: 0, near: 0, missing: 0, absent: 0, assessment: 0 }
  );
  console.log(
    `\nTOTAL: covered=${totals.covered} bab_ada=${totals.chapter} near=${totals.near} missing=${totals.missing} absent=${totals.absent} (sesi asesmen dikecualikan: ${totals.assessment})`
  );
  console.log("JSON: audit-reports/prosem-coverage.json");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
