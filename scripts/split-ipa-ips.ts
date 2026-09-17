/**
 * Drop the Kurikulum-Merdeka-integrated `IPA` and `IPS` subjects from a
 * student's active curriculum.
 *
 * The school does not teach them. Moodle runs Biologi (4169), Fisika (4171),
 * Kimia (4174), Geografi (4172) and Sejarah (4179) as separate courses for
 * VII A, and there is no IPA or IPS course at all. The two integrated rows are
 * leftovers from the original data bank in `curriculum-topics-smp7.ts`.
 *
 * Five mapped rows sit inside IPA/IPS with no equivalent under the split
 * subjects. They are re-homed rather than deleted, so no content is lost:
 *
 *   IPA  Suhu dan Kalor / Kalor dan Perpindahannya        -> Fisika
 *   IPA  Suhu dan Kalor / Suhu dan Pemuaian               -> Fisika
 *   IPS  Kegiatan Ekonomi / Produksi, Distribusi, ...     -> Ekonomi
 *   IPS  Kegiatan Ekonomi / Pasar dan Permintaan-...      -> Ekonomi
 *   IPS  Interaksi Sosial / Sosialisasi dan Lembaga ...   -> Sosiologi
 *
 * Everything else under IPA/IPS is either a duplicate of a split subject
 * (17 of 45) or a leftover from the integrated data bank at weekOrder 999
 * (29 of 45, never scheduled, never shown to the student).
 *
 * Refuses to touch a quiz that has attempts against it — deleting those would
 * destroy student history.
 *
 * Usage:
 *   node scripts/run-ts.mjs scripts/split-ipa-ips.ts [STUDENT_ID]
 *   node scripts/run-ts.mjs scripts/split-ipa-ips.ts [STUDENT_ID] --apply
 */
import { prisma } from "@/lib/prisma";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

const DROP = ["IPA", "IPS"];

/** [fromSubject, topic, subTopic] -> subject that keeps the content */
const REHOME: [string, string, string, string][] = [
  ["IPA", "Suhu dan Kalor", "Kalor dan Perpindahannya", "Fisika"],
  ["IPA", "Suhu dan Kalor", "Suhu dan Pemuaian", "Fisika"],
  ["IPS", "Kegiatan Ekonomi", "Produksi, Distribusi, dan Konsumsi", "Ekonomi"],
  ["IPS", "Kegiatan Ekonomi", "Pasar dan Permintaan-Penawaran", "Ekonomi"],
  ["IPS", "Interaksi Sosial", "Sosialisasi dan Lembaga Sosial", "Sosiologi"],
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const sid = args.find((a) => !a.startsWith("--")) ?? "RAIHAN001";

  const student = await prisma.student.findUnique({
    where: { studentId: sid },
    select: { id: true, name: true, gradeLevel: true },
  });
  if (!student) throw new Error(`student ${sid} not found`);

  const cid = await getActiveCurriculumId(student.id);
  if (!cid) throw new Error("no active curriculum");

  console.log(`${student.name} (${sid}) ${student.gradeLevel} — active ${cid}\n`);

  const rows = await prisma.material.findMany({
    where: { curriculumId: cid, subject: { in: DROP } },
    select: {
      id: true,
      subject: true,
      topic: true,
      subTopic: true,
      weekOrder: true,
      _count: { select: { quizzes: true } },
    },
    orderBy: [{ subject: "asc" }, { weekOrder: "asc" }],
  });

  const before = await prisma.material.groupBy({
    by: ["subject"],
    where: { curriculumId: cid },
    _count: { _all: true },
  });
  const paletteBefore = before.map((b) => b.subject).sort();

  // ── split rows into re-home / delete ──
  const rehome = new Map<string, string>();
  const doomed: typeof rows = [];

  for (const r of rows) {
    const hit = REHOME.find(
      ([s, t, st]) => s === r.subject && t === r.topic && st === r.subTopic,
    );
    if (hit) rehome.set(r.id, hit[3]);
    else doomed.push(r);
  }

  const unused = REHOME.filter(
    ([s, t, st]) => !rows.some((r) => r.subject === s && r.topic === t && r.subTopic === st),
  );

  console.log(`── re-home (${rehome.size}) ──`);
  for (const r of rows) {
    const to = rehome.get(r.id);
    if (to) console.log(`  ${apply ? "MOVE" : "DRY "}  ${r.subject} -> ${to}   ${r.topic} / ${r.subTopic}`);
  }
  if (unused.length) {
    console.log(`  ⚠ ${unused.length} re-home rule(s) matched nothing:`);
    for (const [s, t, st] of unused) console.log(`      ${s} / ${t} / ${st}`);
  }

  console.log(`\n── delete (${doomed.length}) ──`);
  const bySub = new Map<string, number>();
  for (const r of doomed) bySub.set(r.subject, (bySub.get(r.subject) ?? 0) + 1);
  for (const [s, n] of bySub) console.log(`  ${s}: ${n} materials`);

  const doomedIds = doomed.map((r) => r.id);
  const quizzes = await prisma.quiz.findMany({
    where: { materialId: { in: doomedIds } },
    select: { id: true, _count: { select: { attempts: true } } },
  });
  const withAttempts = quizzes.filter((q) => q._count.attempts > 0);
  console.log(`  quizzes to delete: ${quizzes.length}`);
  if (withAttempts.length) {
    console.log(`  🚨 ${withAttempts.length} quiz(zes) have ATTEMPTS — refusing to delete those materials`);
    for (const q of withAttempts) console.log(`      quiz ${q.id}: ${q._count.attempts} attempts`);
  }

  const safeIds = doomed
    .filter((r) => !withAttempts.some((q) => q.id === r.id))
    .map((r) => r.id);

  console.log(`\npalette before : ${paletteBefore.join(", ")}`);
  const paletteAfter = [
    ...new Set([
      ...before.filter((b) => !DROP.includes(b.subject)).map((b) => b.subject),
      ...[...rehome.values()],
    ]),
  ].sort();
  console.log(`palette after  : ${paletteAfter.join(", ")}`);

  if (!apply) {
    console.log(`\nDRY RUN — nothing written. Re-run with --apply.`);
    await prisma.$disconnect();
    return;
  }

  if (withAttempts.length) {
    throw new Error("aborting: some quizzes have attempts");
  }

  // re-home first, then remove the rest
  for (const [id, to] of rehome) {
    await prisma.material.update({ where: { id }, data: { subject: to } });
  }
  await prisma.quiz.deleteMany({ where: { materialId: { in: safeIds } } });
  await prisma.material.deleteMany({ where: { id: { in: safeIds } } });

  const after = await prisma.material.groupBy({
    by: ["subject"],
    where: { curriculumId: cid },
    _count: { _all: true },
  });
  console.log(`\nAPPLIED: moved ${rehome.size}, deleted ${safeIds.length}`);
  console.log(`palette now (${after.length}): ${after.map((a) => a.subject).sort().join(", ")}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
