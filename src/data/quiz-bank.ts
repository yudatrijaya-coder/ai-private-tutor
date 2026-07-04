/**
 * Quiz Bank — real Indonesian-language quiz/exam questions
 *
 * Maps each {subject, topic, subTopic} to 5 curated multiple-choice questions
 * aligned with Kurikulum Merdeka, mirroring the structure of curriculum-content.ts.
 *
 * @module @/data/quiz-bank
 */

import type { QuestionData } from '@/agents/assessment/types';

// ---------------------------------------------------------------------------
//  Helper: build a lookup key
// ---------------------------------------------------------------------------
export function quizKey(
  subject: string,
  topic: string,
  subTopic: string,
): string {
  return `${subject}||${topic}||${subTopic}`;
}

// ---------------------------------------------------------------------------
// Quiz bank — 5 questions per topic entry
// Each question: question, options (4 items), correctIndex (0-3), explanation
// ---------------------------------------------------------------------------

const QUIZ_MAP: Record<string, QuestionData[]> = {
  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — MATEMATIKA
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Matematika', 'Pecahan', 'Mengenal Pecahan')]: [
    {
      question: 'Bentuk pecahan dari bagian yang diarsir pada lingkaran yang dibagi menjadi 4 bagian sama besar dan diarsir 1 bagian adalah ...',
      options: ['1/4', '1/3', '1/2', '3/4'],
      correctIndex: 0,
      explanation: 'Jika lingkaran dibagi 4 bagian sama besar dan diarsir 1 bagian, maka pecahannya adalah 1/4, di mana 1 adalah pembilang (bagian yang diarsir) dan 4 adalah penyebut (jumlah seluruh bagian).',
    },
    {
      question: 'Pada pecahan 5/8, angka 5 disebut ...',
      options: ['Penyebut', 'Pembilang', 'Desimal', 'Persen'],
      correctIndex: 1,
      explanation: 'Angka 5 adalah pembilang, yaitu bilangan yang menunjukkan berapa bagian yang diambil dari keseluruhan. Angka 8 adalah penyebut (jumlah total bagian).',
    },
    {
      question: 'Pecahan senilai dari 2/3 adalah ...',
      options: ['4/6', '3/4', '2/6', '5/8'],
      correctIndex: 0,
      explanation: 'Pecahan senilai diperoleh dengan mengalikan pembilang dan penyebut dengan bilangan yang sama. 2/3 × 2/2 = 4/6. Jadi 4/6 senilai dengan 2/3.',
    },
    {
      question: 'Sebuah pizza dipotong menjadi 8 bagian sama besar. Jika kamu makan 3 bagian, pecahan yang menunjukkan bagian pizza yang kamu makan adalah ...',
      options: ['8/3', '3/8', '3/5', '5/8'],
      correctIndex: 1,
      explanation: 'Total 8 bagian, dimakan 3 bagian. Maka pecahannya adalah 3/8 (3 bagian dari 8 bagian).',
    },
    {
      question: 'Pecahan campuran 2 1/3 jika diubah menjadi pecahan biasa adalah ...',
      options: ['7/3', '5/3', '6/3', '8/3'],
      correctIndex: 0,
      explanation: 'Cara mengubah pecahan campuran ke pecahan biasa: (bilangan bulat × penyebut) + pembilang = (2 × 3) + 1 = 7, penyebut tetap 3. Jadi 7/3.',
    },
  ],

  [quizKey('Matematika', 'Pecahan', 'Penjumlahan Pecahan')]: [
    {
      question: 'Hasil dari 2/7 + 3/7 adalah ...',
      options: ['5/14', '5/7', '6/7', '1/7'],
      correctIndex: 1,
      explanation: 'Karena penyebutnya sama (7), jumlahkan pembilangnya: 2 + 3 = 5, penyebut tetap 7. Hasilnya 5/7.',
    },
    {
      question: 'Hasil dari 1/4 + 1/3 adalah ...',
      options: ['2/7', '2/12', '7/12', '5/12'],
      correctIndex: 2,
      explanation: 'Samakan penyebut dengan KPK dari 4 dan 3 yaitu 12. 1/4 = 3/12, 1/3 = 4/12. Maka 3/12 + 4/12 = 7/12.',
    },
    {
      question: 'Hasil dari 1 1/2 + 2 1/4 adalah ...',
      options: ['3 2/6', '3 3/4', '4 1/4', '3 1/4'],
      correctIndex: 1,
      explanation: 'Jumlahkan bilangan bulat: 1 + 2 = 3. Jumlahkan pecahan: 1/2 + 1/4 = 2/4 + 1/4 = 3/4. Hasilnya 3 3/4.',
    },
    {
      question: 'Hasil dari 3/8 + 1/8 adalah ...',
      options: ['4/16', '1/2', '4/8', '2/8'],
      correctIndex: 1,
      explanation: '3/8 + 1/8 = 4/8. Sederhanakan dengan membagi pembilang dan penyebut dengan 4: 4/8 = 1/2.',
    },
    {
      question: 'Langkah pertama menjumlahkan pecahan dengan penyebut berbeda adalah ...',
      options: ['Mengalikan pembilang', 'Menyamakan penyebut dengan KPK', 'Membagi penyebut', 'Menjumlahkan pembilang langsung'],
      correctIndex: 1,
      explanation: 'Langkah pertama adalah menyamakan penyebut dengan mencari KPK dari penyebut-penyebut tersebut, lalu mengubah setiap pecahan menjadi pecahan senilai dengan penyebut baru.',
    },
  ],

  [quizKey('Matematika', 'Pecahan', 'Pengurangan Pecahan')]: [
    {
      question: 'Hasil dari 5/6 - 1/6 adalah ...',
      options: ['4/6', '4/12', '2/3', '5/12'],
      correctIndex: 0,
      explanation: 'Penyebut sama (6), kurangkan pembilang: 5 - 1 = 4. Hasilnya 4/6 yang bisa disederhanakan menjadi 2/3.',
    },
    {
      question: 'Hasil dari 3/4 - 1/3 adalah ...',
      options: ['2/1', '2/7', '5/12', '4/7'],
      correctIndex: 2,
      explanation: 'KPK dari 4 dan 3 adalah 12. 3/4 = 9/12, 1/3 = 4/12. Maka 9/12 - 4/12 = 5/12.',
    },
    {
      question: 'Hasil dari 2 1/2 - 1 1/4 adalah ...',
      options: ['1 1/4', '1 1/2', '1 1/3', '2 1/4'],
      correctIndex: 0,
      explanation: 'Kurangkan bilangan bulat: 2 - 1 = 1. Kurangkan pecahan: 1/2 - 1/4 = 2/4 - 1/4 = 1/4. Hasilnya 1 1/4.',
    },
    {
      question: 'Hasil dari 4/5 - 2/5 adalah ...',
      options: ['2/5', '2/0', '1/5', '3/5'],
      correctIndex: 0,
      explanation: '4/5 - 2/5 = (4-2)/5 = 2/5.',
    },
    {
      question: 'Ibu memiliki 3/4 kg gula. Ibu menggunakan 1/2 kg untuk membuat kue. Sisa gula ibu adalah ... kg.',
      options: ['1/4', '1/3', '2/4', '3/4'],
      correctIndex: 0,
      explanation: '3/4 - 1/2 = 3/4 - 2/4 = 1/4 kg. Jadi sisa gula ibu 1/4 kg.',
    },
  ],

  [quizKey('Matematika', 'Pecahan', 'Perkalian Pecahan')]: [
    {
      question: 'Hasil dari 2/3 × 4/5 adalah ...',
      options: ['6/15', '8/15', '8/8', '6/8'],
      correctIndex: 1,
      explanation: 'Perkalian pecahan: kalikan pembilang (2 × 4 = 8) dan penyebut (3 × 5 = 15). Hasilnya 8/15.',
    },
    {
      question: 'Hasil dari 3 × 2/5 adalah ...',
      options: ['6/5', '5/5', '3/5', '6/15'],
      correctIndex: 0,
      explanation: '3 × 2/5 = (3 × 2)/5 = 6/5 = 1 1/5.',
    },
    {
      question: 'Hasil dari 1/2 × 1/3 adalah ...',
      options: ['1/6', '2/5', '1/5', '2/6'],
      correctIndex: 0,
      explanation: '1/2 × 1/3 = (1 × 1)/(2 × 3) = 1/6.',
    },
    {
      question: 'Hasil dari 2 1/2 × 1 1/3 adalah ...',
      options: ['3 1/3', '2 1/6', '3 1/6', '2 1/3'],
      correctIndex: 0,
      explanation: 'Ubah ke pecahan biasa: 2 1/2 = 5/2, 1 1/3 = 4/3. Maka 5/2 × 4/3 = 20/6 = 10/3 = 3 1/3.',
    },
    {
      question: 'Dalam perkalian pecahan, kita ...',
      options: ['Menyamakan penyebut dulu', 'Mengalikan pembilang dengan pembilang, penyebut dengan penyebut', 'Menjumlahkan pembilang dan penyebut', 'Membagi pembilang dan penyebut'],
      correctIndex: 1,
      explanation: 'Perkalian pecahan sangat mudah: cukup kalikan pembilang dengan pembilang dan penyebut dengan penyebut. Tidak perlu menyamakan penyebut.',
    },
  ],

  [quizKey('Matematika', 'Pecahan', 'Pembagian Pecahan')]: [
    {
      question: 'Hasil dari 3/4 ÷ 2/5 adalah ...',
      options: ['6/20', '15/8', '6/9', '5/6'],
      correctIndex: 1,
      explanation: 'Pembagian pecahan: ubah ÷ menjadi × dengan membalik pecahan kedua. 3/4 ÷ 2/5 = 3/4 × 5/2 = 15/8 = 1 7/8.',
    },
    {
      question: 'Hasil dari 2 ÷ 1/3 adalah ...',
      options: ['2/3', '6', '3/2', '2/6'],
      correctIndex: 1,
      explanation: '2 ÷ 1/3 = 2 × 3/1 = 6.',
    },
    {
      question: 'Hasil dari 1/2 ÷ 1/4 adalah ...',
      options: ['1/8', '2', '1/6', '4/2'],
      correctIndex: 1,
      explanation: '1/2 ÷ 1/4 = 1/2 × 4/1 = 4/2 = 2.',
    },
    {
      question: 'Hasil dari 2 1/2 ÷ 1/2 adalah ...',
      options: ['5', '2 1/4', '1 1/4', '3'],
      correctIndex: 0,
      explanation: '2 1/2 = 5/2. Maka 5/2 ÷ 1/2 = 5/2 × 2/1 = 10/2 = 5.',
    },
    {
      question: 'Cara mengerjakan pembagian pecahan adalah ...',
      options: ['Membagi pembilang dengan pembilang', 'Mengubah tanda ÷ menjadi × dan membalik pecahan kedua', 'Menyamakan penyebut lalu membagi', 'Mengalikan pembilang dengan penyebut'],
      correctIndex: 1,
      explanation: 'Pembagian pecahan dikerjakan dengan mengubah tanda ÷ menjadi × dan membalik pecahan pembagi (pembilang jadi penyebut, penyebut jadi pembilang).',
    },
  ],

  [quizKey('Matematika', 'Desimal', 'Mengenal Desimal')]: [
    {
      question: 'Bentuk desimal dari 1/4 adalah ...',
      options: ['0,4', '0,25', '0,75', '1,4'],
      correctIndex: 1,
      explanation: '1/4 = 1 ÷ 4 = 0,25. Dalam bentuk desimal, 0,25 sama dengan 25/100 atau 1/4.',
    },
    {
      question: 'Nilai tempat angka 5 pada bilangan 0,57 adalah ...',
      options: ['Satuan', 'Persepuluhan', 'Perseratusan', 'Perseribuan'],
      correctIndex: 1,
      explanation: 'Angka 5 menempati tempat persepuluhan (nilainya 5/10), sedangkan 7 menempati perseratusan (7/100).',
    },
    {
      question: 'Bentuk pecahan biasa dari 0,75 adalah ...',
      options: ['7/5', '3/4', '75/10', '1/75'],
      correctIndex: 1,
      explanation: '0,75 = 75/100 = 3/4 (disederhanakan dengan membagi pembilang dan penyebut dengan 25).',
    },
    {
      question: 'Bilangan 0,5 sama nilainya dengan pecahan ...',
      options: ['1/5', '1/2', '5/100', '5/10'],
      correctIndex: 1,
      explanation: '0,5 = 5/10 = 1/2.',
    },
    {
      question: 'Bilangan desimal 0,125 dibaca ...',
      options: ['Nol koma seratus dua puluh lima', 'Nol koma satu dua lima', 'Seratus dua puluh lima perseribu', 'Nol koma seratus dua puluh lima perseribu'],
      correctIndex: 1,
      explanation: '0,125 dibaca "nol koma satu dua lima" atau "seratus dua puluh lima perseribu".',
    },
  ],

  [quizKey('Matematika', 'Desimal', 'Operasi Desimal')]: [
    {
      question: 'Hasil dari 0,5 + 0,25 adalah ...',
      options: ['0,75', '0,30', '0,50', '0,80'],
      correctIndex: 0,
      explanation: '0,5 + 0,25 = 0,75. Jumlahkan dengan meluruskan tanda koma desimalnya.',
    },
    {
      question: 'Hasil dari 0,75 - 0,25 adalah ...',
      options: ['0,50', '0,40', '0,60', '1,00'],
      correctIndex: 0,
      explanation: '0,75 - 0,25 = 0,50.',
    },
    {
      question: 'Hasil dari 0,6 × 0,3 adalah ...',
      options: ['0,18', '0,9', '1,8', '0,018'],
      correctIndex: 0,
      explanation: '6 × 3 = 18. Karena ada 2 angka di belakang koma (0,6 dan 0,3), hasilnya 0,18.',
    },
    {
      question: 'Hasil dari 1,5 ÷ 0,5 adalah ...',
      options: ['0,3', '3', '0,03', '30'],
      correctIndex: 1,
      explanation: '1,5 ÷ 0,5 = 15/10 ÷ 5/10 = 15/10 × 10/5 = 150/50 = 3.',
    },
    {
      question: 'Ibu membeli 1,5 kg gula dan 0,75 kg tepung. Berat total belanjaan ibu adalah ... kg.',
      options: ['2,25', '1,25', '2,00', '1,50'],
      correctIndex: 0,
      explanation: '1,5 + 0,75 = 2,25 kg.',
    },
  ],

  [quizKey('Matematika', 'Bangun Datar', 'Luas Bangun Datar')]: [
    {
      question: 'Rumus luas persegi panjang adalah ...',
      options: ['sisi × sisi', 'panjang × lebar', '2 × (panjang + lebar)', 'panjang × lebar × tinggi'],
      correctIndex: 1,
      explanation: 'Luas persegi panjang = panjang × lebar. Sedangkan sisi × sisi adalah luas persegi, dan 2 × (p + l) adalah keliling persegi panjang.',
    },
    {
      question: 'Luas persegi dengan sisi 8 cm adalah ... cm².',
      options: ['16', '32', '64', '24'],
      correctIndex: 2,
      explanation: 'Luas persegi = sisi × sisi = 8 × 8 = 64 cm².',
    },
    {
      question: 'Luas segitiga dengan alas 10 cm dan tinggi 6 cm adalah ... cm².',
      options: ['60', '16', '30', '20'],
      correctIndex: 2,
      explanation: 'Luas segitiga = 1/2 × alas × tinggi = 1/2 × 10 × 6 = 30 cm².',
    },
    {
      question: 'Sebuah persegi panjang memiliki panjang 12 cm dan lebar 5 cm. Luasnya adalah ... cm².',
      options: ['60', '17', '34', '50'],
      correctIndex: 0,
      explanation: 'Luas = p × l = 12 × 5 = 60 cm².',
    },
    {
      question: 'Rumus luas lingkaran adalah ...',
      options: ['π × d', 'π × r²', '2 × π × r', 'π × d²'],
      correctIndex: 1,
      explanation: 'Luas lingkaran = π × r² (pi dikali jari-jari kuadrat). π × d adalah keliling lingkaran (d = diameter).',
    },
  ],

  [quizKey('Matematika', 'Bangun Datar', 'Keliling Bangun Datar')]: [
    {
      question: 'Rumus keliling persegi adalah ...',
      options: ['sisi × sisi', '4 × sisi', '2 × (panjang + lebar)', 'sisi × 2'],
      correctIndex: 1,
      explanation: 'Keliling persegi = 4 × sisi. Karena persegi memiliki 4 sisi yang sama panjang.',
    },
    {
      question: 'Keliling persegi panjang dengan panjang 10 cm dan lebar 6 cm adalah ... cm.',
      options: ['16', '60', '32', '24'],
      correctIndex: 2,
      explanation: 'Keliling persegi panjang = 2 × (p + l) = 2 × (10 + 6) = 2 × 16 = 32 cm.',
    },
    {
      question: 'Sebuah segitiga sama sisi memiliki panjang sisi 9 cm. Kelilingnya adalah ... cm.',
      options: ['18', '27', '36', '9'],
      correctIndex: 1,
      explanation: 'Keliling segitiga sama sisi = 3 × sisi = 3 × 9 = 27 cm.',
    },
    {
      question: 'Keliling lingkaran dengan jari-jari 7 cm adalah ... cm. (π = 22/7)',
      options: ['44', '22', '154', '88'],
      correctIndex: 0,
      explanation: 'Keliling lingkaran = 2 × π × r = 2 × 22/7 × 7 = 44 cm.',
    },
    {
      question: 'Rumus keliling lingkaran adalah ...',
      options: ['π × r²', '2 × π × r', 'π × d²', '4 × π × r'],
      correctIndex: 1,
      explanation: 'Keliling lingkaran = 2 × π × r (dua kali pi dikali jari-jari) atau π × d (pi dikali diameter).',
    },
  ],

  [quizKey('Matematika', 'Bangun Ruang', 'Volume Bangun Ruang')]: [
    {
      question: 'Rumus volume balok adalah ...',
      options: ['panjang × lebar', 'panjang × lebar × tinggi', 'sisi × sisi × sisi', 'luas alas × 2'],
      correctIndex: 1,
      explanation: 'Volume balok = panjang × lebar × tinggi. Sedangkan sisi × sisi × sisi adalah volume kubus.',
    },
    {
      question: 'Volume kubus dengan panjang rusuk 5 cm adalah ... cm³.',
      options: ['25', '15', '125', '50'],
      correctIndex: 2,
      explanation: 'Volume kubus = s × s × s = 5 × 5 × 5 = 125 cm³.',
    },
    {
      question: 'Sebuah balok memiliki panjang 8 cm, lebar 4 cm, dan tinggi 3 cm. Volumenya adalah ... cm³.',
      options: ['96', '32', '48', '64'],
      correctIndex: 0,
      explanation: 'Volume = p × l × t = 8 × 4 × 3 = 96 cm³.',
    },
    {
      question: 'Rumus volume tabung adalah ...',
      options: ['π × r² × t', 'π × r × t', '2 × π × r × t', 'π × d × t'],
      correctIndex: 0,
      explanation: 'Volume tabung = luas alas × tinggi = π × r² × t.',
    },
    {
      question: 'Volume kubus yang memiliki volume sama dengan balok berukuran 4 cm × 4 cm × 8 cm adalah ... cm³.',
      options: ['128', '64', '256', '16'],
      correctIndex: 0,
      explanation: 'Volume balok = 4 × 4 × 8 = 128 cm³. Maka volume kubus tersebut adalah 128 cm³.',
    },
  ],

  [quizKey('Matematika', 'Statistika', 'Membaca Data')]: [
    {
      question: 'Data nilai ulangan 5 siswa: 7, 8, 6, 9, 8. Nilai tertinggi dari data tersebut adalah ...',
      options: ['7', '8', '9', '6'],
      correctIndex: 2,
      explanation: 'Setelah data diurutkan: 6, 7, 8, 8, 9. Nilai tertinggi adalah 9.',
    },
    {
      question: 'Dari data 4, 5, 5, 6, 7, 7, 8, nilai yang paling sering muncul adalah ...',
      options: ['5', '6', '7', '5 dan 7'],
      correctIndex: 0,
      explanation: 'Angka 5 muncul 2 kali, angka 7 juga muncul 2 kali, angka lainnya hanya 1 kali. Jadi 5 dan 7 sama-sama paling sering muncul (modus = 5 dan 7).',
    },
    {
      question: 'Data tinggi badan siswa (cm): 120, 125, 130, 125, 120, 135. Jumlah siswa yang diukur adalah ...',
      options: ['4', '5', '6', '7'],
      correctIndex: 2,
      explanation: 'Data terdiri dari 6 angka, berarti ada 6 siswa yang diukur.',
    },
    {
      question: 'Nilai ulangan matematika: 6, 7, 8, 6, 9. Jumlah seluruh nilai adalah ...',
      options: ['34', '35', '36', '33'],
      correctIndex: 2,
      explanation: 'Jumlah = 6 + 7 + 8 + 6 + 9 = 36.',
    },
    {
      question: 'Selisih antara nilai tertinggi dan terendah disebut ...',
      options: ['Rata-rata', 'Modus', 'Median', 'Jangkauan'],
      correctIndex: 3,
      explanation: 'Jangkauan (range) adalah selisih antara nilai tertinggi dan nilai terendah dalam suatu data.',
    },
  ],

  [quizKey('Matematika', 'Statistika', 'Diagram')]: [
    {
      question: 'Diagram yang menggunakan batang tegak lurus untuk menyajikan data disebut ...',
      options: ['Diagram lingkaran', 'Diagram batang', 'Diagram garis', 'Diagram gambar'],
      correctIndex: 1,
      explanation: 'Diagram batang menyajikan data dalam bentuk batang-batang tegak lurus yang tingginya mewakili frekuensi atau nilai data.',
    },
    {
      question: 'Diagram yang paling tepat untuk menunjukkan perubahan data dari waktu ke waktu adalah ...',
      options: ['Diagram batang', 'Diagram lingkaran', 'Diagram garis', 'Diagram gambar'],
      correctIndex: 2,
      explanation: 'Diagram garis paling tepat untuk menunjukkan tren atau perubahan data secara berkelanjutan dari waktu ke waktu.',
    },
    {
      question: 'Dalam diagram lingkaran, sudut yang mewakili 25% dari data adalah ... derajat.',
      options: ['25', '90', '360', '100'],
      correctIndex: 1,
      explanation: '25% = 25/100 × 360° = 90°.',
    },
    {
      question: 'Diagram yang menggunakan gambar atau simbol untuk mewakili jumlah data disebut ...',
      options: ['Diagram batang', 'Diagram lingkaran', 'Diagram gambar (piktogram)', 'Diagram garis'],
      correctIndex: 2,
      explanation: 'Diagram gambar atau piktogram menggunakan gambar atau simbol yang masing-masing mewakili jumlah tertentu.',
    },
    {
      question: 'Data hasil panen padi selama 5 tahun paling mudah dilihat trennya menggunakan diagram ...',
      options: ['Batang', 'Lingkaran', 'Garis', 'Gambar'],
      correctIndex: 2,
      explanation: 'Diagram garis paling baik untuk menunjukkan perubahan atau tren data dalam periode waktu tertentu.',
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — BAHASA INDONESIA
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Bahasa Indonesia', 'Membaca Pemahaman', 'Ide Pokok')]: [
    {
      question: 'Ide pokok adalah ...',
      options: ['Gagasan penjelas dalam paragraf', 'Gagasan utama yang menjadi dasar pengembangan paragraf', 'Kesimpulan akhir dari bacaan', 'Kalimat terakhir dalam paragraf'],
      correctIndex: 1,
      explanation: 'Ide pokok adalah gagasan utama atau inti permasalahan yang ingin disampaikan penulis dalam sebuah paragraf.',
    },
    {
      question: 'Paragraf yang ide pokoknya terletak di awal paragraf disebut paragraf ...',
      options: ['Induktif', 'Deduktif', 'Campuran', 'Naratif'],
      correctIndex: 1,
      explanation: 'Paragraf deduktif memiliki ide pokok di awal paragraf, lalu diikuti kalimat-kalimat penjelas setelahnya.',
    },
    {
      question: '"Olahraga membuat tubuh sehat. Olahraga melancarkan peredaran darah dan memperkuat otot. Jantung pun bekerja lebih optimal." Ide pokok paragraf tersebut adalah ...',
      options: ['Olahraga memperkuat otot', 'Olahraga membuat tubuh sehat', 'Jantung bekerja optimal', 'Peredaran darah lancar'],
      correctIndex: 1,
      explanation: 'Kalimat pertama ("Olahraga membuat tubuh sehat") adalah ide pokok. Kalimat-kalimat berikutnya adalah kalimat penjelas yang mendukung ide pokok ini.',
    },
    {
      question: 'Langkah pertama dalam menemukan ide pokok adalah ...',
      options: ['Mencatat semua kata sulit', 'Membaca paragraf dengan saksama', 'Langsung menyimpulkan', 'Menghitung jumlah kalimat'],
      correctIndex: 1,
      explanation: 'Langkah pertama adalah membaca paragraf dengan saksama untuk memahami isi keseluruhan paragraf, baru kemudian menentukan kalimat utamanya.',
    },
    {
      question: 'Ciri-ciri ide pokok adalah ...',
      options: ['Merupakan kalimat penjelas', 'Bersifat khusus dan rinci', 'Merupakan inti dari seluruh isi paragraf', 'Terletak hanya di akhir paragraf'],
      correctIndex: 2,
      explanation: 'Ide pokok merupakan inti dari seluruh isi paragraf, bersifat umum, dan didukung oleh kalimat-kalimat penjelas.',
    },
  ],

  [quizKey('Bahasa Indonesia', 'Membaca Pemahaman', 'Kesimpulan')]: [
    {
      question: 'Kesimpulan adalah ...',
      options: ['Ide pokok dalam satu paragraf', 'Intisari dari seluruh bacaan', 'Kalimat pertama dalam bacaan', 'Opini pribadi penulis'],
      correctIndex: 1,
      explanation: 'Kesimpulan adalah intisari atau ringkasan dari keseluruhan bacaan, berbeda dengan ide pokok yang hanya untuk satu paragraf.',
    },
    {
      question: 'Kata-kata yang sering digunakan dalam kesimpulan adalah ...',
      options: ['Pertama, kedua, ketiga', 'Jadi, oleh karena itu, dengan demikian', 'Misalnya, contohnya, seperti', 'Akan tetapi, namun, sayangnya'],
      correctIndex: 1,
      explanation: 'Kata seperti "jadi", "oleh karena itu", "dengan demikian", "dapat disimpulkan bahwa" sering digunakan untuk menandai kesimpulan.',
    },
    {
      question: 'Perbedaan ide pokok dan kesimpulan adalah ...',
      options: ['Ide pokok di akhir paragraf, kesimpulan di awal', 'Ide pokok untuk satu paragraf, kesimpulan untuk seluruh bacaan', 'Ide pokok berupa opini, kesimpulan berupa fakta', 'Tidak ada perbedaan'],
      correctIndex: 1,
      explanation: 'Ide pokok berisi gagasan utama dalam SATU paragraf, sedangkan kesimpulan berisi intisari dari SELURUH bacaan yang terdiri dari beberapa paragraf.',
    },
    {
      question: '"Kucing adalah hewan peliharaan yang populer. Kucing memiliki bulu yang lembut dan mata yang indah. Kucing juga pandai menangkap tikus." Kesimpulan yang tepat adalah ...',
      options: ['Kucing memiliki bulu lembut', 'Kucing hewan peliharaan populer karena bulu lembut, mata indah, dan pandai menangkap tikus', 'Kucing pandai menangkap tikus', 'Kucing adalah hewan buas'],
      correctIndex: 1,
      explanation: 'Kesimpulan merangkum semua informasi penting: kucing populer karena bulu lembut, mata indah, dan pandai menangkap tikus.',
    },
    {
      question: 'Ciri kesimpulan yang baik adalah ...',
      options: ['Panjang dan mendetail', 'Berisi opini pribadi', 'Singkat, jelas, padat, dan berdasarkan fakta', 'Menambahkan informasi baru'],
      correctIndex: 2,
      explanation: 'Kesimpulan yang baik disusun dengan bahasa singkat, jelas, dan padat, serta berisi informasi penting yang mewakili isi bacaan tanpa menambahkan opini atau informasi baru.',
    },
  ],

  [quizKey('Bahasa Indonesia', 'Menulis', 'Kalimat Efektif')]: [
    {
      question: 'Kalimat efektif adalah kalimat yang ...',
      options: ['Panjang dan rumit', 'Singkat, jelas, dan mudah dipahami', 'Mengulang-ulang kata', 'Menggunakan kata asing'],
      correctIndex: 1,
      explanation: 'Kalimat efektif adalah kalimat yang singkat, jelas, tepat, dan mudah dipahami sehingga informasi tersampaikan dengan baik.',
    },
    {
      question: 'Kalimat berikut yang merupakan kalimat efektif adalah ...',
      options: ['Kepada Bapak Kepala Sekolah yang terhormat, kami sampaikan laporan ini', 'Bapak Kepala Sekolah yang terhormat, kami sampaikan laporan ini', 'Untuk Bapak Kepala Sekolah yang sangat terhormat sekali', 'Kepada Yth. Bapak Kepala Sekolah yang terhormat kami sampaikan laporan ini'],
      correctIndex: 1,
      explanation: 'Kalimat efektif tidak bertele-tele dan tidak menggunakan kata yang mubazir. Opsi B langsung pada inti tanpa "kepada" dan "Yth." yang berlebihan.',
    },
    {
      question: 'Contoh kalimat tidak efektif karena pemborosan kata adalah ...',
      options: ['Dia pergi ke sekolah', 'Demi untuk kepentingan bersama, mari kita jaga kebersihan', 'Ibu memasak di dapur', 'Adik bermain bola'],
      correctIndex: 1,
      explanation: '"Demi untuk" adalah pemborosan kata karena "demi" sudah mengandung arti "untuk". Cukup "Demi kepentingan bersama" atau "Untuk kepentingan bersama".',
    },
    {
      question: 'Ciri kalimat efektif adalah memiliki unsur ...',
      options: ['SPOK (Subjek, Predikat, Objek, Keterangan)', 'Hanya subjek dan predikat', 'Tidak perlu memiliki subjek', 'Selalu diawali kata depan'],
      correctIndex: 0,
      explanation: 'Kalimat efektif minimal memiliki unsur Subjek dan Predikat. Kalimat yang lebih lengkap memiliki Subjek, Predikat, Objek, dan Keterangan (SPOK).',
    },
    {
      question: '"Para siswa-siswa sedang belajar di kelas." Perbaikan kalimat tersebut agar efektif adalah ...',
      options: ['Para siswa-siswa sedang belajar', 'Siswa sedang belajar di kelas', 'Para siswa sedang belajar di kelas', 'Siswa-siswa sedang belajar di kelas'],
      correctIndex: 2,
      explanation: 'Kata "para" sudah menyatakan banyak (jamak), jadi tidak perlu mengulang "siswa-siswa" (bentuk jamak). Cukup "Para siswa" atau "Siswa-siswa" saja.',
    },
  ],

  [quizKey('Bahasa Indonesia', 'Menulis', 'Paragraf')]: [
    {
      question: 'Paragraf adalah ...',
      options: ['Kumpulan kalimat yang tidak berhubungan', 'Kumpulan kalimat yang saling berkaitan dan membentuk satu gagasan', 'Satu kalimat panjang', 'Kumpulan kata-kata acak'],
      correctIndex: 1,
      explanation: 'Paragraf adalah kumpulan kalimat yang saling berkaitan dan bersama-sama menjelaskan satu gagasan pokok.',
    },
    {
      question: 'Kalimat utama dalam paragraf biasanya berisi ...',
      options: ['Contoh-contoh', 'Gagasan pokok', 'Penjelasan rinci', 'Kesimpulan'],
      correctIndex: 1,
      explanation: 'Kalimat utama berisi gagasan pokok atau ide utama yang akan dijelaskan oleh kalimat-kalimat penjelas lainnya.',
    },
    {
      question: 'Kalimat yang berfungsi menjelaskan kalimat utama disebut ...',
      options: ['Kalimat utama', 'Kalimat penjelas', 'Kalimat tanya', 'Kalimat perintah'],
      correctIndex: 1,
      explanation: 'Kalimat penjelas berfungsi untuk menjelaskan, menguraikan, atau mendukung kalimat utama dalam sebuah paragraf.',
    },
    {
      question: 'Dalam sebuah paragraf yang baik, semua kalimat harus ...',
      options: ['Sama panjangnya', 'Berisi kata-kata sulit', 'Saling berhubungan dan padu', 'Terdiri dari 5 kata'],
      correctIndex: 2,
      explanation: 'Paragraf yang baik memiliki kohesi dan koherensi, yaitu kalimat-kalimatnya saling berhubungan secara logis dan membentuk kesatuan makna.',
    },
    {
      question: 'Jenis paragraf berdasarkan tujuan terdiri dari paragraf narasi, deskripsi, eksposisi, argumentasi, dan ...',
      options: ['Persuasi', 'Deduktif', 'Induktif', 'Campuran'],
      correctIndex: 0,
      explanation: 'Berdasarkan tujuan, paragraf terdiri dari: narasi (bercerita), deskripsi (menggambarkan), eksposisi (menjelaskan), argumentasi (meyakinkan), dan persuasi (mengajak).',
    },
  ],

  [quizKey('Bahasa Indonesia', 'Sastra', 'Puisi')]: [
    {
      question: 'Puisi adalah karya sastra yang ...',
      options: ['Berbentuk cerita panjang', 'Mengutamakan irama, rima, dan diksi yang indah', 'Berisi dialog antar tokoh', 'Menjelaskan fakta ilmiah'],
      correctIndex: 1,
      explanation: 'Puisi adalah karya sastra yang mengutamakan keindahan bahasa dengan irama, rima, diksi, dan majas untuk mengekspresikan perasaan penyair.',
    },
    {
      question: 'Rima adalah ...',
      options: ['Jumlah baris dalam puisi', 'Persamaan bunyi dalam puisi', 'Tema puisi', 'Pilihan kata dalam puisi'],
      correctIndex: 1,
      explanation: 'Rima adalah pengulangan bunyi yang berselang dalam puisi, baik di awal, tengah, maupun akhir baris.',
    },
    {
      question: 'Pilihan kata yang indah dan tepat dalam puisi disebut ...',
      options: ['Rima', 'Diksi', 'Irama', 'Majas'],
      correctIndex: 1,
      explanation: 'Diksi adalah pilihan kata yang tepat dan indah yang digunakan penyair untuk mengungkapkan gagasannya dalam puisi.',
    },
    {
      question: 'Bait puisi adalah ...',
      options: ['Satu baris dalam puisi', 'Kumpulan baris dalam puisi', 'Kata terakhir dalam puisi', 'Judul puisi'],
      correctIndex: 1,
      explanation: 'Bait adalah kumpulan baris yang membentuk satu kesatuan dalam puisi. Satu bait biasanya terdiri dari 2-8 baris.',
    },
    {
      question: 'Majas personifikasi adalah majas yang ...',
      options: ['Membandingkan dengan kata "seperti"', 'Melukiskan benda mati seolah-olah hidup', 'Mengulang kata di awal baris', 'Menggunakan kata yang bertentangan'],
      correctIndex: 1,
      explanation: 'Personifikasi adalah majas yang memberikan sifat-sifat manusia kepada benda mati, misalnya "angin berbisik" atau "mentari tersenyum".',
    },
  ],

  [quizKey('Bahasa Indonesia', 'Sastra', 'Dongeng')]: [
    {
      question: 'Dongeng adalah ...',
      options: ['Cerita nyata tentang kehidupan', 'Cerita khayalan/rakyat yang diwariskan turun-temurun', 'Laporan peristiwa aktual', 'Biografi seseorang'],
      correctIndex: 1,
      explanation: 'Dongeng adalah cerita khayalan rakyat yang diwariskan secara lisan dari generasi ke generasi, biasanya mengandung pesan moral.',
    },
    {
      question: 'Tokoh dalam dongeng yang memiliki sifat jahat disebut ...',
      options: ['Protagonis', 'Antagonis', 'Tritagonis', 'Narator'],
      correctIndex: 1,
      explanation: 'Antagonis adalah tokoh yang memiliki sifat jahat atau berlawanan dengan tokoh utama (protagonis) dalam cerita.',
    },
    {
      question: 'Amanat dalam dongeng adalah ...',
      options: ['Latar tempat cerita', 'Pesan moral yang ingin disampaikan', 'Tokoh utama cerita', 'Konflik dalam cerita'],
      correctIndex: 1,
      explanation: 'Amanat adalah pesan moral atau pelajaran berharga yang ingin disampaikan penulis dongeng kepada pembaca.',
    },
    {
      question: 'Contoh dongeng yang berasal dari Indonesia adalah ...',
      options: ['Cinderella', 'Kancil dan Buaya', 'Putri Salju', 'Pinokio'],
      correctIndex: 1,
      explanation: '"Kancil dan Buaya" adalah dongeng asli Indonesia yang mengisahkan kecerdikan Kancil. Tiga lainnya adalah dongeng asing.',
    },
    {
      question: 'Bagian dongeng yang berisi awal mula cerita disebut ...',
      options: ['Komplikasi', 'Orientasi', 'Resolusi', 'Koda'],
      correctIndex: 1,
      explanation: 'Orientasi adalah bagian awal dongeng yang memperkenalkan tokoh, latar, dan suasana cerita.',
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — IPA
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('IPA', 'Sistem Pencernaan', 'Organ Pencernaan')]: [
    {
      question: 'Organ pencernaan yang pertama kali memproses makanan adalah ...',
      options: ['Lambung', 'Mulut', 'Kerongkongan', 'Usus halus'],
      correctIndex: 1,
      explanation: 'Mulut adalah organ pertama dalam sistem pencernaan. Di dalam mulut terjadi pencernaan mekanik (dikunyah gigi) dan kimiawi (enzim amilase dalam air liur).',
    },
    {
      question: 'Enzim amilase dalam air liur berfungsi untuk mencerna ...',
      options: ['Protein', 'Lemak', 'Karbohidrat', 'Vitamin'],
      correctIndex: 2,
      explanation: 'Enzim amilase (ptialin) dalam air liur berfungsi memecah karbohidrat (amilum) menjadi gula sederhana (maltosa).',
    },
    {
      question: 'Organ yang berbentuk seperti kantong dan menghasilkan asam lambung adalah ...',
      options: ['Usus halus', 'Lambung', 'Hati', 'Pankreas'],
      correctIndex: 1,
      explanation: 'Lambung adalah organ berbentuk kantong yang menghasilkan asam lambung (HCl) untuk membunuh kuman dan enzim pepsin untuk mencerna protein.',
    },
    {
      question: 'Vili pada usus halus berfungsi untuk ...',
      options: ['Mencerna lemak', 'Memperluas permukaan penyerapan sari makanan', 'Menghancurkan bakteri', 'Membentuk vitamin K'],
      correctIndex: 1,
      explanation: 'Vili adalah jonjot-jonjot kecil pada dinding usus halus yang memperluas permukaan penyerapan sehingga penyerapan nutrisi lebih optimal.',
    },
    {
      question: 'Panjang usus halus manusia sekitar ...',
      options: ['1-2 meter', '3-4 meter', '6-7 meter', '10-12 meter'],
      correctIndex: 2,
      explanation: 'Usus halus manusia panjangnya sekitar 6-7 meter. Terdiri dari tiga bagian: duodenum (usus 12 jari), jejunum (usus kosong), dan ileum (usus penyerapan).',
    },
  ],

  [quizKey('IPA', 'Sistem Pencernaan', 'Proses Pencernaan')]: [
    {
      question: 'Setelah makanan dikunyah di mulut, makanan akan masuk ke ... melalui gerak peristaltik.',
      options: ['Lambung', 'Kerongkongan (esofagus)', 'Usus halus', 'Tenggorokan'],
      correctIndex: 1,
      explanation: 'Setelah dikunyah dan dibentuk menjadi bolus, makanan masuk ke kerongkongan (esofagus) dan didorong ke lambung melalui gerak peristaltik (gerakan meremas).',
    },
    {
      question: 'Gerak peristaltik adalah ...',
      options: ['Gerakan memotong oleh gigi', 'Gerakan meremas untuk mendorong makanan', 'Gerakan mengaduk di lambung', 'Gerakan menelan makanan'],
      correctIndex: 1,
      explanation: 'Gerak peristaltik adalah gerakan meremas-remas pada dinding kerongkongan yang mendorong makanan menuju lambung.',
    },
    {
      question: 'Bubur halus hasil pencernaan di lambung disebut ...',
      options: ['Bolus', 'Kimus', 'Feses', 'Urine'],
      correctIndex: 1,
      explanation: 'Setelah diaduk dan dicampur getah lambung selama 2-4 jam, makanan berubah menjadi bubur halus yang disebut kimus (chyme). Bolus adalah gumpalan makanan di mulut.',
    },
    {
      question: 'Penyerapan sari-sari makanan terjadi di ...',
      options: ['Lambung', 'Usus halus', 'Usus besar', 'Kerongkongan'],
      correctIndex: 1,
      explanation: 'Usus halus adalah tempat utama penyerapan sari-sari makanan. Dinding usus halus memiliki vili yang menyerap nutrisi ke aliran darah.',
    },
    {
      question: 'Feses dikeluarkan melalui anus dalam proses yang disebut ...',
      options: ['Defekasi', 'Deglutisi', 'Filtrasi', 'Reabsorpsi'],
      correctIndex: 0,
      explanation: 'Defekasi adalah proses pengeluaran feses (tinja) dari tubuh melalui anus. Deglutisi adalah proses menelan, filtrasi dan reabsorpsi adalah proses di ginjal.',
    },
  ],

  [quizKey('IPA', 'Sistem Pernapasan', 'Organ Pernapasan')]: [
    {
      question: 'Udara masuk ke tubuh melalui ...',
      options: ['Mulut saja', 'Hidung dan mulut', 'Hidung saja', 'Kulit'],
      correctIndex: 1,
      explanation: 'Udara dapat masuk melalui hidung (saluran utama) dan mulut (saluran cadangan). Udara yang melewati hidung disaring, dihangatkan, dan dilembabkan.',
    },
    {
      question: 'Alveolus berfungsi sebagai ...',
      options: ['Menyaring debu', 'Tempat pertukaran O₂ dan CO₂', 'Menghasilkan suara', 'Mengatur suhu udara'],
      correctIndex: 1,
      explanation: 'Alveolus adalah kantung udara kecil di ujung bronkiolus tempat terjadinya difusi oksigen (O₂) ke darah dan karbon dioksida (CO₂) dari darah.',
    },
    {
      question: 'Pita suara terdapat di organ ...',
      options: ['Faring', 'Laring', 'Trakea', 'Bronkus'],
      correctIndex: 1,
      explanation: 'Laring (pangkal tenggorokan) mengandung pita suara yang bergetar saat udara lewat, menghasilkan suara.',
    },
    {
      question: 'Yang bukan termasuk organ pernapasan adalah ...',
      options: ['Hidung', 'Kerongkongan', 'Trakea', 'Bronkus'],
      correctIndex: 1,
      explanation: 'Kerongkongan (esofagus) adalah bagian dari sistem pencernaan, bukan pernapasan. Kerongkongan menghubungkan mulut ke lambung.',
    },
    {
      question: 'Paru-paru kanan memiliki ... lobus.',
      options: ['2', '3', '4', '1'],
      correctIndex: 1,
      explanation: 'Paru-paru kanan memiliki 3 lobus (belahan), sedangkan paru-paru kiri memiliki 2 lobus karena terdesak oleh jantung.',
    },
  ],

  [quizKey('IPA', 'Sistem Pernapasan', 'Mekanisme Bernapas')]: [
    {
      question: 'Saat inspirasi (menghirup), otot diafragma ...',
      options: ['Relaksasi (menggembung)', 'Kontraksi (mendatar)', 'Tidak bergerak', 'Berkontraksi ke samping'],
      correctIndex: 1,
      explanation: 'Saat inspirasi, otot diafragma berkontraksi (mendatar) dan otot antar tulang rusuk mengangkat tulang rusuk, sehingga rongga dada membesar dan udara masuk.',
    },
    {
      question: 'Volume udara yang keluar masuk paru-paru saat pernapasan biasa disebut ...',
      options: ['Udara tidal', 'Udara cadangan', 'Udara residu', 'Kapasitas vital'],
      correctIndex: 0,
      explanation: 'Udara tidal (volume tidal) adalah udara yang keluar masuk paru-paru saat pernapasan normal, sekitar 500 ml.',
    },
    {
      question: 'Saat ekspirasi (menghembus), rongga dada ...',
      options: ['Membesar', 'Mengecil', 'Tetap', 'Berubah bentuk'],
      correctIndex: 1,
      explanation: 'Saat ekspirasi, otot diafragma relaksasi, otot antar tulang rusuk menurunkan tulang rusuk, sehingga rongga dada mengecil dan udara keluar.',
    },
    {
      question: 'Udara yang tidak dapat dikeluarkan dari paru-paru disebut ...',
      options: ['Udara tidal', 'Udara cadangan inspirasi', 'Udara residu', 'Udara suplementer'],
      correctIndex: 2,
      explanation: 'Udara residu adalah udara yang tersisa di paru-paru (sekitar 1000 ml) dan tidak dapat dikeluarkan, berfungsi menjaga paru-paru tetap mengembang.',
    },
    {
      question: 'Frekuensi pernapasan normal manusia dewasa adalah ... kali per menit.',
      options: ['5-10', '12-20', '25-30', '40-50'],
      correctIndex: 1,
      explanation: 'Frekuensi pernapasan normal manusia dewasa adalah 12-20 kali per menit. Bayi dan anak-anak lebih cepat, orang lanjut usia lebih lambat.',
    },
  ],

  [quizKey('IPA', 'Sistem Peredaran Darah', 'Jantung dan Pembuluh Darah')]: [
    {
      question: 'Jantung manusia terdiri dari ... ruang.',
      options: ['2', '3', '4', '5'],
      correctIndex: 2,
      explanation: 'Jantung manusia memiliki 4 ruang: serambi kanan (atrium kanan), serambi kiri (atrium kiri), bilik kanan (ventrikel kanan), dan bilik kiri (ventrikel kiri).',
    },
    {
      question: 'Pembuluh darah yang membawa darah kaya oksigen dari jantung ke seluruh tubuh adalah ...',
      options: ['Vena', 'Arteri', 'Kapiler', 'Pembuluh balik'],
      correctIndex: 1,
      explanation: 'Arteri (pembuluh nadi) membawa darah kaya oksigen dari jantung ke seluruh tubuh, kecuali arteri pulmonalis yang membawa darah kaya CO₂ ke paru-paru.',
    },
    {
      question: 'Pembuluh darah terkecil tempat pertukaran zat antara darah dan sel tubuh adalah ...',
      options: ['Arteri', 'Vena', 'Kapiler', 'Pembuluh nadi'],
      correctIndex: 2,
      explanation: 'Kapiler adalah pembuluh darah yang sangat kecil dan tipis, tempat terjadinya pertukaran oksigen, karbon dioksida, dan zat-zat lain antara darah dan sel tubuh.',
    },
    {
      question: 'Vena adalah pembuluh darah yang ...',
      options: ['Membawa darah kaya oksigen', 'Membawa darah menuju jantung', 'Membawa darah dari jantung', 'Berfungsi menyaring darah'],
      correctIndex: 1,
      explanation: 'Vena (pembuluh balik) membawa darah dari seluruh tubuh menuju jantung. Vena memiliki katup untuk mencegah aliran balik darah.',
    },
    {
      question: 'Darah kaya oksigen dipompa dari bilik kiri menuju ...',
      options: ['Paru-paru', 'Seluruh tubuh melalui aorta', 'Serambi kanan', 'Bilik kanan'],
      correctIndex: 1,
      explanation: 'Bilik kiri memompa darah kaya oksigen ke seluruh tubuh melalui pembuluh besar yang disebut aorta.',
    },
  ],

  [quizKey('IPA', 'Sistem Peredaran Darah', 'Golongan Darah')]: [
    {
      question: 'Sistem golongan darah ABO ditemukan oleh ...',
      options: ['Gregor Mendel', 'Karl Landsteiner', 'Louis Pasteur', 'Alexander Fleming'],
      correctIndex: 1,
      explanation: 'Karl Landsteiner, ilmuwan Austria, menemukan sistem golongan darah ABO pada tahun 1901 dan mendapat Hadiah Nobel pada tahun 1930.',
    },
    {
      question: 'Golongan darah yang disebut sebagai donor universal adalah ...',
      options: ['A', 'B', 'AB', 'O'],
      correctIndex: 3,
      explanation: 'Golongan darah O disebut donor universal karena tidak memiliki antigen A maupun B, sehingga dapat didonorkan ke semua golongan darah (dalam kondisi darurat).',
    },
    {
      question: 'Golongan darah yang disebut sebagai resipien universal adalah ...',
      options: ['A', 'B', 'AB', 'O'],
      correctIndex: 2,
      explanation: 'Golongan darah AB disebut resipien universal karena tidak memiliki antibodi anti-A maupun anti-B, sehingga dapat menerima darah dari semua golongan.',
    },
    {
      question: 'Seseorang bergolongan darah A, maka darahnya memiliki ...',
      options: ['Antigen A dan antibodi anti-B', 'Antigen B dan antibodi anti-A', 'Antigen A dan B, tanpa antibodi', 'Tanpa antigen, memiliki antibodi anti-A dan anti-B'],
      correctIndex: 0,
      explanation: 'Golongan darah A memiliki antigen A pada permukaan sel darah merah dan antibodi anti-B dalam plasma darah.',
    },
    {
      question: 'Golongan darah B dapat menerima darah dari donor bergolongan ...',
      options: ['A dan B', 'B dan O', 'AB dan B', 'A dan O'],
      correctIndex: 1,
      explanation: 'Golongan darah B dapat menerima darah dari golongan B dan O. Golongan A dan AB mengandung antigen yang akan ditolak oleh antibodi anti-A pada darah B.',
    },
  ],

  [quizKey('IPA', 'Tumbuhan', 'Fotosintesis')]: [
    {
      question: 'Fotosintesis adalah proses pembuatan makanan pada tumbuhan yang membutuhkan ...',
      options: ['Air, oksigen, dan karbondioksida', 'Air, karbondioksida, dan cahaya matahari', 'Oksigen, karbondioksida, dan tanah', 'Air, tanah, dan cahaya'],
      correctIndex: 1,
      explanation: 'Fotosintesis memerlukan air (H₂O), karbon dioksida (CO₂), dan cahaya matahari untuk menghasilkan glukosa (C₆H₁₂O₆) dan oksigen (O₂).',
    },
    {
      question: 'Hasil utama fotosintesis adalah ...',
      options: ['Oksigen dan air', 'Glukosa dan oksigen', 'Karbondioksida dan glukosa', 'Air dan karbondioksida'],
      correctIndex: 1,
      explanation: 'Fotosintesis menghasilkan glukosa (sebagai sumber energi dan makanan) dan oksigen (yang dilepaskan ke udara).',
    },
    {
      question: 'Fotosintesis terjadi di bagian tumbuhan yang mengandung ...',
      options: ['Akar', 'Batang', 'Daun (klorofil)', 'Bunga'],
      correctIndex: 2,
      explanation: 'Fotosintesis terutama terjadi di daun yang mengandung klorofil (zat hijau daun), tepatnya di organel sel yang disebut kloroplas.',
    },
    {
      question: 'Zat hijau daun yang berperan dalam fotosintesis disebut ...',
      options: ['Kloroplas', 'Klorofil', 'Karoten', 'Antosianin'],
      correctIndex: 1,
      explanation: 'Klorofil adalah pigmen hijau pada daun yang berfungsi menangkap energi cahaya matahari untuk digunakan dalam fotosintesis.',
    },
    {
      question: 'Reaksi fotosintesis yang benar adalah ...',
      options: ['6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O', '6O₂ + 6H₂O → C₆H₁₂O₆ + 6CO₂', 'CO₂ + H₂O → C₆H₁₂O₆ + O₂'],
      correctIndex: 0,
      explanation: 'Reaksi fotosintesis: 6 karbon dioksida + 6 air + cahaya → 1 glukosa + 6 oksigen. Reaksi kedua adalah respirasi (kebalikan fotosintesis).',
    },
  ],

  [quizKey('IPA', 'Tumbuhan', 'Perkembangbiakan Tumbuhan')]: [
    {
      question: 'Perkembangbiakan tumbuhan secara generatif terjadi melalui ...',
      options: ['Tunas', 'Bunga', 'Akar', 'Daun'],
      correctIndex: 1,
      explanation: 'Perkembangbiakan generatif adalah perkembangbiakan melalui proses penyerbukan pada bunga, yang melibatkan pertemuan sel kelamin jantan dan betina.',
    },
    {
      question: 'Alat kelamin jantan pada bunga disebut ...',
      options: ['Putik', 'Benang sari', 'Mahkota bunga', 'Kelopak bunga'],
      correctIndex: 1,
      explanation: 'Benang sari adalah alat kelamin jantan bunga yang menghasilkan serbuk sari. Putik adalah alat kelamin betina.',
    },
    {
      question: 'Contoh tumbuhan yang berkembang biak dengan tunas adalah ...',
      options: ['Pohon mangga', 'Pohon pisang', 'Pohon jambu', 'Padi'],
      correctIndex: 1,
      explanation: 'Pisang berkembang biak dengan tunas yang tumbuh dari batang di dalam tanah (rhizoma). Mangga dan jambu berkembang biak dengan biji (generatif).',
    },
    {
      question: 'Perkembangbiakan vegetatif buatan pada tumbuhan dapat dilakukan dengan cara ...',
      options: ['Penyerbukan', 'Mencangkok', 'Penyebaran biji', 'Pembuahan'],
      correctIndex: 1,
      explanation: 'Mencangkok adalah perkembangbiakan vegetatif buatan dengan mengupas kulit batang dan membungkusnya dengan tanah untuk merangsang pertumbuhan akar.',
    },
    {
      question: 'Penyerbukan adalah ...',
      options: ['Pertemuan sel telur dan sperma', 'Jatuhnya serbuk sari ke kepala putik', 'Pembentukan biji', 'Perkecambahan biji'],
      correctIndex: 1,
      explanation: 'Penyerbukan (polinasi) adalah peristiwa jatuhnya serbuk sari dari benang sari ke kepala putik. Setelah itu terjadi pembuahan (fertilisasi).',
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — IPS
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('IPS', 'Kerajaan Nusantara', 'Kerajaan Hindu-Buddha')]: [
    {
      question: 'Kerajaan Hindu tertua di Indonesia adalah Kerajaan ...',
      options: ['Sriwijaya', 'Kutai', 'Majapahit', 'Tarumanegara'],
      correctIndex: 1,
      explanation: 'Kutai adalah kerajaan Hindu tertua di Indonesia (abad ke-4 M), terletak di tepi Sungai Mahakam, Kalimantan Timur.',
    },
    {
      question: 'Kerajaan Buddha terbesar di Nusantara yang berpusat di Palembang adalah ...',
      options: ['Kutai', 'Majapahit', 'Sriwijaya', 'Tarumanegara'],
      correctIndex: 2,
      explanation: 'Sriwijaya adalah kerajaan Buddha terbesar di Nusantara yang berpusat di Palembang, Sumatera Selatan, dan menguasai jalur perdagangan Selat Malaka.',
    },
    {
      question: 'Patih Gajah Mada terkenal dengan Sumpah ...',
      options: ['Palapa', 'Pemuda', 'Satya', 'Merdeka'],
      correctIndex: 0,
      explanation: 'Gajah Mada mengucapkan Sumpah Palapa yang berisi tekad untuk menyatukan Nusantara di bawah kekuasaan Majapahit sebelum menikmati kenikmatan duniawi.',
    },
    {
      question: 'Candi Borobudur adalah peninggalan kerajaan bercorak ...',
      options: ['Hindu', 'Buddha', 'Islam', 'Kristen'],
      correctIndex: 1,
      explanation: 'Candi Borobudur di Magelang, Jawa Tengah adalah candi Buddha terbesar di dunia, dibangun oleh Dinasti Syailendra.',
    },
    {
      question: 'Teori masuknya Hindu-Buddha ke Indonesia yang menyatakan bahwa para pendeta India yang menyebarkan agama disebut teori ...',
      options: ['Ksatria', 'Waisya', 'Brahmana', 'Arus Balik'],
      correctIndex: 2,
      explanation: 'Teori Brahmana menyatakan bahwa agama Hindu dibawa oleh para pendeta (brahmana) yang diundang oleh raja-raja Indonesia untuk menyelenggarakan upacara keagamaan.',
    },
  ],

  [quizKey('IPS', 'Kerajaan Nusantara', 'Kerajaan Islam')]: [
    {
      question: 'Kerajaan Islam pertama di Indonesia adalah ...',
      options: ['Demak', 'Samudera Pasai', 'Aceh', 'Mataram Islam'],
      correctIndex: 1,
      explanation: 'Samudera Pasai (Aceh Utara) adalah kerajaan Islam pertama di Indonesia, berdiri sekitar abad ke-13 M dengan raja pertama Sultan Malik Al-Saleh.',
    },
    {
      question: 'Sultan yang membawa Aceh mencapai puncak kejayaan adalah ...',
      options: ['Sultan Agung', 'Sultan Iskandar Muda', 'Sultan Hasanuddin', 'Sultan Malik Al-Saleh'],
      correctIndex: 1,
      explanation: 'Sultan Iskandar Muda (1607-1636) membawa Kesultanan Aceh mencapai puncak kejayaan dengan armada laut yang kuat dan penguasaan perdagangan lada.',
    },
    {
      question: 'Kerajaan Islam pertama di Jawa adalah ...',
      options: ['Mataram Islam', 'Demak', 'Pajang', 'Cirebon'],
      correctIndex: 1,
      explanation: 'Demak adalah kerajaan Islam pertama di Jawa, didirikan oleh Raden Patah yang merupakan putra Raja Majapahit.',
    },
    {
      question: 'Sultan Hasanuddin dijuluki "Ayam Jantan dari Timur" karena ...',
      options: ['Peternakan ayamnya besar', 'Keberaniannya melawan VOC', 'Suaranya yang nyaring', 'Kekayaan emasnya'],
      correctIndex: 1,
      explanation: 'Sultan Hasanuddin, raja Gowa-Tallo (Makassar), dijuluki "Ayam Jantan dari Timur" karena keberaniannya melawan dominasi VOC Belanda di wilayah timur Nusantara.',
    },
    {
      question: 'Wali Songo yang menjadi penasihat Kerajaan Demak adalah ...',
      options: ['Sunan Kudus', 'Sunan Kalijaga', 'Sunan Drajat', 'Sunan Bonang'],
      correctIndex: 1,
      explanation: 'Sunan Kalijaga adalah salah satu Wali Songo yang menjadi penasihat Kerajaan Demak. Ia dikenal dengan pendekatan dakwah melalui seni dan budaya Jawa.',
    },
  ],

  [quizKey('IPS', 'Pahlawan Nasional', 'Pahlawan Kemerdekaan')]: [
    {
      question: 'Pahlawan nasional yang dikenal sebagai "Bapak Proklamator" adalah ...',
      options: ['Mohammad Hatta', 'Soekarno', 'Jenderal Soedirman', 'Ki Hajar Dewantara'],
      correctIndex: 1,
      explanation: 'Soekarno adalah salah satu proklamator kemerdekaan Indonesia bersama Mohammad Hatta. Keduanya membacakan teks proklamasi pada 17 Agustus 1945.',
    },
    {
      question: 'Pangeran Diponegoro memimpin perlawanan melawan Belanda yang dikenal dengan Perang ...',
      options: ['Diponegoro (1825-1830)', 'Padri', 'Aceh', 'Bali'],
      correctIndex: 0,
      explanation: 'Pangeran Diponegoro memimpin Perang Diponegoro (Perang Jawa) tahun 1825-1830 melawan Belanda. Ia ditangkap dengan cara licik melalui perundingan.',
    },
    {
      question: 'Tokoh pahlawan wanita yang memimpin perlawanan rakyat Aceh adalah ...',
      options: ['R.A. Kartini', 'Cut Nyak Dien', 'Dewi Sartika', 'Maria Walanda Maramis'],
      correctIndex: 1,
      explanation: 'Cut Nyak Dien adalah pahlawan nasional dari Aceh yang memimpin perlawanan gerilya melawan Belanda setelah suaminya, Teuku Umar, gugur.',
    },
    {
      question: 'Jenderal Soedirman dikenal sebagai ...',
      options: ['Pahlawan proklamasi', 'Panglima TNI pertama yang memimpin perang gerilya', 'Pendiri organisasi Budi Utomo', 'Menteri pendidikan pertama'],
      correctIndex: 1,
      explanation: 'Jenderal Soedirman adalah Panglima Besar TNI pertama. Meskipun sakit, ia memimpin perang gerilya melawan Belanda pada Agresi Militer Belanda II.',
    },
    {
      question: 'Ki Hajar Dewantara adalah pahlawan nasional di bidang ...',
      options: ['Militer', 'Pendidikan', 'Politik', 'Ekonomi'],
      correctIndex: 1,
      explanation: 'Ki Hajar Dewantara adalah pahlawan nasional di bidang pendidikan. Ia mendirikan Perguruan Taman Siswa dan dikenal dengan semboyan "Ing Ngarso Sung Tulodo".',
    },
  ],

  [quizKey('IPS', 'Pahlawan Nasional', 'Pahlawan Reformasi')]: [
    {
      question: 'Tokoh yang dianggap sebagai Bapak Reformasi adalah ...',
      options: ['B.J. Habibie', 'Gus Dur', 'Amien Rais', 'Megawati Soekarnoputri'],
      correctIndex: 0,
      explanation: 'B.J. Habibie, yang menggantikan Soeharto pada 21 Mei 1998, dijuluki "Bapak Reformasi" karena memulai era reformasi dengan kebebasan pers dan demokratisasi.',
    },
    {
      question: 'Mahasiswa yang tewas dalam Tragedi Trisakti pada 12 Mei 1998 berjumlah ...',
      options: ['2 orang', '4 orang', '6 orang', '8 orang'],
      correctIndex: 1,
      explanation: 'Empat mahasiswa Universitas Trisakti tewas tertembak saat berdemo menuntut reformasi: Elang Mulia Lesmana, Heri Hertanto, Hafidin Royan, dan Hendriawan Sie.',
    },
    {
      question: 'Salah satu tuntutan reformasi 1998 adalah ...',
      options: ['Menambah masa jabatan presiden', 'Adili Soeharto dan kroni-kroninya', 'Mengembalikan dwifungsi ABRI', 'Membatasi partai politik'],
      correctIndex: 1,
      explanation: 'Tuntutan reformasi meliputi: mengadili Soeharto, amandemen UUD 45, menghapus dwifungsi ABRI, otonomi daerah, dan pemerintahan bersih dari KKN.',
    },
    {
      question: 'Soeharto menyatakan mundur sebagai presiden pada tanggal ...',
      options: ['17 Agustus 1998', '21 Mei 1998', '1 Juni 1998', '12 Mei 1998'],
      correctIndex: 1,
      explanation: 'Soeharto menyatakan mundur pada 21 Mei 1998 pukul 09.00 WIB setelah 32 tahun berkuasa, digantikan oleh B.J. Habibie.',
    },
    {
      question: 'Gerakan reformasi 1998 bertujuan untuk ...',
      options: ['Mempertahankan status quo', 'Mengubah sistem yang tidak sesuai dengan kebutuhan masyarakat', 'Memperkuat kekuasaan presiden', 'Mengembalikan Orde Baru'],
      correctIndex: 1,
      explanation: 'Reformasi bertujuan mengubah sistem yang sudah tidak sesuai lagi, termasuk memberantas KKN, menegakkan demokrasi, dan menciptakan pemerintahan yang bersih.',
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — PPKn
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('PPKn', 'Pancasila', 'Nilai-Nilai Pancasila')]: [
    {
      question: 'Pancasila berasal dari bahasa Sansekerta. "Panca" berarti ...',
      options: ['Dasar', 'Lima', 'Negara', 'Panduan'],
      correctIndex: 1,
      explanation: '"Panca" berarti lima, dan "sila" berarti dasar atau asas. Jadi Pancasila berarti lima dasar negara.',
    },
    {
      question: 'Pancasila disahkan sebagai dasar negara pada tanggal ...',
      options: ['17 Agustus 1945', '18 Agustus 1945', '1 Juni 1945', '22 Juni 1945'],
      correctIndex: 1,
      explanation: 'Pancasila disahkan sebagai dasar negara pada tanggal 18 Agustus 1945 oleh PPKI (Panitia Persiapan Kemerdekaan Indonesia).',
    },
    {
      question: 'Menghormati teman yang berbeda agama adalah pengamalan sila ke ...',
      options: ['1', '2', '3', '4'],
      correctIndex: 0,
      explanation: 'Menghormati perbedaan agama adalah pengamalan Sila 1: Ketuhanan Yang Maha Esa, yang mengajarkan toleransi beragama.',
    },
    {
      question: 'Musyawarah untuk mencapai mufakat adalah pengamalan sila ke ...',
      options: ['2', '3', '4', '5'],
      correctIndex: 2,
      explanation: 'Sila 4: Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan, mengutamakan musyawarah dalam mengambil keputusan.',
    },
    {
      question: 'Bunyi sila ke-2 Pancasila adalah ...',
      options: ['Persatuan Indonesia', 'Kemanusiaan yang Adil dan Beradab', 'Keadilan Sosial bagi Seluruh Rakyat Indonesia', 'Ketuhanan Yang Maha Esa'],
      correctIndex: 1,
      explanation: 'Sila ke-2: "Kemanusiaan yang Adil dan Beradab" yang mengajarkan kita untuk bersikap adil dan beradab kepada sesama manusia.',
    },
  ],

  [quizKey('PPKn', 'Hak dan Kewajiban', 'Hak Anak')]: [
    {
      question: 'Hak anak adalah ...',
      options: ['Sesuatu yang harus dilakukan anak', 'Kekuasaan anak untuk menerima sesuatu yang pantas', 'Peraturan untuk anak-anak', 'Tugas anak di rumah'],
      correctIndex: 1,
      explanation: 'Hak anak adalah kekuasaan atau wewenang yang dimiliki anak untuk menerima atau melakukan sesuatu yang pantas, seperti hak hidup, pendidikan, dan perlindungan.',
    },
    {
      question: 'Setiap anak berhak mendapat pendidikan. Hak ini dijamin oleh ...',
      options: ['Undang-Undang No. 23 Tahun 2002', 'Undang-Undang No. 20 Tahun 2003', 'Peraturan Pemerintah No. 19 Tahun 2005', 'Keputusan Presiden No. 1 Tahun 2000'],
      correctIndex: 0,
      explanation: 'Hak anak di Indonesia dilindungi oleh Undang-Undang No. 23 Tahun 2002 tentang Perlindungan Anak, yang menjamin hak hidup, tumbuh kembang, perlindungan, dan partisipasi.',
    },
    {
      question: 'Contoh hak anak di sekolah adalah ...',
      options: ['Membersihkan kelas', 'Mendapat nilai yang adil', 'Menghormati guru', 'Mematuhi tata tertib'],
      correctIndex: 1,
      explanation: 'Mendapat nilai yang adil adalah hak anak di sekolah. Membersihkan kelas, menghormati guru, dan mematuhi tata tertib adalah kewajiban.',
    },
    {
      question: 'Menurut Konvensi PBB tentang Hak Anak, ada empat hak dasar anak, yaitu hak hidup, hak tumbuh kembang, hak perlindungan, dan hak ...',
      options: ['Bermain', 'Partisipasi', 'Bekerja', 'Memilih'],
      correctIndex: 1,
      explanation: 'Empat hak dasar anak menurut Konvensi PBB: hak hidup, hak tumbuh kembang, hak perlindungan, dan hak partisipasi (untuk didengar pendapatnya).',
    },
    {
      question: 'Hak anak untuk menyampaikan pendapat termasuk dalam kategori hak ...',
      options: ['Hidup', 'Tumbuh kembang', 'Perlindungan', 'Partisipasi'],
      correctIndex: 3,
      explanation: 'Hak partisipasi adalah hak anak untuk didengar pendapatnya dan berpartisipasi dalam pengambilan keputusan yang mempengaruhi kehidupannya.',
    },
  ],

  [quizKey('PPKn', 'Hak dan Kewajiban', 'Kewajiban di Sekolah')]: [
    {
      question: 'Kewajiban adalah ...',
      options: ['Sesuatu yang harus diterima', 'Sesuatu yang harus dilakukan dengan penuh tanggung jawab', 'Hak yang diterima dari orang lain', 'Kebebasan melakukan apa pun'],
      correctIndex: 1,
      explanation: 'Kewajiban adalah sesuatu yang harus dilakukan dengan penuh tanggung jawab. Berbeda dengan hak yang bisa diterima, kewajiban harus dilaksanakan.',
    },
    {
      question: 'Contoh kewajiban siswa di sekolah adalah ...',
      options: ['Mendapat perlakuan adil', 'Mengikuti pelajaran dengan tertib', 'Mendapat nilai bagus', 'Dipuji guru'],
      correctIndex: 1,
      explanation: 'Mengikuti pelajaran dengan tertib adalah kewajiban siswa. Mendapat perlakuan adil, nilai bagus, dan dipuji adalah hak yang bisa diterima siswa.',
    },
    {
      question: 'Melaksanakan piket kelas adalah contoh kewajiban siswa untuk ...',
      options: ['Menjaga nama baik sekolah', 'Menjaga kebersihan lingkungan kelas', 'Membantu guru', 'Mendapat nilai tambahan'],
      correctIndex: 1,
      explanation: 'Piket kelas adalah kewajiban siswa untuk menjaga kebersihan kelas, yang merupakan tanggung jawab bersama seluruh warga kelas.',
    },
    {
      question: 'Jika setiap siswa melaksanakan kewajibannya, maka ...',
      options: ['Sekolah menjadi tidak teratur', 'Proses belajar mengajar berjalan lancar', 'Guru tidak perlu mengajar', 'Siswa mendapat nilai otomatis'],
      correctIndex: 1,
      explanation: 'Jika semua siswa melaksanakan kewajibannya (belajar tertib, mematuhi tata tertib, menjaga kebersihan), maka proses belajar mengajar akan berjalan lancar dan nyaman.',
    },
    {
      question: 'Keseimbangan antara hak dan kewajiban penting karena ...',
      options: ['Hak lebih penting dari kewajiban', 'Kita tidak bisa menuntut hak tanpa melaksanakan kewajiban', 'Kewajiban lebih penting dari hak', 'Hak dan kewajiban tidak saling terkait'],
      correctIndex: 1,
      explanation: 'Hak dan kewajiban harus seimbang. Seseorang tidak bisa menuntut haknya jika belum melaksanakan kewajiban. Misalnya, untuk mendapat nilai (hak), siswa harus belajar (kewajiban).',
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — AGAMA
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Agama', 'Akhlak', 'Akhlak Terpuji')]: [
    {
      question: 'Akhlak terpuji disebut juga ...',
      options: ['Akhlakul mazmumah', 'Akhlakul karimah', 'Akhlak sayyiah', 'Akhlak madzmumah'],
      correctIndex: 1,
      explanation: 'Akhlakul karimah artinya akhlak yang mulia atau terpuji. Sedangkan akhlakul mazmumah adalah akhlak tercela.',
    },
    {
      question: 'Berikut ini yang termasuk akhlak terpuji adalah ...',
      options: ['Berbohong', 'Jujur', 'Mencuri', 'Berkata kasar'],
      correctIndex: 1,
      explanation: 'Jujur (berkata dan berbuat sesuai kebenaran) adalah akhlak terpuji. Berbohong, mencuri, dan berkata kasar termasuk akhlak tercela.',
    },
    {
      question: 'Rasulullah SAW bersabda bahwa beliau diutus untuk menyempurnakan ...',
      options: ['Ibadah', 'Akhlak yang mulia', 'Ilmu pengetahuan', 'Harta benda'],
      correctIndex: 1,
      explanation: 'Rasulullah SAW bersabda: "Sesungguhnya aku diutus untuk menyempurnakan akhlak yang mulia" (HR. Ahmad). Ini menunjukkan pentingnya akhlak dalam Islam.',
    },
    {
      question: 'Sikap disiplin termasuk akhlak terpuji. Contoh disiplin di sekolah adalah ...',
      options: ['Datang terlambat', 'Mengumpulkan tugas tepat waktu', 'Menyontek saat ulangan', 'Berkelahi dengan teman'],
      correctIndex: 1,
      explanation: 'Mengumpulkan tugas tepat waktu adalah contoh sikap disiplin. Disiplin berarti patuh dan taat pada aturan serta melaksanakan kewajiban tepat waktu.',
    },
    {
      question: 'Hormat kepada orang tua termasuk akhlak terpuji karena ...',
      options: ['Orang tua kaya', 'Orang tua telah merawat dan membesarkan kita', 'Orang tua sempurna', 'Anak wajib menurut apa pun'],
      correctIndex: 1,
      explanation: 'Kita wajib menghormati orang tua karena mereka telah merawat, mendidik, dan membesarkan kita dengan penuh kasih sayang. Islam memerintahkan berbakti kepada orang tua.',
    },
  ],

  [quizKey('Agama', 'Akhlak', 'Akhlak Tercela')]: [
    {
      question: 'Akhlak tercela disebut juga ...',
      options: ['Akhlakul karimah', 'Akhlakul mazmumah', 'Akhlak mahmudah', 'Akhlak hasanah'],
      correctIndex: 1,
      explanation: 'Akhlakul mazmumah artinya akhlak yang tercela atau buruk. Contohnya: berbohong, iri hati, sombong, dan dengki.',
    },
    {
      question: 'Berikut ini yang termasuk akhlak tercela adalah ...',
      options: ['Sabar', 'Pemaaf', 'Sombong', 'Dermawan'],
      correctIndex: 2,
      explanation: 'Sombong (takabur) termasuk akhlak tercela, yaitu merasa diri lebih hebat dari orang lain. Sabar, pemaaf, dan dermawan termasuk akhlak terpuji.',
    },
    {
      question: 'Rasa iri hati kepada keberhasilan orang lain termasuk akhlak tercela yang disebut ...',
      options: ['Takabur', 'Hasad (dengki)', 'Ghibah', 'Namimah'],
      correctIndex: 1,
      explanation: 'Hasad (dengki/iri hati) adalah perasaan tidak senang melihat orang lain mendapat nikmat dan berharap nikmat itu hilang darinya.',
    },
    {
      question: 'Menyebarkan berita bohong termasuk akhlak tercela yang disebut ...',
      options: ['Fitnah', 'Ghibah', 'Namimah', 'Takabur'],
      correctIndex: 0,
      explanation: 'Fitnah adalah menyebarkan berita bohong untuk menjelekkan seseorang. Islam melarang keras perbuatan fitnah karena dampaknya sangat merusak.',
    },
    {
      question: 'Cara menghindari akhlak tercela adalah ...',
      options: ['Berteman dengan siapa pun tanpa seleksi', 'Memperbanyak ibadah dan berdzikir', 'Membalas kejahatan dengan kejahatan', 'Mementingkan diri sendiri'],
      correctIndex: 1,
      explanation: 'Memperbanyak ibadah dan berdzikir dapat mendekatkan diri kepada Allah dan membantu menjauhi perilaku tercela. Iman yang kuat mencegah perbuatan buruk.',
    },
  ],

  [quizKey('Agama', 'Ibadah', 'Shalat')]: [
    {
      question: 'Shalat adalah ibadah yang dimulai dengan takbiratul ihram dan diakhiri dengan ...',
      options: ['Rukuk', 'Salam', 'Sujud', 'Doa'],
      correctIndex: 1,
      explanation: 'Shalat dimulai dengan takbiratul ihram dan diakhiri dengan salam ke kanan dan ke kiri.',
    },
    {
      question: 'Jumlah rakaat shalat Isya adalah ...',
      options: ['3', '2', '4', '5'],
      correctIndex: 2,
      explanation: 'Shalat Isya berjumlah 4 rakaat. Subuh (2 rakaat), Maghrib (3 rakaat), Dzuhur dan Ashar (4 rakaat).',
    },
    {
      question: 'Syarat sah shalat yang berkaitan dengan badan adalah ...',
      options: ['Menghadap kiblat', 'Suci dari hadas kecil dan besar', 'Berakal sehat', 'Masuk waktu shalat'],
      correctIndex: 1,
      explanation: 'Syarat sah shalat: suci dari hadas kecil dan besar, suci badan/pakaian/tempat, menutup aurat, menghadap kiblat, dan masuk waktu shalat. Suci dari hadas berkaitan dengan wudhu dan mandi wajib.',
    },
    {
      question: 'Rukun shalat yang pertama adalah ...',
      options: ['Takbiratul ihram', 'Niat', 'Membaca Al-Fatihah', 'Berdiri bagi yang mampu'],
      correctIndex: 1,
      explanation: 'Niat adalah rukun shalat yang pertama. Niat dilakukan di dalam hati bersamaan dengan takbiratul ihram. "Ushalli..." adalah bacaan niat.',
    },
    {
      question: 'Shalat sunnah yang dikerjakan pada malam hari raya Idul Fitri dan Idul Adha adalah shalat ...',
      options: ['Tahajud', 'Tarawih', 'Tasbih', 'Hajat'],
      correctIndex: 1,
      explanation: 'Shalat Tarawih adalah shalat sunnah yang dikerjakan pada malam hari selama bulan Ramadhan. Shalat Idul Fitri dan Idul Adha dikerjakan pada pagi hari raya.',
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  //  SD/5 — SENI BUDAYA & PJOK
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Seni Budaya', 'Seni Rupa', 'Menggambar')]: [
    {
      question: 'Menggambar bentuk dilakukan dengan cara ...',
      options: ['Mengkhayal tanpa melihat objek', 'Mengamati objek nyata lalu menggambarnya', 'Menjiplak gambar orang lain', 'Membuat pola abstrak'],
      correctIndex: 1,
      explanation: 'Menggambar bentuk (menggambar model) adalah kegiatan menggambar dengan mengamati objek nyata secara langsung, memperhatikan proporsi, bentuk, dan detailnya.',
    },
    {
      question: 'Alat yang cocok untuk menggambar dengan teknik basah adalah ...',
      options: ['Pensil', 'Cat air', 'Kapur', 'Arang'],
      correctIndex: 1,
      explanation: 'Cat air menggunakan air sebagai pelarut, sehingga termasuk teknik basah. Pensil, kapur, dan arang termasuk teknik kering.',
    },
    {
      question: 'Perbandingan ukuran antar bagian objek dalam menggambar disebut ...',
      options: ['Proporsi', 'Komposisi', 'Keseimbangan', 'Irama'],
      correctIndex: 0,
      explanation: 'Proporsi adalah perbandingan ukuran antar bagian dalam suatu objek atau antar objek dalam suatu gambar agar terlihat wajar dan realistis.',
    },
    {
      question: 'Prinsip menggambar yang mengatur tata letak agar harmonis disebut ...',
      options: ['Proporsi', 'Komposisi', 'Gelap terang', 'Tekstur'],
      correctIndex: 1,
      explanation: 'Komposisi adalah prinsip mengatur tata letak objek dalam gambar sehingga menghasilkan kesan harmonis dan seimbang.',
    },
    {
      question: 'Pensil dengan kode B (Black) menghasilkan garis yang ...',
      options: ['Tipis dan keras', 'Tebal dan lunak', 'Sedang', 'Berwarna'],
      correctIndex: 1,
      explanation: 'Pensil kode B (Black) memiliki grafit yang lebih lunak sehingga menghasilkan garis yang tebal dan gelap, cocok untuk membuat bayangan.',
    },
  ],

  [quizKey('Seni Budaya', 'Seni Musik', 'Alat Musik Daerah')]: [
    {
      question: 'Angklung adalah alat musik tradisional dari ...',
      options: ['Jawa Tengah', 'Jawa Barat', 'Bali', 'Sumatera Barat'],
      correctIndex: 1,
      explanation: 'Angklung berasal dari Jawa Barat (Sunda). Alat musik ini terbuat dari bambu dan dimainkan dengan cara digoyangkan.',
    },
    {
      question: 'Gamelan adalah alat musik tradisional yang dimainkan dengan cara ...',
      options: ['Digoyangkan', 'Dipukul', 'Ditiup', 'Dipetik'],
      correctIndex: 1,
      explanation: 'Gamelan adalah ensambel alat musik tradisional Jawa yang dimainkan dengan cara dipukul menggunakan pemukul khusus.',
    },
    {
      question: 'Tifa adalah alat musik tradisional dari ...',
      options: ['Jawa Timur', 'Papua dan Maluku', 'Kalimantan', 'Sulawesi'],
      correctIndex: 1,
      explanation: 'Tifa adalah alat musik pukul (seperti gendang) yang berasal dari Papua dan Maluku, terbuat dari kayu dengan selaput kulit hewan.',
    },
    {
      question: 'Sasando adalah alat musik petik tradisional dari ...',
      options: ['Nusa Tenggara Timur', 'Aceh', 'Sumatera Utara', 'Kalimantan Selatan'],
      correctIndex: 0,
      explanation: 'Sasando adalah alat musik petik tradisional dari Rote, Nusa Tenggara Timur. Alat musik ini terbuat dari bambu dan daun lontar.',
    },
    {
      question: 'Alat musik Suling dimainkan dengan cara ...',
      options: ['Dipetik', 'Ditiup', 'Dipukul', 'Digesek'],
      correctIndex: 1,
      explanation: 'Suling adalah alat musik tiup yang terbuat dari bambu. Suara dihasilkan dengan meniupkan udara ke lubang tiupan dan mengatur nada dengan jari pada lubang nada.',
    },
  ],

  [quizKey('PJOK', 'Olahraga', 'Permainan Bola Besar')]: [
    {
      question: 'Jumlah pemain sepak bola dalam satu tim adalah ...',
      options: ['9 orang', '10 orang', '11 orang', '12 orang'],
      correctIndex: 2,
      explanation: 'Sepak bola dimainkan oleh 11 pemain per tim, termasuk satu penjaga gawang (kiper).',
    },
    {
      question: 'Dalam permainan bola voli, satu tim terdiri dari ... pemain inti.',
      options: ['4 orang', '5 orang', '6 orang', '7 orang'],
      correctIndex: 2,
      explanation: 'Bola voli dimainkan oleh 6 pemain inti per tim. Permainan ini bertujuan memukul bola melewati net ke area lawan.',
    },
    {
      question: 'Tujuan utama permainan bola basket adalah ...',
      options: ['Menendang bola ke gawang', 'Memasukkan bola ke ring lawan', 'Memukul bola melewati net', 'Menjaga bola tetap di udara'],
      correctIndex: 1,
      explanation: 'Tujuan bola basket adalah memasukkan bola ke dalam ring (keranjang) lawan sebanyak-banyaknya sambil mencegah lawan memasukkan bola ke ring sendiri.',
    },
    {
      question: 'Teknik mengoper bola dalam sepak bola dengan menggunakan kaki bagian dalam bertujuan ...',
      options: ['Mengoper jauh', 'Mengoper pendek dengan akurat', 'Menendang keras ke gawang', 'Mengoper dengan melambung'],
      correctIndex: 1,
      explanation: 'Mengoper (passing) dengan kaki bagian dalam menghasilkan operan pendek yang akurat karena bidang kontak kaki dengan bola lebih luas.',
    },
    {
      question: 'Manfaat bermain olahraga bola besar secara rutin adalah ...',
      options: ['Menyebabkan cedera', 'Melatih kekuatan otot dan kerja sama tim', 'Membuat tubuh cepat lelah', 'Menurunkan kebugaran'],
      correctIndex: 1,
      explanation: 'Bermain olahraga bola besar seperti sepak bola, voli, dan basket dapat melatih kekuatan otot, meningkatkan kebugaran jantung, dan mengembangkan kerja sama tim.',
    },
  ],

  [quizKey('PJOK', 'Kebugaran', 'Latihan Kelenturan')]: [
    {
      question: 'Latihan kelenturan (fleksibilitas) bertujuan untuk ...',
      options: ['Menambah tinggi badan', 'Melatih keluwesan sendi dan otot', 'Menambah berat badan', 'Mempercepat lari'],
      correctIndex: 1,
      explanation: 'Latihan kelenturan bertujuan melatih keluwesan atau fleksibilitas sendi dan otot agar gerakan tubuh lebih leluasa dan mengurangi risiko cedera.',
    },
    {
      question: 'Gerakan duduk dengan kaki lurus lalu membungkukkan badan ke depan adalah latihan kelenturan ...',
      options: ['Otot lengan', 'Otot punggung dan hamstring', 'Otot perut', 'Otot leher'],
      correctIndex: 1,
      explanation: 'Latihan membungkukkan badan ke depan dari posisi duduk dengan kaki lurus meregangkan otot punggung bawah dan hamstring (paha belakang).',
    },
    {
      question: 'Latihan kelenturan sebaiknya dilakukan ...',
      options: ['Sebelum olahraga (pemanasan)', 'Setelah olahraga (pendinginan)', 'Keduanya (pemanasan dan pendinginan)', 'Hanya saat cedera'],
      correctIndex: 2,
      explanation: 'Latihan kelenturan (stretching) sebaiknya dilakukan saat pemanasan (untuk menyiapkan otot) dan saat pendinginan (untuk mengembalikan otot ke kondisi normal).',
    },
    {
      question: 'Gerakan memutar kepala ke kanan dan ke kiri melatih kelenturan ...',
      options: ['Otot bahu', 'Otot leher', 'Otot lengan', 'Otot punggung'],
      correctIndex: 1,
      explanation: 'Memutar kepala melatih kelenturan otot-otot leher, membantu mengurangi kekakuan di area leher dan pundak.',
    },
    {
      question: 'Prinsip latihan kelenturan yang benar adalah ...',
      options: ['Dilakukan dengan gerakan menyentak', 'Dilakukan perlahan dan bertahap tanpa memaksa', 'Dilakukan sekuat tenaga', 'Hanya dilakukan 1 detik'],
      correctIndex: 1,
      explanation: 'Latihan kelenturan harus dilakukan secara perlahan, bertahap, dan tidak memaksa. Gerakan menyentak justru berisiko menyebabkan cedera otot.',
    },
  ],
};

export default QUIZ_MAP;
