/**
 * Targeted slide regeneration for specific material IDs that the batch-generate
 * route matcher keeps missing (case variants, long subTopics) or that ended up
 * as stubs. Calls LLM per material directly, writes metadata.slide_sibi.
 *
 * Usage: npx tsx scripts/regen-slides-by-id.ts --apply
 *        (without --apply: dry-run, lists targets)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { callLLM } from "../src/llm/client";
import { isUsableSlideText } from "../src/lib/content/slide-content";

const APPLY = process.argv.includes("--apply");

const TARGET_IDS = [
  // SHOFI
  "17ed75eb14414995a37f664f", // Bahasa Indonesia ~ Menulis Karya Ilmiah
  "4b31c56fed3c42619dee76db", // Bahasa Indonesia ~ Menampilkan Pertunjukan Drama
  "00e246e5df7d488da7bb0887", // Biologi ~ Makanan dan Zat Makanan
  "f9ef891c2024418f8ba5f4ba", // Bahasa Indonesia ~ Ragam Karya Ilmiah
  "ae29634729924316b8f2caa4", // Sejarah ~ dampak di negara koloni
  // Tiumu
  "185f0e11-035e-41f0-a7e8-623c285fc5bd",
  "95e55e8d-5f07-4a35-bc25-216b3df1aa19",
  "f32103f1-fb64-429b-8a0c-e189d9695c40",
  "58d52efa-b061-46c7-83bf-32bf2485a74d",
  "c70854c5-c640-4d07-a91f-3017a468c395",
  "733f365d-da92-4f6f-bd9d-48ff22cabce3", // Fisika ~ Kalor (stub 77 chars, 2026-09-15)
  "6685df84-6635-4661-afa7-2f8f3584de28", // Matematika Penalaran ~ Bangun Datar (stub 81 chars, 2026-09-15)
  // Raihan
  "f8f4d60c59a240edb0ff0a4a", // Pendidikan Pancasila ~ pengertian macam-macam norma
];

const PROMPT = (subject: string, topic: string, sub: string, raw: string) => `Buatkan 3-5 slide markdown untuk materi sekolah berikut.

Subject: ${subject}
Topik: ${topic}
Sub-topik: ${sub}

Konten sumber:
"""
${raw.slice(0, 4000)}
"""

Aturan:
- Markdown murni, mulai dengan judul slide (# ).
- Konten faktual, sesuai sub-topik, bahasa Indonesia, untuk siswa.
- Tanpa komentar meta, tanpa menyebut prompt/instruksi, langsung konten.
- Akhiri dengan ringkasan poin penting.`;

async function main() {
  for (const id of TARGET_IDS) {
    const m = await prisma.material.findUnique({
      where: { id },
      select: { subject: true, topic: true, subTopic: true, rawContent: true, processedContent: true, metadata: true },
    });
    if (!m) {
      console.log(`SKIP ${id}: not found`);
      continue;
    }
    const src = (m.rawContent || m.processedContent || "").trim();
    console.log(`\n=== ${m.subject} | ${m.subTopic} (src=${src.length} chars)`);
    if (!APPLY) continue;

    const resp = await callLLM("content", [
      { role: "user", content: PROMPT(m.subject, m.topic, m.subTopic || "", src || m.topic) },
    ]);
    const text = (typeof resp === "string" ? resp : String(resp ?? "")).trim();
    if (isUsableSlideText(text)) {
      const meta = (m.metadata as Record<string, unknown>) || {};
      meta.slide_sibi = text;
      await prisma.material.update({ where: { id }, data: { metadata: meta } });
      console.log(`  OK slide_sibi=${text.length} chars`);
    } else {
      console.log(`  FAIL unusable output (${text.length} chars): ${text.slice(0, 80)}`);
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
