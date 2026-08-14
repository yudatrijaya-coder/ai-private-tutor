import { PrismaClient } from '@prisma/client';
import { generateQuizContent } from '../src/agents/assessment/generator';

const prisma = new PrismaClient();

const FAILED_ITEMS = [
  { student: "Raihan", topic: "Unsur Puisi Rakyat" },
  { student: "Raihan", topic: "Menyajikan Teks Deskripsi" },
  { student: "Raihan", topic: "Unsur Bahasa dalam Teks Deskripsi" },
  { student: "Raihan", topic: "Teks Berita" },
  { student: "Raihan", topic: "Unsur dan Jenis Puisi Rakyat" },
  { student: "Raihan", topic: "Unsur-Unsur Berita" },
  { student: "Raihan", topic: "Describing Family Members" },
  { student: "Raihan", topic: "Algoritma dan Pemrograman" },
  { student: "Raihan", topic: "Dasar-Dasar Algoritma dan Flowchart" },
  { student: "Raihan", topic: "Definisi dan Ruang Lingkup Informatika" },
  { student: "Raihan", topic: "Hakikat Ilmu Sains" },
  { student: "Raihan", topic: "Klasifikasi Makhluk Hidup" },
  { student: "Raihan", topic: "Besaran dan Pengukuran" },
  { student: "Raihan", topic: "Kerajaan Hindu-Buddha di Indonesia" },
  { student: "Raihan", topic: "Lambang Unsur dan Tabel Periodik" },
  { student: "Raihan", topic: "Tantangan Keberagaman" },
  { student: "Raihan", topic: "Penerapan Norma" },
  { student: "Raihan", topic: "Nilai-Nilai Pancasila" },
  { student: "Raihan", topic: "Konsep Gerak" },
  { student: "Raihan", topic: "Latihan Kebugaran" },
  { student: "Raihan", topic: "Peran dalam Tim" },
  { student: "Raihan", topic: "Bulu Tangkis" }
];

async function retry() {
  console.log(`Starting retry for ${FAILED_ITEMS.length} items...`);
  for (const item of FAILED_ITEMS) {
    console.log(`Retrying: ${item.student} > ${item.topic}`);
    try {
      await generateQuizContent(item.student, item.topic, true);
      console.log(`✅ Success: ${item.topic}`);
    } catch (e: any) {
      console.error(`❌ Still Failed: ${item.topic}`, e.message);
    }
  }
  await prisma.$disconnect();
}

retry().catch(console.error);
