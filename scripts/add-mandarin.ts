/**
 * Tambah subject Bahasa Mandarin ke SHOFI
 * plus fix lookup jadwal sekolah SHOFI
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const student = await prisma.student.findFirst({ where: { studentId: "STU_MRHQL6KX" } });
  if (!student) {
    console.error("SHOFI tidak ditemukan");
    process.exit(1);
  }

  const curriculum = await prisma.curriculum.findFirst({ where: { studentId: student.id } });
  if (!curriculum) {
    console.error("Curriculum SHOFI tidak ditemukan");
    process.exit(1);
  }

  // Cek apakah Mandarin sudah ada
  const existing = await prisma.material.findFirst({
    where: { curriculumId: curriculum.id, subject: "Bahasa Mandarin" },
  });
  if (existing) {
    console.log("✅ Bahasa Mandarin sudah ada");
    return;
  }

  // Cari weekOrder tertinggi untuk tau mulai dari mana
  const maxWeek = await prisma.material.findFirst({
    where: { curriculumId: curriculum.id },
    orderBy: { weekOrder: "desc" },
    select: { weekOrder: true },
  });
  let nextOrder = (maxWeek?.weekOrder ?? 0) + 1;

  // Topik Bahasa Mandarin dari Moodle
  const topics = [
    "Kosakata HSK 3.0 Level 1",
    "Kosakata HSK 3.0 Level 2",
    "Kosakata HSK 3.0 Level 3",
    "Kosakata HSK 3.0 Level 4",
    "Bangun Fondasi Bahasa Mandarin",
    "Program Semester Ganjil",
    "Materi Pembelajaran Ganjil",
    "SOP Mata Pelajaran Mandarin",
  ];

  for (const topic of topics) {
    await prisma.material.create({
      data: {
        curriculumId: curriculum.id,
        topic,
        subject: "Bahasa Mandarin",
        gradeLevel: "SMA_2" as any,
        weekOrder: nextOrder++,
        priority: 0,
        delivery: "TEXT" as any,
        status: "DRAFT" as any,
      },
    });
    console.log(`  + ${topic}`);
  }

  console.log(`\n✅ ${topics.length} materi Bahasa Mandarin ditambahkan ke SHOFI`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
