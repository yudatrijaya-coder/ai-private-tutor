/**
 * End-to-end check that regenerating a curriculum reproduces the school's
 * subject set from the data bank.
 *
 * Creates a throwaway SMP_1 student, runs the same two calls the
 * `/api/curriculum/regenerate` route makes, prints the resulting palette, then
 * tears the student down.
 *
 * Usage: node scripts/run-ts.mjs scripts/verify-regenerate-smp7.ts
 */
import { prisma } from "@/lib/prisma";
import {
  generateCurriculumDraft,
  replaceCurriculumForStudent,
} from "@/agents/curriculum";
import { MIN_USABLE_SLIDE_LENGTH } from "@/lib/content/slide-content";

const EXPECTED = [
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Bahasa Mandarin",
  "Biologi",
  "Ekonomi",
  "Fisika",
  "Geografi",
  "Informatika",
  "Kimia",
  "Matematika",
  "Pendidikan Agama Islam",
  "Pendidikan Pancasila",
  "PJOK",
  "Sejarah",
  "Sosiologi",
].sort();

const FORBIDDEN = ["IPA", "IPS"];

async function main(): Promise<void> {
  const sid = "ZZTEST_REGEN";
  await prisma.student.deleteMany({ where: { studentId: sid } });

  const student = await prisma.student.create({
    data: {
      studentId: sid,
      name: "Regen Probe",
      gradeLevel: "SMP_1",
      status: "TRIAL",
    },
  });

  try {
    // ── first generation (what onboarding does) ──
    await generateCurriculumDraft(student.id);

    const first = await prisma.material.groupBy({
      by: ["subject"],
      where: { curriculum: { studentId: student.id } },
      _count: { _all: true },
    });
    const firstPalette = first.map((f) => f.subject).sort();
    console.log(`generation 1 — ${firstPalette.length} subjects, ${first.reduce((n, f) => n + f._count._all, 0)} materials`);
    console.log(`  ${firstPalette.join(", ")}`);

    // ── regenerate (what the admin button does) ──
    const replaced = await replaceCurriculumForStudent(student.id);
    console.log(`\nreplace -> mode=${replaced.mode} nextVersion=${replaced.nextVersion} removed=${replaced.oldMaterialCount} materials`);

    await generateCurriculumDraft(student.id, { version: replaced.nextVersion });

    const rows = await prisma.material.findMany({
      where: { curriculum: { studentId: student.id } },
      select: { subject: true, curriculumId: true },
      orderBy: { subject: "asc" },
    });
    const curricula = await prisma.curriculum.findMany({
      where: { studentId: student.id },
      select: { id: true, version: true, _count: { select: { materials: true } } },
      orderBy: { version: "desc" },
    });
    const active = curricula[0];
    const activeRows = rows.filter((r) => r.curriculumId === active.id);
    const palette = [...new Set(activeRows.map((r) => r.subject))].sort();

    console.log(`\ncurriculum rows: ${curricula.map((c) => `v${c.version}:${c._count.materials}`).join(" ")}`);
    console.log(`active v${active.version} — ${palette.length} subjects, ${activeRows.length} materials`);
    console.log(`  ${palette.join(", ")}`);

    // ── assertions ──
    const missing = EXPECTED.filter((s) => !palette.includes(s));
    const forbidden = FORBIDDEN.filter((s) => palette.includes(s));
    const extra = palette.filter((s) => !EXPECTED.includes(s));

    console.log("");
    console.log(`missing   : ${missing.length ? missing.join(", ") : "none ✔"}`);
    console.log(`forbidden : ${forbidden.length ? forbidden.join(", ") : "none ✔"}`);
    console.log(`unexpected: ${extra.length ? extra.join(", ") : "none ✔"}`);

    const quizCount = await prisma.quiz.count({
      where: { material: { curriculumId: active.id } },
    });
    console.log(`quizzes   : ${quizCount}/${activeRows.length}`);

    // ── content richness: the whole point of the regenerated bank ──
    const richRows = await prisma.material.findMany({
      where: { curriculumId: active.id },
      select: { subject: true, subTopic: true, processedContent: true, metadata: true },
    });
    let withContent = 0;
    let withSlide = 0;
    let usableContent = 0;
    let totalChars = 0;
    const thin: string[] = [];
    for (const r of richRows) {
      const c = r.processedContent ?? "";
      if (c.length > 0) { withContent++; totalChars += c.length; }
      if (c.length >= MIN_USABLE_SLIDE_LENGTH) usableContent++;
      else thin.push(`${r.subject}/${r.subTopic} (${c.length})`);
      if (typeof (r.metadata as Record<string, unknown> | null)?.slide === "string") withSlide++;
    }
    console.log(`content   : ${withContent}/${richRows.length} non-empty, ${usableContent} >= ${MIN_USABLE_SLIDE_LENGTH} chars, avg ${Math.round(totalChars / Math.max(1, withContent))} chars`);
    console.log(`metadata.slide: ${withSlide}/${richRows.length} (slides viewer resolves from metadata only)`);
    if (thin.length) console.log(`  thin: ${thin.slice(0, 8).join(", ")}`);
    console.log(`fresh run : replaced v1 -> nextVersion=${replaced.nextVersion} (expect 1)`);
    console.log(`idempotent: first palette === second palette -> ${JSON.stringify(firstPalette) === JSON.stringify(palette)}`);

    // ── attempt-aware replacement ──
    const someQuiz = await prisma.quiz.findFirst({
      where: { material: { curriculumId: active.id } },
      select: { id: true },
    });
    await prisma.attempt.create({
      data: {
        quizId: someQuiz!.id,
        studentId: student.id,
        score: 50,
        maxScore: 50,
        answers: [],
        type: "QUIZ",
      },
    });

    const blocked = await replaceCurriculumForStudent(student.id);
    console.log(`\nwith 1 attempt, no force -> mode=${blocked.mode} nextVersion=${blocked.nextVersion} (expect blocked/0)`);
    const stillThere = await prisma.curriculum.count({ where: { studentId: student.id } });
    const attemptsAlive = await prisma.attempt.count({ where: { studentId: student.id } });
    console.log(`  untouched: ${stillThere} curriculum row(s), ${attemptsAlive} attempt(s) (expect 1/1)`);

    const superceded = await replaceCurriculumForStudent(student.id, { allowSupercede: true });
    console.log(`with force            -> mode=${superceded.mode} nextVersion=${superceded.nextVersion} (expect superseded/2)`);
    const attemptsStill = await prisma.attempt.count({ where: { studentId: student.id } });
    console.log(`  attempt history preserved: ${attemptsStill} (expect 1)`);

    const ok =
      missing.length === 0 &&
      forbidden.length === 0 &&
      extra.length === 0 &&
      replaced.nextVersion === 1 &&
      blocked.mode === "blocked" &&
      attemptsAlive === 1 &&
      superceded.mode === "superseded" &&
      superceded.nextVersion === 2 &&
      attemptsStill === 1 &&
      quizCount >= richRows.length - 1 &&
      usableContent === richRows.length &&
      withSlide === richRows.length &&
      JSON.stringify(firstPalette) === JSON.stringify(palette);
    console.log(`\n${ok ? "PASS" : "FAIL"}`);
  } finally {
    const cs = await prisma.curriculum.findMany({
      where: { studentId: student.id },
      select: { id: true },
    });
    const ids = cs.map((c) => c.id);
    const mids = (
      await prisma.material.findMany({ where: { curriculumId: { in: ids } }, select: { id: true } })
    ).map((m) => m.id);
    const qids = (
      await prisma.quiz.findMany({ where: { materialId: { in: mids } }, select: { id: true } })
    ).map((q) => q.id);
    await prisma.reviewQueue.deleteMany({ where: { quizId: { in: qids } } });
    await prisma.attempt.deleteMany({ where: { quizId: { in: qids } } });
    await prisma.quiz.deleteMany({ where: { id: { in: qids } } });
    await prisma.material.deleteMany({ where: { curriculumId: { in: ids } } });
    await prisma.curriculum.deleteMany({ where: { id: { in: ids } } });
    await prisma.student.delete({ where: { id: student.id } });
    console.log("probe student removed");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
