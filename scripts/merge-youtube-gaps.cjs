/**
 * Merge curated YouTube candidates into the per-grade data files.
 *
 * Guards applied before anything is written:
 *   - grade gate      : reject explicit cross-jenjang titles (SD vs SMP vs SMA)
 *   - foreign gate    : reject GCSE/GCE/Khan Academy/FuseSchool/etc. content,
 *                       EXCEPT when the subject is a language lesson itself
 *   - mandarin gate   : HSK topics need score >= 0.67 (drops patriotic pop songs)
 *   - dedupe          : skip any videoId already present in any pool
 *   - alias           : a zero-result topic that is a 1-2 char typo of a topic
 *                       that DID get candidates inherits those candidates
 */
const fs = require("fs");

const CAND = "/tmp/yt-candidates.json";
const FILES = {
  SD_5: { path: "src/data/youtube.ts", array: "YOUTUBE_RECOMMENDATIONS" },
  SMP_1: { path: "src/data/youtube-smp7.ts", array: "YOUTUBE_SMP7" },
  SMA_2: { path: "src/data/youtube-sma11.ts", array: "YOUTUBE_SMA11" },
};

const FOREIGN_CH =
  /fuseschool|cognito|smile and learn|ted-ed|khan academy|nucleus medical|organic chemistry tutor|learning junction|physedgames|physics universe|free animated education|rawmaths|super cucos|bbc learning english/i;
const FOREIGN_TI = /\bGCSE\b|\bGCE\b|\bO-Level\b|\bA-Level\b|Khan Academy|FuseSchool|Nucleus Medical/i;
const LANGUAGE_SUBJECTS = /bahasa inggris|bahasa mandarin/i;

function levelReject(grade, title) {
  const t = title.toLowerCase();
  if (grade === "SD_5")
    return /\bsmp\b|\bmts\b|\bsma\b|\bsmk\b|kuliah|perkuliahan|kelas\s*(1|2|3|4|6|7|8|9|10|11|12)\b/.test(t);
  if (grade === "SMP_1")
    return /\bsma\b|\bsmk\b|kuliah|perkuliahan|\bsd\b|sekolah dasar|kelas\s*(10|11|12)\b/.test(t);
  if (grade === "SMA_2")
    return /\bsmp\b|\bmts\b|\bsd\b|sekolah dasar|kelas\s*(5|6|7|8|9)\b/.test(t);
  return false;
}

function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// ── existing (topic, videoId) pairs across every pool ───────────────────────
// Keyed per-topic on purpose: getYouTubeForTopic() resolves by topic string, so
// the same video legitimately appears under two topic keys (e.g. a DB typo).
const ENTRY_RE =
  /title:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*url:\s*"([^"]+)",\s*\n\s*channel:\s*"((?:[^"\\]|\\.)*)",\s*\n\s*topic:\s*"((?:[^"\\]|\\.)*)",/g;
const existing = new Set();
for (const { path } of Object.values(FILES)) {
  const txt = fs.readFileSync(path, "utf8");
  for (const m of txt.matchAll(ENTRY_RE)) {
    const id = (m[2].match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1];
    if (id) existing.add(m[4].toLowerCase() + "|" + id);
  }
}

const records = JSON.parse(fs.readFileSync(CAND, "utf8"));

// ── alias pass: typo'd zero-result topic inherits from a near-match ─────────
for (const r of records) {
  if (r.candidates && r.candidates.length) continue;
  const donor = records.find(
    (o) =>
      o !== r &&
      o.grade === r.grade &&
      o.subject === r.subject &&
      o.candidates &&
      o.candidates.length &&
      lev(o.topic.toLowerCase(), r.topic.toLowerCase()) <= 2,
  );
  if (donor) {
    r.candidates = donor.candidates;
    r.aliasOf = donor.topic;
  }
}

// ── filter + group ──────────────────────────────────────────────────────────
const perFile = {}; // path -> Map(topic -> entries[])
const stats = { added: 0, rejected: [], skippedDup: 0, stillEmpty: [] };
const seenBatch = new Set();

for (const r of records) {
  const file = FILES[r.grade];
  if (!file) continue;
  if (!r.candidates || !r.candidates.length) {
    stats.stillEmpty.push(`${r.grade} | ${r.subject} | ${r.topic}`);
    continue;
  }
  const isLang = LANGUAGE_SUBJECTS.test(r.subject);
  const isMandarin = /bahasa mandarin/i.test(r.subject);

  const kept = [];
  for (const c of r.candidates) {
    const key = r.topic.toLowerCase() + "|" + c.videoId;
    if (existing.has(key) || seenBatch.has(key)) {
      stats.skippedDup++;
      continue;
    }
    if (levelReject(r.grade, c.title)) {
      stats.rejected.push(`[jenjang] ${r.grade} | ${r.topic} | ${c.title.slice(0, 70)}`);
      continue;
    }
    if (!isLang && (FOREIGN_CH.test(c.channel) || FOREIGN_TI.test(c.title))) {
      stats.rejected.push(`[asing] ${r.grade} | ${r.topic} | ${c.title.slice(0, 70)}`);
      continue;
    }
    if (isMandarin && c.score < 0.67) {
      stats.rejected.push(`[mandarin] ${r.grade} | ${r.topic} | ${c.title.slice(0, 70)}`);
      continue;
    }
    seenBatch.add(c.videoId);
    kept.push(c);
  }

  if (!kept.length) {
    stats.stillEmpty.push(`${r.grade} | ${r.subject} | ${r.topic}`);
    continue;
  }

  const bucket = (perFile[file.path] ??= new Map());
  const list = bucket.get(r.topic) ?? [];
  list.push(...kept);
  bucket.set(r.topic, list);
  stats.added += kept.length;
}

// ── write ───────────────────────────────────────────────────────────────────
for (const [path, bucket] of Object.entries(perFile)) {
  let txt = fs.readFileSync(path, "utf8");
  const close = txt.indexOf("\n];");
  if (close === -1) throw new Error(`no array close found in ${path}`);

  const blocks = [];
  for (const [topic, entries] of bucket) {
    blocks.push(`\n  // ══════ ${topic} (${entries.length} video — curated 11 Sep 2026) ══════`);
    for (const e of entries) {
      blocks.push(
        `  {\n` +
          `    title: "${esc(e.title)}",\n` +
          `    url: "https://www.youtube.com/watch?v=${e.videoId}",\n` +
          `    channel: "${esc(e.channel)}",\n` +
          `    topic: "${esc(topic)}",\n` +
          `  },`,
      );
    }
  }

  txt = txt.slice(0, close) + "\n" + blocks.join("\n") + txt.slice(close);
  fs.writeFileSync(path, txt);
  console.log(`WROTE ${path}: ${bucket.size} topics, ${[...bucket.values()].reduce((a, b) => a + b.length, 0)} videos`);
}

console.log(`\nadded: ${stats.added}  dup-skipped: ${stats.skippedDup}  rejected: ${stats.rejected.length}`);
console.log(`\nREJECTED (${stats.rejected.length}):`);
stats.rejected.forEach((r) => console.log("  " + r));
console.log(`\nSTILL EMPTY (${stats.stillEmpty.length}):`);
stats.stillEmpty.forEach((r) => console.log("  " + r));
