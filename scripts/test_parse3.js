function extractQuestions(text) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const start = cleaned.indexOf("[");
  if (start === -1) return null;
  let outerDepth = 0, outerEnd = -1, inString = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (ch === '"' && cleaned[i - 1] !== "\\") inString = false;
    } else {
      if (ch === '"') { inString = true; }
      else if (ch === "[") { outerDepth++; }
      else if (ch === "]") { outerDepth--; if (outerDepth === 0) { outerEnd = i; break; } }
    }
  }
  if (outerEnd === -1) return null;
  const candidate = cleaned.slice(start, outerEnd + 1).trim();
  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { console.log("M1 fail:", e.message); }
  const allMatches = [...candidate.matchAll(/\[[\s\S]*?\]/g)];
  for (const m of allMatches.reverse()) {
    try {
      const p = JSON.parse(m[0]);
      if (Array.isArray(p)) return p;
    } catch { /* ignore */ }
  }
  return null;
}

// Real LLM output with ]```json at end
const real = '```json\n[\n  {\n    "question": "Syair memiliki scheme rima?",\n    "options": ["ABAB","AABB","AAAA","ABBA"],\n    "correctIndex": 2\n  },\n  {\n    "question": "\\"Bagai air di daun talas\\" termasuk unsur?",\n    "options": ["Diksi","Imaji","Rima","Irama"],\n    "correctIndex": 1\n  },\n  {\n    "question": "Pilihan kata yang tepat dalam puisi disebut?",\n    "options": ["Imaji","Diksi","Kata konkret","Irama"],\n    "correctIndex": 1\n  }\n]\n```\n\nTerima kasih!';

const r = extractQuestions(real);
console.log("Result:", r ? "OK " + r.length + " questions" : "NULL");
if (r) { console.log("Q1:", r[0].question); console.log("Q2:", r[1].question); }
