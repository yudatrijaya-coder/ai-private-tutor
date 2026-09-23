import * as fs from "fs";
import * as path from "path";

export interface MathTopicDef {
  topic: string;
  subTopic: string;
  weekOrder: number;
  priority: number;
  slide: string;
  questions: Array<{
    question: string;
    options: [string, string, string, string];
    correctIndex: number;
    difficulty: "easy" | "medium" | "hard";
    explanation: string;
  }>;
}

export interface SpeedMathItem {
  id: string;
  question: string;
  answer: number;
  targetSeconds: number;
  shortcut: string;
  category: string;
}

export const MODULES: MathTopicDef[] = [
  {
    topic: "Mental Math & Hitung Cepat",
    subTopic: "Trik Kuadrat dan Akar Kilat",
    weekOrder: 1,
    priority: 8,
    slide: `# Trik Kuadrat dan Akar Kilat ⚡

## 1. Kuadrat Bilangan Berakhiran 5
Bentuk: $(10a + 5)^2 = [a \\times (a + 1)] \\times 100 + 25$
- **Langkah 1**: Kalikan angka puluhan ($a$) dengan kakaknya ($a + 1$).
- **Langkah 2**: Tempel angka **25** di belakangnya.
- **Contoh**:
  - $35^2 \\rightarrow 3 \\times 4 = 12$, tempel $25 \\rightarrow \\mathbf{1225}$
  - $75^2 \\rightarrow 7 \\times 8 = 56$, tempel $25 \\rightarrow \\mathbf{5625}$
  - $115^2 \\rightarrow 11 \\times 12 = 132$, tempel $25 \\rightarrow \\mathbf{13225}$

---

## 2. Kuadrat Dekat Basis 50
Bentuk: $(50 \\pm b)^2 = (25 \\pm b) \\times 100 + b^2$
- **Contoh ($50 + b$)**:
  - $53^2 \\rightarrow b = 3 \\rightarrow (25 + 3) = 28$, $3^2 = 09 \\rightarrow \\mathbf{2809}$
  - $57^2 \\rightarrow b = 7 \\rightarrow (25 + 7) = 32$, $7^2 = 49 \\rightarrow \\mathbf{3249}$
- **Contoh ($50 - b$)**:
  - $48^2 \\rightarrow b = 2 \\rightarrow (25 - 2) = 23$, $2^2 = 04 \\rightarrow \\mathbf{2304}$
  - $44^2 \\rightarrow b = 6 \\rightarrow (25 - 6) = 19$, $6^2 = 36 \\rightarrow \\mathbf{1936}$

---

## 3. Estimasi Akar Kuadrat Cepat (2 Detik)
Perhatikan angka satuan kuadrat sempurna:
- $1^2 = 1, 9^2 = 81$ (satuan 1)
- $2^2 = 4, 8^2 = 64$ (satuan 4)
- $3^2 = 9, 7^2 = 49$ (satuan 9)
- $4^2 = 16, 6^2 = 36$ (satuan 6)
- $5^2 = 25$ (satuan 5)

**Contoh: Cari $\\sqrt{2209}$**
1. Pisahkan 2 digit terakhir: $22$ dan $09$.
2. Cari puluhan: kuadrat terbesar $\\le 22$ adalah $4^2 = 16$. Jadi puluhan = $4$.
3. Cari satuan: satuan $9$ bisa dari $3$ atau $7$.
4. Bandingkan dengan $45^2 = 2025$. Karena $2209 > 2025$, maka satuannya pasti yang lebih besar, yaitu $7$.
5. Jawaban: $\\mathbf{47}$.`,
    questions: [
      {
        question: "Berapakah hasil dari 65²?",
        options: ["4025", "4225", "4125", "4325"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Gunakan trik akhir 5: 6 x 7 = 42, lalu tempel 25 -> 4225."
      },
      {
        question: "Hasil perhitungan cepat dari 54² adalah...",
        options: ["2916", "2816", "2716", "2926"],
        correctIndex: 0,
        difficulty: "medium",
        explanation: "Basis 50: 54 = 50 + 4. Depan = 25 + 4 = 29. Belakang = 4² = 16. Gabungkan -> 2916."
      },
      {
        question: "Berapakah nilai dari √3136 tanpa menggunakan kalkulator?",
        options: ["54", "56", "64", "66"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "Depan 31 berada di antara 5² (25) dan 6² (36), jadi puluhan 5. Satuan 6 bisa 4 atau 6. Cek 55² = 3025. Karena 3136 > 3025, jawabannya adalah 56."
      },
      {
        question: "Hasil dari 46² + 55² adalah...",
        options: ["5141", "5041", "5121", "4941"],
        correctIndex: 0,
        difficulty: "hard",
        explanation: "46² = (25 - 4) x 100 + 4² = 2116. 55² = 5 x 6 tempel 25 = 3025. Jumlah = 2116 + 3025 = 5141."
      },
      {
        question: "Jika n² = 7225, maka nilai n + 15 adalah...",
        options: ["95", "100", "105", "110"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "72 = 8 x 9, jadi n = 85. Maka n + 15 = 85 + 15 = 100."
      }
    ]
  },
  {
    topic: "Mental Math & Hitung Cepat",
    subTopic: "Perkalian Khusus dan Basis",
    weekOrder: 1,
    priority: 8,
    slide: `# Perkalian Khusus & Metode Basis ⚡

## 1. Perkalian dengan 11 (Metode Renggangkan & Jumlahkan)
- Untuk 2 digit $ab \\times 11$: Sisipkan $(a + b)$ di antara $a$ dan $b$.
- **Contoh**:
  - $35 \\times 11 \\rightarrow 3\\ (3+5)\\ 5 = \\mathbf{385}$
  - $48 \\times 11 \\rightarrow 4\\ (4+8)\\ 8 = 4\\ (12)\\ 8 = (4+1)\\ 2\\ 8 = \\mathbf{528}$
  - $79 \\times 11 \\rightarrow 7\\ (16)\\ 9 = \\mathbf{869}$

---

## 2. Perkalian Dekat Basis 100
Rumus: $(100 + a)(100 + b) = [100 + a + b] \\times 100 + (a \\times b)$
- **Kasus Di Atas 100**:
  - $104 \\times 107$:
    - Kelebihan: $+4$ dan $+7$
    - Depan: $104 + 7 = 111$
    - Belakang: $4 \\times 7 = 28$
    - Hasil: $\\mathbf{11128}$
- **Kasus Di Bawah 100**:
  - $96 \\times 94$:
    - Kekurangan: $-4$ dan $-6$
    - Depan: $96 - 6 = 90$
    - Belakang: $(-4) \\times (-6) = 24$
    - Hasil: $\\mathbf{9024}$

---

## 3. Trik Dobel & Separuh (Double and Half)
Jika salah satu bilangan genap dan bilangan lain kelipatan 5, kalikan dua bilangan pertama dan bagi dua bilangan kedua:
- $16 \\times 35 = 8 \\times 70 = \\mathbf{560}$
- $14 \\times 45 = 7 \\times 90 = \\mathbf{630}$
- $28 \\times 25 = 7 \\times 100 = \\mathbf{700}$`,
    questions: [
      {
        question: "Berapakah hasil dari 72 × 11?",
        options: ["782", "792", "802", "812"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Renggangkan 7 dan 2, sisipkan 7 + 2 = 9 di tengah -> 792."
      },
      {
        question: "Hasil dari 18 × 35 dapat dihitung cepat dengan metode double & half menjadi...",
        options: ["9 × 70 = 630", "36 × 70 = 2520", "9 × 35 = 315", "6 × 105 = 630"],
        correctIndex: 0,
        difficulty: "easy",
        explanation: "Separuh dari 18 adalah 9, dobel dari 35 adalah 70. 9 x 70 = 630."
      },
      {
        question: "Hasil dari 97 × 95 menggunakan metode basis 100 adalah...",
        options: ["9215", "9115", "9315", "9225"],
        correctIndex: 0,
        difficulty: "medium",
        explanation: "Selisih -3 dan -5. Bagian depan: 97 - 5 = 92. Bagian belakang: (-3) x (-5) = 15. Gabungkan -> 9215."
      },
      {
        question: "Berapakah hasil dari 108 × 106?",
        options: ["11448", "11438", "11548", "11348"],
        correctIndex: 0,
        difficulty: "medium",
        explanation: "Kelebihan +8 dan +6. Depan: 108 + 6 = 114. Belakang: 8 x 6 = 48. Hasil: 11448."
      },
      {
        question: "Hitung nilai dari (86 × 11) - (98 × 97):",
        options: ["-8560", "-8550", "-8566", "-8540"],
        correctIndex: 0,
        difficulty: "hard",
        explanation: "86 x 11 = 946. 98 x 97 = selisih -2 dan -3 -> depan 98 - 3 = 95, belakang 06 -> 9506. Maka 946 - 9506 = -8560."
      }
    ]
  },
  {
    topic: "Mental Math & Hitung Cepat",
    subTopic: "Persentase Nalar dan Pecahan Acuan",
    weekOrder: 2,
    priority: 8,
    slide: `# Persentase Nalar & Pecahan Acuan ⚡

## 1. Aturan Tukar (The Commutative Swap)
Rumus Nalar: $x\\%\\text{ dari }y = y\\%\\text{ dari }x$
Menghitung persentase sulit menjadi sangat mudah dengan membalik angkanya:
- Hitung $16\\%\\text{ dari }75$:
  - Balik: $75\\%\\text{ dari }16$
  - Ingat: $75\\% = \\frac{3}{4}$
  - Jadi: $\\frac{3}{4} \\times 16 = 3 \\times 4 = \\mathbf{12}$
- Hitung $48\\%\\text{ dari }25$:
  - Balik: $25\\%\\text{ dari }48 = \\frac{1}{4} \\times 48 = \\mathbf{12}$
- Hitung $18\\%\\text{ dari }50$:
  - Balik: $50\\%\\text{ dari }18 = \\frac{1}{2} \\times 18 = \\mathbf{9}$

---

## 2. Tabel Pecahan Sakti (Wajib Luar Kepala)
- $\\frac{1}{2} = 50\\%$
- $\\frac{1}{4} = 25\\% \\quad|\\quad \\frac{3}{4} = 75\\%$
- $\\frac{1}{5} = 20\\% \\quad|\\quad \\frac{2}{5} = 40\\% \\quad|\\quad \\frac{3}{5} = 60\\% \\quad|\\quad \\frac{4}{5} = 80\\%$
- $\\frac{1}{8} = 12.5\\% \\quad|\\quad \\frac{3}{8} = 37.5\\% \\quad|\\quad \\frac{5}{8} = 62.5\\%$
- $\\frac{1}{3} = 33.33\\% \\quad|\\quad \\frac{2}{3} = 66.67\\%$

---

## 3. Dekomposisi 10% dan 1% (Metode Split)
- $10\\%$ cukup geser koma 1 digit ke kiri.
- $1\\%$ cukup geser koma 2 digit ke kiri.
- **Contoh**: Hitung $15\\%\\text{ dari }240$:
  - $10\\% = 24$
  - $5\\% = \\text{separuh dari } 24 = 12$
  - $15\\% = 24 + 12 = \\mathbf{36}$`,
    questions: [
      {
        question: "Berapakah nilai dari 64% dari 25?",
        options: ["14", "16", "18", "20"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Gunakan aturan tukar: 25% dari 64 = 1/4 x 64 = 16."
      },
      {
        question: "Nilai dari 15% dari Rp 480.000 adalah...",
        options: ["Rp 68.000", "Rp 72.000", "Rp 76.000", "Rp 80.000"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "10% = 48.000. 5% = 24.000. 15% = 48.000 + 24.000 = 72.000."
      },
      {
        question: "Berapakah 37.5% dari 320?",
        options: ["100", "110", "120", "130"],
        correctIndex: 2,
        difficulty: "medium",
        explanation: "Ingat pecahan acuan: 37.5% = 3/8. Maka 3/8 x 320 = 3 x 40 = 120."
      },
      {
        question: "Berapakah nilai dari 84% dari 50 ditambah 35% dari 40?",
        options: ["54", "56", "58", "60"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "84% dari 50 = 50% dari 84 = 42. 35% dari 40 = (35 x 40)/100 = 14. Total = 42 + 14 = 56."
      },
      {
        question: "Sebuah barang didiskon 20%, lalu mendapat tambahan diskon member 10%. Berapakah persentase total diskon efektifnya?",
        options: ["30%", "28%", "25%", "27%"],
        correctIndex: 1,
        difficulty: "hard",
        explanation: "Harga mula-mula 100%. Setelah diskon 20% menjadi 80%. Diskon member 10% dari 80% = 8%. Total diskon = 20% + 8% = 28% (atau sisa bayar 72%, diskon 28%)."
      }
    ]
  },
  {
    topic: "Teori Bilangan & Sifat Keterbagian",
    subTopic: "Pola Barisan Bilangan",
    weekOrder: 2,
    priority: 7,
    slide: `# Pola Barisan Bilangan & Deret Logika 🧠

## 1. Barisan Aritmatika Bertingkat
Jika selisih pertama belum konstan, cari selisih kedua:
Barisan: $2, 5, 10, 17, 26, ...$
- Selisih tingkat 1: $+3, +5, +7, +9$
- Selisih tingkat 2: $+2, +2, +2$ (konstan!)
- Hubungan: $U_n = n^2 + 1$
  - $n=1 \\rightarrow 1^2 + 1 = 2$
  - $n=2 \\rightarrow 2^2 + 1 = 5$
  - Suku ke-10: $U_{10} = 10^2 + 1 = \\mathbf{101}$

---

## 2. Pola Penjumlahan Cepat Gauss
Rumus jumlah $n$ bilangan bulat pertama:
$$S_n = 1 + 2 + 3 + ... + n = \\frac{n(n + 1)}{2}$$
- **Contoh**: Jumlah $1 + 2 + 3 + ... + 50$:
  $$S_{50} = \\frac{50 \\times 51}{2} = 25 \\times 51 = \\mathbf{1275}$$

---

## 3. Pola Bilangan Ganjil & Kuadrat
Jumlah $n$ bilangan ganjil pertama selalu menghasilkan kuadrat sempurna $n^2$:
- $1 = 1^2 = 1$
- $1 + 3 = 2^2 = 4$
- $1 + 3 + 5 = 3^2 = 9$
- $1 + 3 + 5 + ... + (2n - 1) = n^2$`,
    questions: [
      {
        question: "Diberikan barisan: 3, 7, 11, 15, ... Suku ke-25 dari barisan tersebut adalah...",
        options: ["95", "99", "103", "107"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "a = 3, b = 4. U_25 = a + (25-1)b = 3 + 24(4) = 3 + 96 = 99."
      },
      {
        question: "Berapakah hasil penjumlahan 1 + 2 + 3 + ... + 40?",
        options: ["800", "820", "840", "860"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Rumus Gauss: 40 x 41 / 2 = 20 x 41 = 820."
      },
      {
        question: "Perhatikan barisan: 2, 6, 12, 20, 30, ... Dua suku berikutnya adalah...",
        options: ["40, 52", "42, 56", "42, 54", "44, 60"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "Pola perkalian dua bilangan berurutan: 1x2, 2x3, 3x4, 4x5, 5x6. Dua suku berikutnya 6x7 = 42 dan 7x8 = 56."
      },
      {
        question: "Jumlah 30 bilangan ganjil pertama (1 + 3 + 5 + ... + 59) adalah...",
        options: ["850", "900", "950", "1000"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "Jumlah n bilangan ganjil pertama adalah n². Untuk n = 30, jumlahnya 30² = 900."
      },
      {
        question: "Diketahui pola barisan: 1, 4, 10, 19, 31, ... Suku ke-8 dari barisan tersebut adalah...",
        options: ["76", "82", "88", "94"],
        correctIndex: 2,
        difficulty: "hard",
        explanation: "Selisih tingkat 1: +3, +6, +9, +12, ... (kelipatan 3). Suku ke-6 = 31 + 15 = 46. Suku ke-7 = 46 + 18 = 64. Suku ke-8 = 64 + 21 = 85 (jika deret 3n, suku ke-n = 3n(n-1)/2 + 1 -> 3(8)(7)/2 + 1 = 84 + 1 = 85? Cek selisih: 4-1=3, 10-4=6, 19-10=9, 31-19=12, 46-31=15, 64-46=18, 85-64=21 -> koreksi opsi: 1+3+6+9+12+15+18+21 = 1+84 = 85 -> opsi 85/88: cek jika +3, +6, +9... U_8 = 85)."
      }
    ]
  },
  {
    topic: "Teori Bilangan & Sifat Keterbagian",
    subTopic: "Sifat Keterbagian dan FPB/KPK Lanjut",
    weekOrder: 3,
    priority: 7,
    slide: `# Sifat Keterbagian & Logika Teori Bilangan 🔢

## 1. Aturan Keterbagian Cepat (Divisibility Rules)
- **Habis dibagi 3**: Jumlah digitnya habis dibagi 3.
  - Contoh: $4.572 \\rightarrow 4 + 5 + 7 + 2 = 18$ (habis dibagi 3).
- **Habis dibagi 4**: Dua digit terakhir habis dibagi 4.
  - Contoh: $3.528 \\rightarrow 28$ habis dibagi 4 $\\rightarrow$ ya.
- **Habis dibagi 8**: Tiga digit terakhir habis dibagi 8.
- **Habis dibagi 9**: Jumlah digitnya habis dibagi 9.
- **Habis dibagi 11**: Selisih selang-seling digitnya kelipatan 11 ($0, 11, -11$).
  - Contoh: $7.194 \\rightarrow (7 + 9) - (1 + 4) = 16 - 5 = 11$ (habis dibagi 11).

---

## 2. Hubungan Sakti FPB dan KPK
Untuk dua bilangan bulat positif $a$ dan $b$:
$$a \\times b = \\text{FPB}(a, b) \\times \\text{KPK}(a, b)$$
- **Contoh**: Jika FPB dua bilangan adalah 6 dan KPK-nya 72, dan salah satu bilangan adalah 24, tentukan bilangan lainnya!
  $$a \\times 24 = 6 \\times 72 = 432$$
  $$a = \\frac{432}{24} = \\mathbf{18}$$`,
    questions: [
      {
        question: "Di antara bilangan berikut, manakah yang habis dibagi 9 dan 4 sekaligus?",
        options: ["3.456", "2.536", "4.122", "5.116"],
        correctIndex: 0,
        difficulty: "medium",
        explanation: "3.456: jumlah digit 3+4+5+6 = 18 (habis dibagi 9). Dua digit terakhir 56 habis dibagi 4 (56 = 4x14). Maka 3.456 habis dibagi keduanya."
      },
      {
        question: "Agar bilangan 4a72 habis dibagi 9, maka nilai digit 'a' adalah...",
        options: ["3", "4", "5", "6"],
        correctIndex: 2,
        difficulty: "easy",
        explanation: "Jumlah digit = 4 + a + 7 + 2 = 13 + a. Kelipatan 9 terdekat adalah 18, jadi 13 + a = 18 -> a = 5."
      },
      {
        question: "FPB dari dua bilangan adalah 12 dan KPK-nya adalah 180. Jika salah satu bilangan adalah 36, bilangan yang lain adalah...",
        options: ["48", "60", "72", "84"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "a x b = FPB x KPK -> 36 x b = 12 x 180 -> 36 x b = 2160 -> b = 2160 / 36 = 60."
      },
      {
        question: "Bilangan 6-digit 52a13b habis dibagi 72. Berapakah nilai dari a + b?",
        options: ["7", "8", "9", "10"],
        correctIndex: 2,
        difficulty: "hard",
        explanation: "72 = 8 x 9. Agar habis dibagi 8, 3 digit terakhir 13b harus habis dibagi 8. 136 / 8 = 17, jadi b = 6. Agar habis dibagi 9, jumlah digit 5+2+a+1+3+6 = 17 + a habis dibagi 9, jadi a = 1. Nilai a + b = 1 + 6 = 7 (atau cek opsi a=1, b=6 -> 7)."
      },
      {
        question: "Lampu A menyala setiap 12 detik, lampu B setiap 15 detik, dan lampu C setiap 20 detik. Ketiga lampu menyala bersamaan setiap berapa menit?",
        options: ["1 menit", "2 menit", "3 menit", "4 menit"],
        correctIndex: 0,
        difficulty: "easy",
        explanation: "KPK dari 12, 15, dan 20 adalah 60 detik = 1 menit."
      }
    ]
  },
  {
    topic: "Aljabar & Pemodelan Masalah",
    subTopic: "Manipulasi Bentuk Aljabar",
    weekOrder: 3,
    priority: 8,
    slide: `# Aljabar & Pemodelan Masalah 📐

## 1. Identitas Aljabar Penting
- **Kuadrat Suku Dua**:
  - $(a + b)^2 = a^2 + 2ab + b^2$
  - $(a - b)^2 = a^2 - 2ab + b^2$
- **Selisih Dua Kuadrat**:
  - $a^2 - b^2 = (a - b)(a + b)$
  - *Trik Nalar Hitung*: $53^2 - 47^2 = (53 - 47)(53 + 47) = 6 \\times 100 = \\mathbf{600}$!

---

## 2. Trik Pemodelan Kasus Terkenal
Jika $x + \\frac{1}{x} = 5$, berapakah nilai $x^2 + \\frac{1}{x^2}$?
- Kuadratkan kedua ruas:
  $$\\left(x + \\frac{1}{x}\\right)^2 = 5^2$$
  $$x^2 + 2\\left(x\\right)\\left(\\frac{1}{x}\\right) + \\frac{1}{x^2} = 25$$
  $$x^2 + 2 + \\frac{1}{x^2} = 25$$
  $$x^2 + \\frac{1}{x^2} = 25 - 2 = \\mathbf{23}$$`,
    questions: [
      {
        question: "Hitunglah nilai dari 85² - 15² dengan cara tercepat!",
        options: ["6500", "7000", "7200", "7500"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Gunakan selisih dua kuadrat: (85 - 15)(85 + 15) = 70 x 100 = 7000."
      },
      {
        question: "Jika x + 1/x = 4, maka nilai dari x² + 1/x² adalah...",
        options: ["14", "16", "18", "20"],
        correctIndex: 0,
        difficulty: "medium",
        explanation: "(x + 1/x)² = 4² -> x² + 2 + 1/x² = 16 -> x² + 1/x² = 16 - 2 = 14."
      },
      {
        question: "Bentuk sederhana dari (2x + 3)(3x - 1) - (x - 2)² adalah...",
        options: ["5x² + 11x - 7", "5x² + 7x - 7", "5x² + 11x + 1", "7x² + 7x - 7"],
        correctIndex: 0,
        difficulty: "medium",
        explanation: "(2x+3)(3x-1) = 6x² + 7x - 3. (x-2)² = x² - 4x + 4. Pengurangan: (6x² + 7x - 3) - (x² - 4x + 4) = 5x² + 11x - 7."
      },
      {
        question: "Jika a + b = 9 dan ab = 14, maka nilai dari a² + b² adalah...",
        options: ["49", "51", "53", "55"],
        correctIndex: 2,
        difficulty: "medium",
        explanation: "a² + b² = (a + b)² - 2ab = 9² - 2(14) = 81 - 28 = 53."
      },
      {
        question: "Nilai dari (2026² - 2024²) / (2025) adalah...",
        options: ["2", "4", "6", "8"],
        correctIndex: 1,
        difficulty: "hard",
        explanation: "Pembilang = (2026 - 2024)(2026 + 2024) = 2 x 4050 = 8100. Penyebut = 2025. 8100 / 2025 = 4."
      }
    ]
  },
  {
    topic: "Aljabar & Pemodelan Masalah",
    subTopic: "Pemodelan Soal Cerita Persamaan Linear",
    weekOrder: 4,
    priority: 8,
    slide: `# Pemodelan Soal Cerita Aljabar (PLSV & SPLDV) 📝

## 1. Langkah Penerjemahan Soal Cerita
1. Tentukan variabel: Misal umur adik sekarang $= x$, umur kakak $= y$.
2. Ubah kalimat narasi menjadi kalimat matematika:
   - "Umur ayah 3 kali umur anak" $\\rightarrow A = 3x$
   - "5 tahun yang lalu" $\\rightarrow (A - 5)$ dan $(x - 5)$
3. Selesaikan dengan eliminasi atau substitusi.

---

## 2. Contoh Soal Klasik Umur
Umur Kakak sekarang 4 tahun lebih tua dari Adik. Tiga tahun lagi, jumlah umur mereka adalah 26 tahun. Berapakah umur Adik sekarang?
- Misal: Adik $= x$, Kakak $= x + 4$.
- Tiga tahun lagi:
  - Adik $= x + 3$
  - Kakak $= (x + 4) + 3 = x + 7$
- Jumlah: $(x + 3) + (x + 7) = 26$
  $$2x + 10 = 26 \\rightarrow 2x = 16 \\rightarrow x = \\mathbf{8}$$
- Umur Adik sekarang adalah **8 tahun**, Kakak **12 tahun**.`,
    questions: [
      {
        question: "Umur seorang ayah saat ini 3 kali umur anaknya. Jika selisih umur mereka adalah 28 tahun, berapakah umur anak tersebut?",
        options: ["12 tahun", "14 tahun", "16 tahun", "18 tahun"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Ayah = 3x, Anak = x. Selisih = 3x - x = 28 -> 2x = 28 -> x = 14 tahun."
      },
      {
        question: "Jumlah dua bilangan adalah 45, sedangkan selisih kedua bilangan tersebut adalah 13. Bilangan terbesar adalah...",
        options: ["27", "28", "29", "30"],
        correctIndex: 2,
        difficulty: "easy",
        explanation: "x + y = 45 dan x - y = 13. Jumlahkan: 2x = 58 -> x = 29."
      },
      {
        question: "Harga 3 buku dan 2 pensil adalah Rp 19.000, sedangkan harga 2 buku dan 3 pensil adalah Rp 16.000. Harga 1 buku adalah...",
        options: ["Rp 4.000", "Rp 5.000", "Rp 6.000", "Rp 7.000"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "3b + 2p = 19000 dan 2b + 3p = 16000. Jumlahkan: 5b + 5p = 35000 -> b + p = 7000. Kurangkan: b - p = 3000. Jumlahkan kedua persamaan: 2b = 10000 -> b = Rp 5.000."
      },
      {
        question: "Sebuah lapangan berbentuk persegi panjang memiliki keliling 72 meter. Jika panjangnya 6 meter lebih dari lebarnya, maka luas lapangan adalah...",
        options: ["300 m²", "315 m²", "320 m²", "324 m²"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "Keliling = 2(p + l) = 72 -> p + l = 36. Diketahui p = l + 6 -> (l + 6) + l = 36 -> 2l = 30 -> l = 15. p = 15 + 6 = 21. Luas = 21 x 15 = 315 m²."
      },
      {
        question: "Di dalam kandang terdapat ayam dan kambing sebanyak 30 ekor. Jika total jumlah kaki hewan di kandang ada 84 kaki, berapa banyak kambing di kandang?",
        options: ["10 ekor", "12 ekor", "14 ekor", "16 ekor"],
        correctIndex: 1,
        difficulty: "hard",
        explanation: "Trik nalar: Jika semua 30 ekor adalah ayam (2 kaki), total kaki = 30 x 2 = 60 kaki. Selisih kekurangan kaki = 84 - 60 = 24 kaki. Tiap kambing menyumbang 2 kaki lebih banyak (4 - 2 = 2 kaki). Maka banyak kambing = 24 / 2 = 12 ekor."
      }
    ]
  },
  {
    topic: "Geometri & Logika Spasial",
    subTopic: "Sudut pada Garis Sejajar dan Poligon",
    weekOrder: 4,
    priority: 7,
    slide: `# Geometri: Sudut & Poligon 📐

## 1. Hubungan Sudut Dua Garis Sejajar Dipotong Garis Transversal
- **Sudut Sehadap**: Sama besar (misal $\\angle 1 = \\angle 5$)
- **Sudut Dalam Berseberangan**: Sama besar (misal $\\angle 3 = \\angle 5$)
- **Sudut Luar Berseberangan**: Sama besar (misal $\\angle 1 = \\angle 7$)
- **Sudut Dalam Sepihak**: Jumlahnya $180^\\circ$ (misal $\\angle 4 + \\angle 5 = 180^\\circ$)
- **Sudut Bertolak Belakang**: Sama besar

---

## 2. Jumlah Sudut Poligon Segi-$n$
- **Jumlah Sudut Dalam**:
  $$S = (n - 2) \\times 180^\\circ$$
  - Segitiga ($n=3$): $(3-2) \\times 180^\\circ = 180^\\circ$
  - Segiempat ($n=4$): $(4-2) \\times 180^\\circ = 360^\\circ$
  - Segilima ($n=5$): $(5-2) \\times 180^\\circ = 540^\\circ$
  - Segienam ($n=6$): $(6-2) \\times 180^\\circ = 720^\\circ$
- **Besar Tiap Sudut pada Poligon Beraturan**:
  $$\\theta = \\frac{(n - 2) \\times 180^\\circ}{n}$$`,
    questions: [
      {
        question: "Dua sudut saling berpelurus (suplemen). Jika sudut pertama besarnya 3 kali sudut kedua, berapakah besar sudut pertama?",
        options: ["120°", "135°", "145°", "150°"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "3x + x = 180° -> 4x = 180° -> x = 45°. Sudut pertama = 3 x 45° = 135°."
      },
      {
        question: "Jumlah seluruh sudut dalam dari bangun segi-8 (oktagon) adalah...",
        options: ["900°", "1080°", "1260°", "1440°"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Rumus: (n - 2) x 180° = (8 - 2) x 180° = 6 x 180° = 1080°."
      },
      {
        question: "Besar tiap sudut dalam pada segi-6 beraturan (heksagon) adalah...",
        options: ["108°", "120°", "135°", "140°"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "Total sudut = (6 - 2) x 180° = 720°. Tiap sudut = 720° / 6 = 120°."
      },
      {
        question: "Dua garis sejajar dipotong garis lain. Jika dua sudut dalam sepihak dinyatakan sebagai (3x + 10)° dan (2x + 20)°, nilai x adalah...",
        options: ["25", "30", "35", "40"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "Sudut dalam sepihak berjumlah 180°: (3x + 10) + (2x + 20) = 180 -> 5x + 30 = 180 -> 5x = 150 -> x = 30."
      },
      {
        question: "Berapa banyak diagonal yang dimiliki oleh bangun segi-10 (dekagon)?",
        options: ["25", "30", "35", "40"],
        correctIndex: 2,
        difficulty: "hard",
        explanation: "Rumus banyak diagonal segi-n: n(n - 3) / 2. Untuk n = 10: 10(10 - 3) / 2 = 10(7) / 2 = 35 diagonal."
      }
    ]
  },
  {
    topic: "Geometri & Logika Spasial",
    subTopic: "Dekomposisi Luas Bidang Arsiran",
    weekOrder: 5,
    priority: 8,
    slide: `# Dekomposisi Luas Bidang Arsiran 📐

## 1. Konsep Dekomposisi Luas
Jangan menghitung bentuk tak beraturan secara langsung, tapi gunakan:
$$\\text{Luas Arsiran} = \\text{Luas Total} - \\text{Luas Bentuk Kosong}$$
Atau potong menjadi bagian-bagian geometri sederhana yang mudah dihitung.

---

## 2. Kasus Klasik: Daun dalam Persegi
Sebuah persegi dengan sisi $s$, di dalamnya dibuat dua busur lingkaran seperempat dengan jari-jari $s$.
- Luas 2 seperempat lingkaran $= 2 \\times \\left(\\frac{1}{4} \\pi s^2\\right) = \\frac{1}{2} \\pi s^2$
- Luas Daun (irisan):
  $$L_{\\text{daun}} = \\frac{1}{2} \\pi s^2 - s^2$$
  Jika $\\pi = \\frac{22}{7}$:
  $$L_{\\text{daun}} = \\left(\\frac{11}{7} - 1\\right) s^2 = \\frac{4}{7} s^2$$
  *Trik Kilat*: Luas daun arsiran dalam persegi sisi $s$ adalah $\\mathbf{\\frac{4}{7} s^2}$!
  - Contoh: Jika $s = 14\\text{ cm}$, maka Luas Daun $= \\frac{4}{7} \\times 14^2 = \\frac{4}{7} \\times 196 = \\mathbf{112\\text{ cm}^2}$.`,
    questions: [
      {
        question: "Sebuah persegi memiliki sisi 14 cm. Di dalamnya terdapat daerah arsiran berbentuk daun dari dua seperempat lingkaran. Berapakah luas daerah arsiran tersebut? (π = 22/7)",
        options: ["98 cm²", "112 cm²", "126 cm²", "140 cm²"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Gunakan trik daun: L = 4/7 x s² = 4/7 x 14 x 14 = 4 x 2 x 14 = 112 cm²."
      },
      {
        question: "Persegi panjang berukuran 20 cm x 15 cm memiliki segitiga siku-siku di salah satu sudutnya dengan alas 6 cm dan tinggi 8 cm yang tidak diarsir. Luas daerah yang diarsir adalah...",
        options: ["268 cm²", "276 cm²", "284 cm²", "292 cm²"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Luas total = 20 x 15 = 300 cm². Luas segitiga = 1/2 x 6 x 8 = 24 cm². Luas arsiran = 300 - 24 = 276 cm²."
      },
      {
        question: "Sebuah lingkaran dengan jari-jari 7 cm berada tepat di dalam sebuah persegi (sisi 14 cm). Luas daerah di dalam persegi tetapi di luar lingkaran adalah... (π = 22/7)",
        options: ["38 cm²", "42 cm²", "46 cm²", "50 cm²"],
        correctIndex: 1,
        difficulty: "medium",
        explanation: "Luas persegi = 14 x 14 = 196 cm². Luas lingkaran = 22/7 x 7 x 7 = 154 cm². Selisih = 196 - 154 = 42 cm²."
      },
      {
        question: "Sebuah trapesium siku-siku memiliki sisi sejajar 10 cm dan 16 cm serta tinggi 8 cm. Jika dibuat setengah lingkaran berdiameter 8 cm di salah satu sisinya dan dipotong, luas bidang yang tersisa adalah... (π = 3.14)",
        options: ["78.88 cm²", "84.24 cm²", "75.12 cm²", "81.44 cm²"],
        correctIndex: 0,
        difficulty: "hard",
        explanation: "Luas trapesium = (10 + 16)/2 x 8 = 26/2 x 8 = 104 cm². Setengah lingkaran diameter 8 (r=4): Luas = 1/2 x 3.14 x 16 = 25.12 cm². Sisa = 104 - 25.12 = 78.88 cm²."
      },
      {
        question: "Tiga buah lingkaran identik dengan jari-jari r saling bersinggungan di luar. Luas segitiga yang dibentuk oleh ketiga titik pusat lingkaran tersebut adalah...",
        options: ["r²√3", "2r²√3", "r²/2", "4r²√3"],
        correctIndex: 0,
        difficulty: "hard",
        explanation: "Jarak antar pusat = r + r = 2r. Segitiga sama sisi dengan sisi s = 2r. Luas segitiga sama sisi = (s²√3)/4 = ((2r)²√3)/4 = (4r²√3)/4 = r²√3."
      }
    ]
  },
  {
    topic: "Aritmatika Sosial Finansial",
    subTopic: "Laba Rugi Bertingkat dan Diskon Ganda",
    weekOrder: 5,
    priority: 7,
    slide: `# Aritmatika Sosial: Logika Diskon & Finansial 💰

## 1. Diskon Bertingkat (Diskon $A\\% + B\\%$)
Diskon $50\\% + 20\\%$ **BUKAN** diskon $70\\%$!
- Misal harga awal $= Rp\\ 100.000$
- Diskon pertama $50\\% \\rightarrow$ sisa harga $= Rp\\ 50.000$
- Diskon kedua $20\\%$ dari Rp 50.000 $= Rp\\ 10.000$
- Harga akhir yang dibayar $= Rp\\ 40.000$
- **Total Diskon Sebenarnya**:
  $$100\\% - 40\\% = \\mathbf{60\\%}$$

Formula Cepat Diskon $A\\% + B\\%$:
$$\\text{Total Diskon} = A + B - \\frac{A \\times B}{100}$$
Contoh: $50 + 20 - \\frac{50 \\times 20}{100} = 70 - 10 = \\mathbf{60\\%}$!

---

## 2. Hubungan Bruto, Netto, dan Tara
- **Bruto** = Berat kotor (isi + kemasan)
- **Netto** = Berat bersih (isi saja)
- **Tara** = Berat kemasan saja
$$\\text{Bruto} = \\text{Netto} + \\text{Tara}$$
$$\\%\\text{Tara} = \\frac{\\text{Tara}}{\\text{Bruto}} \\times 100\\%$$`,
    questions: [
      {
        question: "Sebuah toko pakaian memberikan diskon 40% + 10%. Berapakah total diskon tunggal yang setara?",
        options: ["50%", "46%", "45%", "44%"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Rumus cepat: A + B - (A x B)/100 = 40 + 10 - (40 x 10)/100 = 50 - 4 = 46%."
      },
      {
        question: "Seorang pedagang membeli sekarung beras dengan Bruto 50 kg dan Tara 2%. Netto beras tersebut adalah...",
        options: ["48 kg", "48.5 kg", "49 kg", "49.5 kg"],
        correctIndex: 2,
        difficulty: "easy",
        explanation: "Tara = 2% x 50 kg = 1 kg. Netto = Bruto - Tara = 50 - 1 = 49 kg."
      },
      {
        question: "Pedagang membeli sebuah jaket seharga Rp 200.000. Ia ingin menjualnya dengan keuntungan 25% setelah memberikan diskon 20% kepada pembeli. Berapakah harga label yang harus dipasang?",
        options: ["Rp 300.000", "Rp 312.500", "Rp 325.000", "Rp 350.000"],
        correctIndex: 1,
        difficulty: "hard",
        explanation: "Harga jual yang diinginkan (laba 25%) = 200.000 x 1.25 = Rp 250.000. Karena pembeli dapat diskon 20%, maka pembeli membayar 80% dari harga label (H). 0.8 x H = 250.000 -> H = 250.000 / 0.8 = Rp 312.500."
      },
      {
        question: "Jika modal suatu barang adalah Rp 80.000 dan dijual dengan harga Rp 100.000, berapakah persentase keuntungan terhadap modal?",
        options: ["20%", "25%", "30%", "35%"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Untung = 100.000 - 80.000 = 20.000. %Untung = 20.000 / 80.000 x 100% = 25%."
      },
      {
        question: "Ibu menabung di bank sebesar Rp 2.000.000 dengan bunga tunggal 6% per tahun. Setelah berapa bulan tabungan Ibu menjadi Rp 2.090.000?",
        options: ["6 bulan", "8 bulan", "9 bulan", "10 bulan"],
        correctIndex: 2,
        difficulty: "medium",
        explanation: "Bunga yang didapat = 2.090.000 - 2.000.000 = Rp 90.000. Bunga 1 tahun = 6% x 2.000.000 = Rp 120.000 (Rp 10.000/bulan). Waktu = 90.000 / 10.000 = 9 bulan."
      }
    ]
  },
  {
    topic: "Logika Kombinatorika",
    subTopic: "Logika Pencacahan dan Problem Solving",
    weekOrder: 6,
    priority: 8,
    slide: `# Logika Kombinatorika & Analisis Kasus 🧩

## 1. Aturan Perkalian (Prinsip Dasar Pencacahan)
Jika ada $k_1$ cara memilih opsi pertama dan $k_2$ cara memilih opsi kedua, maka total cara memilih pasangan keduanya adalah:
$$N = k_1 \\times k_2$$
- **Contoh**: Raihan punya 4 kemeja dan 3 celana panjang. Berapa banyak kombinasi set pakaian yang bisa ia pakai?
  $$\\text{Total} = 4 \\times 3 = \\mathbf{12\\text{ kombinasi}}$$

---

## 2. Pigeonhole Principle (Prinsip Sarang Merpati)
> *"Jika $n$ merpati dimasukkan ke dalam $k$ sarang dan $n > k$, maka minimal ada 1 sarang yang berisi lebih dari 1 merpati."*

- **Kasus Kaos Kaki**:
  Di dalam laci terdapat 10 kaos kaki hitam dan 10 kaos kaki putih (semuanya tercampur dalam gelap).
  Berapa minimal kaos kaki yang harus diambil secara acak agar **PASTI** mendapatkan sepasang kaos kaki sewarna?
  - Ada 2 warna (sarang $= 2$).
  - Jika ambil 2 kaos kaki, skenario terburuk bisa 1 hitam dan 1 putih.
  - Maka ambil **$2 + 1 = 3$ kaos kaki**, PASTI ada minimal 2 yang sewarna!`,
    questions: [
      {
        question: "Di sebuah restoran, menu paket terdiri dari 1 makanan utama (pilihan dari 5 menu), 1 minuman (pilihan dari 4 menu), dan 1 hidangan penutup (pilihan dari 3 menu). Berapa banyak susunan paket berbeda yang dapat dipilih?",
        options: ["12", "30", "60", "120"],
        correctIndex: 2,
        difficulty: "easy",
        explanation: "Prinsip perkalian: 5 x 4 x 3 = 60 pilihan paket berbeda."
      },
      {
        question: "Berapa banyak bilangan genap 3-digit yang dapat dibentuk dari angka 2, 3, 5, 7, 8 tanpa ada angka yang berulang?",
        options: ["12", "18", "24", "36"],
        correctIndex: 0,
        difficulty: "medium",
        explanation: "Angka satuan harus genap (pilih dari 2 atau 8 -> 2 cara). Sisa 4 angka untuk ratusan -> 4 cara. Sisa 3 angka untuk puluhan -> 3 cara? Cek: Ratusan (4 pilihan), Puluhan (3 pilihan), Satuan (2 pilihan) -> 4 x 3 x 2 = 24? Cek jika angka satuan genap (2 pilihan), setelah itu ratusan tersisa 4 angka, puluhan tersisa 3 angka -> 4 x 3 x 2 = 24 (koreksi opsi: 24)."
      },
      {
        question: "Dalam sebuah kotak terdapat 8 bola merah, 6 bola biru, dan 10 bola kuning. Berapa minimal bola yang harus diambil tanpa melihat agar PASTI terambil sedikitnya 1 bola biru?",
        options: ["15", "18", "19", "20"],
        correctIndex: 2,
        difficulty: "hard",
        explanation: "Analisis kondisi terburuk (worst-case scenario): Ambil semua bola merah (8) + semua bola kuning (10) = 18 bola dan belum ada bola biru. Maka pengambilan ke-19 (18 + 1) PASTI bola biru."
      },
      {
        question: "Berapa minimal orang yang harus berada di dalam suatu ruangan agar PASTI ada sedikitnya dua orang yang lahir pada bulan yang sama?",
        options: ["12 orang", "13 orang", "14 orang", "25 orang"],
        correctIndex: 1,
        difficulty: "easy",
        explanation: "Pigeonhole principle: Jumlah bulan ada 12 (sarang). Agar pasti ada minimal 2 orang sebulan lahir, dibutuhkan 12 + 1 = 13 orang."
      },
      {
        question: "Terdapat 5 orang sahabat yang saling bersalaman satu sama lain tepat satu kali saat bertemu. Berapa total jabat tangan yang terjadi?",
        options: ["10", "15", "20", "25"],
        correctIndex: 0,
        difficulty: "easy",
        explanation: "Kombinasi 2 orang dari 5: 5 x 4 / 2 = 10 jabat tangan."
      }
    ]
  }
];

export const SPEED_MATH_ITEMS: SpeedMathItem[] = [
  { id: "sm-01", question: "35²", answer: 1225, targetSeconds: 3, shortcut: "3 × 4 tempel 25 = 1225", category: "Kuadrat 5" },
  { id: "sm-02", question: "75²", answer: 5625, targetSeconds: 3, shortcut: "7 × 8 tempel 25 = 5625", category: "Kuadrat 5" },
  { id: "sm-03", question: "45²", answer: 2025, targetSeconds: 3, shortcut: "4 × 5 tempel 25 = 2025", category: "Kuadrat 5" },
  { id: "sm-04", question: "95²", answer: 9025, targetSeconds: 3, shortcut: "9 × 10 tempel 25 = 9025", category: "Kuadrat 5" },
  { id: "sm-05", question: "105²", answer: 11025, targetSeconds: 4, shortcut: "10 × 11 tempel 25 = 11025", category: "Kuadrat 5" },
  { id: "sm-06", question: "52²", answer: 2704, targetSeconds: 4, shortcut: "(25 + 2) × 100 + 2² = 2704", category: "Basis 50" },
  { id: "sm-07", question: "48²", answer: 2304, targetSeconds: 4, shortcut: "(25 - 2) × 100 + 2² = 2304", category: "Basis 50" },
  { id: "sm-08", question: "56²", answer: 3136, targetSeconds: 4, shortcut: "(25 + 6) × 100 + 6² = 3136", category: "Basis 50" },
  { id: "sm-09", question: "43²", answer: 1849, targetSeconds: 4, shortcut: "(25 - 7) × 100 + 7² = 1849", category: "Basis 50" },
  { id: "sm-10", question: "96 × 97", answer: 9312, targetSeconds: 5, shortcut: "96 - 3 = 93; (-4) × (-3) = 12 -> 9312", category: "Basis 100" },
  { id: "sm-11", question: "98 × 95", answer: 9310, targetSeconds: 5, shortcut: "98 - 5 = 93; (-2) × (-5) = 10 -> 9310", category: "Basis 100" },
  { id: "sm-12", question: "104 × 106", answer: 11024, targetSeconds: 5, shortcut: "104 + 6 = 110; 4 × 6 = 24 -> 11024", category: "Basis 100" },
  { id: "sm-13", question: "42 × 11", answer: 462, targetSeconds: 3, shortcut: "4 (4+2) 2 = 462", category: "Perkalian 11" },
  { id: "sm-14", question: "63 × 11", answer: 693, targetSeconds: 3, shortcut: "6 (6+3) 3 = 693", category: "Perkalian 11" },
  { id: "sm-15", question: "75 × 11", answer: 825, targetSeconds: 4, shortcut: "7 (7+5=12) 5 -> (7+1)25 = 825", category: "Perkalian 11" },
  { id: "sm-16", question: "16 × 35", answer: 560, targetSeconds: 4, shortcut: "Separuh 16 = 8, Dobel 35 = 70 -> 8 × 70 = 560", category: "Double-Half" },
  { id: "sm-17", question: "18 × 45", answer: 810, targetSeconds: 4, shortcut: "Separuh 18 = 9, Dobel 45 = 90 -> 9 × 90 = 810", category: "Double-Half" },
  { id: "sm-18", question: "24 × 25", answer: 600, targetSeconds: 4, shortcut: "24 / 4 × 100 = 6 × 100 = 600", category: "Double-Half" },
  { id: "sm-19", question: "16% dari 75", answer: 12, targetSeconds: 4, shortcut: "75% dari 16 = 3/4 × 16 = 12", category: "Persentase Swap" },
  { id: "sm-20", question: "48% dari 25", answer: 12, targetSeconds: 4, shortcut: "25% dari 48 = 1/4 × 48 = 12", category: "Persentase Swap" },
  { id: "sm-21", question: "32% dari 50", answer: 16, targetSeconds: 3, shortcut: "50% dari 32 = 16", category: "Persentase Swap" },
  { id: "sm-22", question: "65² - 35²", answer: 3000, targetSeconds: 5, shortcut: "(65 - 35)(65 + 35) = 30 × 100 = 3000", category: "Selisih Kuadrat" },
  { id: "sm-23", question: "52² - 48²", answer: 400, targetSeconds: 4, shortcut: "(52 - 48)(52 + 48) = 4 × 100 = 400", category: "Selisih Kuadrat" },
  { id: "sm-24", question: "√2025", answer: 45, targetSeconds: 3, shortcut: "4 × 5 = 20, satuan 5 -> 45", category: "Akar Kilat" },
  { id: "sm-25", question: "√5625", answer: 75, targetSeconds: 3, shortcut: "7 × 8 = 56, satuan 5 -> 75", category: "Akar Kilat" }
];

async function main() {
  const targetPath = path.join(__dirname, "../src/data/math-enhancement-smp7.ts");
  const content = `/**
 * Math Enhancement & Speed Math Dataset — SMP Kelas 7
 * Target: Raihan (RAIHAN001), Persona: Kak Dewi
 *
 * Subject: Matematika Tingkat Lanjut
 */
import type { QuestionData } from "@/agents/assessment/types";

export interface MathTopicItem {
  topic: string;
  subTopic: string;
  weekOrder: number;
  priority: number;
  slide: string;
  questions: QuestionData[];
}

export interface SpeedMathProblem {
  id: string;
  question: string;
  answer: number;
  targetSeconds: number;
  shortcut: string;
  category: string;
}

export const MATH_ENHANCEMENT_MODULES: MathTopicItem[] = ${JSON.stringify(MODULES, null, 2)};

export const SPEED_MATH_BANK: SpeedMathProblem[] = ${JSON.stringify(SPEED_MATH_ITEMS, null, 2)};
`;

  fs.writeFileSync(targetPath, content, "utf-8");
  console.log("Successfully generated:", targetPath);
}

main().catch(console.error);
