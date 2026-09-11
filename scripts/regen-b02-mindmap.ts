/**
 * Regenerate the mindmaps that B-02 left empty (ledger B-02, follow-up).
 *
 * Context
 * -------
 * `scripts/fix-b02-mindmap-cot.ts` moved leaked LLM deliberation out of
 * `metadata.mindmap_sibi` into `metadata.mindmap_sibi_raw`. For most rows a
 * clean mindmap existed elsewhere and the resolver simply picked that. Sixteen
 * rows had no alternative source, so they were left with no mindmap at all —
 * better an empty pane than the model's scratchpad.
 *
 * This script regenerates those sixteen from the clean `slide_sibi` text that
 * the same material already carries. It is the only sanctioned way to refill
 * `mindmap_sibi` for them.
 *
 * Safety
 * ------
 * - Writes ONLY `metadata.mindmap_sibi`. `mindmap_sibi_raw` is left untouched, so
 *   the original (contaminated) output stays on disk for audit.
 * - Every candidate is validated with the same guards the display path uses
 *   (`isLlmReasoningDump`, `isUsableMindmap`). A rejected response is retried,
 *   never stored.
 * - Serial with a delay between calls: 9Router is single-threaded and returns
 *   empty content under concurrency (see the SIBI pipeline skill, Rule 1).
 * - `--dry-run` is the default. `--apply` writes. A rollback snapshot is written
 *   to `docs/designs/` before the first write.
 *
 * Usage:
 *   npx tsx scripts/regen-b02-mindmap.ts             # dry run
 *   npx tsx scripts/regen-b02-mindmap.ts --apply     # write
 *   npx tsx scripts/regen-b02-mindmap.ts --apply --limit 1
 */

// `tsx` does not read `.env` the way Next.js does. Without this, `LLM_API_KEY`
// is unset and the LLM client silently falls back to its "sk-9router" default,
// which 9Router rejects with 401 Invalid API key. Prisma loads `.env` on its own,
// so the DB half works either way — which is exactly why this is easy to miss.
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { callLLM } from "../src/llm/client";
import {
  isLlmReasoningDump,
  isUsableMindmap,
  resolveSlideMarkdown,
} from "../src/lib/content/slide-content";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
const LIMIT_ARG = process.argv.indexOf("--limit");
const LIMIT = LIMIT_ARG >= 0 ? Number(process.argv[LIMIT_ARG + 1]) : Infinity;
const DELAY_MS = 3_000;
const MAX_ATTEMPTS = 3;

interface MindmapNode {
  id: string;
  label: string;
  children: MindmapNode[];
}

/**
 * Parse an indented-dash outline into the `[{id,label,children}]` shape the
 * mindmap viewer expects. Mirrors the Python parser in
 * `scripts/sibi-generate-mindmap.py` so regenerated trees look like the rest.
 */
function parseOutline(text: string, rootLabel: string): MindmapNode[] {
  const lines = text.split("\n");
  const root: MindmapNode = { id: "0", label: rootLabel, children: [] };
  const parents: Record<number, MindmapNode> = { 0: root };
  let counter = 1;

  for (const line of lines) {
    if (!line.trim()) continue;

    const trimmed = line.replace(/^[ \t]*/, "");
    const indent = line.length - trimmed.length;
    let level = indent >= 6 ? 3 : indent >= 4 ? 2 : indent >= 2 ? 1 : 0;

    const label = trimmed.replace(/^[-*\t\s]+/, "").trim();
    if (!label) continue;

    if (level > 0 && parents[level] === undefined) level = 0;
    if (parents[level] === undefined) parents[level] = root;

    const node: MindmapNode = { id: String(counter++), label, children: [] };
    parents[level].children.push(node);
    parents[level + 1] = node;
  }

  // Fallback: malformed indentation collapsed everything to the root.
  if (root.children.length === 0) {
    for (const line of lines) {
      const label = line.trim().replace(/^[-*\t\s]+/, "").trim();
      if (label.length > 3) {
        root.children.push({ id: String(counter++), label, children: [] });
      }
    }
  }

  return [root];
}

interface Target {
  id: string;
  subject: string;
  topic: string;
  subTopic: string;
  metadata: Record<string, unknown>;
}

async function findTargets(): Promise<Target[]> {
  const rows = await prisma.$queryRawUnsafe<
    { id: string; subject: string; topic: string; subTopic: string; metadata: Record<string, unknown> }[]
  >(
    `SELECT id, subject, topic, "subTopic", metadata
       FROM "Material"
      WHERE metadata->>'mindmap_sibi_raw' IS NOT NULL
        AND (metadata->>'mindmap_sibi' IS NULL OR metadata->>'mindmap_sibi' = '')
        AND metadata->'mindmap' IS NULL
      ORDER BY subject, "weekOrder"`,
  );
  return rows;
}

async function generateFor(target: Target): Promise<MindmapNode[] | null> {
  // Source: the material's own clean slide text. It is Indonesian teaching
  // content about the same sub-topic, which is what the original run used.
  const source = resolveSlideMarkdown(target.metadata, "sibi");
  if (!source) {
    console.log(`    ⚠️  tidak ada slide_sibi bersih — dilewati`);
    return null;
  }

  const prompt =
    `Buat kerangka mindmap untuk "${target.topic} - ${target.subTopic}".\n\n` +
    `Gunakan HANYA materi berikut:\n\n\`\`\`\n${source.slice(0, 4000)}\n\`\`\`\n\n` +
    `Format: daftar bertingkat dengan tanda dash, 2 spasi per level, seperti:\n` +
    `- Topik Utama\n  - Subtopik\n    - Detail`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string | null = null;
    try {
      raw = await callLLM(
        "content",
        [
          {
            role: "system",
            content:
              "Anda generator konten pendidikan. Keluarkan HANYA kerangka mindmap " +
              "berbentuk daftar bertingkat dengan tanda dash. Jangan menjelaskan " +
              "rencana, jangan mengulang instruksi, jangan menuliskan penalaran. " +
              "Jangan memakai blok markdown.",
          },
          { role: "user", content: prompt },
        ],
        { temperature: 0.1, maxTokens: 1500, timeoutMs: 120_000 },
      );
    } catch (err) {
      console.log(`    ⚠️  attempt ${attempt}: LLM error — ${(err as Error).message}`);
      continue;
    }

    const text = (raw ?? "")
      .replace(/```[a-z]*\n?/g, "")
      .replace(/```/g, "")
      .trim();

    if (isLlmReasoningDump(text)) {
      console.log(`    ⚠️  attempt ${attempt}: ditolak — penalaran mentah`);
    } else {
      const tree = parseOutline(text, target.subTopic);
      if (isUsableMindmap(tree)) {
        return tree;
      }
      console.log(`    ⚠️  attempt ${attempt}: ditolak — bukan outline valid`);
    }

    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 5_000));
  }

  return null;
}

async function main() {
  const targets = (await findTargets()).slice(0, LIMIT);

  console.log(`Mode: ${APPLY ? "APPLY (menulis)" : "DRY RUN"}`);
  console.log(`Target: ${targets.length} material tanpa mindmap\n`);

  const plan: { id: string; subject: string; topic: string; subTopic: string }[] = [];
  const snapshot: { id: string; mindmap_sibi: unknown }[] = [];
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const label = `${target.subject} / ${target.topic} / ${target.subTopic}`;
    console.log(`[${i + 1}/${targets.length}] ${label}`);

    const tree = await generateFor(target);

    if (!tree) {
      console.log(`    ❌ gagal — tidak ada mindmap valid setelah ${MAX_ATTEMPTS} percobaan`);
      failed++;
    } else {
      const nodeCount = JSON.stringify(tree).match(/"label"/g)?.length ?? 0;
      console.log(`    ✅ ${nodeCount} node`);
      plan.push({ id: target.id, subject: target.subject, topic: target.topic, subTopic: target.subTopic });
      snapshot.push({ id: target.id, mindmap_sibi: target.metadata.mindmap_sibi ?? null });

      if (APPLY) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Material"
              SET metadata = jsonb_set(metadata, '{mindmap_sibi}', $1::jsonb, true),
                  "updatedAt" = NOW()
            WHERE id = $2`,
          JSON.stringify(tree),
          target.id,
        );
        console.log(`    💾 tersimpan`);
      }
      ok++;
    }

    if (i < targets.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  if (APPLY && snapshot.length > 0) {
    const dir = join(process.cwd(), "docs", "designs");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "2026-09-11-b02-mindmap-regen-rollback.json");
    writeFileSync(path, JSON.stringify(snapshot, null, 2));
    console.log(`\nSnapshot rollback: ${path}`);
  }

  console.log(`\n=== Rekap ===`);
  console.log(`berhasil : ${ok}`);
  console.log(`gagal    : ${failed}`);
  if (!APPLY) console.log(`\n(DRY RUN — jalankan dengan --apply untuk menulis)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
