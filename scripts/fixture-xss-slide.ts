import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/**
 * Create or remove a material whose slide content carries an XSS payload.
 *
 * WHY
 * `scripts/test-slide-html-escape.ts` proves the renderer escapes payloads at
 * the unit level. That is not the same as proving the payload cannot execute in
 * a real browser on the real page, which is the claim that matters. This
 * fixture puts a payload into a real curriculum so the page can be loaded.
 *
 * The payload also carries a marker element so the browser check can tell
 * "escaped and shown as text" apart from "silently stripped".
 *
 * Usage:
 *   npx tsx scripts/fixture-xss-slide.ts create TIUMU001
 *   npx tsx scripts/fixture-xss-slide.ts remove
 */

const TOPIC = "ZZXSSFIXTURE";
const MARKER = "ZZXSSFIXTURE";
const PAYLOAD = `<img src=x onerror="window.__xssFired=true"><script>window.__xssFired=true</script>`;

const action = process.argv[2] ?? "create";
const code = process.argv[3] ?? "TIUMU001";

async function remove() {
  const materials = await prisma.material.findMany({
    where: { topic: TOPIC },
    select: { id: true },
  });
  if (materials.length === 0) {
    console.log("nothing to remove");
    return;
  }
  const ids = materials.map((m) => m.id);
  // Quizzes reference the material; clear them first so the delete cannot fail
  // on a foreign key and leave a half-cleaned fixture behind.
  await prisma.quiz.deleteMany({ where: { materialId: { in: ids } } });
  const res = await prisma.material.deleteMany({ where: { id: { in: ids } } });
  console.log(`removed ${res.count} material(s)`);
}

async function create() {
  await remove();

  const student = await prisma.student.findUnique({ where: { studentId: code } });
  if (!student) throw new Error(`student ${code} not found`);

  const curriculum = await prisma.curriculum.findFirst({ where: { studentId: student.id } });
  if (!curriculum) throw new Error(`no curriculum for ${code}`);

  const material = await prisma.material.create({
    data: {
      curriculumId: curriculum.id,
      topic: TOPIC,
      subTopic: "payload",
      subject: "Informatika",
      gradeLevel: "SMP_1" as never,
      weekOrder: 9999,
      status: "READY" as never,
      // The viewer splits on /\n{3,}/ into slides, so the payload is placed in
      // its own block to make sure it reaches renderSlideMarkdown intact.
      processedContent: `${MARKER} line before\n\n${PAYLOAD}\n\n${MARKER} line after`,
      metadata: {
        slide: `## ${MARKER}\n\nBefore\n\n${PAYLOAD}\n\nAfter`,
        slide_sibi: `## ${MARKER} SIBI\n\n${PAYLOAD}`,
      },
    },
  });

  console.log(`materialId=${material.id}`);
  console.log(`studentId=${student.id}`);
  console.log(`payload=${PAYLOAD}`);
}

const run = action === "remove" ? remove : create;
run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
