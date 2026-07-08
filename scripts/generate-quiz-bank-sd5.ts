/**
 * Mass quiz bank generator — SD/5 (108 sub-topik, 5 soal each = 540 soal)
 * Uses 9Router ai_tutor_agent for high-quality, accurate questions
 *
 * Run: npx tsx scripts/generate-quiz-bank-sd5.ts
 */
import { writeFileSync, existsSync, readFileSync } from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:20128/v1",
  apiKey: "sk-9router",
  defaultQuery: { combo: "ai_tutor_agent" } as any,
});

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
}

interface QuizEntry {
  subject: string;
  topic: string;
  subTopic: string;
  questions: QuizQuestion[];
}

/**
 * Attempt to extract and repair JSON from LLM response.
 * The 9Router deepseek model includes reasoning_content that can confuse parsing.
 */
function extractAndRepairJSON(raw: string): string | null {
  // Remove markdown code fences
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

  // Find the first [ and last ]
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  let json = cleaned.slice(start, end + 1);

  // Try to parse directly
  try {
    JSON.parse(json);
    return json; // it's valid
  } catch {
    // Need to repair
  }

  // Common fixes:
  // 1. Remove trailing commas before ] or }
  json = json.replace(/,\s*]/g, "]");
  json = json.replace(/,\s*}/g, "}");

  // 2. Try parsing again
  try {
    JSON.parse(json);
    return json;
  } catch {
    // 3. Try to handle each object individually
    try {
      const objRegex = /\{[^{}]*\}/g;
      const objs: string[] = [];
      let match;
      while ((match = objRegex.exec(json)) !== null) {
        // Basic validation: must have question, options, correctIndex
        if (
          match[0].includes('"question"') &&
          match[0].includes('"options"') &&
          match[0].includes('"correctIndex"')
        ) {
          // Fix double-quotes inside strings
          let fixedObj = match[0];
          try {
            JSON.parse(fixedObj);
            objs.push(fixedObj);
          } catch {
            // Try minimal repair
            fixedObj = fixedObj.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
            try {
              JSON.parse(fixedObj);
              objs.push(fixedObj);
            } catch {
              // Skip this object
            }
          }
        }
      }
      if (objs.length > 0) {
        return "[" + objs.join(",") + "]";
      }
    } catch {
      // give up
    }
  }

  return null;
}

/**
 * Build the prompt for quiz generation.
 * For English subjects, use English prompt to get better results.
 */
function buildPrompt(
  subject: string,
  topic: string,
  subTopic: string,
  count = 5
): { system: string; user: string } {
  const isEnglish = subject === "Bahasa Inggris";

  const system = isEnglish
    ? `You are a quiz maker for Indonesian elementary school Grade 5 (SD Kelas 5) Kurikulum Merdeka.
Output ONLY a valid JSON array. No markdown, no other text.
Questions should be appropriate for Grade 5 students.
For "Bahasa Inggris" (English) subject, questions can be in simple English.
Include a mix of easy, medium, and hard questions.
Each question must have an explanation of the correct answer.`
    : `Kamu adalah pembuat soal pendidikan Indonesia untuk tingkat SD Kelas 5 Kurikulum Merdeka.
Keluarkan HANYA array JSON valid tanpa markdown, tanpa teks lain.
Pastikan soal:
- Sesuai tingkat kognitif SD kelas 5
- Akurat secara akademik dan tidak menyesatkan
- Menggunakan bahasa Indonesia yang baik dan jelas
- Bervariasi level kesulitannya (easy, medium, hard)
- Tersedia penjelasan yang informatif untuk setiap jawaban benar`;

  const user = isEnglish
    ? `Create ${count} multiple-choice questions for "${subject}" Grade 5 SD with topic "${topic}" sub-topic "${subTopic}".

REQUIREMENTS:
- Each question has 4 options (A, B, C, D)
- Mix difficulty levels: easy, medium, hard (aim for 2 easy, 2 medium, 1 hard)
- Questions must be ACCURATE and age-appropriate for Grade 5
- Include correctIndex (0=A, 1=B, 2=C, 3=D)
- Include a brief explanation why the answer is correct
- Use simple English suitable for Grade 5 ESL students

Format JSON array:
[
  {
    "question": "question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correctIndex": 0,
    "difficulty": "easy",
    "explanation": "why this answer is correct"
  }
]

Output ONLY the JSON array, no other text.`
    : `Buatkan ${count} soal pilihan ganda untuk pelajaran ${subject} SD Kelas 5 dengan topik "${topic}" sub-topik "${subTopic}".

PERSYARATAN:
- Setiap soal punya 4 pilihan jawaban (A, B, C, D) dalam bahasa Indonesia
- Campur level kesulitan: easy, medium, hard (usahakan 2 easy, 2 medium, 1 hard)
- Soal harus AKURAT secara ilmiah/akademik — jangan menyesatkan
- Sertakan kunci jawaban (correctIndex: 0=A, 1=B, 2=C, 3=D)
- Sertakan penjelasan singkat kenapa jawaban itu benar (1-2 kalimat jelas)
- Gunakan bahasa Indonesia yang baik

Format JSON array:
[
  {
    "question": "teks soal",
    "options": ["pilihan A", "pilihan B", "pilihan C", "pilihan D"],
    "correctIndex": 0,
    "difficulty": "easy",
    "explanation": "penjelasan jawaban benar"
  }
]

Keluarkan HANYA array JSON, tanpa teks lain.`;

  return { system, user };
}

async function generateQuiz(
  subject: string,
  topic: string,
  subTopic: string,
  count = 5,
  maxRetries = 3
): Promise<QuizQuestion[]> {
  const { system, user } = buildPrompt(subject, topic, subTopic, count);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: "ai_tutor_agent",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 4000,
        temperature: 0.7 + attempt * 0.1,
      });

      const content = res.choices?.[0]?.message?.content || "";
      const jsonStr = extractAndRepairJSON(content);
      if (!jsonStr) {
        console.warn(`  ⚠️ No valid JSON found (attempt ${attempt + 1})`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        return [];
      }

      const questions = JSON.parse(jsonStr) as QuizQuestion[];
      const valid = questions.filter(
        (q) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex <= 3 &&
          q.explanation
      );
      if (valid.length === 0) {
        console.warn(`  ⚠️ No valid questions after validation (attempt ${attempt + 1})`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
      }
      return valid.slice(0, count);
    } catch (err) {
      const msg = (err as Error).message?.slice(0, 120) || "Unknown error";
      console.error(`  ❌ Error: ${msg}`);
      if (attempt < maxRetries) {
        console.log(`  → Retrying (${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  return [];
}

/**
 * Hard-coded SD/5 curriculum entries.
 * Manually extracted from curriculum-topics-sd5.ts to avoid module resolution issues.
 */
const SD5_ENTRIES: { subject: string; topic: string; subTopic: string }[] = [
  // IPAS — 29 sub-topik
  { subject: "IPAS", topic: "Indonesia Kaya", subTopic: "Letak Geografis Indonesia" },
  { subject: "IPAS", topic: "Indonesia Kaya", subTopic: "Daratan dan Lautan" },
  { subject: "IPAS", topic: "Indonesia Kaya", subTopic: "Negara Maritim dan Agraris" },
  { subject: "IPAS", topic: "Indonesia Kaya", subTopic: "Potensi Sumber Daya Alam" },
  { subject: "IPAS", topic: "Indonesia Kaya", subTopic: "Peta dan Wilayah Indonesia" },
  { subject: "IPAS", topic: "Ekonomi", subTopic: "Kebutuhan dan Keinginan" },
  { subject: "IPAS", topic: "Ekonomi", subTopic: "Kegiatan Ekonomi di Daerah" },
  { subject: "IPAS", topic: "Ekonomi", subTopic: "Pelaku Ekonomi" },
  { subject: "IPAS", topic: "Ekonomi", subTopic: "Produksi, Distribusi, Konsumsi" },
  { subject: "IPAS", topic: "Ekosistem", subTopic: "Komponen Ekosistem" },
  { subject: "IPAS", topic: "Ekosistem", subTopic: "Interaksi dalam Ekosistem" },
  { subject: "IPAS", topic: "Ekosistem", subTopic: "Rantai Makanan dan Jaring Makanan" },
  { subject: "IPAS", topic: "Ekosistem", subTopic: "Pelestarian Ekosistem" },
  { subject: "IPAS", topic: "Air Sumber Kehidupan", subTopic: "Siklus Air" },
  { subject: "IPAS", topic: "Air Sumber Kehidupan", subTopic: "Sumber Air Bersih" },
  { subject: "IPAS", topic: "Air Sumber Kehidupan", subTopic: "Pencemaran Air" },
  { subject: "IPAS", topic: "Air Sumber Kehidupan", subTopic: "Konservasi Air" },
  { subject: "IPAS", topic: "Daerah Bersejarah", subTopic: "Peninggalan Sejarah" },
  { subject: "IPAS", topic: "Daerah Bersejarah", subTopic: "Kerajaan Nusantara" },
  { subject: "IPAS", topic: "Daerah Bersejarah", subTopic: "Nilai Sejarah dan Pelestarian" },
  { subject: "IPAS", topic: "Perubahan Fisik", subTopic: "Pubertas pada Manusia" },
  { subject: "IPAS", topic: "Perubahan Fisik", subTopic: "Kesehatan Reproduksi" },
  { subject: "IPAS", topic: "Perubahan Fisik", subTopic: "Perubahan Fisik dan Mental" },
  { subject: "IPAS", topic: "Cahaya", subTopic: "Sifat-Sifat Cahaya" },
  { subject: "IPAS", topic: "Cahaya", subTopic: "Cahaya dan Penglihatan" },
  { subject: "IPAS", topic: "Cahaya", subTopic: "Teknologi Berbasis Cahaya" },
  { subject: "IPAS", topic: "Bunyi", subTopic: "Sumber Bunyi" },
  { subject: "IPAS", topic: "Bunyi", subTopic: "Bunyi dan Pendengaran" },
  { subject: "IPAS", topic: "Bunyi", subTopic: "Teknologi Bunyi" },

  // Bahasa Indonesia — 18 sub-topik
  { subject: "Bahasa Indonesia", topic: "Aku yang Unik", subTopic: "Mengenal Ciri-Ciri Melalui Cerita" },
  { subject: "Bahasa Indonesia", topic: "Aku yang Unik", subTopic: "Mendeskripsikan Diri dan Orang Lain" },
  { subject: "Bahasa Indonesia", topic: "Aku yang Unik", subTopic: "Kata Sifat dan Kata Kerja" },
  { subject: "Bahasa Indonesia", topic: "Buku Jendela Dunia", subTopic: "Mengenal Bagian-Bagian Buku" },
  { subject: "Bahasa Indonesia", topic: "Buku Jendela Dunia", subTopic: "Cara Memahami Bacaan" },
  { subject: "Bahasa Indonesia", topic: "Buku Jendela Dunia", subTopic: "Ide Pokok dan Kesimpulan" },
  { subject: "Bahasa Indonesia", topic: "Ekspresi Diri", subTopic: "Mengenal Hobi dan Minat" },
  { subject: "Bahasa Indonesia", topic: "Ekspresi Diri", subTopic: "Menulis Pengalaman Pribadi" },
  { subject: "Bahasa Indonesia", topic: "Ekspresi Diri", subTopic: "Puisi dan Ungkapan Perasaan" },
  { subject: "Bahasa Indonesia", topic: "Belajar Berwirausaha", subTopic: "Ide Kreatif dan Inovasi" },
  { subject: "Bahasa Indonesia", topic: "Belajar Berwirausaha", subTopic: "Iklan dan Promosi" },
  { subject: "Bahasa Indonesia", topic: "Belajar Berwirausaha", subTopic: "Negosiasi dan Tawar Menawar" },
  { subject: "Bahasa Indonesia", topic: "Cinta Indonesia", subTopic: "Keberagaman Budaya" },
  { subject: "Bahasa Indonesia", topic: "Cinta Indonesia", subTopic: "Pahlawan dan Tokoh Nasional" },
  { subject: "Bahasa Indonesia", topic: "Cinta Indonesia", subTopic: "Bahasa Daerah di Indonesia" },
  { subject: "Bahasa Indonesia", topic: "Sayangi Bumi", subTopic: "Lingkungan Hidup" },
  { subject: "Bahasa Indonesia", topic: "Sayangi Bumi", subTopic: "Sampah dan Daur Ulang" },
  { subject: "Bahasa Indonesia", topic: "Sayangi Bumi", subTopic: "Menulis Artikel Lingkungan" },

  // Bahasa Inggris — 14 sub-topik
  { subject: "Bahasa Inggris", topic: "Shopping", subTopic: "Fruits and Prices" },
  { subject: "Bahasa Inggris", topic: "Shopping", subTopic: "Vegetables and Groceries" },
  { subject: "Bahasa Inggris", topic: "Shopping", subTopic: "Shopping Dialogue" },
  { subject: "Bahasa Inggris", topic: "Direction", subTopic: "Giving Directions" },
  { subject: "Bahasa Inggris", topic: "Direction", subTopic: "Places in Town" },
  { subject: "Bahasa Inggris", topic: "Direction", subTopic: "Reading a Map" },
  { subject: "Bahasa Inggris", topic: "Daily Life", subTopic: "Daily Routines" },
  { subject: "Bahasa Inggris", topic: "Daily Life", subTopic: "Helping at Home" },
  { subject: "Bahasa Inggris", topic: "Daily Life", subTopic: "Cooking and Recipes" },
  { subject: "Bahasa Inggris", topic: "Reading", subTopic: "Borrowing Books" },
  { subject: "Bahasa Inggris", topic: "Reading", subTopic: "My Favorite Book" },
  { subject: "Bahasa Inggris", topic: "Reading", subTopic: "Storytelling" },
  { subject: "Bahasa Inggris", topic: "Culture", subTopic: "Indonesian Folktales" },
  { subject: "Bahasa Inggris", topic: "Culture", subTopic: "Fables and Moral Values" },

  // Pendidikan Pancasila — 15 sub-topik
  { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Sejarah Kelahiran Pancasila" },
  { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Nilai-Nilai Pancasila" },
  { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Simbol dan Makna Pancasila" },
  { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Pengamalan Pancasila" },
  { subject: "Pendidikan Pancasila", topic: "Norma", subTopic: "Macam-Macam Norma" },
  { subject: "Pendidikan Pancasila", topic: "Norma", subTopic: "Penerapan Norma dalam Kehidupan" },
  { subject: "Pendidikan Pancasila", topic: "Norma", subTopic: "Hukum dan Aturan" },
  { subject: "Pendidikan Pancasila", topic: "Budaya Daerah", subTopic: "Keberagaman Budaya" },
  { subject: "Pendidikan Pancasila", topic: "Budaya Daerah", subTopic: "Bhineka Tunggal Ika" },
  { subject: "Pendidikan Pancasila", topic: "Budaya Daerah", subTopic: "Melestarikan Budaya Daerah" },
  { subject: "Pendidikan Pancasila", topic: "Gotong Royong", subTopic: "Kerja Sama dan Musyawarah" },
  { subject: "Pendidikan Pancasila", topic: "Gotong Royong", subTopic: "Keputusan Bersama" },
  { subject: "Pendidikan Pancasila", topic: "Gotong Royong", subTopic: "Kegiatan Sosial di Lingkungan" },
  { subject: "Pendidikan Pancasila", topic: "NKRI", subTopic: "Wilayah Negara Kesatuan RI" },
  { subject: "Pendidikan Pancasila", topic: "NKRI", subTopic: "Menjaga Keutuhan NKRI" },

  // PJOK — 17 sub-topik
  { subject: "PJOK", topic: "Eksplorasi Gerak", subTopic: "Gerak Lokomotor" },
  { subject: "PJOK", topic: "Eksplorasi Gerak", subTopic: "Gerak Non-Lokomotor" },
  { subject: "PJOK", topic: "Eksplorasi Gerak", subTopic: "Gerak Manipulatif" },
  { subject: "PJOK", topic: "Eksplorasi Gerak", subTopic: "Koordinasi dan Keseimbangan" },
  { subject: "PJOK", topic: "Permainan Bola", subTopic: "Permainan Bola Besar" },
  { subject: "PJOK", topic: "Permainan Bola", subTopic: "Permainan Bola Kecil" },
  { subject: "PJOK", topic: "Permainan Bola", subTopic: "Teknik Melempar dan Menangkap" },
  { subject: "PJOK", topic: "Aktivitas Air", subTopic: "Gerakan Dasar di Air" },
  { subject: "PJOK", topic: "Aktivitas Air", subTopic: "Renang Gaya Bebas" },
  { subject: "PJOK", topic: "Aktivitas Air", subTopic: "Keamanan dan Keselamatan Air" },
  { subject: "PJOK", topic: "Kebugaran Jasmani", subTopic: "Latihan Kekuatan" },
  { subject: "PJOK", topic: "Kebugaran Jasmani", subTopic: "Latihan Kelenturan" },
  { subject: "PJOK", topic: "Kebugaran Jasmani", subTopic: "Daya Tahan Tubuh" },
  { subject: "PJOK", topic: "Kebugaran Jasmani", subTopic: "Pola Makan Sehat" },
  { subject: "PJOK", topic: "Permainan Tradisional", subTopic: "Aturan dan Sportivitas" },
  { subject: "PJOK", topic: "Permainan Tradisional", subTopic: "Kerja Sama dalam Tim" },
  { subject: "PJOK", topic: "Permainan Tradisional", subTopic: "Modifikasi Permainan" },

  // Informatika — 15 sub-topik
  { subject: "Informatika", topic: "Berpikir Komputasional", subTopic: "Memahami Masalah Sehari-hari" },
  { subject: "Informatika", topic: "Berpikir Komputasional", subTopic: "Pola dan Abstraksi" },
  { subject: "Informatika", topic: "Berpikir Komputasional", subTopic: "Algoritma Sederhana" },
  { subject: "Informatika", topic: "Berpikir Komputasional", subTopic: "Dekomposisi Masalah" },
  { subject: "Informatika", topic: "Teknologi Digital", subTopic: "Perangkat Digital" },
  { subject: "Informatika", topic: "Teknologi Digital", subTopic: "Internet dan Jaringan" },
  { subject: "Informatika", topic: "Teknologi Digital", subTopic: "Aplikasi dan Perangkat Lunak" },
  { subject: "Informatika", topic: "Teknologi Digital", subTopic: "Keamanan Digital" },
  { subject: "Informatika", topic: "Kecerdasan Artifisial", subTopic: "Apa Itu AI" },
  { subject: "Informatika", topic: "Kecerdasan Artifisial", subTopic: "AI dalam Kehidupan" },
  { subject: "Informatika", topic: "Kecerdasan Artifisial", subTopic: "Etika dan AI" },
  { subject: "Informatika", topic: "Proyek Digital", subTopic: "Proyek Berpikir Komputasional" },
  { subject: "Informatika", topic: "Proyek Digital", subTopic: "Presentasi Digital" },
  { subject: "Informatika", topic: "Proyek Digital", subTopic: "Kolaborasi Online" },
  { subject: "Informatika", topic: "Proyek Digital", subTopic: "Kreasi Konten Digital" },
];

async function main() {
  const allQuizzes: QuizEntry[] = [];
  const entries = SD5_ENTRIES;

  console.log(`📚 SD/5 Quiz Bank Generator v2`);
  console.log(`   Total sub-topik: ${entries.length}`);
  console.log(`   Target soal: ${entries.length * 5}\n`);

  // Track progress for resume
  const PROGRESS_FILE = "/home/ubuntu/ai-private-tutor/.progress-sd5.json";
  const doneKeys = new Set<string>();
  if (existsSync(PROGRESS_FILE)) {
    try {
      const saved = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
      if (Array.isArray(saved)) {
        for (const entry of saved) {
          doneKeys.add(`${entry.subject}||${entry.topic}||${entry.subTopic}`);
          allQuizzes.push(entry);
        }
        console.log(`♻️  Resuming from ${doneKeys.size} already-generated entries\n`);
      }
    } catch {}
  }

  let idx = 0;
  for (const entry of entries) {
    idx++;
    const key = `${entry.subject}||${entry.topic}||${entry.subTopic}`;

    if (doneKeys.has(key)) {
      console.log(`  [${idx}/${entries.length}] ✓ SKIP (done): ${entry.subject} — ${entry.topic} — ${entry.subTopic}`);
      continue;
    }

    console.log(`  [${idx}/${entries.length}] 📝 ${entry.subject} — ${entry.topic} — ${entry.subTopic}...`);

    const questions = await generateQuiz(entry.subject, entry.topic, entry.subTopic);

    if (questions.length >= 3) {
      const quizEntry: QuizEntry = {
        subject: entry.subject,
        topic: entry.topic,
        subTopic: entry.subTopic,
        questions: questions.slice(0, 5).map((q) => ({
          ...q,
          difficulty: q.difficulty || "medium",
        })),
      };
      allQuizzes.push(quizEntry);
      doneKeys.add(key);
      writeFileSync(PROGRESS_FILE, JSON.stringify(allQuizzes, null, 2));
      console.log(`    ✅ ${questions.length} soal generated`);
    } else {
      console.log(`    ❌ Only ${questions.length} valid questions — marking for retry`);
      writeFileSync(PROGRESS_FILE, JSON.stringify(allQuizzes, null, 2));
    }

    // Small delay
    await new Promise((r) => setTimeout(r, 1000));
  }

  // ── Generate TypeScript Output ──────────────────────────────────
  console.log(`\n📦 Generating TypeScript output...`);

  const output = `// ═══════════════════════════════════════════════════════════════════
//  Auto-generated Quiz Bank — SD Kelas 5
//  ${allQuizzes.length} entries × ${allQuizzes.length > 0 ? (allQuizzes.reduce((s, e) => s + e.questions.length, 0) / allQuizzes.length).toFixed(0) : 0} avg questions each
//  Total questions: ${allQuizzes.reduce((s, e) => s + e.questions.length, 0)}
//  Generated: ${new Date().toISOString()}
//  Source: curriculum-topics-sd5.ts + 9Router LLM (ai_tutor_agent)
// ═══════════════════════════════════════════════════════════════════
import type { QuestionData } from '@/agents/assessment/types';

export function quizKey(subject: string, topic: string, subTopic: string): string {
  return \`\${subject}||\${topic}||\${subTopic}\`;
}

const QUIZ_MAP: Record<string, QuestionData[]> = {
${allQuizzes
  .map((q) => {
    const key = `"${q.subject}||${q.topic}||${q.subTopic}"`;
    const questions = q.questions
      .map(
        (qq) =>
          `    { question: ${JSON.stringify(qq.question)}, options: ${JSON.stringify(qq.options)}, correctIndex: ${qq.correctIndex}, difficulty: "${qq.difficulty}", explanation: ${JSON.stringify(qq.explanation)} }`
      )
      .join(",\n");
    return `  ${key}: [\n${questions}\n  ],`;
  })
  .join("\n\n")}
};

export function getQuiz(subject: string, topic: string, subTopic: string): QuestionData[] {
  return QUIZ_MAP[quizKey(subject, topic, subTopic)] || [];
}

export function getAllQuizzes(): Record<string, QuestionData[]> {
  return QUIZ_MAP;
}
`;

  const outPath = "/home/ubuntu/ai-private-tutor/src/data/quiz-bank-sd5.ts";
  writeFileSync(outPath, output);
  console.log(`\n✅ Generated ${allQuizzes.length} entries → ${outPath}`);
  console.log(`   Total questions: ${allQuizzes.reduce((s, e) => s + e.questions.length, 0)}`);

  // Update progress file
  writeFileSync(PROGRESS_FILE, JSON.stringify(allQuizzes, null, 2));
}

main().catch(console.error);
