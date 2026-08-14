function extractQuestions(text) {
  const bracketPos = text.indexOf("[");
  if (bracketPos === -1) return null;

  let slice = text.slice(bracketPos);
  let outerDepth = 0;
  let outerBracketEnd = -1;
  let inString = false;
  let i = 0;

  while (i < slice.length) {
    const ch = slice[i];

    if (inString) {
      if (ch === '"' && slice[i - 1] !== "\\") {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "[") {
        outerDepth++;
      } else if (ch === "]") {
        outerDepth--;
        if (outerDepth === 0) {
          outerBracketEnd = i;
          break;
        }
      }
    }
    i++;
  }

  if (outerBracketEnd >= 0) {
    const candidate = slice.slice(0, outerBracketEnd + 1)
      .replace(/```json\s*$/gim, "").replace(/```\s*$/gim, "").trim();
    if (candidate.startsWith("[")) {
      try { return JSON.parse(candidate); } catch (e) { console.log("M1 error:", e.message); }
    }
  }

  const arrayMatch = slice.match(/^\[(\{[^\]]*\})\s*\]/s);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch (e) { console.log("M2 error:", e.message); }
  }

  const objMatch = slice.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s);
  if (objMatch) {
    try { return [JSON.parse(objMatch[0])]; } catch (e) { console.log("M3 error:", e.message); }
  }

  return null;
}

// Simulate LLM output with escaped quotes in string
const testOutput = '```json\n[\n  {\n    "question": "Syair memiliki scheme rima?",\n    "options": ["ABAB", "AABB", "AAAA", "ABBA"],\n    "correctIndex": 2\n  },\n  {\n    "question": "\\"Bagai air di daun talas\\" termasuk unsur?",\n    "options": ["Diksi", "Imaji", "Rima", "Irama"],\n    "correctIndex": 1\n  },\n  {\n    "question": "Pilihan kata yang tepat dalam puisi disebut?",\n    "options": ["Imaji", "Diksi", "Kata konkret", "Irama"],\n    "correctIndex": 1\n  }\n]\n```\n\nTerima kasih!';

const r = extractQuestions(testOutput);
console.log("Result:", r ? "OK " + r.length + " questions" : "NULL");
if (r) {
  console.log("Q1:", r[0].question);
  console.log("Q2:", r[1].question);
  console.log("Generic:", r.some(q => /penting|berguna/i.test(q.question || "")));
}
