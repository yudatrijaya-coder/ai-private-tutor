const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const studentId = "e30b6559-1d33-4aa5-a39a-22102f29894d";

const QUIZ_TEMPLATES = {
  "Kimia_Pengantar Kimia": [
    { q: "Apa yang dimaksud dengan materi dalam ilmu kimia?", o: ["Segala sesuatu yang memiliki massa dan volume","Zat yang hanya bisa dilihat","Benda yang tidak berwujud","Energi murni"], c: 0, e: "Materi adalah segala sesuatu yang memiliki massa dan menempati ruang (volume)." },
    { q: "Apa satuan SI untuk jumlah zat?", o: ["Kilogram","Mol","Liter","Gram"], c: 1, e: "Mol adalah satuan SI untuk jumlah zat dalam kimia." },
    { q: "Manakah yang termasuk zat padat?", o: ["Udara","Batu","Air","Oksigen"], c: 1, e: "Batu adalah contoh zat padat yang memiliki bentuk dan volume tetap." },
    { q: "Apa yang dimaksud dengan atom?", o: ["Partikel terkecil unsur yang tidak dapat dibagi lagi","Campuran dua zat","Zat yang dapat menguap","Molekul air"], c: 0, e: "Atom adalah partikel terkecil dari suatu unsur yang masih memiliki sifat unsur tersebut." },
    { q: "Manakah contoh perubahan fisika?", o: ["Besi berkarat","Es mencair","Kayu terbakar","Makanan basi"], c: 1, e: "Es mencair adalah perubahan fisika karena hanya berubah wujud tanpa mengubah komposisi kimia." },
    { q: "Apa rumus kimia air?", o: ["H2O","CO2","NaCl","O2"], c: 0, e: "Air memiliki rumus kimia H2O, terdiri dari 2 atom hidrogen dan 1 atom oksigen." },
    { q: "Apa fungsi laboratorium kimia?", o: ["Tempat bermain","Tempat melakukan eksperimen ilmiah","Tempat menyimpan buku","Tempat olahraga"], c: 1, e: "Laboratorium kimia digunakan untuk melakukan percobaan dan penelitian ilmiah." },
    { q: "Manakah alat laboratorium untuk mengukur volume cairan?", o: ["Tabung reaksi","Gelas ukur","Cawan porselen","Kaki tiga"], c: 1, e: "Gelas ukur digunakan untuk mengukur volume cairan dengan cukup akurat." },
  ],
  "Kimia_Termokimia": [
    { q: "Apa yang dimaksud dengan termokimia?", o: ["Cabang kimia yang mempelajari perubahan energi dalam reaksi kimia","Cabang fisika tentang suhu","Ilmu tentang suhu tubuh","Studi tentang tekanan"], c: 0, e: "Termokimia adalah cabang ilmu kimia yang mempelajari kalor yang menyertai reaksi kimia." },
    { q: "Apa satuan energi dalam SI?", o: ["Kalori","Joule","Watt","Newton"], c: 1, e: "Satuan energi dalam SI adalah Joule (J)." },
    { q: "Reaksi yang melepas kalor disebut?", o: ["Endoterm","Eksoterm","Isoterm","Hipoterm"], c: 1, e: "Reaksi eksoterm melepaskan kalor ke lingkungan, sehingga suhu lingkungan naik." },
    { q: "Contoh reaksi eksoterm adalah?", o: ["Fotosintesis","Pembakaran kayu","Es mencair","Air menguap"], c: 1, e: "Pembakaran kayu melepaskan energi dalam bentuk kalor dan cahaya." },
    { q: "Apa hukum kekekalan energi dalam termokimia?", o: ["Hukum Boyle","Hukum Hess","Hukum Avogadro","Hukum Gay-Lussac"], c: 1, e: "Hukum Hess menyatakan bahwa perubahan energi total reaksi tidak tergantung pada jalannya reaksi." },
    { q: "Reaksi endoterm ditandai dengan?", o: ["Suhu naik","Suhu turun","Volume bertambah","Tekanan naik"], c: 1, e: "Reaksi endoterm menyerap kalor sehingga suhu lingkungan turun." },
    { q: "Apa contoh reaksi endoterm?", o: ["Pembakaran bensin","Fotosintesis","Ledakan petasan","Pembakaran lilin"], c: 1, e: "Fotosintesis membutuhkan energi cahaya matahari untuk mengubah CO2 menjadi glukosa." },
    { q: "Apa yang dimaksud dengan entalpi?", o: ["Kandungan kalor suatu zat pada tekanan tetap","Volume gas","Tekanan atmosfer","Suhu mutlak"], c: 0, e: "Entalpi (H) adalah jumlah energi total yang terkandung dalam suatu sistem pada tekanan konstan." },
  ],
  "Bahasa Inggris Tingkat Lanjut_Pengantar Bahasa Inggris Tingkat Lanjut": [
    { q: "What is a complex sentence?", o: ["A sentence with one clause","A sentence with an independent clause and at least one dependent clause","A simple sentence","A question sentence"], c: 1, e: "A complex sentence combines an independent clause with one or more dependent clauses." },
    { q: "Which is an example of a subordinate conjunction?", o: ["and","but","or","although"], c: 3, e: "'Although' is a subordinate conjunction used to introduce a dependent clause." },
    { q: "Narrative text aims to...", o: ["Explain a process","Entertain the reader","Describe a place","Argue a point"], c: 1, e: "Narrative text aims to entertain or engage the reader through stories." },
    { q: "What is the purpose of a topic sentence?", o: ["To end a paragraph","To introduce the main idea of a paragraph","To add detail","To conclude the essay"], c: 1, e: "A topic sentence states the main idea of a paragraph." },
    { q: "Which tense is commonly used in analytical exposition?", o: ["Past tense","Simple present tense","Future tense","Past perfect tense"], c: 1, e: "Analytical exposition commonly uses simple present tense to state facts and opinions." },
    { q: "A formal letter should include...", o: ["Slang words","Proper salutation and closing","Emojis","Casual greetings"], c: 1, e: "Formal letters require proper structure including salutation, body, and closing." },
    { q: "What does 'in conclusion' signal?", o: ["The beginning","The end of an argument","A new topic","A question"], c: 1, e: "'In conclusion' signals the summary or closing part of an argumentative text." },
    { q: "Passive voice: 'The book ___ by the teacher.'", o: ["is read","reads","is reading","read"], c: 0, e: "Passive voice uses 'to be' + past participle. 'The book is read by the teacher.'" },
  ],
  "Matematika Tingkat Lanjut_Pengantar Matematika Tingkat Lanjut": [
    { q: "Apa yang dimaksud dengan fungsi kuadrat?", o: ["Fungsi berpangkat 1","Fungsi berpangkat 2 dengan bentuk ax2+bx+c","Fungsi linear","Fungsi trigonometri"], c: 1, e: "Fungsi kuadrat berbentuk f(x) = ax2 + bx + c dengan a \u2260 0." },
    { q: "Diskriminan dari ax2+bx+c dirumuskan sebagai?", o: ["D = b2 - 4ac","D = b2 + 4ac","D = 4ac - b2","D = -b2 - 4ac"], c: 0, e: "Diskriminan D = b2 - 4ac digunakan untuk menentukan jenis akar persamaan kuadrat." },
    { q: "Jika D > 0, maka akar persamaan kuadrat bersifat...", o: ["Imajiner","Real dan berbeda","Real dan sama","Tidak ada akar"], c: 1, e: "Jika D > 0, persamaan kuadrat memiliki dua akar real yang berbeda." },
    { q: "Rumus kuadrat (abc formula) adalah...", o: ["x = (-b \u00b1 \u221aD)/(2a)","x = (-b \u00b1 D)/a","x = (b \u00b1 \u221aD)/(2c)","x = (-a \u00b1 \u221aD)/(2b)"], c: 0, e: "Rumus ABC: x = (-b \u00b1 \u221a(b2 - 4ac))/(2a) untuk mencari akar persamaan kuadrat." },
    { q: "Titik puncak fungsi kuadrat terletak di...", o: ["(-b/2a, D/4a)","(-b/2a, -D/4a)","(-b/a, D/2a)","(-2b/a, -D/a)"], c: 1, e: "Titik puncak fungsi kuadrat f(x)=ax2+bx+c adalah (-b/2a, -D/4a)." },
    { q: "Fungsi naik terjadi ketika...", o: ["Turunan pertama > 0","Turunan pertama < 0","Turunan pertama = 0","Turunan kedua > 0"], c: 0, e: "Fungsi naik jika turunan pertama (f'(x)) bernilai positif." },
    { q: "Limit lim(x\u2192\u221e) 1/x nilainya...", o: ["1","\u221e","0","Tidak terdefinisi"], c: 2, e: "lim(x\u2192\u221e) 1/x = 0 karena semakin besar x, nilai 1/x mendekati 0." },
    { q: "Matriks identitas adalah matriks yang...", o: ["Semua elemennya 1","Diagonal utama 1, sisanya 0","Semua elemennya 0","Elemen diagonal utama 0"], c: 1, e: "Matriks identitas adalah matriks persegi dengan elemen diagonal utama bernilai 1 dan sisanya 0." },
  ],
};

const materials = [
  { id: "1126855c-e24e-4408-9c2c-7381d4869884", subject: "Bahasa Inggris Tingkat Lanjut", topic: "Pengantar Bahasa Inggris Tingkat Lanjut" },
  { id: "5284a834-de1a-48a8-975c-1206f3f1d205", subject: "Kimia", topic: "Pengantar Kimia" },
  { id: "df992341-3e3f-4a57-b44f-8f0dfa9dad0f", subject: "Kimia", topic: "Termokimia" },
  { id: "b3464210-831e-49c2-854c-561105d14af5", subject: "Matematika Tingkat Lanjut", topic: "Pengantar Matematika Tingkat Lanjut" },
];

const sqlLines = [];
for (const mat of materials) {
  const key = `${mat.subject}_${mat.topic}`;
  const questions = QUIZ_TEMPLATES[key];
  if (!questions) { console.log(`No template: ${key}`); continue; }

  const qJson = JSON.stringify(questions.map(q => ({
    question: q.q,
    options: q.o,
    correctIndex: q.c,
    explanation: q.e,
  }))).replace(/'/g, "''");

  sqlLines.push(`INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "updatedAt")
VALUES (gen_random_uuid()::text, '${mat.id}', '${studentId}', 'QUIZ', '${qJson}', ${questions.length * 10}, NOW())
ON CONFLICT DO NOTHING;`);
}

const sqlFile = "/tmp/gen-quiz.sql";
fs.writeFileSync(sqlFile, sqlLines.join("\n"), "utf8");
console.log(`Wrote ${sqlLines.length} INSERTs to ${sqlFile}`);

execSync(`PGPASSWORD=tutor123 psql -h localhost -U tutor -d ai_private_tutor -f ${sqlFile}`, { stdio: "inherit" });
console.log("Done!");
