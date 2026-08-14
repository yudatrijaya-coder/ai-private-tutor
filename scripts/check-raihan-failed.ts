import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "ai_private_tutor",
  user: process.env.PGUSER || "tutor",
  password: process.env.PGPASSWORD || "tutor123",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const FAILED = [
  "Unsur Puisi Rakyat","Menyajikan Teks Deskripsi","Unsur Bahasa dalam Teks Deskripsi",
  "Teks Berita","Unsur dan Jenis Puisi Rakyat","Unsur-Unsur Berita",
  "Describing Family Members","Algoritma dan Pemrograman","Dasar-Dasar Algoritma dan Flowchart",
  "Definisi dan Ruang Lingkup Informatika","Hakikat Ilmu Sains","Klasifikasi Makhluk Hidup",
  "Besaran dan Pengukuran","Kerajaan Hindu-Buddha di Indonesia","Lambang Unsur dan Tabel Periodik",
  "Tantangan Keberagaman","Penerapan Norma","Nilai-Nilai Pancasila",
  "Konsep Gerak","Latihan Kebugaran","Peran dalam Tim","Bulu Tangkis"
];

async function main() {
  console.log("subTopic|hasQuiz|rawLen|procLen|materialId");
  for (const sub of FAILED) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT m.id, m."subTopic", m.subject, q.id as quiz_id,
              char_length(m."rawContent") as raw_len,
              char_length(m."processedContent") as proc_len
       FROM "Material" m
       JOIN "Curriculum" c ON c.id = m."curriculumId"
       JOIN "Student" s ON s.id = c."studentId"
       LEFT JOIN "Quiz" q ON q."materialId" = m.id AND q."studentId" = s.id
       WHERE s."studentId" = 'RAIHAN001' AND m."subTopic" = $1
       LIMIT 1`,
      [sub]
    );
    if (rows.length === 0) {
      console.log(`${sub}|NOT_FOUND|null|null|null`);
    } else {
      const r = rows[0];
      console.log(`${sub}|${r.quiz_id ? 'HAS_QUIZ' : 'NO_QUIZ'}|${r.raw_len}|${r.proc_len}|${r.id}`);
    }
  }
  await prisma.$disconnect();
  await pool.end();
}
main().catch(console.error);
