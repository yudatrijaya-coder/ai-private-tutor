/**
 * End-to-end check that regenerating a curriculum reproduces the school's
 * subject set, and produces materials that are actually filled in, for every
 * grade — SD_5, SMP_1 and SMA_2.
 *
 * The unit-level check in `scripts/verify-content-bank.ts` only proves the bank
 * covers the topics. This proves the whole path: `generateCurriculumDraft` reads
 * `GRADE_TOPICS` + the banks, so a grade whose bank is missing would come out
 * structurally correct and completely empty. That was the state of all three
 * grades before this work.
 *
 * Creates a throwaway student per grade, runs the same calls the
 * `/api/curriculum/regenerate` route makes, then tears it down.
 *
 * Usage: node scripts/run-ts.mjs scripts/verify-regenerate-all.ts
 */
import { prisma } from "@/lib/prisma";
import { generateCurriculumDraft, replaceCurriculumForStudent } from "@/agents/curriculum";
import { MIN_USABLE_SLIDE_LENGTH } from "@/lib/content/slide-content";

const GRADES = ["SD_5", "SMP_1", "SMA_2"] as const;
type Grade = (typeof GRADES)[number];

/**
 * Topics the source curriculum cannot supply a quiz for, so the generator cannot
 * attach one. Same two defects documented in `scripts/verify-content-bank.ts`:
 * a SMP_1 Sejarah row stored with five truncated questions, and an orphan SMA_2
 * Matematika Tingkat Lanjut test row that never had a quiz.
 */
const KNOWN_QUIZ_GAPS: Record<Grade, string[]> = {
  SD_5: [],
  // Both former gaps were data defects, now repaired: SMP_1 Sejarah had five
  // unrenderable questions, and SMA_2 Polinomial had a null processedContent
  // which made generateQuiz refuse to run. Add an entry only for a topic that
  // provably cannot have a quiz.
  SMP_1: [],
  SMA_2: [],
};

interface Row {
  grade: Grade;
  topics: number;
  subjects: number;
  filled: number;
  rich: number;
  quizzes: number;
  questions: number;
  minChars: number;
  avgChars: number;
  modes: string;
  ok: boolean;
  problems: string[];
}

/**
 * Delete a throwaway student and everything that references it.
 *
 * `prisma.student.delete` alone fails: 22 models carry a `studentId` and the FKs
 * are RESTRICT, so the probe students leaked on the first run. Deleting in the
 * order below works because every row is scoped to the student or its curriculum,
 * and the curriculum tree goes first (materials → quizzes → curriculum) so no
 * row is deleted while still referenced.
 */
async function teardown(studentId: string): Promise<void> {
  await replaceCurriculumForStudent(studentId, { allowSupercede: true }).catch(() => {});
  const db = prisma as unknown as Record<string, { deleteMany: (a: unknown) => Promise<unknown> }>;
  const scoped = [
    "attempt",
    "reviewQueue",
    "studentBadge",
    "progressSnap",
    "scheduleSession",
    "sessionState",
    "intervention",
    "chatLog",
    "studentActivity",
    "studySession",
    "studentSubjectMastery",
    "topicMastery",
    "reminder",
    "homeworkTask",
    "apiUsage",
    "agentLog",
    "examSchedule",
    "examAttempt",
    "improvementPlan",
  ];
  for (const model of scoped) {
    await db[model]?.deleteMany({ where: { studentId } }).catch(() => {});
  }
  await prisma.curriculum.deleteMany({ where: { studentId } }).catch(() => {});
  await prisma.student.delete({ where: { id: studentId } });
}

async function probe(grade: Grade): Promise<Row> {
  const sid = `ZZTEST_REGEN_${grade}`;
  // Clear leftovers from an interrupted run first — a bare deleteMany fails,
  // those students have dependants.
  for (const stale of await prisma.student.findMany({ where: { studentId: sid }, select: { id: true } })) {
    await teardown(stale.id).catch(() => {});
  }
  const student = await prisma.student.create({
    data: { studentId: sid, name: `Regen Probe ${grade}`, gradeLevel: grade, status: "TRIAL" },
  });

  const problems: string[] = [];
  try {
    await generateCurriculumDraft(student.id);

    // The route's sequence: clear the old version, then generate into it. No
    // attempts exist on a throwaway student, so this must take `replaced`.
    const replace = await replaceCurriculumForStudent(student.id);
    if (replace.mode !== "replaced") {
      problems.push(`regenerate took mode=${replace.mode}, expected replaced`);
    }
    await generateCurriculumDraft(student.id, { version: replace.nextVersion });

    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId: student.id },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });
    if (!curriculum) throw new Error("no curriculum after regenerate");

    const rows = await prisma.material.findMany({
      where: { curriculumId: curriculum.id },
      select: {
        id: true,
        subject: true,
        topic: true,
        subTopic: true,
        processedContent: true,
        metadata: true,
        _count: { select: { quizzes: true } },
      },
    });

    let filled = 0;
    let rich = 0;
    let quizzes = 0;
    let questions = 0;
    const lengths: number[] = [];
    const unexplained: string[] = [];
    for (const r of rows) {
      const md = (r.metadata ?? {}) as Record<string, unknown>;
      const slide = typeof md.slide === "string" ? md.slide.trim() : "";
      const len = slide.length || (r.processedContent ?? "").length;
      if (len > 0) filled++;
      if (len >= MIN_USABLE_SLIDE_LENGTH) rich++;
      lengths.push(len);
      if (r._count.quizzes > 0) {
        quizzes++;
      } else {
        const id = `${r.subject}||${r.topic}||${r.subTopic}`;
        if (!KNOWN_QUIZ_GAPS[grade].includes(id)) unexplained.push(id);
      }
      const q = await prisma.quiz.findMany({
        where: { materialId: r.id },
        select: { questions: true },
      });
      for (const qq of q) {
        questions += Array.isArray(qq.questions) ? qq.questions.length : 0;
      }
    }

    const subjects = [...new Set(rows.map((r) => r.subject))].sort();
    for (const bad of ["IPA", "IPS"]) {
      if (subjects.includes(bad)) problems.push(`forbidden subject present: ${bad}`);
    }
    if (filled !== rows.length) problems.push(`${rows.length - filled} material(s) have no content`);
    if (rich !== rows.length) problems.push(`${rows.length - rich} material(s) shorter than ${MIN_USABLE_SLIDE_LENGTH} chars`);
    for (const u of unexplained) problems.push(`no quiz and not a known gap: ${u}`);
    if (questions === 0) problems.push("no questions at all");

    const sum = lengths.reduce((a, b) => a + b, 0);
    return {
      grade,
      topics: rows.length,
      subjects: subjects.length,
      filled,
      rich,
      quizzes,
      questions,
      minChars: lengths.length ? Math.min(...lengths) : 0,
      avgChars: lengths.length ? Math.round(sum / lengths.length) : 0,
      modes: `regen=${replace.mode}`,
      ok: problems.length === 0,
      problems,
    };
  } finally {
    await teardown(student.id).catch((e) => console.error(`teardown failed: ${String(e).slice(0, 200)}`));
  }
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  for (const g of GRADES) {
    process.stdout.write(`probing ${g} … `);
    const r = await probe(g);
    rows.push(r);
    console.log(r.ok ? "ok" : `PROBLEMS: ${r.problems.join("; ")}`);
  }

  console.log("");
  console.log("grade  topics  subj  filled  rich   quiz  questions   min   avg  modes");
  for (const r of rows) {
    console.log(
      r.grade.padEnd(7) +
        String(r.topics).padStart(6) +
        String(r.subjects).padStart(6) +
        String(r.filled).padStart(8) +
        String(r.rich).padStart(6) +
        String(r.quizzes).padStart(7) +
        String(r.questions).padStart(10) +
        String(r.minChars).padStart(6) +
        String(r.avgChars).padStart(6) +
        "  " + r.modes,
    );
  }

  const bad = rows.filter((r) => !r.ok);
  console.log("");
  if (bad.length) {
    for (const r of bad) console.log(`FAIL ${r.grade}: ${r.problems.join("; ")}`);
  }
  console.log(bad.length ? "FAIL" : "PASS");

  const left = await prisma.student.count({ where: { studentId: { startsWith: "ZZTEST_REGEN" } } });
  console.log(`leftover probe students: ${left}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
