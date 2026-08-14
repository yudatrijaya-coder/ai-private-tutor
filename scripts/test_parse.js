function extractQuestions(text) {
  const bracketPos = text.indexOf("[");
  if (bracketPos === -1) return null;
  let slice = text.slice(bracketPos);
  let outerDepth = 0, outerBracketEnd = -1, depth = 0;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (ch === '"') {
      i++;
      while (i < slice.length && slice[i] !== '"') {
        if (slice[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (ch === "[") { depth++; outerDepth++; }
    else if (ch === "]") {
      depth--;
      if (outerDepth > 0) {
        outerDepth--;
        if (outerDepth === 0) outerBracketEnd = i;
      }
    }
  }
  if (outerBracketEnd === -1) return null;
  slice = slice.slice(0, outerBracketEnd + 1)
    .replace(/```json\s*$/gi, "").replace(/```\s*$/gi, "").trim();
  if (!slice.startsWith("[")) return null;
  try { return JSON.parse(slice); } catch (e) { return null; }
}

// Test 1: normal with markdown fence at end
const t1 = '```json\n[{"question":"Apa itu pantun?","options":["A","B","C","D"],"correctIndex":0}]\n```\n\nSemoga membantu!';
const r1 = extractQuestions(t1);
console.log("T1:", r1 ? "OK " + r1.length + " items" : "NULL");
console.log("   Q:", r1?.[0]?.question);

// Test 2: nested array options + outer array
const t2 = '```json\n[{"question":"Apa itu pantun?","options":["A","B","C","D"],"correctIndex":0},{"question":"Syair berapa baris?","options":["2","3","4","5"],"correctIndex":2}]\n```json\n\nTerima kasih!';
const r2 = extractQuestions(t2);
console.log("T2:", r2 ? "OK " + r2.length + " items" : "NULL");

// Test 3: string with bracket inside
const t3 = '```json\n[{"question":"Contoh: [isi kurung] dalam teks","options":["A","B","C","D"],"correctIndex":0}]\n```\n\nEnd text';
const r3 = extractQuestions(t3);
console.log("T3:", r3 ? "OK " + r3.length + " items" : "NULL");
console.log("   Q:", r3?.[0]?.question);
