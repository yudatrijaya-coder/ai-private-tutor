const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  host: "localhost", port: 5432, database: "ai_private_tutor",
  user: "tutor", password: "tutor123",
});

function uid() { return crypto.randomUUID(); }

async function main() {
  const sres = await pool.query(`SELECT id FROM "Student" WHERE "studentId" = 'STU_MRHQL6KX'`);
  const studentUUID = sres.rows[0].id;
  const cid = (await pool.query(`SELECT id FROM "Curriculum" WHERE "studentId" = $1`, [studentUUID])).rows[0].id;
  console.log("Curriculum:", cid);

  // Delete old MTL
  const oldMats = await pool.query(`SELECT id FROM "Material" WHERE "curriculumId" = $1 AND subject = 'Matematika Tingkat Lanjut'`, [cid]);
  for (const m of oldMats.rows) {
    const oldQ = await pool.query(`SELECT id FROM "Quiz" WHERE "materialId" = $1`, [m.id]);
    for (const q of oldQ.rows) {
      await pool.query(`DELETE FROM "Attempt" WHERE "quizId" = $1`, [q.id]);
    }
    await pool.query(`DELETE FROM "Quiz" WHERE "materialId" = $1`, [m.id]);
    await pool.query(`DELETE FROM "Material" WHERE id = $1`, [m.id]);
  }
  if (oldMats.rows.length > 0) console.log("Deleted", oldMats.rows.length, "old materials");

  const TOPICS = [
    [1,"Polinomial","Polinomial dan Fungsi Polinomial",4],[2,"Polinomial","Operasi Aljabar pada Polinomial",4],[3,"Polinomial","Pembagian Sintetik dan Kesamaan",8],[4,"Polinomial","Teorema Sisa dan Teorema Faktor",6],[5,"Polinomial","Akar-Akar Persamaan Polinomial",4],[6,"Trigonometri","Identitas Trigonometri",4],[7,"Trigonometri","Aturan Sinus",6],[8,"Trigonometri","Aturan Cosinus",6],[9,"Trigonometri","Fungsi Trigonometri",4],[10,"Fungsi dan Pemodelannya","Fungsi Rasional",4],[11,"Fungsi dan Pemodelannya","Fungsi Irasional",4],[12,"Fungsi dan Pemodelannya","Fungsi Nilai Mutlak",4],[13,"Fungsi dan Pemodelannya","Fungsi Tangga",4],[14,"Fungsi dan Pemodelannya","Fungsi Piecewise",2],[15,"Trigonometri","Rumus Jumlah dan Selisih Sudut",6],[16,"Trigonometri","Rumus-Rumus Sudut Ganda",4],[17,"Trigonometri","Rumus Perkalian Sinus dan Kosinus",6],[18,"Trigonometri","Rumus Jumlah dan Selisih Sinus dan Kosinus",6],[19,"Limit Fungsi Trigonometri","Pengertian Limit Fungsi Trigonometri",2],[20,"Limit Fungsi Trigonometri","Menurunkan Rumus Limit Fungsi Trigonometri",2],[21,"Limit Fungsi Trigonometri","Menentukan Nilai Limit Fungsi Trigonometri",16],[22,"Turunan Trigonometri","Konsep Turunan Fungsi Trigonometri",8],[23,"Turunan Trigonometri","Persamaan Garis Singgung Kurva Trigonometri",6],[24,"Turunan Trigonometri","Menyelesaikan Masalah Optimasi",8],
  ];

  const SLIDES = {
    "Polinomial dan Fungsi Polinomial": "Polinomial (suku banyak) adalah ekspresi matematika berbentuk $a_nx^n + ... + a_0$ dengan $n$ bilangan bulat non-negatif. Derajat = pangkat tertinggi. Contoh: $P(x) = 2x^3 - 5x^2 + 3x - 7$ → derajat 3.",
    "Operasi Aljabar pada Polinomial": "Penjumlahan/pengurangan: koefisien suku sejenis dijumlah/dikurang. Perkalian: distributif. Pembagian: $P(x) = Q(x)H(x) + S(x)$.",
    "Pembagian Sintetik dan Kesamaan": "Metode Horner: bagi polinomial dengan $(x - k)$. Kesamaan: dua polinomial sama jika derajat dan koefisien sejenis sama.",
    "Teorema Sisa dan Teorema Faktor": "Sisa bagi $P(x)$ oleh $(x-k)$ = $P(k)$. $(x-k)$ faktor jika $P(k)=0$. $k$ = akar persamaan.",
    "Akar-Akar Persamaan Polinomial": "Nilai $x$ yg memenuhi $P(x)=0$. Untuk $ax^3+bx^2+cx+d=0$: jumlah akar $= -b/a$, hasil kali $= -d/a$.",
    "Identitas Trigonometri": "$\\sin^2\\theta + \\cos^2\\theta = 1$, $\\tan\\theta = \\sin\\theta/\\cos\\theta$. Lingkaran satuan: $(\\cos\\theta, \\sin\\theta)$.",
    "Aturan Sinus": "$a/\\sin A = b/\\sin B = c/\\sin C = 2R$. Untuk segitiga sembarang.",
    "Aturan Cosinus": "$a^2 = b^2 + c^2 - 2bc\\cos A$. Untuk s-sd-s atau s-s-s.",
    "Fungsi Trigonometri": "$y=\\sin x$ (T=360°), $y=\\cos x$ (T=360°), $y=\\tan x$ (T=180°).",
    "Fungsi Rasional": "$f(x)=P(x)/Q(x)$, domain $x\\neq$ pembuat nol penyebut.",
    "Fungsi Irasional": "$f(x)=\\sqrt{g(x)}$, domain $g(x)\\ge0$ (akar genap).",
    "Fungsi Nilai Mutlak": "$|x|=x$ jika $x\\ge0$, $-x$ jika $x<0$. Graf bentuk V.",
    "Fungsi Tangga": "$\\lfloor x\\rfloor$ = bulat terbesar $\\le x$. $\\lceil x\\rceil$ = bulat terkecil $\\ge x$.",
    "Fungsi Piecewise": "Aturan berbeda pada interval berbeda. Cek kontinuitas.",
    "Rumus Jumlah dan Selisih Sudut": "$\\sin(A\\pm B)=\\sin A\\cos B\\pm\\cos A\\sin B$.",
    "Rumus-Rumus Sudut Ganda": "$\\sin2A=2\\sin A\\cos A$, $\\cos2A=\\cos^2A-\\sin^2A$.",
    "Rumus Perkalian Sinus dan Kosinus": "$2\\sin A\\cos B=\\sin(A+B)+\\sin(A-B)$.",
    "Rumus Jumlah dan Selisih Sinus dan Kosinus": "$\\sin A+\\sin B=2\\sin((A+B)/2)\\cos((A-B)/2)$.",
    "Pengertian Limit Fungsi Trigonometri": "Nilai yg didekati $f(x)$ saat $x\\to c$.",
    "Menurunkan Rumus Limit Fungsi Trigonometri": "$\\lim_{x\\to0}\\sin x/x=1$, $\\lim_{x\\to0}\\tan x/x=1$.",
    "Menentukan Nilai Limit Fungsi Trigonometri": "Substitusi, faktorkan, kali sekawan.",
    "Konsep Turunan Fungsi Trigonometri": "$d/dx\\sin x=\\cos x$, $d/dx\\cos x=-\\sin x$.",
    "Persamaan Garis Singgung Kurva Trigonometri": "Gradien = $f'(a)$. $y-f(a)=f'(a)(x-a)$.",
    "Menyelesaikan Masalah Optimasi": "$f'(x)=0$, $f''(x)>0$ min, $f''(x)<0$ maks.",
  };

  // Quiz questions per sub-topic (3-5 questions each)
  const QUIZ_QS = {
    "Polinomial dan Fungsi Polinomial": [
      { question: "Derajat dari $P(x) = 5x^4 - 3x^2 + 7x - 2$?", options: ["2","3","4","7"], correctIndex: 2, explanation: "Pangkat tertinggi = 4" },
      { question: "Yang merupakan polinomial?", options: ["$x^2 + \\sqrt{x}$","$3x^3 - 2x^2 + x - 5$","$1/x + x$","$2^x + 3$"], correctIndex: 1, explanation: "Polinomial punya pangkat bulat non-negatif" },
      { question: "Koefisien utama dari $P(x) = 2x^3 - 5x^2 + 4x - 1$?", options: ["-5","2","4","-1"], correctIndex: 1, explanation: "Koefisien x^3 = 2" },
    ],
    "Operasi Aljabar pada Polinomial": [
      { question: "$(3x^2+2x-1)+(x^2-4x+5)=?$", options: ["$4x^2-2x+4$","$4x^2+6x+4$","$2x^2-2x-6$","$4x^2-2x-4$"], correctIndex: 0, explanation: "Jumlahkan suku sejenis" },
      { question: "$(x+2)(x-3)=?$", options: ["$x^2-x-6$","$x^2+x-6$","$x^2-5x-6$","$x^2-x+6$"], correctIndex: 0, explanation: "Distributif" },
    ],
    "Pembagian Sintetik dan Kesamaan": [
      { question: "Sisa bagi $x^3-2x^2+3x-5$ oleh $(x-2)$?", options: ["-5","1","7","3"], correctIndex: 1, explanation: "P(2)=8-8+6-5=1" },
    ],
    "Teorema Sisa dan Teorema Faktor": [
      { question: "Jika $P(3)=0$ maka faktor?", options: ["$x+3$","$x-3$","$3x-1$","$x-1$"], correctIndex: 1, explanation: "P(k)=0 → (x-k) faktor" },
    ],
    "Akar-Akar Persamaan Polinomial": [
      { question: "Jumlah akar $x^3-5x^2+7x-3=0$?", options: ["5","-5","7","-3"], correctIndex: 0, explanation: "-b/a = -(-5)/1 = 5" },
    ],
    "Identitas Trigonometri": [
      { question: "$\\sin^2x + \\cos^2x = ?$", options: ["$\\tan x$","$1$","$\\sin x \\cos x$","$0$"], correctIndex: 1, explanation: "Identitas dasar" },
      { question: "$\\tan x = ?$", options: ["$\\cos x/\\sin x$","$\\sin x/\\cos x$","$1/\\cos x$","$1/\\sin x$"], correctIndex: 1, explanation: "tan = sin/cos" },
    ],
    "Aturan Sinus": [
      { question: "Bentuk aturan sinus?", options: ["$a/\\sin A = b/\\sin B = c/\\sin C$","$a=b=c$","$a/\\sin A = b/\\sin C$","$a=2R\\sin B$"], correctIndex: 0, explanation: "a/sinA = b/sinB = c/sinC = 2R" },
    ],
    "Aturan Cosinus": [
      { question: "Rumus cosinus?", options: ["$a^2=b^2+c^2-2bc\\cos A$","$a^2=b^2+c^2+2bc\\cos A$","$a^2=b^2-c^2-2bc\\cos A$","$a=b^2+c^2-2bc\\cos A$"], correctIndex: 0, explanation: "Aturan cosinus" },
    ],
    "Fungsi Trigonometri": [
      { question: "Periode $\\sin x$?", options: ["90°","180°","360°","720°"], correctIndex: 2, explanation: "Periode sin = 360°" },
    ],
    "Fungsi Rasional": [
      { question: "Domain $f(x)=1/(x-3)$?", options: ["$x\\neq-3$","$x\\neq3$","$x\\neq0$","$x>3$"], correctIndex: 1, explanation: "x-3≠0 → x≠3" },
    ],
    "Fungsi Irasional": [
      { question: "Domain $f(x)=\\sqrt{x-2}$?", options: ["$x\\ge2$","$x>2$","$x\\le2$","$x\\neq2$"], correctIndex: 0, explanation: "x-2≥0" },
    ],
    "Fungsi Nilai Mutlak": [
      { question: "$|-7|=?$", options: ["-7","7","0","$\\pm7$"], correctIndex: 1, explanation: "|x| selalu non-negatif" },
    ],
    "Fungsi Tangga": [
      { question: "$\\lfloor 3.8 \\rfloor = ?$", options: ["3","4","3.8","38"], correctIndex: 0, explanation: "Floor = bulat terbesar ≤ x" },
    ],
    "Fungsi Piecewise": [
      { question: "f(x)=x+2 utk x<1, 3 utk x=1. f(0)=?", options: ["1","2","3","0"], correctIndex: 1, explanation: "0<1 → f(0)=2" },
    ],
    "Rumus Jumlah dan Selisih Sudut": [
      { question: "$\\sin(A+B)=?$", options: ["$\\sin A+\\sin B$","$\\sin A\\cos B+\\cos A\\sin B$","$\\sin A\\cos B-\\cos A\\sin B$","$\\cos A\\cos B+\\sin A\\sin B$"], correctIndex: 1, explanation: "sin(A+B)=sinAcosB+cosAsinB" },
    ],
    "Rumus-Rumus Sudut Ganda": [
      { question: "$\\sin 2A=?$", options: ["$2\\cos A$","$2\\sin A\\cos A$","$\\sin^2A-\\cos^2A$","$2\\sin A$"], correctIndex: 1, explanation: "sin2A=2sinAcosA" },
    ],
    "Rumus Perkalian Sinus dan Kosinus": [
      { question: "$2\\sin A\\cos B=?$", options: ["$\\sin(A+B)+\\sin(A-B)$","$\\sin(A+B)+\\cos(A-B)$","$\\cos(A+B)+\\sin(A-B)$","$\\cos(A+B)+\\cos(A-B)$"], correctIndex: 0, explanation: "2sinAcosB = sin(A+B)+sin(A-B)" },
    ],
    "Rumus Jumlah dan Selisih Sinus dan Kosinus": [
      { question: "$\\sin A + \\sin B=?$", options: ["$2\\sin((A+B)/2)\\sin((A-B)/2)$","$2\\sin((A+B)/2)\\cos((A-B)/2)$","$2\\cos((A+B)/2)\\sin((A-B)/2)$","$2\\cos((A+B)/2)\\cos((A-B)/2)$"], correctIndex: 1, explanation: "sinA+sinB = 2sin((A+B)/2)cos((A-B)/2)" },
    ],
    "Pengertian Limit Fungsi Trigonometri": [
      { question: "$\\lim_{x\\to0}\\cos x=?$", options: ["0","1","$\\infty$","-1"], correctIndex: 1, explanation: "cos 0 = 1" },
    ],
    "Menurunkan Rumus Limit Fungsi Trigonometri": [
      { question: "$\\lim_{x\\to0}\\sin x/x=?$", options: ["0","1","$\\infty$","tidak ada"], correctIndex: 1, explanation: "Limit fundamental = 1" },
    ],
    "Menentukan Nilai Limit Fungsi Trigonometri": [
      { question: "$\\lim_{x\\to0}\\sin 2x/x=?$", options: ["0","1","2","4"], correctIndex: 2, explanation: "=2·lim sin2x/2x=2·1=2" },
    ],
    "Konsep Turunan Fungsi Trigonometri": [
      { question: "Turunan $\\sin x$?", options: ["$-\\sin x$","$\\cos x$","$-\\cos x$","$\\tan x$"], correctIndex: 1, explanation: "d/dx sin x = cos x" },
    ],
    "Persamaan Garis Singgung Kurva Trigonometri": [
      { question: "Gradien singgung $\\sin x$ di $x=0$?", options: ["0","1","-1","$\\infty$"], correctIndex: 1, explanation: "f'(0)=cos0=1" },
    ],
    "Menyelesaikan Masalah Optimasi": [
      { question: "Jika f'(x)=0 dan f''(x)<0?", options: ["Minimum","Maksimum","Belok","Stasioner"], correctIndex: 1, explanation: "f''<0 → maksimum lokal" },
    ],
  };

  let totalQ = 0;
  for (const [order, topic, sub, jam] of TOPICS) {
    const matId = uid();
    const slide = SLIDES[sub] || `${sub} - bagian dari ${topic} MTL XI.`;
    const week = Math.ceil(order / 4);

    await pool.query(
      `INSERT INTO "Material" (id, "curriculumId", subject, topic, "subTopic", "rawContent", "processedContent", "gradeLevel", "weekOrder", priority, delivery, status, "createdAt", "updatedAt")
       VALUES ($1, $2, 'Matematika Tingkat Lanjut', $3, $4, $5, $6, 'SMA_2', $7, $8, 'TEXT', 'READY', NOW(), NOW())`,
      [matId, cid, topic, sub, slide, slide, week, jam]
    );

    const qs = QUIZ_QS[sub] || [{ question: `Apa ${sub}?`, options: ["Konsep dasar","Turunan","Integral","Limit"], correctIndex: 0, explanation: `${sub} adalah bagian dari ${topic}.` }];
    const quizId = uid();
    await pool.query(
      `INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "timeLimit", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'QUIZ', $4, $5, NULL, NOW(), NOW())`,
      [quizId, matId, studentUUID, JSON.stringify(qs), qs.length]
    );
    totalQ += qs.length;

    process.stdout.write(`  ${sub} (${qs.length} soal)\n`);
  }

  console.log(`\n✅ ${TOPICS.length} materials, ${totalQ} quiz questions`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
