/**
 * Probe: YouTube coverage for the real (subject, topic) pairs of one grade.
 *
 * Usage: npx tsx scripts/probe-youtube-coverage.ts <GRADE> <pairs.json>
 *   pairs.json = [{ "subject": "...", "topic": "..." }, ...]
 *
 * Prints every topic that resolves to ZERO videos — those are the topics where
 * the student dashboard renders no "▶️ Tonton video" recommendation at all.
 */
import { readFileSync } from "node:fs";
import { getYouTubeForTopic } from "../src/data/youtube";

const grade = process.argv[2] ?? "SD_5";
const pairsFile = process.argv[3];
if (!pairsFile) {
  console.error("usage: probe-youtube-coverage.ts <GRADE> <pairs.json>");
  process.exit(1);
}

const rows = JSON.parse(readFileSync(pairsFile, "utf8")) as {
  subject: string;
  topic: string;
}[];

let zero = 0;
const gaps: string[] = [];

for (const row of rows) {
  const n = getYouTubeForTopic(row.subject, row.topic, grade).length;
  if (n === 0) {
    zero++;
    gaps.push(`${row.subject} | ${row.topic}`);
  }
}

console.log(`${grade}: ${rows.length} topics, ${zero} with ZERO videos, ${rows.length - zero} covered`);
if (gaps.length) {
  console.log("ZERO-COVERAGE TOPICS:");
  gaps.forEach((g) => console.log("  " + g));
}
