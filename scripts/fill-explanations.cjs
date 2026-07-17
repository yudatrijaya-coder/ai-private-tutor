const { execSync } = require("child_process");
const fs = require("fs");

function generateExplanation(question, options, correctIdx) {
  const correct = options[correctIdx] || "";
  const q = question.toLowerCase();
  if (/\bhasil|nilai|tentukan|hitung\b/.test(q))
    return `Hasil perhitungan yang benar adalah "${correct}".`;
  if (/\brumus\b/.test(q)) return `Rumus yang tepat adalah "${correct}".`;
  if (/\bdefinisi|pengertian|yang dimaksud\b/.test(q))
    return `Definisi yang tepat adalah "${correct}".`;
  if (/\bmanakah|berikut ini|yang bukan|yang merupakan\b/.test(q))
    return `Jawaban yang tepat adalah "${correct}".`;
  if (/\bfungsi|kegunaan|tujuan\b/.test(q))
    return `Fungsinya adalah "${correct}".`;
  if (/\bsebab|penyebab|alasan|karena\b/.test(q))
    return `Penyebabnya adalah "${correct}".`;
  if (/\bakibat|dampak\b/.test(q)) return `Dampaknya adalah "${correct}".`;
  if (/\bciri|karakteristik|sifat\b/.test(q))
    return `Ciri yang benar adalah "${correct}".`;
  if (/\bcontoh\b/.test(q)) return `Contoh yang tepat adalah "${correct}".`;
  if (/\bproses|tahap|langkah\b/.test(q))
    return `Langkah yang benar adalah "${correct}".`;
  if (/\bperbedaan|persamaan\b/.test(q))
    return `Yang tepat adalah "${correct}".`;
  if (/\bteori|konsep|prinsip|hukum|aturan\b/.test(q))
    return `Konsep yang benar adalah "${correct}".`;
  if (/\bwhat|which|who|where|when|how\b/.test(q))
    return `The correct answer is "${correct}".`;
  return `Jawaban yang tepat adalah "${correct}".`;
}

function db(sql) {
  return execSync(
    `PGPASSWORD=tutor123 psql -h localhost -U tutor -d ai_private_tutor -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
  ).trim();
}

async function main() {
  const raw = db(`SELECT json_agg(json_build_object('id', id, 'name', name, 'studentId', "studentId"))
    FROM "Student" WHERE status = 'ACTIVE'`);
  const students = raw ? JSON.parse(raw) : [];
  console.log(`Found ${students.length} students\n`);

  let totalFixed = 0;
  let totalGenerated = 0;

  for (const s of students) {
    const rawQuiz = db(`SELECT json_agg(json_build_object('id', id, 'questions', questions))
      FROM "Quiz" WHERE "studentId" = '${s.id}'`);
    if (!rawQuiz) { console.log(`${s.name}: no quizzes`); continue; }
    const quizzes = JSON.parse(rawQuiz);
    let fixed = 0;
    let queries = [];

    for (const quiz of quizzes) {
      const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
      if (questions.length === 0) continue;
      let needUpdate = false;
      for (const q of questions) {
        if (!q.explanation) {
          // Determine correctIndex — support both old (answer: "A") and new (correctIndex: number)
          let ci = q.correctIndex;
          if (typeof ci !== "number" && q.answer && q.options) {
            const letter = String(q.answer).toUpperCase().replace(/^["']|["']$/g, "");
            if (/^[A-D]$/.test(letter)) {
              ci = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            }
          }
          if (typeof ci === "number" && ci >= 0 && Array.isArray(q.options) && ci < q.options.length) {
            q.explanation = generateExplanation(q.question, q.options, ci);
            // Also add correctIndex if it was missing
            if (typeof q.correctIndex !== "number") {
              q.correctIndex = ci;
            }
            needUpdate = true;
            totalGenerated++;
          }
        }
      }
      if (needUpdate) {
        const jsonStr = JSON.stringify(questions);
        queries.push(`UPDATE "Quiz" SET questions = '${jsonStr.replace(/'/g, "''")}'::json WHERE id = '${quiz.id}';`);
        fixed++;
      }
    }

    if (queries.length > 0) {
      const tmpFile = `/tmp/fill_explanations_${s.id}.sql`;
      fs.writeFileSync(tmpFile, queries.join("\n"));
      const result = execSync(
        `PGPASSWORD=tutor123 psql -h localhost -U tutor -d ai_private_tutor -f "${tmpFile}"`,
        { encoding: "utf8" }
      ).trim();
      console.log(`${s.name} (${s.studentId}): fixed ${fixed} quizzes`);
    } else {
      console.log(`${s.name} (${s.studentId}): 0 to fix`);
    }

    totalFixed += fixed;
  }

  console.log(`\n✅ Done! ${totalFixed} quizzes fixed, ${totalGenerated} explanations generated`);
}

main().catch(console.error);
