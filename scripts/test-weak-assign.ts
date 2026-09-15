/**
 * Unit test for selectWeakAreaTopics priority logic — pure function, no DB.
 * Run: npx tsx scripts/test-weak-assign.ts
 */
import { selectWeakAreaTopics } from "../src/agents/scheduler/assigner";
import type { Material } from "../src/generated/prisma/client";

function mat(subject: string, topic: string, weekOrder = 1): Material {
  return { subject, topic, weekOrder } as unknown as Material;
}

const weakSubjects = new Map([["Fisika", [mat("Fisika", "Gaya")]]]);
const allMaterials = [
  mat("Fisika", "Gaya", 2),
  mat("Fisika", "Tekanan", 3),
  mat("Biologi", "Sel", 1),
];

// 1. lagging topics win, oldest week first, deduped
const lagging = [
  { topic: "Tekanan", subject: "Fisika", weekOrder: 3 },
  { topic: "Gaya", subject: "Fisika", weekOrder: 2 },
  { topic: "Gerak Lurus", subject: "Fisika", weekOrder: 1 },
];
const r1 = selectWeakAreaTopics(weakSubjects, allMaterials, 3, lagging, new Set());
const ok1 =
  r1[0]?.topic === "Gerak Lurus" && // weekOrder 1 first
  r1[1]?.topic === "Gaya" &&
  r1[2]?.topic === "Tekanan";
console.log(`test1 lagging priority+order: ${ok1 ? "PASS" : "FAIL"} (${r1.map((r) => r.topic).join(", ")})`);

// 2. usedTopics excluded (already picked as new this week); remaining slots
//    filled by the review-label fallback by design.
const r2 = selectWeakAreaTopics(weakSubjects, allMaterials, 3, lagging, new Set(["Gerak Lurus", "Gaya"]));
const ok2 = r2[0]?.topic === "Tekanan" && r2[1]?.topic === "Review Fisika";
console.log(`test2 usedTopics excluded: ${ok2 ? "PASS" : "FAIL"} (${r2.map((r) => r.topic).join(", ")})`);

// 3. empty lagging → falls back to weak-subject materials
const r3 = selectWeakAreaTopics(weakSubjects, allMaterials, 2, [], new Set());
const ok3 = r3[0]?.topic === "Gaya";
console.log(`test3 fallback materials: ${ok3 ? "PASS" : "FAIL"} (${r3.map((r) => r.topic).join(", ")})`);

// 4. nothing available → review labels
const r4 = selectWeakAreaTopics(weakSubjects, [], 2, [], new Set());
const ok4 = r4[0]?.topic === "Review Fisika";
console.log(`test4 review label: ${ok4 ? "PASS" : "FAIL"} (${r4.map((r) => r.topic).join(", ")})`);

const pass = ok1 && ok2 && ok3 && ok4;
console.log(`=== RESULT: ${pass ? "PASS" : "FAIL"}`);
process.exit(pass ? 0 : 1);
