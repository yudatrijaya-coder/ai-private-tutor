/**
 * Fix Syifa Data Script
 * ======================
 * 1. Swap isTemplate flag: SYIF72237 → false, STU_MRHL5FYL → true
 * 2. Fix video URLs for STU_MRHL5FYL materials
 * 3. Regenerate mindmaps where possible
 *
 * Usage: npx tsx scripts/fix-syifa-data.ts
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { parseMindmapFromMarkdown, type MindmapNode } from '../src/lib/mindmap-template';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'ai_private_tutor',
  user: 'tutor',
  password: 'tutor123',
});
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

// ─── Student IDs ────────────────────────────────────────────────────
const SYIF_ID = 'a80cbfa5-9e21-42fa-a0e2-69943d9a2161';   // SYIF72237
const MRHL_ID = '4f248d53-940f-406c-ae64-a1722f8d5c86';   // STU_MRHL5FYL

// ─── Helpers ────────────────────────────────────────────────────────

/** Clean a video URL text: remove channel references, parentheses, and trailing trash. */
function cleanVideoTitle(raw: string | null): string | null {
  if (!raw) return null;
  let s = raw.trim();

  // Remove leading/trailing quotes
  s = s.replace(/^["']|["']$/g, '').trim();

  // Remove patterns like:
  //   (Channel: ...)
  //   (channel: ...)
  //   (channel ...)
  //   (saluran: ...)
  //   oleh channel ...
  //   dari channel ...
  //   – Channel ...
  //   "oleh Channel ..."
  //   "oleh ... channel ..."
  //   (Channel: Kok Bisa? atau IPAS Kelas ...)
  s = s.replace(/\([^)]*(?:channel|Channel|Channel:|saluran|Saluran)[^)]*\)/g, '');

  // Remove "– Channel ..." suffix patterns
  s = s.replace(/[–-]\s*(?:channel|Channel|channel:|Channel:)[^,)]*$/i, '');

  // Remove "oleh channel ..." or "dari channel ..." suffix
  s = s.replace(/\s*(?:oleh|dari)\s+channel\s+.+$/i, '');

  // Remove "– oleh ..." suffix
  s = s.replace(/\s*[–-]\s*oleh\s+.+$/i, '');

  // Remove "dari channel ..." or "oleh ..." patterns at end
  s = s.replace(/\s+(?:oleh|dari)\s+(?:channel|Channel)?\s*[A-Z][^,)]*$/i, '');

  // Remove trailing " - YouTube"
  s = s.replace(/\s*[–-]\s*YouTube\s*$/i, '');
  s = s.replace(/\s*\|?\s*YouTube\s*$/i, '');

  // Remove remaining parentheses content at end
  s = s.replace(/\s*\([^)]*\)\s*$/, '');

  // Remove "–" at end
  s = s.replace(/\s*[–-]\s*$/, '');

  // Clean up "Rekomendasi: " prefix in some texts
  s = s.replace(/^Rekomendasi:\s*/i, '');

  // Clean up "Video edukasi YouTube: " prefix
  s = s.replace(/^Video edukasi YouTube:\s*/i, '');
  s = s.replace(/^Video edukasi:\s*/i, '');

  // Clean up "Belajar ... untuk Anak SD" type suffixes that are generic
  // Actually keep the core title

  // Double spaces
  s = s.replace(/\s{2,}/g, ' ').trim();

  if (s.length < 3) return null;

  return s;
}

/** Build YouTube search URL from cleaned text. */
function buildYouTubeSearchUrl(cleaned: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(cleaned)}`;
}

// ─── Step 1: Fix Template Flag ──────────────────────────────────────

async function fixTemplateFlag() {
  console.log('\n' + '='.repeat(60));
  console.log('📌 Step 1: Fix Template Flag');
  console.log('='.repeat(60));

  // SYIF72237 → isTemplate=false
  const syifUpdate = await p.student.update({
    where: { id: SYIF_ID },
    data: { isTemplate: false },
  });
  console.log(`   ✅ SYIF72237 (${syifUpdate.name}) → isTemplate = false`);

  // STU_MRHL5FYL → isTemplate=true
  const mrhlUpdate = await p.student.update({
    where: { id: MRHL_ID },
    data: { isTemplate: true },
  });
  console.log(`   ✅ STU_MRHL5FYL (${mrhlUpdate.name}) → isTemplate = true`);
}

// ─── Step 2: Fix Video URLs ────────────────────────────────────────

async function fixVideoUrls() {
  console.log('\n' + '='.repeat(60));
  console.log('📌 Step 2: Fix Video URLs');
  console.log('='.repeat(60));

  const curriculum = await p.curriculum.findFirst({
    where: { studentId: MRHL_ID },
    orderBy: { createdAt: 'desc' },
    include: { materials: true },
  });

  if (!curriculum) {
    console.log('   ❌ No curriculum found for STU_MRHL5FYL');
    return;
  }

  let fixed = 0;
  let alreadyGood = 0;
  let failed = 0;

  for (const material of curriculum.materials) {
    const videoUrl = material.videoUrl;

    // Skip if already a YouTube URL
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
      alreadyGood++;
      continue;
    }

    if (!videoUrl) {
      console.log(`   ⚠️  No videoUrl for ${material.topic} / ${material.subTopic}`);
      failed++;
      continue;
    }

    const cleaned = cleanVideoTitle(videoUrl);
    if (!cleaned) {
      console.log(`   ⚠️  Could not clean videoUrl: "${videoUrl.substring(0, 60)}..." for ${material.subTopic}`);
      failed++;
      continue;
    }

    const newUrl = buildYouTubeSearchUrl(cleaned);

    await p.material.update({
      where: { id: material.id },
      data: { videoUrl: newUrl },
    });

    console.log(`   ✅ ${material.subject} / ${material.subTopic}`);
    console.log(`      Before: ${videoUrl.substring(0, 70)}...`);
    console.log(`      After:  ${newUrl.substring(0, 80)}...`);
    fixed++;
  }

  console.log(`\n   📊 Video URLs: ${fixed} fixed, ${alreadyGood} already good, ${failed} failed`);
}

// ─── Step 3: Fix Mindmaps ──────────────────────────────────────────

async function fixMindmaps() {
  console.log('\n' + '='.repeat(60));
  console.log('📌 Step 3: Fix Mindmaps (regenerate single-branch)');
  console.log('='.repeat(60));

  const curriculum = await p.curriculum.findFirst({
    where: { studentId: MRHL_ID },
    orderBy: { createdAt: 'desc' },
    include: { materials: true },
  });

  if (!curriculum) {
    console.log('   ❌ No curriculum found');
    return;
  }

  let regenerated = 0;
  let skipped = 0;
  let kept = 0;

  for (const material of curriculum.materials) {
    const meta = material.metadata as Record<string, any> | null;
    if (!meta) {
      skipped++;
      continue;
    }

    const mindmap = meta.mindmap as MindmapNode[] | undefined;
    const slides = meta.slides as string | undefined;

    // Only process single-branch "Pokok Bahasan" mindmaps
    if (!mindmap || mindmap.length !== 1 || mindmap[0]?.label !== 'Pokok Bahasan') {
      kept++;
      continue;
    }

    if (!slides || slides.length < 10) {
      skipped++;
      continue;
    }

    // Try to parse mindmap from slides (handles ## headings → multi-branch)
    const parsed = parseMindmapFromMarkdown(slides);

    // Only update if we got more than 1 branch
    if (parsed.length > 1) {
      const updateMeta = { ...meta, mindmap: JSON.parse(JSON.stringify(parsed)) };
      await p.material.update({
        where: { id: material.id },
        data: { metadata: updateMeta },
      });

      console.log(`   ✅ ${material.subject} / ${material.subTopic} — regenerated (${parsed.length} branches)`);
      for (const branch of parsed) {
        console.log(`      Branch: "${branch.label}" (${branch.children.length} children)`);
      }
      regenerated++;
    } else {
      console.log(`   ℹ️  ${material.subject} / ${material.subTopic} — still single-branch (flat bullets only)`);
      skipped++;
    }
  }

  console.log(`\n   📊 Mindmaps: ${regenerated} regenerated, ${kept} kept (already multi-branch or not "Pokok Bahasan"), ${skipped} skipped`);
}

// ─── Step 4: Verify ────────────────────────────────────────────────

async function verify() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Step 4: Verify Changes');
  console.log('='.repeat(60));

  // 4a. Check isTemplate
  const syif = await p.student.findUnique({ where: { id: SYIF_ID } });
  const mrhl = await p.student.findUnique({ where: { id: MRHL_ID } });

  console.log(`\n📊 Template Flag:`);
  console.log(`   SYIF72237 (${syif?.name}) → isTemplate = ${syif?.isTemplate} ${syif?.isTemplate === false ? '✅' : '❌'}`);
  console.log(`   STU_MRHL5FYL (${mrhl?.name}) → isTemplate = ${mrhl?.isTemplate} ${mrhl?.isTemplate === true ? '✅' : '❌'}`);

  // 4b. Check video URLs
  const curriculum = await p.curriculum.findFirst({
    where: { studentId: MRHL_ID },
    orderBy: { createdAt: 'desc' },
    include: { materials: true },
  });

  if (curriculum) {
    const totalVideo = curriculum.materials.length;
    const goodVideo = curriculum.materials.filter(
      (m) => m.videoUrl && (m.videoUrl.includes('youtube.com') || m.videoUrl.includes('youtu.be'))
    ).length;

    console.log(`\n📊 Video URLs:`);
    console.log(`   Total materials: ${totalVideo}`);
    console.log(`   With 'youtube.com' URL: ${goodVideo} (${((goodVideo / totalVideo) * 100).toFixed(1)}%)`);

    // Show any bad ones
    const badOnes = curriculum.materials.filter(
      (m) => !m.videoUrl || !(m.videoUrl.includes('youtube.com') || m.videoUrl.includes('youtu.be'))
    );
    if (badOnes.length > 0) {
      console.log(`   ⚠️  Materials WITHOUT proper YouTube URL:`);
      for (const b of badOnes) {
        console.log(`      - ${b.subject} / ${b.topic} / ${b.subTopic}: "${b.videoUrl?.substring(0, 60)}"`);
      }
    } else {
      console.log(`   ✅ All video URLs contain 'youtube.com'`);
    }

    // 4c. Check mindmaps
    const withMindmap = curriculum.materials.filter((m) => {
      const md = m.metadata as Record<string, any> | null;
      return md?.mindmap;
    }).length;

    const multiBranch = curriculum.materials.filter((m) => {
      const md = m.metadata as Record<string, any> | null;
      const mm = md?.mindmap as MindmapNode[] | undefined;
      return mm && mm.length > 1;
    }).length;

    const singleBranchPokok = curriculum.materials.filter((m) => {
      const md = m.metadata as Record<string, any> | null;
      const mm = md?.mindmap as MindmapNode[] | undefined;
      return mm && mm.length === 1 && mm[0]?.label === 'Pokok Bahasan';
    }).length;

    console.log(`\n📊 Mindmaps:`);
    console.log(`   With mindmap: ${withMindmap}`);
    console.log(`   Multi-branch (>1): ${multiBranch}`);
    console.log(`   Single-branch \"Pokok Bahasan\": ${singleBranchPokok}`);
  }

  await p.$disconnect();
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 Fix Syifa Data');
  console.log('='.repeat(60));

  console.log('\nStudent Info:');
  console.log(`   SYIF72237 (id: ${SYIF_ID}) — current template: will check`);
  console.log(`   STU_MRHL5FYL (id: ${MRHL_ID}) — current template: will check`);

  // Check current state
  const syifBefore = await p.student.findUnique({ where: { id: SYIF_ID } });
  const mrhlBefore = await p.student.findUnique({ where: { id: MRHL_ID } });
  console.log(`   Before: SYIF72237 isTemplate=${syifBefore?.isTemplate}, STU_MRHL5FYL isTemplate=${mrhlBefore?.isTemplate}`);

  await fixTemplateFlag();
  await fixVideoUrls();
  await fixMindmaps();
  await verify();

  console.log('\n' + '='.repeat(60));
  console.log('✅ All fixes applied!');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
