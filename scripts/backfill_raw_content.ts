import { readFileSync } from "fs";
import { prisma } from "../src/lib/prisma";
import { callLLM } from "../src/llm/client";

/**
 * Fill empty rawContent for Kimia SMA + Matematika SD materials.
 * Source priority: SIBI matched chapters → SIBI fuzzy bab match → LLM knowledge.
 * Target: ~2000-3000 chars per material (cukup untuk weekly exam 20 soal).
 */

const TARGET_CHARS = 2500;

interface SibiChapter {
  title: string;
  text: string;
}

interface SibiFile {
  grade: string;
  subject: string;
  chapters: SibiChapter[];
}

interface MatchEntry {
  topic: string;
  subTopic: string;
  chapter_indices: number[];
}

function loadSibi(grade: string, subject: string): SibiFile | null {
  try {
    return JSON.parse(readFileSync(`data/sibi/raw_content/${grade}/${subject}.json`, "utf-8"));
  } catch {
    return null;
  }
}

function loadMatched(grade: string, subject: string): MatchEntry[] {
  try {
    const d = JSON.parse(readFileSync(`data/sibi/matched/${grade}/${subject}.json`, "utf-8"));
    return d.matches ?? [];
  } catch {
    return [];
  }
}

/** Ambil potongan teks bab yang relevan dengan subTopic/topic, ~TARGET_CHARS. */
function extractRelevant(text: string, keywords: string[]): string {
  const clean = text.replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= TARGET_CHARS) return clean;

  // Cari posisi keyword pertama (case-insensitive, kata utuh)
  for (const kw of keywords) {
    if (!kw) continue;
    const idx = clean.toLowerCase().indexOf(kw.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 600);
      return clean.slice(start, start + TARGET_CHARS);
    }
  }
  // Fallback: awal bab
  return clean.slice(0, TARGET_CHARS);
}

/** Fuzzy match: cek apakah topic/subTopic muncul di judul bab. */
function fuzzyBab(chapters: SibiChapter[], keywords: string[]): SibiChapter | null {
  let best: SibiChapter | null = null;
  let bestScore = 0;
  for (const ch of chapters) {
    const title = ch.title.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      const k = kw.toLowerCase();
      if (k && (title.includes(k) || k.includes(title.replace(/[^a-z0-9 ]/g, "").trim()))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = ch;
    }
  }
  return bestScore > 0 ? best : null;
}

async function llmContent(subject: string, topic: string, subTopic: string, grade: string): Promise<string | null> {
  const prompt = `Buat ringkasan materi pelajaran untuk siswa ${grade} (Indonesia).

Mata pelajaran: ${subject}
Topik: ${topic}
Sub-topik: ${subTopic || "-"}

Tulis ringkasan materi yang PADAT dan LENGKAP (±${TARGET_CHARS} karakter) dalam Bahasa Indonesia, meliputi:
- Definisi/konsep inti
- Rumus/aturan penting (jika ada)
- Contoh penerapan singkat
- Poin-poin kunci

Gunakan format markdown dengan heading dan bullet. Langsung tulis materinya, tanpa intro.`;

  try {
    const r = await callLLM(
      "assessment",
      [
        { role: "system", content: "Kamu adalah penulis materi pelajaran Indonesia. Output hanya konten materi, tanpa basa-basi." },
        { role: "user", content: prompt },
      ],
      { maxTokens: 4000, temperature: 0.3, studentId: "CONTENT-BACKFILL" },
    );
    const txt = (r ?? "").trim();
    return txt.length > 300 ? txt : null;
  } catch (e) {
    console.error("    LLM fail:", (e as Error).message.slice(0, 120));
    return null;
  }
}

async function main() {
  // Konfigurasi: [studentId, subject, grade, sibiSubject]
  const jobs: Array<{ studentId: string; subject: string; grade: string; sibiSubject: string }> = [
    { studentId: "TIAMO001", subject: "Kimia", grade: "SMA_2", sibiSubject: "Kimia" },
    { studentId: "SHOFI001", subject: "Kimia", grade: "SMA_2", sibiSubject: "Kimia" },
    { studentId: "SYIFA001", subject: "Matematika", grade: "SD_5", sibiSubject: "Matematika" },
  ];

  for (const job of jobs) {
    const student = await prisma.student.findUnique({ where: { studentId: job.studentId } });
    if (!student) {
      console.log(`[${job.studentId}] student not found, skip`);
      continue;
    }
    const cur = await prisma.curriculum.findFirst({
      where: { studentId: student.id },
      orderBy: { version: "desc" },
    });
    if (!cur) continue;

    const materials = await prisma.material.findMany({
      where: { curriculumId: cur.id, subject: job.subject, weekOrder: { lt: 999 } },
      orderBy: { weekOrder: "asc" },
      select: { id: true, topic: true, subTopic: true, weekOrder: true, rawContent: true, status: true },
    });
    const empty = materials.filter((m) => !(m.rawContent ?? "").trim() || (m.rawContent ?? "").trim().length < 50);
    if (empty.length === 0) {
      console.log(`[${job.studentId}] ${job.subject}: semua sudah berisi (${materials.length})`);
      continue;
    }

    const sibi = loadSibi(job.grade, job.sibiSubject);
    const matched = loadMatched(job.grade, job.sibiSubject);
    console.log(`[${job.studentId}] ${job.subject}: ${empty.length} kosong dari ${materials.length}, SIBI chapters: ${sibi?.chapters.length ?? 0}, matches: ${matched.length}`);

    let filled = 0;
    let sibiFilled = 0;
    let llmFilled = 0;

    for (const m of empty) {
      const keywords = [m.subTopic ?? "", m.topic].filter(Boolean);
      let content: string | null = null;
      let source = "";

      // 1. SIBI matched (chapter_indices)
      const match = matched.find((x) => x.topic === m.topic && (!m.subTopic || x.subTopic === m.subTopic));
      if (match && sibi) {
        const parts = match.chapter_indices
          .map((i) => sibi.chapters[i]?.text ?? "")
          .filter((t) => t.trim().length > 100);
        if (parts.length) {
          content = extractRelevant(parts.join("\n\n"), keywords);
          source = `sibi-matched(${match.chapter_indices.join(",")})`;
        }
      }

      // 2. Fuzzy bab match
      if (!content && sibi) {
        const bab = fuzzyBab(sibi.chapters, keywords);
        if (bab && bab.text.trim().length > 300) {
          content = extractRelevant(bab.text, keywords);
          source = `sibi-fuzzy(${bab.title.slice(0, 30)})`;
        }
      }

      // 3. LLM fallback
      if (!content) {
        const llm = await llmContent(job.subject, m.topic, m.subTopic ?? "", job.grade);
        if (llm) {
          content = llm;
          source = "llm";
          llmFilled++;
        }
      } else {
        sibiFilled++;
      }

      if (content) {
        await prisma.material.update({
          where: { id: m.id },
          data: {
            rawContent: content,
            status: "READY",
          },
        });
        filled++;
        console.log(`  ✅ w${m.weekOrder} ${m.topic}${m.subTopic ? " — " + m.subTopic : ""} [${source}] (${content.length} chars)`);
      } else {
        console.log(`  ❌ w${m.weekOrder} ${m.topic}${m.subTopic ? " — " + m.subTopic : ""} — GAGAL`);
      }

      // Serial safety delay (9Router)
      if (source === "llm") await new Promise((r) => setTimeout(r, 1500));
    }

    console.log(`[${job.studentId}] ${job.subject}: DONE — ${filled}/${empty.length} (sibi: ${sibiFilled}, llm: ${llmFilled})`);
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
