/*
 * Insert quiz for SOP Mata Pelajaran Mandarin (SHOFI)
 */
import { prisma } from "../src/lib/prisma";

const MATERIAL_ID = "7c046920-48a1-431f-9b9f-0d3fbe70a04d";
const STUDENT_CODE = "STU_MRHQL6KX";

const questions = [
  {
    question: "Berapa minimal penggunaan bahasa Mandarin di kelas selama pembelajaran?",
    options: ["30%", "40%", "60%", "80%"],
    correctIndex: 2,
    difficulty: "medium",
    explanation: "SOP menetapkan penggunaan bahasa Mandarin minimal 60% durasi kelas.",
  },
  {
    question: "Apa sanksi jika siswa tidak mengumpulkan tugas mandiri tepat waktu (terlambat >5 menit)?",
    options: ["Langsung mendapat nilai 0", "Diganti dengan tugas lisan", "Dilaporkan ke wali kelas", "Diberi waktu tambahan 1 minggu"],
    correctIndex: 1,
    difficulty: "easy",
    explanation: "Keterlambatan lebih dari 5 menit dianggap tidak mengumpulkan dan diganti dengan tugas lisan.",
  },
  {
    question: "Apa yang harus diserahkan siswa untuk tugas kelompok presentasi?",
    options: ["Hanya naskah", "Slide PowerPoint saja", "Naskah dan rekaman latihan video 2 menit", "Rekaman audio saja"],
    correctIndex: 2,
    difficulty: "medium",
    explanation: "Siswa menyerahkan naskah dan rekaman latihan (video 2 menit) sebagai bukti proses.",
  },
  {
    question: "Berapa batas maksimal ketidakhadiran tanpa surat izin per semester?",
    options: ["1 kali", "2 kali", "3 kali", "5 kali"],
    correctIndex: 2,
    difficulty: "easy",
    explanation: "SOP menetapkan maksimal 3 kali tanpa surat izin.",
  },
  {
    question: "Apa kegiatan 'wufenzhong reshen' (lima menit pemanasan) di awal kelas?",
    options: ["Senam lima menit", "Menulis 5 karakter + membaca pinyin berpasangan", "Menyanyikan lagu Mandarin", "Diskusi kelompok 5 menit"],
    correctIndex: 1,
    difficulty: "hard",
    explanation: "Pemanasan 5 menit: menulis 5 karakter dari materi sebelumnya dan membaca pinyin berpasangan.",
  },
];

async function main() {
  const stu = await prisma.student.findUnique({ where: { studentId: STUDENT_CODE }, select: { id: true } });
  if (!stu) { console.log("❌ Student not found"); return; }

  // Skip if quiz already exists
  const existing = await prisma.quiz.findFirst({ where: { materialId: MATERIAL_ID } });
  if (existing) { console.log("⚠️ Quiz already exists, skipping"); await prisma.$disconnect(); return; }

  await prisma.quiz.create({
    data: {
      materialId: MATERIAL_ID,
      studentId: stu.id,
      type: "QUIZ",
      questions: questions as any,
      maxScore: questions.length,
    },
  });

  console.log("✅ Quiz SOP Mandarin created with", questions.length, "questions");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
