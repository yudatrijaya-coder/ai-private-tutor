/**
 * Quiz Bank — SMA Kelas 11 (Kurikulum Merdeka)
 *
 * 123 sub-topik × 5 soal = 615 soal pilihan ganda
 * Mapel: Matematika TL, Bahasa Indonesia TL, Bahasa Inggris TL,
 *        Ekonomi, Geografi, Sosiologi, PJOK, Pendidikan Pancasila, Informatika
 *
 * @module @/data/quiz-bank-sma11
 */

import type { QuestionData } from '@/agents/assessment/types';

// ---------------------------------------------------------------------------
// Helper: build a lookup key
// ---------------------------------------------------------------------------
function quizKey(
  subject: string,
  topic: string,
  subTopic: string,
): string {
  return `${subject}||${topic}||${subTopic}`;
}

// ---------------------------------------------------------------------------
// Quiz bank — 615 entries
// ---------------------------------------------------------------------------

const QUIZ_MAP: Record<string, QuestionData[]> = {

  // ═══════════════════════════════════════════════════════════════════════════
  //  MATEMATIKA TL — 18 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Matematika', 'Fungsi', 'Fungsi dan Grafik')]: [
    {
      question: 'Jika f(x) = 2x + 3, maka nilai f(4) adalah ...',
      options: ['8', '11', '7', '10'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'f(4) = 2(4) + 3 = 8 + 3 = 11.',
    },
    {
      question: 'Daerah asal (domain) dari fungsi f(x) = √(x-2) adalah ...',
      options: ['x < 2', 'x ≤ 2', 'x > 2', 'x ≥ 2'],
      correctIndex: 3,
      difficulty: 'medium',
      explanation: 'Bentuk akar √(x-2) terdefinisi jika x-2 ≥ 0, maka x ≥ 2.',
    },
    {
      question: 'Jika fungsi f(x) = x² - 4, maka grafik fungsi tersebut memotong sumbu x di titik ...',
      options: ['(2,0) dan (2,0)', '(2,0) dan (-2,0)', '(0,4) dan (0,-4)', '(4,0) dan (-4,0)'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'f(x) = 0 → x² - 4 = 0 → x² = 4 → x = 2 atau x = -2. Jadi titik potong (2,0) dan (-2,0).',
    },
    {
      question: 'Daerah hasil (range) dari fungsi f(x) = x² + 1 dengan domain x ∈ ℝ adalah ...',
      options: ['{y | y ≥ 0, y ∈ ℝ}', '{y | y ≥ 1, y ∈ ℝ}', '{y | y ≤ 1, y ∈ ℝ}', '{y | y ∈ ℝ}'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Karena x² ≥ 0, maka x² + 1 ≥ 1. Jadi range = {y | y ≥ 1, y ∈ ℝ}.',
    },
    {
      question: 'Suatu fungsi dinyatakan dengan f(x) = ax + b. Jika f(2) = 7 dan f(5) = 13, maka nilai a + b adalah ...',
      options: ['3', '5', '7', '9'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'f(2) = 2a + b = 7; f(5) = 5a + b = 13. Eliminasi: 3a = 6 → a = 2. Substitusi: 4 + b = 7 → b = 3. Maka a + b = 5.',
    }],

  [quizKey('Matematika', 'Fungsi', 'Komposisi Fungsi')]: [
    {
      question: 'Jika f(x) = 2x dan g(x) = x + 3, maka (f ∘ g)(x) = ...',
      options: ['2x + 3', '2x + 6', '2x² + 6x', 'x + 6'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: '(f ∘ g)(x) = f(g(x)) = f(x + 3) = 2(x + 3) = 2x + 6.',
    },
    {
      question: 'Diketahui f(x) = x² dan g(x) = 2x - 1. Nilai (g ∘ f)(2) adalah ...',
      options: ['3', '7', '9', '15'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: '(g ∘ f)(2) = g(f(2)) = g(4) = 2(4) - 1 = 8 - 1 = 7.',
    },
    {
      question: 'Jika f(x) = 3x + 2 dan (f ∘ g)(x) = 3x² + 5, maka g(x) = ...',
      options: ['x² + 1', 'x² - 1', 'x² + 3', 'x² - 3'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: '(f ∘ g)(x) = 3(g(x)) + 2 = 3x² + 5. Maka 3(g(x)) = 3x² + 3 → g(x) = x² + 1.',
    },
    {
      question: 'Diketahui f(x) = x - 1 dan g(x) = x² - 2x. Hasil dari (f ∘ g)(x) adalah ...',
      options: ['x² - 2x - 1', 'x² - 2x - 2', 'x² - x - 1', 'x² - 2x + 1'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: '(f ∘ g)(x) = f(g(x)) = (x² - 2x) - 1 = x² - 2x - 1.',
    },
    {
      question: 'Komposisi fungsi bersifat ...',
      options: ['Komutatif', 'Asosiatif', 'Distributif', 'Tidak komutatif'],
      correctIndex: 3,
      difficulty: 'easy',
      explanation: 'Komposisi fungsi tidak bersifat komutatif, artinya (f ∘ g)(x) ≠ (g ∘ f)(x) secara umum.',
    }],

  [quizKey('Matematika', 'Fungsi', 'Fungsi Invers')]: [
    {
      question: 'Invers dari fungsi f(x) = 2x + 5 adalah ...',
      options: ['(x-5)/2', '(x+5)/2', '2x - 5', 'x/2 - 5'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'f(x) = 2x + 5 → y = 2x + 5 → 2x = y - 5 → x = (y-5)/2. Jadi f⁻¹(x) = (x-5)/2.',
    },
    {
      question: 'Jika f(x) = 3x - 2, maka nilai f⁻¹(7) adalah ...',
      options: ['1', '2', '3', '4'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'f⁻¹(x) = (x+2)/3. Maka f⁻¹(7) = (7+2)/3 = 9/3 = 3.',
    },
    {
      question: 'Diketahui f(x) = (2x+1)/(x-3), x ≠ 3. Invers dari f(x) adalah ...',
      options: ['(3x+1)/(x-2)', '(3x-1)/(x+2)', '(3x+1)/(x+2)', '(x+2)/(3x+1)'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: 'y = (2x+1)/(x-3) → y(x-3) = 2x+1 → xy - 3y = 2x+1 → xy - 2x = 3y+1 → x(y-2) = 3y+1 → x = (3y+1)/(y-2). Jadi f⁻¹(x) = (3x+1)/(x-2).',
    },
    {
      question: 'Syarat suatu fungsi memiliki invers adalah fungsi tersebut bersifat ...',
      options: ['Surjektif', 'Injektif', 'Bijektif', 'Linear'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Suatu fungsi memiliki invers jika dan hanya jika fungsi tersebut bijektif (injektif sekaligus surjektif).',
    },
    {
      question: 'Jika f(x) = x² - 4x dengan domain x ≥ 2, maka f⁻¹(x) = ...',
      options: ['2 + √(x+4)', '2 - √(x+4)', '4 + √(x+2)', '2 + √(x-4)'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: 'y = x² - 4x → y = (x-2)² - 4 → (x-2)² = y+4 → x-2 = √(y+4) (karena x≥2, ambil positif). Jadi f⁻¹(x) = 2 + √(x+4).',
    }],

  [quizKey('Matematika', 'Polinomial', 'Suku Banyak')]: [
    {
      question: 'Derajat dari polinomial 2x⁴ + 3x³ - x² + 5x - 7 adalah ...',
      options: ['2', '3', '4', '5'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Derajat polinomial adalah pangkat tertinggi dari variabelnya, yaitu 4.',
    },
    {
      question: 'Koefisien x² pada polinomial 3x⁴ - 2x² + 5x - 1 adalah ...',
      options: ['3', '2', '-2', '5'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Koefisien x² adalah bilangan yang mendampingi x², yaitu -2.',
    },
    {
      question: 'Nilai polinomial x³ + 2x² - 3x + 5 untuk x = 1 adalah ...',
      options: ['3', '4', '5', '6'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'f(1) = 1³ + 2(1)² - 3(1) + 5 = 1 + 2 - 3 + 5 = 5.',
    },
    {
      question: 'Jika x³ - 6x² + 11x - 6 = 0 memiliki akar-akar x₁, x₂, x₃, maka x₁ + x₂ + x₃ = ...',
      options: ['6', '-6', '11', '-11'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: 'Untuk polinomial ax³ + bx² + cx + d, jumlah akar = -b/a = -(-6)/1 = 6.',
    },
    {
      question: 'Hasil bagi dari (x³ - 3x² + 2x - 1) ÷ (x - 2) adalah ...',
      options: ['x² - x + 0', 'x² - x + 0 sisa -1', 'x² - 5x + 12', 'x² - x + 0 sisa 1'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Gunakan metode Horner: 2 | 1 -3 2 -1. Turunkan 1, kalikan 2 = 2, jumlah dengan -3 = -1, kalikan 2 = -2, jumlah dengan 2 = 0, kalikan 2 = 0, jumlah dengan -1 = -1. Hasil: x² - x + 0, sisa -1.',
    }],

  [quizKey('Matematika', 'Polinomial', 'Operasi Polinomial')]: [
    {
      question: 'Hasil penjumlahan (2x² + 3x - 1) + (x² - 2x + 4) adalah ...',
      options: ['3x² + x + 3', '3x² + 5x + 3', '3x² + x - 3', 'x² + x + 3'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: '(2x² + 3x - 1) + (x² - 2x + 4) = (2+1)x² + (3-2)x + (-1+4) = 3x² + x + 3.',
    },
    {
      question: 'Hasil pengurangan (3x² - 2x + 5) - (x² + 3x - 1) adalah ...',
      options: ['2x² - 5x + 6', '2x² + x + 4', '4x² + x + 6', '2x² - 5x + 4'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: '(3x² - 2x + 5) - (x² + 3x - 1) = 3x² - 2x + 5 - x² - 3x + 1 = 2x² - 5x + 6.',
    },
    {
      question: 'Hasil perkalian (x + 2)(x² - 3x + 1) adalah ...',
      options: ['x³ - x² - 5x + 2', 'x³ - x² - 5x - 2', 'x³ - 5x² - 5x + 2', 'x³ + 5x² - 5x + 2'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: '(x+2)(x²-3x+1) = x(x²-3x+1) + 2(x²-3x+1) = x³-3x²+x+2x²-6x+2 = x³ - x² - 5x + 2.',
    },
    {
      question: 'Derajat hasil perkalian polinomial berderajat 3 dan polinomial berderajat 4 adalah ...',
      options: ['7', '12', '3', '4'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Derajat hasil perkalian polinomial = jumlah derajat masing-masing polinomial = 3 + 4 = 7.',
    },
    {
      question: 'Hasil bagi dan sisa dari (2x⁴ - 3x³ + 2x² - x + 1) ÷ (x² + 1) adalah ...',
      options: ['2x² - 3x dengan sisa 2x+1', '2x² - 3x + 0 dengan sisa 2x+1', '2x² - 3x + 1 dengan sisa 0', '2x² - 3x dengan sisa 0'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Pembagian polinomial: (2x⁴-3x³+2x²-x+1) ÷ (x²+1). Hasil bagi = 2x² - 3x, sisa = 2x + 1.',
    }],

  [quizKey('Matematika', 'Polinomial', 'Faktorisasi Polinomial')]: [
    {
      question: 'Faktor dari x² - 5x + 6 adalah ...',
      options: ['(x-2)(x-3)', '(x+2)(x+3)', '(x-1)(x-6)', '(x+1)(x-6)'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'x² - 5x + 6 = (x-2)(x-3) karena -2 × -3 = 6 dan -2 + (-3) = -5.',
    },
    {
      question: 'Jika (x-2) adalah faktor dari x³ - 3x² - 10x + 24, maka faktor lainnya adalah ...',
      options: ['(x-3)(x+4)', '(x+3)(x-4)', '(x-3)(x-4)', '(x+3)(x+4)'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Bagi x³-3x²-10x+24 dengan (x-2) menggunakan Horner: hasil x²-x-12 = (x+3)(x-4). Jadi faktor lainnya (x+3)(x-4).',
    },
    {
      question: 'Banyaknya faktor linear dari x⁴ - 16 adalah ...',
      options: ['1', '2', '3', '4'],
      correctIndex: 3,
      difficulty: 'medium',
      explanation: 'x⁴ - 16 = (x²-4)(x²+4) = (x-2)(x+2)(x²+4). x²+4 tidak bisa difaktorkan di ℝ, jadi hanya 2 faktor linear di ℝ. Namun di ℂ, x²+4 = (x-2i)(x+2i), jadi 4 faktor. Untuk tingkat SMA, cukup (x-2)(x+2) sebagai faktor linear real = 2 faktor.',
    },
    {
      question: 'Salah satu akar dari x³ - 6x² + 11x - 6 = 0 adalah ...',
      options: ['0', '1', '5', '6'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'f(1) = 1 - 6 + 11 - 6 = 0, jadi x=1 adalah akar. Faktorisasi: (x-1)(x-2)(x-3)=0, akar-akarnya 1, 2, dan 3.',
    },
    {
      question: 'Teorema faktor menyatakan bahwa (x - k) adalah faktor polinomial f(x) jika dan hanya jika ...',
      options: ['f(k) = 1', 'f(k) < 0', 'f(k) = 0', 'f(0) = k'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Teorema faktor: (x - k) adalah faktor dari f(x) jika dan hanya jika f(k) = 0.',
    }],

  [quizKey('Matematika', 'Trigonometri', 'Fungsi Trigonometri')]: [
    {
      question: 'Nilai dari sin 30° adalah ...',
      options: ['0', '1/2', '1/√2', '√3/2'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'sin 30° = 1/2. Ini adalah nilai trigonometri dasar yang perlu dihafal.',
    },
    {
      question: 'Nilai dari cos 60° adalah ...',
      options: ['1/2', '1/√2', '√3/2', '1'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'cos 60° = 1/2.',
    },
    {
      question: 'Nilai dari tan 45° + sin 90° adalah ...',
      options: ['1', '2', '3', '0'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'tan 45° = 1, sin 90° = 1. Maka 1 + 1 = 2.',
    },
    {
      question: 'Jika sin A = 3/5, maka cos A untuk A di kuadran I adalah ...',
      options: ['4/5', '3/5', '5/4', '2/5'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'cos² A = 1 - sin² A = 1 - 9/25 = 16/25. cos A = 4/5 (kuadran I, cos positif).',
    },
    {
      question: 'Nilai dari sin 150° adalah ...',
      options: ['-1/2', '1/2', '-√3/2', '√3/2'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'sin 150° = sin (180° - 30°) = sin 30° = 1/2. Di kuadran II, sin positif.',
    }],

  [quizKey('Matematika', 'Trigonometri', 'Identitas Trigonometri')]: [
    {
      question: 'Bentuk sederhana dari sin² x + cos² x adalah ...',
      options: ['0', '1', 'sin x + cos x', '2'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Ini adalah identitas trigonometri dasar: sin² x + cos² x = 1.',
    },
    {
      question: 'Jika sin θ = 3/5, maka nilai dari 1 - cos² θ adalah ...',
      options: ['9/25', '16/25', '3/5', '1'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: '1 - cos² θ = sin² θ = (3/5)² = 9/25.',
    },
    {
      question: 'Bentuk (1 - cos² A) / sin A ekuivalen dengan ...',
      options: ['sin A', 'cos A', 'tan A', 'csc A'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: '(1 - cos² A) / sin A = sin² A / sin A = sin A.',
    },
    {
      question: 'Penyederhanaan dari tan x × cos x adalah ...',
      options: ['sin x', 'cos x', 'sec x', 'csc x'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'tan x × cos x = (sin x/cos x) × cos x = sin x.',
    },
    {
      question: 'Jika tan A = a, maka sin 2A dalam a adalah ...',
      options: ['2a/(1+a²)', 'a/(1+a²)', '2a/(1-a²)', 'a/(1-a²)'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: 'sin 2A = 2 tan A / (1 + tan² A) = 2a/(1+a²).',
    }],

  [quizKey('Matematika', 'Trigonometri', 'Persamaan Trigonometri')]: [
    {
      question: 'Himpunan penyelesaian dari sin x = 1/2 untuk 0° ≤ x ≤ 360° adalah ...',
      options: ['{30°, 150°}', '{30°, 210°}', '{60°, 120°}', '{30°, 330°}'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'sin x = 1/2 → x = 30° (kuadran I) atau x = 180°-30° = 150° (kuadran II).',
    },
    {
      question: 'Himpunan penyelesaian dari cos x = 1/2 untuk 0° ≤ x ≤ 360° adalah ...',
      options: ['{30°, 330°}', '{60°, 300°}', '{60°, 120°}', '{30°, 150°}'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'cos x = 1/2 → x = 60° (kuadran I) atau x = 360°-60° = 300° (kuadran IV).',
    },
    {
      question: 'Persamaan tan x = √3 untuk 0° ≤ x ≤ 180° memiliki penyelesaian x = ...',
      options: ['30°', '45°', '60°', '90°'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'tan x = √3 → x = 60° (kuadran I). Karena periode tan 180°, maka x = 60° adalah satu-satunya penyelesaian dalam interval 0° ≤ x ≤ 180°.',
    },
    {
      question: 'Himpunan penyelesaian dari sin 2x = 1/2 untuk 0° ≤ x ≤ 180° adalah ...',
      options: ['{15°, 75°}', '{15°, 105°}', '{30°, 150°}', '{30°, 60°}'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: 'sin 2x = 1/2 → 2x = 30° atau 2x = 150°. Maka x = 15° atau x = 75°.',
    },
    {
      question: 'Bentuk umum penyelesaian persamaan sin x = sin a adalah ...',
      options: ['x = a + k·360° atau x = (180°-a) + k·360°', 'x = a + k·360°', 'x = a + k·180°', 'x = ±a + k·360°'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Penyelesaian sin x = sin a: x = a + k·360° atau x = (180°-a) + k·360°, dengan k bilangan bulat.',
    }],

  [quizKey('Matematika', 'Limit', 'Konsep Limit Fungsi')]: [
    {
      question: 'Nilai dari lim(x→2) (3x + 1) adalah ...',
      options: ['5', '6', '7', '8'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Substitusi langsung: 3(2) + 1 = 6 + 1 = 7.',
    },
    {
      question: 'Nilai dari lim(x→3) (x² - 9)/(x - 3) adalah ...',
      options: ['0', '3', '6', '9'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Faktorkan: (x²-9)/(x-3) = (x-3)(x+3)/(x-3) = x+3. Maka lim(x→3)(x+3) = 6.',
    },
    {
      question: 'Nilai dari lim(x→0) sin x / x adalah ...',
      options: ['0', '1', '∞', 'tidak ada'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'lim(x→0) sin x / x = 1. Ini adalah limit trigonometri fundamental.',
    },
    {
      question: 'Nilai dari lim(x→1) (x² - 1)/(x - 1) adalah ...',
      options: ['0', '1', '2', '3'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: '(x²-1)/(x-1) = (x-1)(x+1)/(x-1) = x+1. Maka lim(x→1)(x+1) = 2.',
    },
    {
      question: 'Jika lim(x→a) f(x) = L dan lim(x→a) g(x) = M, maka lim(x→a) [f(x)g(x)] = ...',
      options: ['L + M', 'L - M', 'L × M', 'L / M'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Sifat limit: limit dari perkalian fungsi = perkalian dari masing-masing limit = L × M.',
    }],

  [quizKey('Matematika', 'Limit', 'Limit Tak Hingga')]: [
    {
      question: 'Nilai dari lim(x→∞) 1/x adalah ...',
      options: ['1', '0', '∞', 'tidak ada'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Jika x semakin besar mendekati tak hingga, 1/x semakin mendekati 0.',
    },
    {
      question: 'Nilai dari lim(x→∞) (2x² + 3x - 1)/(x² + 5) adalah ...',
      options: ['0', '1', '2', '∞'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Bagi pembilang dan penyebut dengan x²: lim(x→∞) (2 + 3/x - 1/x²)/(1 + 5/x²) = 2/1 = 2.',
    },
    {
      question: 'Nilai dari lim(x→∞) (3x - 2)/(2x + 1) adalah ...',
      options: ['0', '1/2', '3/2', '∞'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Bagi dengan x: lim(x→∞) (3 - 2/x)/(2 + 1/x) = 3/2.',
    },
    {
      question: 'Nilai dari lim(x→∞) (x³ - 4x)/(x² + x) adalah ...',
      options: ['0', '1', '∞', '-4'],
      correctIndex: 2,
      difficulty: 'hard',
      explanation: 'Bagi dengan x³: lim(x→∞) (1 - 4/x²)/(1/x + 1/x²) = 1/0 = ∞ (pembilang lebih besar dari penyebut).',
    },
    {
      question: 'Nilai dari lim(x→∞) (√(4x²+5x) - 2x) adalah ...',
      options: ['0', '5/4', '∞', '2'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Rasionalkan: (√(4x²+5x)-2x) × (√(4x²+5x)+2x)/(√(4x²+5x)+2x) = (5x)/(√(4x²+5x)+2x). Bagi x: 5/(√(4+5/x)+2) → 5/(2+2) = 5/4.',
    }],

  [quizKey('Matematika', 'Turunan', 'Konsep Turunan')]: [
    {
      question: 'Turunan pertama dari f(x) = 3x² adalah ...',
      options: ['3x', '6x', '3x²', '6x²'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'f\'(x) = 2·3x²⁻¹ = 6x.',
    },
    {
      question: 'Turunan dari f(x) = x³ + 2x² - 5x + 7 adalah ...',
      options: ['3x² + 4x - 5', '3x² + 2x - 5', 'x² + 4x - 5', '3x² + 4x + 5'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'f\'(x) = 3x² + 4x - 5. Turunan konstanta 7 adalah 0.',
    },
    {
      question: 'Turunan dari f(x) = (2x + 3)(x - 1) adalah ...',
      options: ['4x + 1', '4x - 1', '2x + 1', '4x + 3'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Gunakan aturan perkalian: f\'(x) = 2(x-1) + (2x+3)(1) = 2x-2+2x+3 = 4x+1.',
    },
    {
      question: 'Jika f(x) = 5x⁴ - 3x² + 2x, maka f\'(-1) = ...',
      options: ['-20', '-12', '-16', '-8'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'f\'(x) = 20x³ - 6x + 2. f\'(-1) = 20(-1)³ - 6(-1) + 2 = -20 + 6 + 2 = -12.',
    },
    {
      question: 'Turunan dari f(x) = 2/x adalah ...',
      options: ['2/x²', '-2/x²', '2/x', '-2/x'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'f(x) = 2x⁻¹. f\'(x) = -2x⁻² = -2/x².',
    }],

  [quizKey('Matematika', 'Turunan', 'Aplikasi Turunan')]: [
    {
      question: 'Fungsi f(x) = x² - 6x + 5 naik pada interval ...',
      options: ['x < 3', 'x > 3', 'x < -3', 'x > -3'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'f\'(x) = 2x - 6. Fungsi naik jika f\'(x) > 0 → 2x - 6 > 0 → x > 3.',
    },
    {
      question: 'Nilai maksimum fungsi f(x) = -x² + 4x + 1 adalah ...',
      options: ['3', '5', '7', '9'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'f\'(x) = -2x + 4 = 0 → x = 2. f(2) = -4 + 8 + 1 = 5. Nilai maksimum = 5.',
    },
    {
      question: 'Garis singgung kurva y = x² - 3x + 2 di titik (1, 0) memiliki gradien ...',
      options: ['-1', '0', '1', '2'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'y\' = 2x - 3. Gradien di x=1: y\'(1) = 2(1) - 3 = -1.',
    },
    {
      question: 'Suatu proyek dikerjakan x orang dengan biaya per hari (5x - 10 + 250/x) juta rupiah. Biaya minimum diperoleh jika banyak pekerja ...',
      options: ['5', '√50', '√10', '10'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'f(x) = 5x - 10 + 250x⁻¹. f\'(x) = 5 - 250/x² = 0 → 5 = 250/x² → x² = 50 → x = √50.',
    },
    {
      question: 'Turunan kedua dari f(x) = x³ - 3x² + 2x adalah ...',
      options: ['3x² - 6x + 2', '6x - 6', '6x + 6', '3x - 6'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'f\'(x) = 3x² - 6x + 2. f\'\'(x) = 6x - 6.',
    }],

  [quizKey('Matematika', 'Integral', 'Integral Tak Tentu')]: [
    {
      question: 'Hasil dari ∫ 2x dx adalah ...',
      options: ['x² + C', '2x² + C', 'x + C', 'x²/2 + C'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: '∫ 2x dx = (2/2)x² + C = x² + C.',
    },
    {
      question: 'Hasil dari ∫ (3x² + 4x - 1) dx adalah ...',
      options: ['x³ + 2x² - x + C', '3x³ + 4x² - x + C', 'x³ + 4x² - x + C', 'x³ + 2x² + C'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: '∫ 3x² dx = x³, ∫ 4x dx = 2x², ∫ -1 dx = -x. Jadi hasilnya x³ + 2x² - x + C.',
    },
    {
      question: 'Hasil dari ∫ (2x + 3)⁵ dx adalah ...',
      options: ['(2x+3)⁶/6 + C', '(2x+3)⁶/12 + C', '(2x+3)⁶/3 + C', '(2x+3)⁵/5 + C'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: '∫ (2x+3)⁵ dx, subtitusi u = 2x+3, du = 2dx → dx = du/2. ∫ u⁵ du/2 = u⁶/(12) + C = (2x+3)⁶/12 + C.',
    },
    {
      question: 'Hasil dari ∫ (x² - 3)/x² dx adalah ...',
      options: ['x + 3/x + C', 'x - 3/x + C', 'x + 3x⁻¹ + C', '1 - 3/x² + C'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: '(x²-3)/x² = 1 - 3/x². ∫ (1 - 3x⁻²) dx = x - 3(-1)x⁻¹ + C = x + 3/x + C.',
    },
    {
      question: 'Integral tak tentu adalah kebalikan dari ...',
      options: ['Turunan', 'Limit', 'Diferensial', 'Faktorisasi'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Integral tak tentu merupakan kebalikan (invers) dari turunan (diferensial).',
    }],

  [quizKey('Matematika', 'Integral', 'Integral Tentu')]: [
    {
      question: 'Nilai dari ∫₁³ 2x dx adalah ...',
      options: ['4', '6', '8', '10'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: '∫₁³ 2x dx = [x²]₁³ = 3² - 1² = 9 - 1 = 8.',
    },
    {
      question: 'Nilai dari ∫₀² (x² + 1) dx adalah ...',
      options: ['8/3', '14/3', '10/3', '2'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: '∫₀² (x²+1) dx = [x³/3 + x]₀² = (8/3 + 2) - (0 + 0) = 8/3 + 6/3 = 14/3.',
    },
    {
      question: 'Luas daerah yang dibatasi oleh kurva y = x², sumbu x, dan garis x = 1, x = 3 adalah ...',
      options: ['26/3', '28/3', '20/3', '8'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: 'Luas = ∫₁³ x² dx = [x³/3]₁³ = (27/3) - (1/3) = 26/3.',
    },
    {
      question: 'Nilai dari ∫₀^π sin x dx adalah ...',
      options: ['0', '1', '2', '-1'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: '∫₀^π sin x dx = [-cos x]₀^π = (-cos π) - (-cos 0) = -(-1) + 1 = 1 + 1 = 2.',
    },
    {
      question: 'Sifat integral tentu: ∫ₐᵇ f(x) dx = ...',
      options: ['-∫ₐᵇ f(x) dx', '∫ᵇₐ f(x) dx', '-∫ᵇₐ f(x) dx', '∫ₐᵇ -f(x) dx'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Sifat integral tentu: ∫ₐᵇ f(x) dx = -∫ᵇₐ f(x) dx. Jika batas dibalik, nilai integral berubah tanda.',
    }],

  [quizKey('Matematika', 'Matriks', 'Operasi Matriks')]: [
    {
      question: 'Diketahui A = [2 1; 3 4] dan B = [1 0; 2 1]. Hasil A + B adalah ...',
      options: ['[3 1; 5 5]', '[3 1; 5 5]', '[3 1; 1 5]', '[1 1; 5 5]'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'A + B = [2+1 1+0; 3+2 4+1] = [3 1; 5 5].',
    },
    {
      question: 'Hasil kali matriks [1 2; 3 4] × [5; 6] adalah ...',
      options: ['[17; 39]', '[17; 39]', '[13; 29]', '[5; 12]'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: '[1×5+2×6; 3×5+4×6] = [5+12; 15+24] = [17; 39].',
    },
    {
      question: 'Diketahui A = [2 1; -1 3]. Hasil dari 3A adalah ...',
      options: ['[6 3; -3 9]', '[6 3; 3 9]', '[5 4; 2 6]', '[6 1; -1 9]'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: '3A = [3×2 3×1; 3×(-1) 3×3] = [6 3; -3 9].',
    },
    {
      question: 'Matriks A berordo 2×3 dan B berordo 3×4. Hasil perkalian A×B berordo ...',
      options: ['2×3', '3×4', '2×4', '4×2'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Jika A berordo m×n dan B berordo n×p, maka A×B berordo m×p. Jadi 2×4.',
    },
    {
      question: 'Operasi penjumlahan matriks dapat dilakukan jika kedua matriks memiliki ...',
      options: ['Ordo yang sama', 'Elemen yang sama', 'Determinan yang sama', 'Nilai yang sama'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Penjumlahan matriks hanya dapat dilakukan jika kedua matriks memiliki ordo (ukuran) yang sama.',
    }],

  [quizKey('Matematika', 'Matriks', 'Determinan dan Invers')]: [
    {
      question: 'Determinan dari matriks [4 3; 2 1] adalah ...',
      options: ['10', '-2', '2', '-10'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'det(A) = (4×1) - (3×2) = 4 - 6 = -2.',
    },
    {
      question: 'Invers dari matriks [2 1; 5 3] adalah ...',
      options: ['[3 -1; -5 2]', '[3 1; 5 2]', '[-3 1; 5 -2]', '[2 -1; -5 3]'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'det = 6-5=1. Invers = (1/1)×[3 -1; -5 2] = [3 -1; -5 2].',
    },
    {
      question: 'Matriks yang memiliki invers disebut matriks ...',
      options: ['Singular', 'Non-singular', 'Identitas', 'Nol'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Matriks non-singular adalah matriks yang determinannya ≠ 0, sehingga memiliki invers.',
    },
    {
      question: 'Jika matriks [2 3; 1 a] memiliki determinan 5, maka nilai a adalah ...',
      options: ['2', '3', '4', '5'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'det = 2a - 3 = 5 → 2a = 8 → a = 4.',
    },
    {
      question: 'Sifat invers matriks: (AB)⁻¹ = ...',
      options: ['A⁻¹B⁻¹', 'B⁻¹A⁻¹', 'AB⁻¹', 'A⁻¹B'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: '(AB)⁻¹ = B⁻¹A⁻¹. Urutan dibalik, mirip dengan sifat transpose.',
    }],

  [quizKey('Matematika', 'Vektor', 'Vektor Ruang Dimensi')]: [
    {
      question: 'Panjang vektor a = (3, 4) adalah ...',
      options: ['5', '6', '7', '8'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: '|a| = √(3² + 4²) = √(9 + 16) = √25 = 5.',
    },
    {
      question: 'Jika a = (1, -2, 2) dan b = (3, 0, -1), maka a + b = ...',
      options: ['(4, -2, 1)', '(4, 2, 1)', '(4, -2, -1)', '(2, 2, 3)'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'a + b = (1+3, -2+0, 2+(-1)) = (4, -2, 1).',
    },
    {
      question: 'Hasil kali titik (dot product) dari a = (2, 3) dan b = (4, -1) adalah ...',
      options: ['11', '5', '8', '6'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'a·b = (2×4) + (3×(-1)) = 8 - 3 = 5.',
    },
    {
      question: 'Vektor satuan dari a = (3, 0, 4) adalah ...',
      options: ['(3/5, 0, 4/5)', '(3, 0, 4)', '(1, 0, 1)', '(3/7, 0, 4/7)'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: '|a| = √(9+0+16) = 5. Vektor satuan = a/|a| = (3/5, 0, 4/5).',
    },
    {
      question: 'Jika a = (1, 2, 3) dan b = (-1, 0, 2), maka a × b (cross product) adalah ...',
      options: ['(4, -5, 2)', '(4, 5, 2)', '(1, 2, 6)', '(4, -5, -2)'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: 'a×b = ((2×2-3×0), (3×(-1)-1×2), (1×0-2×(-1))) = (4, -5, 2).',
    }],

  // ═══════════════════════════════════════════════════════════════════════════
  //  BAHASA INDONESIA TL — 16 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Bahasa Indonesia', 'Teks Eksposisi', 'Struktur Teks Eksposisi')]: [
    {
      question: 'Struktur teks eksposisi yang benar adalah ...',
      options: ['Pernyataan pendapat, argumentasi, penegasan ulang', 'Orientasi, komplikasi, resolusi', 'Abstrak, orientasi, krisis, reaksi, koda', 'Pernyataan umum, aspek yang dilaporkan'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Struktur teks eksposisi terdiri dari tesis (pernyataan pendapat), argumentasi, dan penegasan ulang.',
    },
    {
      question: 'Bagian teks eksposisi yang berisi gagasan utama penulis disebut ...',
      options: ['Argumentasi', 'Tesis', 'Penegasan ulang', 'Kesimpulan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tesis atau pernyataan pendapat adalah bagian yang berisi gagasan utama atau pandangan penulis tentang suatu topik.',
    },
    {
      question: 'Bagian argumentasi dalam teks eksposisi berfungsi untuk ...',
      options: ['Memperkenalkan topik', 'Memperkuat tesis dengan bukti dan alasan', 'Menyimpulkan isi teks', 'Memberikan orientasi pembaca'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Argumentasi berisi alasan, data, dan bukti yang mendukung dan memperkuat tesis penulis.',
    },
    {
      question: 'Penegasan ulang dalam teks eksposisi terletak di bagian ...',
      options: ['Awal teks', 'Akhir teks', 'Tengah teks', 'Sepanjang teks'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Penegasan ulang (reiteration) terletak di bagian akhir teks, berisi simpulan atau penekanan kembali pada gagasan utama.',
    },
    {
      question: 'Teks eksposisi bertujuan untuk ...',
      options: ['Menghibur pembaca', 'Menjelaskan informasi dan meyakinkan pembaca', 'Menceritakan pengalaman', 'Menggambarkan suatu objek'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Teks eksposisi bertujuan untuk menjelaskan atau memaparkan informasi sekaligus meyakinkan pembaca tentang suatu gagasan.',
    }],

  [quizKey('Bahasa Indonesia', 'Teks Eksposisi', 'Tesis dan Argumen')]: [
    {
      question: 'Tesis dalam teks eksposisi disebut juga ...',
      options: ['Argumentasi', 'Pernyataan pendapat', 'Fakta', 'Opini'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tesis adalah pernyataan pendapat atau gagasan utama penulis yang akan dijelaskan dalam teks eksposisi.',
    },
    {
      question: 'Kalimat berikut yang merupakan contoh tesis adalah ...',
      options: ['Pendidikan karakter perlu diterapkan sejak dini di sekolah.', 'Siswa SD Negeri 1 mengikuti upacara setiap Senin.', 'Buku itu tebalnya 200 halaman.', 'Ia pergi ke sekolah naik sepeda.'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: '"Pendidikan karakter perlu diterapkan sejak dini di sekolah" adalah pernyataan pendapat yang membutuhkan argumen pendukung, sehingga merupakan tesis.',
    },
    {
      question: 'Argumen yang kuat dalam teks eksposisi didukung oleh ...',
      options: ['Opini pribadi', 'Fakta dan data', 'Perasaan penulis', 'Teka-teki'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Argumen yang kuat harus didukung oleh fakta, data, dan bukti empiris, bukan sekadar opini pribadi.',
    },
    {
      question: 'Perbedaan antara tesis dan argumen adalah ...',
      options: ['Tesis berupa pertanyaan, argumen berupa jawaban', 'Tesis adalah pendapat, argumen adalah alasan pendukung', 'Tesis dan argumen sama saja', 'Tesis di akhir, argumen di awal'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Tesis adalah pendapat atau gagasan utama, sedangkan argumen adalah alasan, bukti, atau data yang digunakan untuk mendukung tesis.',
    },
    {
      question: 'Jumlah argumen minimal dalam teks eksposisi biasanya ...',
      options: ['Satu', 'Dua', 'Tiga', 'Tidak ditentukan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Secara umum teks eksposisi minimal memiliki dua argumen untuk memperkuat tesis yang disampaikan.',
    }],

  [quizKey('Bahasa Indonesia', 'Teks Eksposisi', 'Fakta dan Opini')]: [
    {
      question: 'Fakta adalah pernyataan yang ...',
      options: ['Berdasarkan pendapat pribadi', 'Bersifat subjektif', 'Dapat dibuktikan kebenarannya', 'Mengandung imajinasi'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Fakta adalah pernyataan yang bersifat objektif dan dapat dibuktikan kebenarannya secara empiris.',
    },
    {
      question: 'Kalimat berikut yang termasuk opini adalah ...',
      options: ['Indonesia merdeka pada tahun 1945.', 'Matahari terbit dari timur.', 'Menurut saya, film ini sangat bagus.', 'Gunung Everest adalah gunung tertinggi di dunia.'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: '"Menurut saya, film ini sangat bagus" adalah opini karena mengandung penilaian subjektif yang belum tentu disetujui orang lain.',
    },
    {
      question: 'Ciri-ciri fakta adalah ...',
      options: ['Subjektif, mengandung pendapat, belum pasti', 'Objektif, dapat diuji kebenarannya, data akurat', 'Menarik, menghibur, subjektif', 'Panjang, detail, subjektif'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Fakta bersifat objektif, dapat diuji kebenarannya, dan didukung data yang akurat.',
    },
    {
      question: 'Kata yang sering digunakan dalam opini adalah ...',
      options: ['Tahun, tanggal, jumlah', 'Menurut saya, sebaiknya, mungkin', 'Pertama, kedua, ketiga', 'Karena, sehingga, akibatnya'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kata seperti "menurut saya", "sebaiknya", "mungkin" sering digunakan dalam opini karena menunjukkan ketidakpastian atau pandangan pribadi.',
    },
    {
      question: 'Dalam teks eksposisi, fakta digunakan untuk ...',
      options: ['Memperkuat opini penulis', 'Menghibur pembaca', 'Menggantikan argumen', 'Memperpanjang teks'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Fakta digunakan sebagai data pendukung yang memperkuat opini atau argumen penulis dalam teks eksposisi.',
    }],

  [quizKey('Bahasa Indonesia', 'Teks Argumentasi', 'Argumen Logis')]: [
    {
      question: 'Argumen logis adalah argumen yang ...',
      options: ['Berdasarkan emosi', 'Menggunakan nalar dan masuk akal', 'Berdasarkan imajinasi', 'Mengandung unsur humor'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Argumen logis adalah argumen yang menggunakan nalar atau penalaran yang masuk akal dan dapat diterima akal sehat.',
    },
    {
      question: 'Penalaran deduktif dimulai dari ...',
      options: ['Khusus ke umum', 'Umum ke khusus', 'Satu ke semua', 'Setara'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Penalaran deduktif dimulai dari pernyataan umum (premis) ke kesimpulan yang lebih khusus.',
    },
    {
      question: 'Contoh argumen logis adalah ...',
      options: ['Saya tidak suka matematika karena membosankan.', 'Semua manusia membutuhkan oksigen. Adi adalah manusia, maka Adi membutuhkan oksigen.', 'Menurut perasaan saya, belajar itu berat.', 'Gurunya baik hati, jadi semua siswa pasti senang.'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Argumen dengan silogisme: premis mayor (semua manusia butuh oksigen), premis minor (Adi manusia), kesimpulan (Adi butuh oksigen) adalah contoh argumen logis.',
    },
    {
      question: 'Ciri argumen tidak logis adalah ...',
      options: ['Menggunakan data akurat', 'Berbasis fakta', 'Mengandung generalisasi berlebihan', 'Menggunakan silogisme'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Generalisasi berlebihan, seperti menyimpulkan sesuatu dari contoh yang terlalu sedikit, merupakan ciri argumen yang tidak logis.',
    },
    {
      question: 'Penalaran induktif memiliki kesimpulan yang bersifat ...',
      options: ['Pasti', 'Probabilistik (kemungkinan besar)', 'Mutlak', 'Deduktif'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Penalaran induktif (khusus ke umum) menghasilkan kesimpulan yang bersifat probabilistik, tidak mutlak seperti deduktif.',
    }],

  [quizKey('Bahasa Indonesia', 'Teks Argumentasi', 'Bukti dan Data')]: [
    {
      question: 'Data dalam teks argumentasi berfungsi untuk ...',
      options: ['Mempercantik tulisan', 'Memperkuat argumen', 'Menggantikan opini', 'Memperpanjang paragraf'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Data berfungsi sebagai bukti empiris yang memperkuat argumen penulis agar lebih meyakinkan.',
    },
    {
      question: 'Sumber data yang paling kredibel untuk teks argumentasi adalah ...',
      options: ['Gosip', 'Penelitian ilmiah', 'Opini teman', 'Media sosial', 'Tebakan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Penelitian ilmiah merupakan sumber data yang paling kredibel karena melalui metode ilmiah yang teruji.',
    },
    {
      question: 'Contoh data kuantitatif dalam argumentasi adalah ...',
      options: ['Siswa merasa senang', '75% siswa mengalami peningkatan nilai', 'Guru mengajar dengan baik', 'Suasana kelas kondusif'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: '"75% siswa mengalami peningkatan nilai" adalah data kuantitatif karena berupa angka yang dapat diukur secara statistik.',
    },
    {
      question: 'Perbedaan bukti dan opini adalah ...',
      options: ['Bukti bisa diuji, opini subjektif', 'Bukti subjektif, opini objektif', 'Tidak ada perbedaan', 'Bukti dari penulis, opini dari pembaca'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Bukti bersifat objektif dan dapat diuji kebenarannya, sedangkan opini bersifat subjektif tergantung pandangan seseorang.',
    },
    {
      question: 'Data kualitatif dalam teks argumentasi berupa ...',
      options: ['Persentase', 'Hasil wawancara dan deskripsi', 'Statistik', 'Angka dan tabel'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Data kualitatif berbentuk deskripsi, narasi, hasil wawancara, atau pengamatan yang tidak berupa angka.',
    }],

  [quizKey('Bahasa Indonesia', 'Teks Argumentasi', 'Menulis Teks Argumentasi')]: [
    {
      question: 'Langkah pertama dalam menulis teks argumentasi adalah ...',
      options: ['Mengumpulkan data', 'Menentukan topik dan tesis', 'Menulis kesimpulan', 'Menyusun argumen'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Langkah pertama adalah menentukan topik dan merumuskan tesis (pendapat) yang akan diargumentasikan.',
    },
    {
      question: 'Struktur teks argumentasi terdiri dari ...',
      options: ['Pendahuluan, isi, penutup', 'Tesis, argumen, penegasan ulang', 'Orientasi, komplikasi, resolusi', 'Abstrak, koda'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Struktur teks argumentasi: tesis (pendahuluan), rangkaian argumen, dan penegasan ulang (simpulan).',
    },
    {
      question: 'Penulisan argumen yang efektif sebaiknya ...',
      options: ['Satu argumen saja', 'Disusun dari yang terlemah ke terkuat', 'Disusun dari yang terkuat ke terlemah', 'Acak sesuai keinginan'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Argumen sebaiknya disusun dari yang terkuat ke yang lebih lemah agar pembaca langsung terpengaruh oleh argumen paling kuat.',
    },
    {
      question: 'Kalimat penutup dalam teks argumentasi sebaiknya berisi ...',
      options: ['Argumen baru', 'Penegasan kembali tesis', 'Data tambahan', 'Pertanyaan retoris'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Penutup teks argumentasi berisi penegasan kembali tesis atau simpulan dari seluruh argumen yang telah disampaikan.',
    },
    {
      question: 'Kesalahan umum dalam menulis teks argumentasi adalah ...',
      options: ['Menggunakan data akurat', 'Argumen yang konsisten', 'Mencampur fakta dan opini tanpa bukti', 'Struktur yang jelas'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Kesalahan umum adalah mencampuradukkan fakta dan opini tanpa didukung bukti yang jelas, sehingga argumen menjadi lemah.',
    }],

  [quizKey('Bahasa Indonesia', 'Cerita Pendek', 'Analisis Cerpen')]: [
    {
      question: 'Cerita pendek adalah karya sastra yang ...',
      options: ['Panjangnya lebih dari 100 halaman', 'Menceritakan kisah singkat dengan fokus pada satu peristiwa', 'Berisi data dan fakta', 'Tidak memiliki alur'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Cerpen adalah karya sastra prosa yang singkat, fokus pada satu peristiwa atau konflik, dan dapat dibaca dalam sekali duduk.',
    },
    {
      question: 'Alur cerpen yang dimulai dari konflik kemudian menuju masa lalu disebut alur ...',
      options: ['Maju', 'Mundur', 'Campuran', 'Linear'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Alur mundur (flashback) adalah alur yang menceritakan masa lalu setelah memperkenalkan konflik terlebih dahulu.',
    },
    {
      question: 'Latar dalam cerpen mencakup ...',
      options: ['Hanya tempat', 'Tempat, waktu, dan suasana', 'Hanya waktu', 'Karakter tokoh'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Latar (setting) meliputi tiga aspek: tempat terjadinya peristiwa, waktu, dan suasana atau kondisi lingkungan.',
    },
    {
      question: 'Sudut pandang orang pertama menggunakan kata ganti ...',
      options: ['Dia, mereka', 'Aku, saya', 'Kamu, Anda', 'Kita, kami'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sudut pandang orang pertama menggunakan kata ganti "aku" atau "saya", di mana penulis menjadi tokoh dalam cerita.',
    },
    {
      question: 'Konflik dalam cerpen adalah ...',
      options: ['Penyelesaian cerita', 'Permasalahan atau pertentangan dalam cerita', 'Latar tempat', 'Pengenalan tokoh'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Konflik adalah permasalahan, pertentangan, atau ketegangan yang menjadi inti cerita dan mendorong alur.',
    }],

  [quizKey('Bahasa Indonesia', 'Cerita Pendek', 'Unsur Intrinsik Cerpen')]: [
    {
      question: 'Unsur intrinsik cerpen adalah unsur yang ...',
      options: ['Berasal dari luar cerita', 'Membangun cerita dari dalam', 'Terkait latar belakang penulis', 'Berkaitan dengan pembaca'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Unsur intrinsik adalah unsur yang membangun karya sastra dari dalam, seperti tema, tokoh, alur, latar, sudut pandang, amanat.',
    },
    {
      question: 'Tema dalam cerpen adalah ...',
      options: ['Judul cerita', 'Gagasan pokok yang mendasari cerita', 'Tokoh utama', 'Akhir cerita'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tema adalah gagasan sentral atau ide pokok yang menjadi dasar pengembangan cerita.',
    },
    {
      question: 'Tokoh yang memiliki peran penting dan sering muncul disebut tokoh ...',
      options: ['Figuran', 'Utama', 'Tambahan', 'Antagonis'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tokoh utama (protagonis) adalah tokoh yang memiliki peran sentral dan sering muncul dalam cerita.',
    },
    {
      question: 'Amanat dalam cerpen adalah ...',
      options: ['Alur cerita', 'Pesan moral yang ingin disampaikan penulis', 'Latar cerita', 'Dialog tokoh'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Amanat adalah pesan moral atau nasihat yang ingin disampaikan penulis kepada pembaca melalui cerita.',
    },
    {
      question: 'Yang bukan termasuk unsur intrinsik cerpen adalah ...',
      options: ['Alur', 'Latar', 'Biografi penulis', 'Tokoh'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Biografi penulis adalah unsur ekstrinsik, bukan intrinsik. Unsur intrinsik meliputi tema, tokoh, alur, latar, sudut pandang, gaya bahasa, dan amanat.',
    }],

  [quizKey('Bahasa Indonesia', 'Cerita Pendek', 'Menulis Cerpen')]: [
    {
      question: 'Langkah pertama dalam menulis cerpen adalah ...',
      options: ['Menulis dialog', 'Menentukan tema dan ide cerita', 'Menentukan judul', 'Membuat alur'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Langkah pertama adalah menentukan tema dan ide cerita, karena tema menjadi dasar pengembangan seluruh elemen cerpen.',
    },
    {
      question: 'Pengembangan konflik dalam cerpen sebaiknya ...',
      options: ['Dihilangkan agar cerita pendek', 'Dikembangkan secara bertahap menuju klimaks', 'Langgsung diselesaikan', 'Tidak perlu ada konflik'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Konflik perlu dikembangkan secara bertahap (gradual) menuju puncak ketegangan (klimaks) agar cerita menarik.',
    },
    {
      question: 'Ciri khas cerpen yang baik adalah ...',
      options: ['Panjang dan detail', 'Singkat, padat, dan memiliki kesan mendalam', 'Tidak memiliki akhir', 'Berisi data statistik'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Cerpen yang baik bersifat singkat dan padat namun mampu meninggalkan kesan mendalam bagi pembaca.',
    },
    {
      question: 'Penggunaan dialog dalam cerpen berfungsi untuk ...',
      options: ['Memperpanjang cerita', 'Menghidupkan karakter dan memajukan alur', 'Menggantikan narasi', 'Menambah halaman'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Dialog berfungsi untuk menghidupkan karakter tokoh, menunjukkan interaksi, dan memajukan alur cerita.',
    },
    {
      question: 'Yang perlu diperhatikan dalam menulis cerpen agar menarik adalah ...',
      options: ['Menggunakan kalimat panjang dan rumit', 'Memilih diksi yang tepat dan menciptakan konflik menarik', 'Menghindari konflik', 'Menulis tanpa revisi'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pemilihan diksi (pilihan kata) yang tepat dan konflik yang menarik adalah kunci cerpen yang berkualitas.',
    }],

  [quizKey('Bahasa Indonesia', 'Novel', 'Unsur Intrinsik Novel')]: [
    {
      question: 'Perbedaan novel dengan cerpen terletak pada ...',
      options: ['Tema', 'Jumlah kata dan kompleksitas cerita', 'Jumlah tokoh saja', 'Latar'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Novel memiliki jumlah kata lebih banyak, alur lebih kompleks, dan pengembangan karakter yang lebih mendalam dibanding cerpen.',
    },
    {
      question: 'Penokohan dalam novel adalah ...',
      options: ['Latar cerita', 'Penggambaran watak atau karakter tokoh', 'Alur cerita', 'Tema cerita'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Penokohan adalah penggambaran watak, karakter, dan kepribadian tokoh dalam novel.',
    },
    {
      question: 'Tokoh antagonis adalah tokoh yang ...',
      options: ['Mendukung tokoh utama', 'Berlawanan atau menjadi lawan tokoh utama', 'Netral', 'Tidak penting'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tokoh antagonis adalah tokoh yang menjadi lawan atau penghalang bagi tokoh utama (protagonis).',
    },
    {
      question: 'Alur maju dalam novel berarti cerita bergerak ...',
      options: ['Mundur ke masa lalu', 'Secara kronologis dari awal ke akhir', 'Acak', 'Berputar-putar'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Alur maju (kronologis) adalah alur yang bergerak maju secara linear dari awal peristiwa hingga akhir cerita.',
    },
    {
      question: 'Gaya bahasa dalam novel adalah ...',
      options: ['Tema cerita', 'Cara khas penulis dalam menggunakan bahasa', 'Latar cerita', 'Alur cerita'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Gaya bahasa (style) adalah cara khas penulis dalam memilih kata, menyusun kalimat, dan menggunakan majas dalam novel.',
    }],

  [quizKey('Bahasa Indonesia', 'Novel', 'Nilai dalam Novel')]: [
    {
      question: 'Nilai moral dalam novel berkaitan dengan ...',
      options: ['Keindahan', 'Ajaran tentang baik dan buruk', 'Pengetahuan ilmiah', 'Sistem pemerintahan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Nilai moral adalah nilai yang berkaitan dengan ajaran tentang perilaku baik dan buruk dalam kehidupan.',
    },
    {
      question: 'Nilai sosial dalam novel tercermin dari ...',
      options: ['Hubungan antar tokoh dan interaksi masyarakat', 'Keindahan bahasa', 'Alur cerita', 'Latar tempat'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Nilai sosial tercermin dari interaksi, hubungan, dan norma-norma yang berlaku dalam masyarakat yang digambarkan dalam novel.',
    },
    {
      question: 'Nilai budaya dalam novel berkaitan dengan ...',
      options: ['Tradisi, adat istiadat, dan kebiasaan masyarakat', 'Perekonomian', 'Sistem politik'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Nilai budaya berkaitan dengan tradisi, adat istiadat, kesenian, dan kebiasaan yang berkembang dalam suatu masyarakat.',
    },
    {
      question: 'Nilai agama dalam novel dapat ditemukan melalui ...',
      options: ['Ajaran moral keagamaan dan perilaku religius tokoh', 'Deskripsi alam', 'Alur cerita'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Nilai agama tercermin dari ajaran-ajaran keagamaan, perilaku religius tokoh, dan nilai-nilai spiritual dalam novel.',
    },
    {
      question: 'Nilai estetis dalam novel berkaitan dengan ...',
      options: ['Keindahan dan seni dalam karya sastra', 'Fakta sejarah', 'Data ilmiah'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Nilai estetis adalah nilai keindahan yang terdapat dalam novel, baik dari segi bahasa, alur, maupun penggambaran.',
    }],

  [quizKey('Bahasa Indonesia', 'Drama', 'Naskah Drama')]: [
    {
      question: 'Naskah drama adalah ...',
      options: ['Cerita panjang', 'Tulisan berisi dialog dan arahan pementasan', 'Puisi', 'Laporan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Naskah drama adalah teks tertulis yang berisi dialog antar tokoh dan arahan teknis (stage direction) untuk pementasan.',
    },
    {
      question: 'Kramagung dalam naskah drama adalah ...',
      options: ['Judul drama', 'Petunjuk perilaku, gerak, atau ekspresi tokoh', 'Dialog tokoh', 'Nama pemeran'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kramagung adalah petunjuk teknis yang memberi arahan tentang gerak, ekspresi, atau perilaku tokoh dalam tanda kurung.',
    },
    {
      question: 'Bagian naskah drama yang berisi percakapan antar tokoh disebut ...',
      options: ['Monolog', 'Dialog', 'Prolog', 'Epilog'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Dialog adalah percakapan antara dua tokoh atau lebih dalam naskah drama.',
    },
    {
      question: 'Prolog dalam drama adalah ...',
      options: ['Kata penutup', 'Kata pengantar atau pembukaan drama', 'Dialog utama', 'Adegan akhir'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Prolog adalah pembukaan atau pengantar yang disampaikan sebelum pertunjukan drama dimulai.',
    },
    {
      question: 'Menulis naskah drama yang baik perlu memperhatikan ...',
      options: ['Hanya dialog', 'Struktur alur, karakterisasi dialog, dan kramagung', 'Hanya latar', 'Jumlah halaman'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Penulisan naskah drama perlu memperhatikan struktur alur, pengembangan karakter melalui dialog, dan kramagung yang jelas.',
    }],

  [quizKey('Bahasa Indonesia', 'Drama', 'Pementasan Drama')]: [
    {
      question: 'Unsur utama dalam pementasan drama adalah ...',
      options: ['Penonton', 'Aktor, naskah, sutradara, panggung', 'Biaya', 'Kritikus'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Unsur utama pementasan drama meliputi aktor (pemain), naskah, sutradara, dan panggung (tata panggung).',
    },
    {
      question: 'Sutradara dalam pementasan drama bertugas ...',
      options: ['Memerankan tokoh', 'Memimpin dan mengarahkan jalannya pementasan', 'Menulis naskah', 'Membuat properti'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sutradara bertugas memimpin, mengarahkan, dan mengoordinasikan seluruh aspek pementasan drama.',
    },
    {
      question: 'Tata rias dalam pementasan drama berfungsi untuk ...',
      options: ['Mempercantik pemain', 'Menggambarkan karakter dan usia tokoh', 'Menghias panggung', 'Mengatur lampu'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Tata rias berfungsi untuk menggambarkan karakter, usia, kondisi, dan suasana hati tokoh melalui riasan wajah.',
    },
    {
      question: 'Blocking dalam pementasan drama adalah ...',
      options: ['Naskah drama', 'Pengaturan posisi dan perpindahan aktor di panggung', 'Tata lampu', 'Kostum pemain'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Blocking adalah pengaturan posisi pemain di panggung serta perpindahan mereka dari satu posisi ke posisi lain.',
    },
    {
      question: 'Tata lampu dalam pementasan berfungsi untuk ...',
      options: ['Menerangi panggung saja', 'Menciptakan suasana dan fokus perhatian', 'Menghidupkan sound', 'Mengganti kostum'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Tata lampu berfungsi menciptakan suasana (mood), memberikan fokus perhatian, dan memperkuat estetika pementasan.',
    }],

  [quizKey('Bahasa Indonesia', 'Karya Ilmiah', 'Penulisan Karya Ilmiah')]: [
    {
      question: 'Karya ilmiah adalah tulisan yang didasarkan pada ...',
      options: ['Opini pribadi', 'Penelitian dan data yang objektif', 'Imajinasi', 'Pengalaman subjektif'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Karya ilmiah didasarkan pada penelitian, data, dan fakta yang objektif serta menggunakan metode ilmiah.',
    },
    {
      question: 'Tujuan penulisan karya ilmiah adalah ...',
      options: ['Menghibur pembaca', 'Menyajikan informasi dan hasil penelitian secara sistematis', 'Berimajinasi', 'Mempromosikan produk'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tujuan karya ilmiah adalah menyajikan informasi, gagasan, atau hasil penelitian secara sistematis, logis, dan objektif.',
    },
    {
      question: 'Ciri bahasa dalam karya ilmiah adalah ...',
      options: ['Figuratif dan bermajas', 'Baku, jelas, lugas, dan objektif', 'Santai dan akrab', 'Emosional dan subjektif'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Bahasa karya ilmiah harus baku, jelas, lugas (langsung), dan objektif tanpa unsur subjektivitas.',
    },
    {
      question: 'Karya ilmiah populer berbeda dengan karya ilmiah akademik dalam hal ...',
      options: ['Kebenaran data', 'Bahasa yang digunakan lebih ringan dan mudah dipahami', 'Metode penelitian', 'Objek kajian'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Karya ilmiah populer menggunakan bahasa yang lebih ringan dan mudah dipahami masyarakat umum, tanpa mengurangi keakuratan data.',
    },
    {
      question: 'Langkah pertama dalam penulisan karya ilmiah adalah ...',
      options: ['Menulis bab I', 'Menentukan topik dan perumusan masalah', 'Mengumpulkan data', 'Menyusun daftar pustaka'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Langkah pertama adalah menentukan topik yang akan dibahas dan merumuskan masalah secara jelas.',
    }],

  [quizKey('Bahasa Indonesia', 'Karya Ilmiah', 'Sistematika Penulisan')]: [
    {
      question: 'Sistematika penulisan karya ilmiah yang benar adalah ...',
      options: ['Pendahuluan, pembahasan, kesimpulan', 'Abstrak, pendahuluan, kajian teori, metodologi, hasil dan pembahasan, penutup, daftar pustaka', 'Kesimpulan, pendahuluan, isi', 'Hanya pendahuluan dan isi'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Sistematika standar: Abstrak → Pendahuluan → Kajian Teori → Metodologi → Hasil & Pembahasan → Penutup → Daftar Pustaka.',
    },
    {
      question: 'Bagian pendahuluan dalam karya ilmiah berisi ...',
      options: ['Kesimpulan penelitian', 'Latar belakang, rumusan masalah, tujuan penelitian', 'Hasil penelitian', 'Daftar pustaka'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pendahuluan berisi latar belakang masalah, rumusan masalah, tujuan penelitian, dan manfaat penelitian.',
    },
    {
      question: 'Kajian teori dalam karya ilmiah berfungsi untuk ...',
      options: ['Menjelaskan hasil penelitian', 'Memaparkan teori yang relevan sebagai landasan penelitian', 'Penutup', 'Abstrak'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kajian teori memaparkan teori-teori yang relevan dan menjadi landasan konseptual bagi penelitian.',
    },
    {
      question: 'Bagian metodologi dalam karya ilmiah berisi ...',
      options: ['Hasil analisis', 'Cara atau metode yang digunakan dalam penelitian', 'Kesimpulan', 'Saran'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Metodologi berisi penjelasan tentang metode, pendekatan, teknik pengumpulan data, dan teknik analisis yang digunakan.',
    },
    {
      question: 'Abstrak dalam karya ilmiah berisi ...',
      options: ['Daftar pustaka', 'Ringkasan singkat seluruh isi karya ilmiah', 'Bab I pendahuluan', 'Lampiran'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Abstrak adalah ringkasan singkat dan padat yang mencakup latar belakang, tujuan, metode, hasil, dan kesimpulan penelitian.',
    }],

  [quizKey('Bahasa Indonesia', 'Karya Ilmiah', 'Kutipan dan Daftar Pustaka')]: [
    {
      question: 'Kutipan langsung adalah ...',
      options: ['Mengutip dengan bahasa sendiri', 'Mengutip persis seperti sumber aslinya', 'Merangkum ide', 'Menulis ulang dengan gaya sendiri'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kutipan langsung adalah pengutipan yang persis sama dengan teks asli, ditandai dengan tanda petik.',
    },
    {
      question: 'Daftar pustaka disusun secara ...',
      options: ['Acak', 'Alfabetis berdasarkan nama penulis', 'Berdasarkan tahun', 'Berdasarkan topik'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Daftar pustaka disusun secara alfabetis berdasarkan urutan abjad nama belakang penulis.',
    },
    {
      question: 'Penulisan daftar pustaka untuk buku dengan format APA adalah ...',
      options: ['Judul buku. Penulis. Tahun.', 'Penulis. (Tahun). Judul Buku. Penerbit.', 'Tahun. Penulis. Judul.', 'Penerbit. Penulis. Tahun. Judul.'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Format APA: Nama Penulis. (Tahun). Judul Buku. Penerbit.',
    },
    {
      question: 'Fungsi daftar pustaka dalam karya ilmiah adalah ...',
      options: ['Mempercantik tulisan', 'Memberi penghargaan pada sumber rujukan dan menghindari plagiarisme', 'Menambah halaman', 'Menggantikan lampiran'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Daftar pustaka berfungsi sebagai penghargaan terhadap sumber rujukan dan menghindari tuduhan plagiarisme.',
    },
    {
      question: 'Cara menulis kutipan tidak langsung yang benar adalah ...',
      options: ['Menyalin persis dengan tanda petik', 'Menulis ulang ide dengan bahasa sendiri tanpa tanda petik, tetap mencantumkan sumber', 'Tidak perlu mencantumkan sumber', 'Menyalin tanpa menyebut penulis'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kutipan tidak langsung ditulis dengan bahasa sendiri (parafrase) tanpa tanda petik, tetapi tetap mencantumkan sumbernya.',
    }],

  // ═══════════════════════════════════════════════════════════════════════════
  //  BAHASA INGGRIS TL — 12 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Bahasa Inggris', 'Narrative', 'Narrative Text')]: [
    {
      question: 'The purpose of a narrative text is to ...',
      options: ['Persuade the reader', 'Entertain or amuse the reader with a story', 'Explain how something works', 'Describe a place'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Narrative text aims to entertain or amuse readers through a story, often containing a lesson or moral value.',
    },
    {
      question: '"Once upon a time, there lived a beautiful princess named Cinderella." This is an example of ...',
      options: ['Complication', 'Orientation', 'Resolution', 'Coda'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'This sentence introduces the characters and setting, which is the orientation part of a narrative text.',
    },
    {
      question: 'The generic structure of a narrative text is ...',
      options: ['Orientation, complication, resolution', 'Title, introduction, body, conclusion', 'Thesis, argument, reiteration', 'Identification, description'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Narrative structure: Orientation (introduction) → Complication (conflict) → Resolution (solution).',
    },
    {
      question: 'The complication in a narrative text refers to ...',
      options: ['The beginning of the story', 'The problem or conflict in the story', 'The ending of the story', 'The moral lesson'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Complication is the part where the main problem or conflict arises in the story.',
    },
    {
      question: 'A fable is a type of narrative text where the characters are ...',
      options: ['Human beings', 'Animals that act like humans', 'Mythical creatures', 'Historical figures'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'A fable is a narrative where animals or inanimate objects behave like humans, often conveying a moral lesson.',
    }],

  [quizKey('Bahasa Inggris', 'Narrative', 'Struktur Narrative')]: [
    {
      question: 'In narrative text, the orientation usually introduces ...',
      options: ['The solution to the problem', 'The characters, setting, and background', 'The conflict', 'The moral value'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Orientation introduces the characters, time, place, and background information of the story.',
    },
    {
      question: 'The resolution in a narrative text is ...',
      options: ['The introduction of characters', 'How the conflict is solved or ended', 'The climax of the story', 'The beginning of the problem'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Resolution is the part where the conflict is resolved, whether happily or sadly.',
    },
    {
      question: 'Coda in a narrative text contains ...',
      options: ['The problem', 'The moral lesson or message of the story', 'Character description', 'Setting information'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Coda is an optional part that contains the moral lesson or message the author wants to convey.',
    },
    {
      question: 'The climax in a narrative is ...',
      options: ['Orientation', 'Complication', 'Resolution', 'Reorientation'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'The climax is the highest point of tension in the story, where the conflict reaches its peak before being resolved.',
    },
    {
      question: 'A narrative text that uses animals as characters with human traits is called a ...',
      options: ['Legend', 'Fable', 'Myth', 'Fairy tale'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A fable is a narrative featuring animals or inanimate objects that speak and act like humans, usually conveying a moral lesson.',
    }],

  [quizKey('Bahasa Inggris', 'Explanation', 'Explanation Text')]: [
    {
      question: 'The social function of an explanation text is to ...',
      options: ['Tell a story', 'Explain how or why something happens', 'Persuade the reader', 'Describe a person'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Explanation text explains the processes involved in how or why something occurs, such as natural phenomena.',
    },
    {
      question: '"Rain occurs when water vapor in the atmosphere condenses into droplets." This is an example of ...',
      options: ['Narrative text', 'Explanation text', 'Procedure text', 'Descriptive text'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'This sentence explains how rain occurs, which is the function of an explanation text.',
    },
    {
      question: 'The generic structure of an explanation text is ...',
      options: ['Orientation, complication, resolution', 'General statement, explanation sequence, closing', 'Thesis, argument, reiteration', 'Goal, materials, steps'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Explanation text structure: General statement (phenomenon introduced) → Sequenced explanation (how/why) → Closing.',
    },
    {
      question: 'An explanation text mainly uses ...',
      options: ['Past tense', 'Present tense', 'Future tense', 'Past perfect tense'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Explanation text predominantly uses simple present tense because it describes general truths or scientific facts.',
    },
    {
      question: 'Which conjunction is commonly used in explanation texts to show cause and effect?',
      options: ['However', 'Because', 'Moreover', 'Meanwhile'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Conjunctions like "because," "therefore," "as a result," and "so" are used to show cause-and-effect relationships.',
    }],

  [quizKey('Bahasa Inggris', 'Explanation', 'Cause and Effect')]: [
    {
      question: '"The tsunami happened because of the earthquake." The cause in this sentence is ...',
      options: ['Tsunami', 'Earthquake', 'Happened', 'Because of'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'The earthquake is the cause that resulted in the tsunami (the effect).',
    },
    {
      question: 'Which sentence expresses cause and effect?',
      options: ['I went to school yesterday.', 'The heavy rain caused flooding in several areas.', 'She is a good student.', 'The book is on the table.'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: '"Heavy rain" (cause) resulted in "flooding" (effect), showing a clear cause-and-effect relationship.',
    },
    {
      question: 'The word "consequently" is used to introduce ...',
      options: ['A cause', 'An effect', 'A contrast', 'An addition'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: '"Consequently" introduces the result or effect of a previously stated cause.',
    },
    {
      question: '"Due to the pandemic, schools switched to online learning." The effect is ...',
      options: ['The pandemic', 'Schools switched to online learning', 'Due to', 'The pandemic and online learning'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'The pandemic is the cause, and schools switching to online learning is the effect.',
    },
    {
      question: 'Identify the cause: "Lack of sleep leads to decreased concentration."',
      options: ['Decreased concentration', 'Lack of sleep', 'Leads to', 'Concentration'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lack of sleep (cause) results in decreased concentration (effect).',
    }],

  [quizKey('Bahasa Inggris', 'Discussion', 'Discussion Text')]: [
    {
      question: 'The purpose of a discussion text is to ...',
      options: ['Entertain the reader', 'Present arguments from different perspectives on an issue', 'Describe a place', 'Explain a process'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Discussion text presents multiple viewpoints (pros and cons) on an issue before reaching a conclusion.',
    },
    {
      question: 'A discussion text typically begins with ...',
      options: ['Arguments for', 'Arguments against', 'An issue or topic statement', 'A conclusion'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'A discussion text starts by stating the issue or topic being discussed, followed by arguments for and against.',
    },
    {
      question: 'In a discussion text, the conclusion should ...',
      options: ['Only support one side', 'Summarize the discussion and state a balanced position', 'Introduce new arguments', 'Ignore opposing views'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'The conclusion summarizes the discussion and presents a balanced position or recommendation.',
    },
    {
      question: 'Words commonly used in discussion texts to introduce contrasting views are ...',
      options: ['Moreover, in addition', 'However, on the other hand', 'First, next, then', 'For example, such as'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: '"However" and "on the other hand" introduce opposing or contrasting viewpoints in a discussion.',
    },
    {
      question: '"Some people believe that social media brings people closer. Others argue that it reduces face-to-face interaction." This text is a ...',
      options: ['Narrative', 'Explanation', 'Discussion', 'Procedure'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'The text presents two opposing viewpoints on social media, which is characteristic of a discussion text.',
    }],

  [quizKey('Bahasa Inggris', 'Discussion', 'For and Against')]: [
    {
      question: 'In a "For and Against" essay, the paragraph supporting the issue is called ...',
      options: ['Against argument', 'Pros or supporting argument', 'Conclusion', 'Introduction'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Supporting arguments (pros) present reasons in favor of the issue being discussed.',
    },
    {
      question: '"On the one hand, online learning offers flexibility. On the other hand, it lacks social interaction." This shows ...',
      options: ['Cause and effect', 'For and against arguments', 'Sequence of events', 'Description'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'The first part offers a supporting argument (for) while the second presents an opposing view (against).',
    },
    {
      question: 'A balanced "For and Against" discussion should ...',
      options: ['Only present supporting arguments', 'Present both sides fairly', 'Only present opposing arguments', 'Ignore the opposing view'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A balanced discussion presents both supporting and opposing arguments fairly before reaching a conclusion.',
    },
    {
      question: 'Transition words for presenting against arguments are ...',
      options: ['First, second, third', 'However, nevertheless, despite', 'Similarly, likewise', 'Therefore, thus'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Words like "however," "nevertheless," and "despite" are used to introduce arguments against an issue.',
    },
    {
      question: 'The structure of a "For and Against" essay is ...',
      options: ['Introduction, supporting arguments, opposing arguments, conclusion', 'Orientation, complication, resolution', 'Thesis, argument, reiteration', 'Goal, materials, steps'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Structure: Introduction (issue) → Supporting arguments → Opposing arguments → Balanced conclusion.',
    }],

  [quizKey('Bahasa Inggris', 'Review', 'Critical Review')]: [
    {
      question: 'The purpose of a critical review is to ...',
      options: ['Summarize a work', 'Evaluate and critique a work such as a book, film, or article', 'Entertain the reader', 'Tell a story'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A critical review evaluates and critiques a work, discussing its strengths, weaknesses, and overall quality.',
    },
    {
      question: 'A critical review should be based on ...',
      options: ['Personal feelings only', 'Objective analysis and criteria', 'Rumors', 'Other people\'s opinions'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A critical review should be objective, using established criteria to analyze and evaluate the work.',
    },
    {
      question: 'The structure of a review text includes ...',
      options: ['Orientation, evaluation, interpretation, summary', 'Thesis, argument, reiteration', 'Goal, materials, steps', 'General statement, explanation'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Review structure: Orientation (introduction of work) → Evaluation (assessment) → Interpretation (analysis) → Summary.',
    },
    {
      question: '"This novel is beautifully written with rich character development." This sentence is part of ...',
      options: ['Summary', 'Evaluation', 'Orientation', 'Reiteration'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'This sentence evaluates the quality of the novel, specifically praising its writing and character development.',
    },
    {
      question: 'A good critical review should include ...',
      options: ['Only positive points', 'Both strengths and weaknesses of the work', 'Only negative criticism', 'Personal attacks on the author'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A balanced review discusses both strengths and weaknesses to provide a fair and useful critique.',
    }],

  [quizKey('Bahasa Inggris', 'Review', 'Book and Movie Review')]: [
    {
      question: 'In a movie review, the part that gives a brief outline of the story without spoilers is called ...',
      options: ['Evaluation', 'Synopsis', 'Conclusion', 'Recommendation'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A synopsis provides a brief summary of the plot or story without revealing major spoilers.',
    },
    {
      question: '"I would recommend this movie to anyone who enjoys action films." This is part of ...',
      options: ['Orientation', 'Recommendation', 'Synopsis', 'Evaluation'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A recommendation tells the reader who might enjoy the work and whether they should watch/read it.',
    },
    {
      question: 'What aspects are evaluated in a book review?',
      options: ['Plot, character, writing style, themes', 'Only the cover design', 'Page count', 'Publisher\'s location'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Book reviews evaluate elements such as plot, character development, writing style, and thematic depth.',
    },
    {
      question: 'In a movie review, "cinematography" refers to ...',
      options: ['The acting quality', 'The visual style and camera work', 'The soundtrack', 'The dialogue'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Cinematography refers to the art of photography and camera work in filmmaking.',
    },
    {
      question: '"The acting was superb, but the plot was predictable." This sentence shows ...',
      options: ['Only positive evaluation', 'Balanced evaluation with strengths and weaknesses', 'Only negative evaluation', 'Neutral comment'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'The sentence includes both a strength (superb acting) and a weakness (predictable plot), showing balanced evaluation.',
    }],

  [quizKey('Bahasa Inggris', 'Speech', 'Public Speaking')]: [
    {
      question: 'The first step in preparing a public speech is to ...',
      options: ['Memorize the script', 'Determine the purpose and audience', 'Practice gestures', 'Write the conclusion'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Before writing, identify the purpose of the speech and understand who the audience is.',
    },
    {
      question: 'Eye contact during public speaking is important because it ...',
      options: ['Helps memorize the speech', 'Builds connection and engagement with the audience', 'Replaces the need for notes', 'Makes the speaker nervous'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Eye contact helps build rapport, shows confidence, and keeps the audience engaged.',
    },
    {
      question: 'Effective body language in public speaking includes ...',
      options: ['Crossed arms', 'Natural gestures and open posture', 'Looking at the floor', 'Standing completely still'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Natural gestures and open posture convey confidence and help emphasize key points.',
    },
    {
      question: 'The structure of a good speech is ...',
      options: ['Opening, body, closing', 'Orientation, complication, resolution', 'Goal, steps, result', 'Topic, arguments, conclusion'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'A speech typically has an opening (introduction), body (main content), and closing (conclusion).',
    },
    {
      question: 'To overcome nervousness when speaking in public, you should ...',
      options: ['Avoid looking at the audience', 'Prepare well and practice beforehand', 'Speak as fast as possible', 'Read the entire speech from paper'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Good preparation and practice are the best ways to reduce nervousness and build confidence.',
    }],

  [quizKey('Bahasa Inggris', 'Speech', 'Persuasive Speech')]: [
    {
      question: 'The purpose of a persuasive speech is to ...',
      options: ['Entertain the audience', 'Convince the audience to adopt a certain viewpoint or take action', 'Inform the audience', 'Tell a story'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A persuasive speech aims to influence the audience\'s beliefs, attitudes, or actions.',
    },
    {
      question: '"Imagine a world where every child has access to quality education." This rhetorical device is called ...',
      options: ['Repetition', 'Rhetorical question', 'Emotive language', 'Appeal to logic'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'This uses emotive language to create an emotional appeal and paint a vivid picture for the audience.',
    },
    {
      question: 'Ethos in persuasive speaking refers to ...',
      options: ['Emotional appeal', 'Credibility and trustworthiness of the speaker', 'Logical argument', 'Use of humor'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ethos is an appeal based on the character, credibility, and authority of the speaker.',
    },
    {
      question: '"According to research, 80% of students benefit from online learning." This is an example of ...',
      options: ['Ethos', 'Pathos', 'Logos', 'Kairos'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Logos is an appeal to logic and reason, often using data, statistics, and facts.',
    },
    {
      question: 'A hook in a persuasive speech is used to ...',
      options: ['End the speech', 'Grab the audience\'s attention at the beginning', 'Provide evidence', 'Summarize the speech'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'A hook is an attention-grabbing opening, such as a surprising fact, question, or story.',
    }],

  [quizKey('Bahasa Inggris', 'Academic', 'Academic Writing')]: [
    {
      question: 'Academic writing is characterized by ...',
      options: ['Casual and informal language', 'Formal tone, objective, and evidence-based', 'Personal opinions and emotions', 'Short and fragmented sentences'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Academic writing uses formal language, maintains objectivity, and is supported by evidence and citations.',
    },
    {
      question: 'Which of the following is NOT appropriate in academic writing?',
      options: ['Formal vocabulary', 'Contractions (don\'t, can\'t)', 'Citations and references', 'Logical structure'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Contractions (don\'t, can\'t, won\'t) are considered informal and should be avoided in academic writing.',
    },
    {
      question: 'Paraphrasing in academic writing means ...',
      options: ['Copying text directly', 'Restating someone else\'s ideas in your own words', 'Quoting with citation marks', 'Changing a few words only'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Paraphrasing is expressing someone else\'s ideas in your own words while maintaining the original meaning.',
    },
    {
      question: 'Plagiarism in academic writing is ...',
      options: ['Using citations properly', 'Using someone else\'s work without proper attribution', 'Quoting with quotation marks', 'Listing references'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Plagiarism is presenting someone else\'s ideas, words, or work as your own without giving credit.',
    },
    {
      question: 'A thesis statement in academic writing should ...',
      options: ['Be vague and general', 'Clearly state the main argument or claim of the paper', 'Be placed at the end', 'Ask a question'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'A thesis statement clearly states the main argument or claim that the paper will defend or prove.',
    }],

  [quizKey('Bahasa Inggris', 'Academic', 'Essay Structure')]: [
    {
      question: 'A standard academic essay consists of ...',
      options: ['Introduction, body paragraphs, conclusion', 'Orientation, complication, resolution', 'Topic sentence, supporting details, closing', 'Thesis, antithesis, synthesis'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'The standard structure is Introduction (thesis) → Body (supporting paragraphs) → Conclusion.',
    },
    {
      question: 'The introduction of an essay should include ...',
      options: ['New evidence', 'A hook, background information, and thesis statement', 'Counterarguments', 'Concluding remarks'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'An introduction grabs attention (hook), provides context, and states the thesis.',
    },
    {
      question: 'Each body paragraph in an essay should begin with a ...',
      options: ['Concluding sentence', 'Topic sentence', 'Quotation', 'Question'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Each body paragraph starts with a topic sentence that states the main idea of that paragraph.',
    },
    {
      question: 'The conclusion of an essay should ...',
      options: ['Introduce new information', 'Restate the thesis and summarize key points', 'Present new arguments', 'End with a question'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'The conclusion restates the thesis in new words and summarizes the main points without adding new information.',
    },
    {
      question: 'Transitions between paragraphs in an essay are important to ...',
      options: ['Make the essay longer', 'Show logical connections between ideas', 'Confuse the reader', 'Eliminate the need for topic sentences'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Transition words and phrases help connect ideas smoothly and show how paragraphs relate to each other.',
    }],

  // ═══════════════════════════════════════════════════════════════════════════
  //  EKONOMI — 15 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Ekonomi', 'Ilmu Ekonomi', 'Konsep Dasar Ekonomi')]: [
    {
      question: 'Ilmu ekonomi adalah ilmu yang mempelajari tentang ...',
      options: ['Cara manusia memenuhi kebutuhan dengan sumber daya terbatas', 'Cara manusia menghasilkan uang', 'Politik dan pemerintahan', 'Sejarah peradaban'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Ilmu ekonomi mempelajari bagaimana manusia mengelola sumber daya yang terbatas untuk memenuhi kebutuhan yang tidak terbatas.',
    },
    {
      question: 'Prinsip ekonomi adalah ...',
      options: ['Mengorbankan sebanyak mungkin untuk hasil tertentu', 'Dengan pengorbanan tertentu mendapat hasil maksimal', 'Menghabiskan semua sumber daya', 'Tidak perlu berhitung dalam bertindak'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Prinsip ekonomi: dengan pengorbanan tertentu, memperoleh hasil yang maksimal; atau dengan pengorbanan minimal, memperoleh hasil tertentu.',
    },
    {
      question: 'Motif ekonomi adalah ...',
      options: ['Tujuan akhir dari kegiatan ekonomi', 'Alasan atau dorongan seseorang melakukan tindakan ekonomi', 'Hasil dari kegiatan ekonomi', 'Cara melakukan produksi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Motif ekonomi adalah dorongan atau alasan yang mendorong manusia untuk melakukan tindakan ekonomi.',
    },
    {
      question: 'Kegiatan ekonomi meliputi ...',
      options: ['Produksi, distribusi, konsumsi', 'Hanya produksi', 'Hanya konsumsi', 'Jual beli saja'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Kegiatan ekonomi terdiri dari tiga sektor utama: produksi (menghasilkan barang/jasa), distribusi (menyalurkan), dan konsumsi (menggunakan).',
    },
    {
      question: 'Ilmu ekonomi menurut Alfred Marshall adalah ...',
      options: ['Studi tentang kekayaan', 'Studi tentang manusia dalam kegiatan sehari-hari mencari nafkah', 'Studi tentang pasar', 'Studi tentang uang'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Alfred Marshall mendefinisikan ekonomi sebagai studi tentang manusia dalam kegiatan bisnis dan mencari nafkah sehari-hari.',
    }],

  [quizKey('Ekonomi', 'Ilmu Ekonomi', 'Kelangkaan dan Pilihan')]: [
    {
      question: 'Kelangkaan (scarcity) terjadi karena ...',
      options: ['Kebutuhan manusia terbatas, sumber daya tidak terbatas', 'Kebutuhan manusia tidak terbatas, sumber daya terbatas', 'Kebutuhan dan sumber daya sama-sama terbatas', 'Sumber daya melimpah'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kelangkaan muncul karena ketidakseimbangan antara kebutuhan manusia yang tidak terbatas dengan sumber daya yang terbatas.',
    },
    {
      question: 'Masalah ekonomi klasik meliputi ...',
      options: ['Produksi, distribusi, konsumsi', 'Apa, bagaimana, untuk siapa diproduksi', 'Inflasi, pengangguran, pertumbuhan', 'Pajak, retribusi, subsidi'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Masalah ekonomi klasik terdiri dari produksi, distribusi, dan konsumsi. Masalah modern: what, how, for whom.',
    },
    {
      question: 'Biaya peluang (opportunity cost) adalah ...',
      options: ['Biaya yang dikeluarkan secara tunai', 'Nilai alternatif terbaik yang dikorbankan saat memilih', 'Biaya produksi', 'Harga barang'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Biaya peluang adalah nilai dari kesempatan terbaik yang hilang ketika kita memilih suatu alternatif.',
    },
    {
      question: 'Jika seorang siswa memilih kuliah daripada bekerja, maka biaya peluangnya adalah ...',
      options: ['Biaya kuliah', 'Gaji yang seharusnya didapat jika bekerja', 'Uang saku', 'Biaya buku'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Biaya peluang kuliah adalah pendapatan yang hilang karena tidak bekerja (gaji yang seharusnya diperoleh).',
    },
    {
      question: 'Sumber daya ekonomi yang paling utama adalah ...',
      options: ['Uang', 'Sumber daya alam, tenaga kerja, modal, dan kewirausahaan', 'Teknologi', 'Mesin'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sumber daya ekonomi terdiri dari faktor produksi: alam (tanah), tenaga kerja (SDM), modal, dan kewirausahaan (entrepreneurship).',
    }],

  [quizKey('Ekonomi', 'Ilmu Ekonomi', 'Pembagian Ilmu Ekonomi')]: [
    {
      question: 'Ilmu ekonomi dibagi menjadi dua cabang utama, yaitu ...',
      options: ['Mikro dan makro', 'Teori dan terapan', 'Klasik dan modern', 'Positif dan normatif'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Cabang utama ilmu ekonomi: mikroekonomi (unit ekonomi individu) dan makroekonomi (perekonomian secara keseluruhan).',
    },
    {
      question: 'Ekonomi mikro mempelajari tentang ...',
      options: ['Pendapatan nasional', 'Perilaku konsumen dan produsen', 'Inflasi dan pengangguran', 'Kebijakan fiskal'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Mikroekonomi mempelajari perilaku unit ekonomi individu seperti konsumen, produsen, dan pasar.',
    },
    {
      question: 'Yang termasuk kajian ekonomi makro adalah ...',
      options: ['Harga barang di pasar', 'Pendapatan nasional dan inflasi', 'Permintaan individu', 'Biaya produksi perusahaan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ekonomi makro mengkaji variabel agregat seperti pendapatan nasional, inflasi, pengangguran, dan pertumbuhan ekonomi.',
    },
    {
      question: 'Ekonomi deskriptif adalah ilmu ekonomi yang ...',
      options: ['Memberikan saran pemecahan masalah', 'Menggambarkan kondisi ekonomi berdasarkan fakta', 'Mempelajari teori abstrak', 'Menganalisis kebijakan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ekonomi deskriptif menggambarkan kondisi dan fakta ekonomi apa adanya tanpa memberikan penilaian.',
    },
    {
      question: 'Pernyataan "Seharusnya pemerintah menurunkan pajak" termasuk dalam ...',
      options: ['Ekonomi positif', 'Ekonomi normatif', 'Ekonomi deskriptif', 'Ekonomi terapan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ekonomi normatif berisi pernyataan "seharusnya" (what ought to be) yang bersifat subjektif berdasarkan nilai tertentu.',
    }],

  [quizKey('Ekonomi', 'Permintaan dan Penawaran', 'Hukum Permintaan')]: [
    {
      question: 'Hukum permintaan menyatakan bahwa ...',
      options: ['Jika harga naik, permintaan naik', 'Jika harga naik, permintaan turun, ceteris paribus', 'Jika harga turun, permintaan turun', 'Harga tidak mempengaruhi permintaan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Hukum permintaan: hubungan negatif antara harga dan kuantitas yang diminta, dengan asumsi faktor lain tetap (ceteris paribus).',
    },
    {
      question: 'Faktor yang mempengaruhi permintaan kecuali ...',
      options: ['Harga barang itu sendiri', 'Harga barang substitusi', 'Biaya produksi', 'Selera konsumen'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Biaya produksi mempengaruhi penawaran, bukan permintaan. Permintaan dipengaruhi oleh harga barang, selera, pendapatan, dll.',
    },
    {
      question: 'Kurva permintaan memiliki kemiringan (slope) ...',
      options: ['Positif', 'Negatif', 'Vertikal', 'Horizontal'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kurva permintaan memiliki slope negatif (menurun dari kiri atas ke kanan bawah) sesuai hukum permintaan.',
    },
    {
      question: 'Jika harga kopi naik, permintaan terhadap teh akan ...',
      options: ['Turun', 'Naik', 'Tetap', 'Tidak terpengaruh'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kopi dan teh adalah barang substitusi. Jika harga kopi naik, konsumen beralih ke teh sehingga permintaan teh naik.',
    },
    {
      question: 'Peningkatan pendapatan masyarakat akan meningkatkan permintaan barang ...',
      options: ['Inferior', 'Normal', 'Substitusi', 'Komplementer'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Barang normal adalah barang yang permintaannya naik saat pendapatan naik. Barang inferior justru sebaliknya.',
    }],

  [quizKey('Ekonomi', 'Permintaan dan Penawaran', 'Hukum Penawaran')]: [
    {
      question: 'Hukum penawaran menyatakan bahwa ...',
      options: ['Jika harga naik, penawaran turun', 'Jika harga naik, penawaran naik', 'Harga tidak mempengaruhi penawaran', 'Penawaran selalu tetap'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Hukum penawaran: hubungan positif antara harga dan kuantitas yang ditawarkan. Jika harga naik, produsen menawarkan lebih banyak.',
    },
    {
      question: 'Kurva penawaran memiliki kemiringan (slope) ...',
      options: ['Negatif', 'Positif', 'Vertikal', 'Horizontal'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kurva penawaran memiliki slope positif (naik dari kiri bawah ke kanan atas), mencerminkan hubungan positif harga-kuantitas.',
    },
    {
      question: 'Faktor yang mempengaruhi penawaran adalah ...',
      options: ['Selera konsumen', 'Biaya produksi dan teknologi', 'Pendapatan masyarakat', 'Jumlah penduduk'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Penawaran dipengaruhi oleh biaya produksi, teknologi, harga input, pajak, subsidi, dan ekspektasi produsen.',
    },
    {
      question: 'Jika biaya produksi meningkat, kurva penawaran akan ...',
      options: ['Bergeser ke kanan', 'Bergeser ke kiri', 'Tetap', 'Berputar'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kenaikan biaya produksi mengurangi kemampuan produsen menawarkan barang, sehingga kurva penawaran bergeser ke kiri.',
    },
    {
      question: 'Pemberian subsidi oleh pemerintah akan menyebabkan kurva penawaran ...',
      options: ['Bergeser ke kiri', 'Bergeser ke kanan', 'Tetap', 'Menjadi vertikal'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Subsidi mengurangi biaya produksi, sehingga produsen dapat menawarkan lebih banyak barang. Kurva penawaran bergeser ke kanan.',
    }],

  [quizKey('Ekonomi', 'Permintaan dan Penawaran', 'Keseimbangan Pasar')]: [
    {
      question: 'Keseimbangan pasar terjadi ketika ...',
      options: ['Permintaan sama dengan penawaran', 'Harga setinggi-tingginya', 'Produksi maksimal', 'Konsumsi maksimal'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Keseimbangan pasar (equilibrium) terjadi pada titik di mana jumlah permintaan = jumlah penawaran.',
    },
    {
      question: 'Harga keseimbangan (equilibrium price) adalah harga dimana ...',
      options: ['Produsen untung maksimal', 'Jumlah diminta = jumlah ditawarkan', 'Konsumen puas', 'Barang habis terjual'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Harga keseimbangan adalah harga di mana kuantitas yang diminta konsumen sama dengan kuantitas yang ditawarkan produsen.',
    },
    {
      question: 'Jika harga pasar di atas harga keseimbangan, akan terjadi ...',
      options: ['Excess demand (kelebihan permintaan)', 'Excess supply (kelebihan penawaran)', 'Keseimbangan', 'Krisis'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Harga di atas equilibrium menyebabkan penawaran > permintaan, terjadi surplus (excess supply).',
    },
    {
      question: 'Jika harga pasar di bawah harga keseimbangan, akan terjadi ...',
      options: ['Excess supply', 'Excess demand', 'Keseimbangan', 'Surplus'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Harga di bawah equilibrium menyebabkan permintaan > penawaran, terjadi kekurangan (excess demand).',
    },
    {
      question: 'Diketahui fungsi permintaan Qd = 20 - 2P dan fungsi penawaran Qs = 3P - 5. Harga keseimbangan adalah ...',
      options: ['3', '4', '5', '6'],
      correctIndex: 2,
      difficulty: 'hard',
      explanation: 'Keseimbangan: Qd = Qs → 20 - 2P = 3P - 5 → 20 + 5 = 3P + 2P → 25 = 5P → P = 5.',
    }],

  [quizKey('Ekonomi', 'Pasar', 'Struktur Pasar')]: [
    {
      question: 'Struktur pasar adalah ...',
      options: ['Lokasi tempat jual beli', 'Klasifikasi pasar berdasarkan karakteristik tertentu', 'Harga barang di pasar', 'Jumlah uang beredar'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Struktur pasar mengklasifikasikan pasar berdasarkan jumlah penjual, jenis produk, hambatan masuk, dan kekuasaan harga.',
    },
    {
      question: 'Pasar persaingan sempurna memiliki ciri ...',
      options: ['Banyak penjual dan pembeli, produk homogen', 'Satu penjual', 'Beberapa penjual dominan', 'Produk terdiferensiasi'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Ciri pasar persaingan sempurna: banyak penjual dan pembeli, produk homogen, bebas masuk/keluar, price taker.',
    },
    {
      question: 'Pasar monopoli adalah pasar yang ...',
      options: ['Dikuasai oleh satu penjual', 'Dikuasai oleh banyak penjual', 'Dikuasai oleh beberapa penjual', 'Tidak ada penjual'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Monopoli adalah struktur pasar di mana hanya ada satu penjual yang menguasai pasar dan menjadi price maker.',
    },
    {
      question: 'Pasar oligopoli memiliki ciri ...',
      options: ['Banyak perusahaan kecil', 'Beberapa perusahaan besar mendominasi', 'Satu perusahaan', 'Produk homogen sempurna'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Oligopoli adalah pasar yang didominasi oleh beberapa perusahaan besar, bisa dengan produk homogen atau terdiferensiasi.',
    },
    {
      question: 'Monopolistik adalah pasar yang memiliki ciri ...',
      options: ['Satu penjual, banyak pembeli', 'Banyak penjual, produk terdiferensiasi', 'Banyak penjual, produk homogen', 'Beberapa penjual dominan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pasar monopolistik: banyak penjual dengan produk yang terdiferensiasi (berbeda ciri/merek).',
    }],

  [quizKey('Ekonomi', 'Pasar', 'Pasar Persaingan Sempurna')]: [
    {
      question: 'Dalam pasar persaingan sempurna, penjual disebut ...',
      options: ['Price maker', 'Price taker', 'Price setter', 'Price leader'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Penjual di pasar persaingan sempurna adalah price taker, artinya menerima harga pasar karena tidak bisa memengaruhi harga.',
    },
    {
      question: 'Kurva permintaan yang dihadapi perusahaan dalam pasar persaingan sempurna berbentuk ...',
      options: ['Menurun', 'Horizontal', 'Vertikal', 'Melengkung'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kurva permintaan perusahaan adalah horizontal (elastis sempurna) karena perusahaan dapat menjual berapa pun pada harga pasar.',
    },
    {
      question: 'Dalam jangka panjang, perusahaan di pasar persaingan sempurna memperoleh ...',
      options: ['Laba super normal', 'Laba normal (normal profit)', 'Rugi terus menerus', 'Laba maksimum tidak terbatas'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Dalam jangka panjang, karena bebas masuk/keluar, perusahaan hanya memperoleh laba normal (normal profit = 0 economic profit).',
    },
    {
      question: 'Syarat maksimisasi laba perusahaan persaingan sempurna adalah ...',
      options: ['P = MC', 'P > MC', 'P < MC', 'P = AC'],
      correctIndex: 0,
      difficulty: 'hard',
      explanation: 'Perusahaan memaksimalkan laba ketika P = MC (harga sama dengan biaya marjinal), di mana MR = MC.',
    },
    {
      question: 'Keuntungan pasar persaingan sempurna bagi konsumen adalah ...',
      options: ['Harga tinggi, kualitas rendah', 'Harga murah, efisiensi tinggi', 'Produk bervariasi', 'Iklan menarik'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pasar persaingan sempurna menghasilkan harga paling murah dan efisiensi tinggi karena adanya persaingan.',
    }],

  [quizKey('Ekonomi', 'Pasar', 'Pasar Persaingan Tidak Sempurna')]: [
    {
      question: 'Pasar persaingan tidak sempurna meliputi ...',
      options: ['Monopoli, oligopoli, monopolistik', 'Persaingan sempurna saja', 'Pasar tradisional', 'Pasar modal'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Pasar persaingan tidak sempurna mencakup monopoli, oligopoli, dan persaingan monopolistik.',
    },
    {
      question: 'Dalam pasar monopoli, penjual disebut ...',
      options: ['Price taker', 'Price maker', 'Price follower', 'Price acceptor'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Monopolis adalah price maker karena sebagai satu-satunya penjual, ia dapat menentukan harga.',
    },
    {
      question: 'Praktik diskriminasi harga dilakukan oleh pasar ...',
      options: ['Persaingan sempurna', 'Monopoli', 'Oligopoli', 'Monopolistik'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Diskriminasi harga (harga berbeda untuk konsumen berbeda) umumnya dilakukan oleh perusahaan monopoli.',
    },
    {
      question: 'Kartel adalah bentuk kerja sama yang sering terjadi di pasar ...',
      options: ['Monopoli', 'Oligopoli', 'Persaingan sempurna', 'Monopolistik'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kartel adalah kesepakatan antar perusahaan oligopoli untuk mengatur harga dan output, seperti OPEC.',
    },
    {
      question: 'Diferensiasi produk paling menonjol di pasar ...',
      options: ['Persaingan sempurna', 'Monopolistik', 'Monopoli', 'Oligopoli homogen'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Diferensiasi produk (produk berbeda kualitas, merek, kemasan) adalah ciri utama pasar monopolistik.',
    }],

  [quizKey('Ekonomi', 'Kebijakan Moneter', 'Bank dan Lembaga Keuangan')]: [
    {
      question: 'Fungsi utama bank adalah ...',
      options: ['Menjual barang', 'Menghimpun dan menyalurkan dana masyarakat', 'Mencetak uang', 'Mengatur anggaran negara'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Fungsi utama bank: intermediasi keuangan, yaitu menghimpun dana (simpanan) dan menyalurkan dana (kredit) ke masyarakat.',
    },
    {
      question: 'Bank sentral di Indonesia adalah ...',
      options: ['Bank Mandiri', 'Bank Indonesia', 'Bank Rakyat Indonesia', 'Bank Negara Indonesia'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Bank Indonesia adalah bank sentral yang bertugas menjaga stabilitas moneter dan sistem keuangan.',
    },
    {
      question: 'Tugas Bank Indonesia antara lain ...',
      options: ['Memberikan kredit usaha', 'Mengatur dan menjaga kelancaran sistem pembayaran', 'Menerima simpanan masyarakat', 'Melayani transfer uang'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Tugas BI: menetapkan kebijakan moneter, mengatur sistem pembayaran, dan menjaga stabilitas sistem keuangan.',
    },
    {
      question: 'Lembaga keuangan bukan bank (LKBB) contohnya adalah ...',
      options: ['Bank Mandiri', 'Perusahaan asuransi', 'BRI', 'BNI'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'LKBB meliputi asuransi, pegadaian, dana pensiun, leasing, dan pasar modal. Bank adalah lembaga keuangan bank.',
    },
    {
      question: 'Otoritas Jasa Keuangan (OJK) mengawasi ...',
      options: ['Hanya bank', 'Seluruh lembaga jasa keuangan', 'Hanya pasar modal', 'Hanya asuransi'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'OJK mengawasi dan mengatur seluruh lembaga jasa keuangan termasuk perbankan, pasar modal, dan asuransi.',
    }],

  [quizKey('Ekonomi', 'Kebijakan Moneter', 'Inflasi dan Deflasi')]: [
    {
      question: 'Inflasi adalah ...',
      options: ['Penurunan harga secara umum', 'Kenaikan harga secara umum dan terus-menerus', 'Kenaikan harga satu barang', 'Penurunan daya beli uang'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Inflasi adalah kenaikan harga barang dan jasa secara umum yang berlangsung secara terus-menerus.',
    },
    {
      question: 'Penyebab inflasi dari sisi permintaan disebut ...',
      options: ['Cost push inflation', 'Demand pull inflation', 'Structural inflation', 'Imported inflation'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Demand pull inflation terjadi karena peningkatan permintaan agregat yang melebihi kapasitas produksi.',
    },
    {
      question: 'Inflasi yang ringan (di bawah 10% per tahun) disebut ...',
      options: ['Inflasi berat', 'Inflasi sedang', 'Inflasi ringan (creeping inflation)', 'Hiperinflasi'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Creeping inflation adalah inflasi ringan dengan laju di bawah 10% per tahun yang masih dapat dikendalikan.',
    },
    {
      question: 'Kebijakan moneter kontraktif untuk mengatasi inflasi adalah ...',
      options: ['Menurunkan suku bunga', 'Menaikkan suku bunga', 'Menambah jumlah uang beredar', 'Memberi subsidi'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Untuk mengatasi inflasi, Bank Indonesia menaikkan suku bunga (tight money policy) untuk mengurangi jumlah uang beredar.',
    },
    {
      question: 'Deflasi adalah ...',
      options: ['Kenaikan harga umum', 'Penurunan harga secara umum dan terus-menerus', 'Kenaikan daya beli', 'Pertumbuhan ekonomi negatif'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Deflasi adalah kebalikan inflasi, yaitu penurunan harga barang dan jasa secara umum dan terus-menerus.',
    }],

  [quizKey('Ekonomi', 'Kebijakan Fiskal', 'APBN dan APBD')]: [
    {
      question: 'APBN adalah ...',
      options: ['Anggaran Pendapatan dan Belanja Negara', 'Anggaran Pendapatan dan Belanja Daerah', 'Anggaran Pembangunan Nasional', 'Rencana keuangan perusahaan'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'APBN adalah rencana keuangan tahunan pemerintah pusat yang disetujui DPR, meliputi pendapatan dan belanja negara.',
    },
    {
      question: 'APBD disusun oleh pemerintah daerah dan disetujui oleh ...',
      options: ['DPR RI', 'DPRD', 'Presiden', 'Menteri Keuangan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'APBD disusun oleh pemerintah daerah (eksekutif) dan disetujui oleh DPRD (legislatif daerah).',
    },
    {
      question: 'Sumber pendapatan negara dalam APBN berasal dari ...',
      options: ['Pajak, PNBP, hibah', 'Pinjaman luar negeri saja', 'Uang cetak', 'Donasi swasta'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Pendapatan negara bersumber dari pajak, Penerimaan Negara Bukan Pajak (PNBP), dan hibah.',
    },
    {
      question: 'APBN mengalami defisit jika ...',
      options: ['Pendapatan > belanja', 'Belanja > pendapatan', 'Pendapatan = belanja', 'Tidak ada pendapatan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Defisit APBN terjadi ketika belanja negara lebih besar dari pendapatan negara.',
    },
    {
      question: 'Kebijakan fiskal adalah kebijakan pemerintah di bidang ...',
      options: ['Uang beredar', 'Pendapatan dan belanja negara', 'Suku bunga', 'Nilai tukar'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kebijakan fiskal adalah kebijakan yang berkaitan dengan pendapatan (pajak) dan belanja negara yang dilakukan pemerintah.',
    }],

  [quizKey('Ekonomi', 'Kebijakan Fiskal', 'Pajak dan Retribusi')]: [
    {
      question: 'Pajak adalah iuran wajib kepada negara yang bersifat ...',
      options: ['Sukarela dan mendapat imbalan langsung', 'Memaksa dan tanpa imbalan langsung', 'Sukarela tanpa imbalan', 'Memaksa dengan imbalan langsung'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pajak bersifat memaksa (berdasarkan UU) dan tidak mendapat imbalan secara langsung (kontraprestasi tidak langsung).',
    },
    {
      question: 'Pajak Penghasilan (PPh) termasuk jenis pajak ...',
      options: ['Daerah', 'Pusat', 'Retribusi', 'Pajak tidak langsung'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'PPh adalah pajak pusat yang dikelola oleh Direktorat Jenderal Pajak, dikenakan atas penghasilan.',
    },
    {
      question: 'Pajak Pertambahan Nilai (PPN) dikenakan atas ...',
      options: ['Penghasilan seseorang', 'Konsumsi barang/jasa kena pajak', 'Kepemilikan tanah', 'Pendapatan daerah'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'PPN adalah pajak tidak langsung yang dikenakan pada setiap pertambahan nilai dalam transaksi barang/jasa.',
    },
    {
      question: 'Perbedaan pajak dan retribusi adalah ...',
      options: ['Pajak imbalan langsung, retribusi tidak', 'Retribusi mendapat imbalan langsung, pajak tidak', 'Sama saja', 'Keduanya sukarela'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Retribusi mendapat imbalan langsung (misal: retribusi parkir, sampah), sedangkan pajak tidak mendapat imbalan langsung.',
    },
    {
      question: 'Fungsi pajak untuk mengatur kebijakan ekonomi disebut fungsi ...',
      options: ['Budgeter', 'Regulerend', 'Redistribusi', 'Stabilisasi'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Fungsi regulerend (mengatur): pajak digunakan sebagai alat kebijakan untuk mencapai tujuan ekonomi tertentu.',
    }],

  [quizKey('Ekonomi', 'Pembangunan', 'Pertumbuhan Ekonomi')]: [
    {
      question: 'Pertumbuhan ekonomi adalah ...',
      options: ['Peningkatan kesejahteraan rakyat', 'Kenaikan output nasional (PDB) dari waktu ke waktu', 'Penurunan pengangguran', 'Pemerataan pendapatan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pertumbuhan ekonomi diartikan sebagai kenaikan Produk Domestik Bruto (PDB) riil dari suatu periode ke periode berikutnya.',
    },
    {
      question: 'PDB adalah ...',
      options: ['Nilai barang/jasa yang diproduksi warga negara di dalam dan luar negeri', 'Nilai total barang/jasa yang diproduksi di dalam wilayah suatu negara', 'Pendapatan per kapita', 'Jumlah uang beredar'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'PDB (Produk Domestik Bruto) adalah nilai total barang dan jasa akhir yang diproduksi di dalam wilayah suatu negara.',
    },
    {
      question: 'Teori pertumbuhan ekonomi klasik dikemukakan oleh ...',
      options: ['Adam Smith', 'John Maynard Keynes', 'Karl Marx', 'Milton Friedman'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Adam Smith dalam bukunya "The Wealth of Nations" mengemukakan teori pertumbuhan ekonomi klasik yang menekankan spesialisasi.',
    },
    {
      question: 'Faktor utama pertumbuhan ekonomi adalah ...',
      options: ['Sumber daya alam, SDM, modal, teknologi', 'Hanya uang', 'Inflasi', 'Pajak'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Faktor pertumbuhan ekonomi meliputi sumber daya alam, sumber daya manusia, modal (fisik), dan teknologi.',
    },
    {
      question: 'Negara dikatakan mengalami pertumbuhan ekonomi jika PDB riil ...',
      options: ['Menurun', 'Meningkat', 'Tetap', 'Negatif'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pertumbuhan ekonomi ditandai dengan peningkatan PDB riil (PDB yang disesuaikan dengan inflasi) dari tahun ke tahun.',
    }],

  [quizKey('Ekonomi', 'Pembangunan', 'Pembangunan Berkelanjutan')]: [
    {
      question: 'Pembangunan berkelanjutan adalah pembangunan yang ...',
      options: ['Mementingkan pertumbuhan ekonomi saja', 'Memenuhi kebutuhan sekarang tanpa mengorbankan generasi mendatang', 'Hanya fokus lingkungan', 'Mengabaikan ekonomi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pembangunan berkelanjutan (sustainable development) memenuhi kebutuhan kini tanpa mengurangi kemampuan generasi mendatang.',
    },
    {
      question: 'Tiga pilar pembangunan berkelanjutan adalah ...',
      options: ['Ekonomi, sosial, lingkungan', 'Politik, hukum, ekonomi', 'Pendidikan, kesehatan, budaya', 'Pertanian, industri, jasa'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Tiga pilar: ekonomi (pertumbuhan), sosial (keadilan), dan lingkungan (kelestarian), yang harus seimbang.',
    },
    {
      question: 'Indikator keberhasilan pembangunan berkelanjutan selain PDB adalah ...',
      options: ['IPM (Indeks Pembangunan Manusia)', 'Tingkat bunga', 'Jumlah uang beredar', 'Nilai tukar'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'IPM mengukur kualitas hidup manusia melalui kesehatan, pendidikan, dan standar hidup layak.',
    },
    {
      question: 'Pemanasan global adalah contoh kegagalan pembangunan berkelanjutan di pilar ...',
      options: ['Ekonomi', 'Lingkungan', 'Sosial', 'Politik'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pemanasan global akibat emisi karbon berlebihan menunjukkan ketidakseimbangan pada pilar lingkungan.',
    },
    {
      question: 'SDGs (Sustainable Development Goals) memiliki ... tujuan global.',
      options: ['8', '12', '17', '10'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'SDGs memiliki 17 tujuan global yang saling terintegrasi, mencakup pengentasan kemiskinan, pendidikan, lingkungan, dll.',
    }],

  // ═══════════════════════════════════════════════════════════════════════════
  //  GEOGRAFI — 14 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Geografi', 'Peta', 'Dasar Pemetaan')]: [
    {
      question: 'Peta adalah ...',
      options: ['Gambar permukaan bumi di atas kertas', 'Gambaran konvensional permukaan bumi yang diperkecil dengan skala', 'Foto udara', 'Citra satelit'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Peta adalah gambaran permukaan bumi pada bidang datar yang diperkecil dengan skala tertentu dan dilengkapi simbol.',
    },
    {
      question: 'Skala peta 1:500.000 artinya ...',
      options: ['1 cm di peta = 5 km di lapangan', '1 cm di peta = 500.000 km di lapangan', '1 m di peta = 500 m di lapangan', '1 cm di peta = 50 km di lapangan'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: '1:500.000 artinya 1 cm pada peta mewakili 500.000 cm (5 km) di lapangan.',
    },
    {
      question: 'Komponen peta yang menunjukkan arah adalah ...',
      options: ['Legenda', 'Orientasi (mata angin)', 'Inset', 'Skala'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Orientasi atau tanda arah (mata angin) menunjukkan arah utara-selatan pada peta.',
    },
    {
      question: 'Garis lintang (latitude) digunakan untuk ...',
      options: ['Menentukan posisi timur-barat', 'Menentukan posisi utara-selatan', 'Menentukan ketinggian', 'Menghitung jarak'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Garis lintang mengukur jarak dari ekuator ke arah utara atau selatan (0°-90°).',
    },
    {
      question: 'Inset pada peta berfungsi untuk ...',
      options: ['Memperindah peta', 'Menunjukkan lokasi daerah yang dipetakan dalam konteks wilayah yang lebih luas', 'Memberi informasi skala', 'Menunjukkan arah'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Inset adalah peta kecil yang menunjukkan posisi wilayah dipetakan dalam konteks wilayah yang lebih luas.',
    }],

  [quizKey('Geografi', 'Peta', 'Penginderaan Jauh')]: [
    {
      question: 'Penginderaan jauh (remote sensing) adalah ...',
      options: ['Pengukuran jarak secara langsung', 'Teknik memperoleh informasi objek tanpa kontak langsung', 'Pengamatan lapangan', 'Pemetaan manual'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Penginderaan jauh adalah teknik untuk memperoleh informasi tentang suatu objek tanpa menyentuh atau kontak langsung dengan objek tersebut.',
    },
    {
      question: 'Sensor yang digunakan dalam penginderaan jauh adalah ...',
      options: ['Kamera dan satelit', 'Mikroskop', 'Timbangan', 'Termometer biasa'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Sensor penginderaan jauh meliputi kamera (foto udara) dan sensor satelit (Landsat, SPOT, dll).',
    },
    {
      question: 'Interpretasi citra adalah kegiatan ...',
      options: ['Memotret objek', 'Menganalisis dan mengidentifikasi objek pada citra', 'Membuat peta', 'Mengukur jarak'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Interpretasi citra adalah proses mengidentifikasi dan menganalisis objek yang tergambar pada citra penginderaan jauh.',
    },
    {
      question: 'Unsur interpretasi citra yang mengenali objek berdasarkan bentuknya disebut ...',
      options: ['Rona', 'Bentuk (shape)', 'Ukuran', 'Bayangan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Bentuk (shape) adalah ciri objek yang dikenali dari bentuknya, misal: sawah berbentuk kotak, sungai memanjang.',
    },
    {
      question: 'Foto udara yang sumbu kamera tegak lurus permukaan bumi disebut ...',
      options: ['Foto udara vertikal', 'Foto udara miring (oblique)', 'Citra satelit', 'Peta topografi'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Foto vertikal diambil dengan kamera tegak lurus ke bawah, sedangkan foto miring dengan sudut tertentu.',
    }],

  [quizKey('Geografi', 'Peta', 'SIG (Sistem Informasi Geografis)')]: [
    {
      question: 'SIG (Sistem Informasi Geografis) adalah ...',
      options: ['Sistem yang mengolah data geografis berbasis komputer', 'Peta digital', 'Foto udara', 'GPS'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'SIG adalah sistem komputer yang digunakan untuk memasukkan, menyimpan, mengelola, menganalisis, dan menampilkan data geografis.',
    },
    {
      question: 'Data dalam SIG terdiri dari data ...',
      options: ['Vektor dan raster', 'Primer dan sekunder', 'Kualitatif dan kuantitatif', 'Statistik dan numerik'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Data SIG dibagi menjadi data vektor (titik, garis, area) dan data raster (piksel/grid).',
    },
    {
      question: 'Contoh data vektor dalam SIG adalah ...',
      options: ['Citra satelit', 'Jalan raya berupa garis', 'Foto udara', 'Peta curah hujan raster'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Data vektor merepresentasikan objek diskrit: titik (kota), garis (jalan, sungai), dan poligon (danau, sawah).',
    },
    {
      question: 'GPS (Global Positioning System) menggunakan satelit untuk ...',
      options: ['Mengirim sinyal TV', 'Menentukan posisi di permukaan bumi', 'Memotret bumi', 'Mengukur cuaca'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'GPS menggunakan jaringan satelit untuk menentukan koordinat (lintang, bujur, ketinggian) suatu lokasi di bumi.',
    },
    {
      question: 'Overlay dalam SIG adalah ...',
      options: ['Menampilkan peta di layar', 'Menumpangtindihkan beberapa peta untuk analisis', 'Mencetak peta', 'Menggambar peta manual'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Overlay adalah teknik menumpuk beberapa layer peta untuk menghasilkan informasi baru dalam analisis SIG.',
    }],

  [quizKey('Geografi', 'Litosfer', 'Struktur Bumi')]: [
    {
      question: 'Litosfer adalah ...',
      options: ['Lapisan air di Bumi', 'Lapisan kerak bumi yang keras', 'Lapisan atmosfer', 'Lapisan inti bumi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Litosfer adalah lapisan terluar bumi yang keras dan padat, terdiri dari kerak bumi dan bagian atas mantel.',
    },
    {
      question: 'Lapisan bumi yang memiliki suhu paling tinggi adalah ...',
      options: ['Kerak', 'Inti bumi (inner core)', 'Mantel', 'Asthenosfer'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Inti bumi (inner core) memiliki suhu sekitar 5.400°C, paling panas di antara lapisan bumi.',
    },
    {
      question: 'Teori tektonik lempeng menyatakan bahwa ...',
      options: ['Bumi diam dan tidak bergerak', 'Litosfer terpecah menjadi lempeng yang bergerak', 'Semua gunung berapi sudah punah', 'Gempa tidak ada hubungannya dengan lempeng'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Teori tektonik lempeng: litosfer terbagi menjadi beberapa lempeng yang bergerak di atas astenosfer, menyebabkan gempa dan vulkanisme.',
    },
    {
      question: 'Lempeng Indo-Australia bertumbukan dengan lempeng Eurasia di ...',
      options: ['Samudera Atlantik', 'Indonesia bagian selatan', 'Eropa', 'Amerika'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Lempeng Indo-Australia bertumbukan dengan Eurasia di selatan Sumatra, Jawa, dan Nusa Tenggara, membentuk jalur gunung api.',
    },
    {
      question: 'Asthenosfer adalah lapisan di bawah litosfer yang bersifat ...',
      options: ['Padat dan keras', 'Cair kental (plastis)', 'Gas', 'Beku'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Asthenosfer bersifat plastis (cair kental), tempat lempeng litosfer bergerak.',
    }],

  [quizKey('Geografi', 'Litosfer', 'Tenaga Endogen dan Eksogen')]: [
    {
      question: 'Tenaga endogen adalah tenaga yang berasal dari ...',
      options: ['Luar bumi', 'Dalam bumi', 'Matahari', 'Angin'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tenaga endogen berasal dari dalam bumi, seperti tektonisme, vulkanisme, dan seisme (gempa).',
    },
    {
      question: 'Contoh tenaga endogen adalah ...',
      options: ['Pelapukan', 'Erosi oleh air', 'Gempa bumi', 'Pengendapan sungai'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Gempa bumi adalah tenaga endogen yang berasal dari pergerakan lempeng tektonik di dalam bumi.',
    },
    {
      question: 'Tenaga eksogen yang disebabkan oleh air laut disebut ...',
      options: ['Abrasi', 'Erosi', 'Sedimentasi', 'Pelapukan'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Abrasi adalah pengikisan batuan oleh air laut, termasuk tenaga eksogen.',
    },
    {
      question: 'Vulkanisme adalah peristiwa ...',
      options: ['Gempa bumi', 'Keluarnya magma dari dalam bumi', 'Pergerakan lempeng', 'Pelapukan batuan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Vulkanisme adalah peristiwa yang berkaitan dengan keluarnya magma dari dalam bumi ke permukaan.',
    },
    {
      question: 'Pelapukan biologi disebabkan oleh ...',
      options: ['Suhu ekstrem', 'Aktivitas makhluk hidup (akar tanaman, lumut)', 'Air hujan', 'Angin'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pelapukan biologi disebabkan oleh makhluk hidup seperti akar tanaman yang menembus batuan dan lumut yang menghasilkan asam.',
    }],

  [quizKey('Geografi', 'Litosfer', 'Batuan dan Tanah')]: [
    {
      question: 'Batuan beku terbentuk dari ...',
      options: ['Pengendapan material', 'Pembekuan magma', 'Perubahan suhu', 'Tekanan tinggi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Batuan beku (igneous) terbentuk dari pembekuan magma, contoh: granit, basal, obsidian.',
    },
    {
      question: 'Batuan sedimen terbentuk melalui proses ...',
      options: ['Pembekuan magma', 'Pengendapan material dan pembatuan', 'Metamorfosis', 'Pelapukan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Batuan sedimen terbentuk dari hasil pengendapan material yang kemudian mengalami pembatuan (diagenesis).',
    },
    {
      question: 'Marmer adalah contoh batuan ...',
      options: ['Beku', 'Sedimen', 'Metamorf (malihan)', 'Organik'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Marmer adalah batuan metamorf yang berasal dari perubahan batu kapur akibat suhu dan tekanan tinggi.',
    },
    {
      question: 'Siklus batuan menunjukkan bahwa batuan dapat berubah menjadi batuan lain melalui ...',
      options: ['Proses tetap', 'Proses alam yang dinamis', 'Proses buatan', 'Proses kimia saja'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Siklus batuan adalah konsep yang menunjukkan perubahan batuan dari satu jenis ke jenis lain melalui proses alam.',
    },
    {
      question: 'Tanah yang subur biasanya mengandung banyak ...',
      options: ['Pasir', 'Humus (bahan organik)', 'Lempung', 'Batu kerikil'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Humus adalah bahan organik hasil pelapukan sisa makhluk hidup yang membuat tanah subur.',
    }],

  [quizKey('Geografi', 'Hidrosfer', 'Siklus Hidrologi')]: [
    {
      question: 'Hidrosfer adalah ...',
      options: ['Lapisan udara bumi', 'Lapisan air di bumi', 'Lapisan tanah', 'Lapisan batuan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Hidrosfer adalah lapisan air yang meliputi seluruh perairan di bumi, baik laut, danau, sungai, maupun air tanah.',
    },
    {
      question: 'Proses penguapan air dari permukaan bumi disebut ...',
      options: ['Presipitasi', 'Evaporasi', 'Kondensasi', 'Transpirasi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Evaporasi adalah penguapan air dari permukaan (laut, sungai, danau) akibat pemanasan matahari.',
    },
    {
      question: 'Proses berubahnya uap air menjadi titik-titik air disebut ...',
      options: ['Evaporasi', 'Kondensasi', 'Presipitasi', 'Infiltrasi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kondensasi adalah perubahan uap air menjadi air (titik-titik air) karena pendinginan di atmosfer.',
    },
    {
      question: 'Presipitasi dalam siklus hidrologi adalah ...',
      options: ['Penguapan', 'Jatuhnya air ke bumi (hujan, salju)', 'Peresapan air ke tanah', 'Aliran air sungai'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Presipitasi adalah segala bentuk air yang jatuh dari atmosfer ke permukaan bumi, seperti hujan, salju, atau embun.',
    },
    {
      question: 'Infiltrasi adalah proses ...',
      options: ['Aliran air di permukaan', 'Peresapan air ke dalam tanah', 'Penguapan air', 'Pengendapan sedimen'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Infiltrasi adalah proses masuknya air dari permukaan ke dalam tanah melalui pori-pori tanah.',
    }],

  [quizKey('Geografi', 'Hidrosfer', 'Perairan Darat dan Laut')]: [
    {
      question: 'Sungai yang sumber airnya berasal dari mata air disebut sungai ...',
      options: ['Periodik', 'Perennial (tetap)', 'Episodik', 'Intermiten'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Sungai perennial memiliki aliran air sepanjang tahun karena sumber air dari mata air atau hujan teratur.',
    },
    {
      question: 'Danau yang terbentuk akibat letusan gunung api disebut danau ...',
      options: ['Tektonik', 'Vulkanik', 'Karst', 'Gletser'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Danau vulkanik terbentuk di bekas kawah gunung api, contoh: Danau Kelimutu, Danau Batur.',
    },
    {
      question: 'Air tanah yang terletak di antara dua lapisan kedap air disebut ...',
      options: ['Air tanah freatik', 'Air tanah artesis', 'Air hujan', 'Air sungai'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Air tanah artesis (tertekan) terletak di antara dua lapisan kedap air dan memiliki tekanan sehingga bisa menyembur.',
    },
    {
      question: 'Zona laut yang paling dalam disebut ...',
      options: ['Zona neritik', 'Zona abisal', 'Zona litoral', 'Zona batial'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Zona abisal adalah zona laut paling dalam (>2000 m) dengan kondisi gelap total dan tekanan tinggi.',
    },
    {
      question: 'Arus laut yang dingin di Indonesia adalah ...',
      options: ['Arus Kuroshio', 'Arus Oyashio', 'Arus Kalifornia', 'Arus Teluk'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Arus Oyashio adalah arus dingin dari utara Jepang yang mempengaruhi suhu laut di wilayah timur Indonesia.',
    }],

  [quizKey('Geografi', 'Atmosfer', 'Cuaca dan Iklim')]: [
    {
      question: 'Atmosfer adalah ...',
      options: ['Lapisan air bumi', 'Lapisan udara yang menyelimuti bumi', 'Lapisan batuan', 'Lapisan tanah'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Atmosfer adalah lapisan gas yang menyelimuti bumi dan terdiri dari nitrogen, oksigen, dan gas lainnya.',
    },
    {
      question: 'Perbedaan cuaca dan iklim terletak pada ...',
      options: ['Unsur yang diukur', 'Waktu dan wilayah', 'Alat ukur', 'Satuan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Cuaca: kondisi atmosfer dalam waktu singkat (jam/hari) dan wilayah sempit. Iklim: pola rata-rata cuaca dalam waktu panjang (30+ tahun).',
    },
    {
      question: 'Lapisan atmosfer tempat terjadinya fenomena cuaca adalah ...',
      options: ['Stratosfer', 'Troposfer', 'Ionosfer', 'Eksosfer'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Troposfer (0-12 km) adalah lapisan paling bawah tempat sebagian besar fenomena cuaca terjadi.',
    },
    {
      question: 'Alat untuk mengukur tekanan udara adalah ...',
      options: ['Termometer', 'Barometer', 'Higrometer', 'Anemometer'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Barometer digunakan untuk mengukur tekanan udara. Anemometer mengukur kecepatan angin, higrometer kelembaban.',
    },
    {
      question: 'Klasifikasi iklim menurut Koppen didasarkan pada ...',
      options: ['Suhu dan curah hujan', 'Tekanan udara', 'Kelembaban', 'Kecepatan angin'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Klasifikasi iklim Koppen menggunakan data suhu dan curah hujan untuk mengelompokkan tipe iklim (A, B, C, D, E).',
    }],

  [quizKey('Geografi', 'Atmosfer', 'Perubahan Iklim Global')]: [
    {
      question: 'Efek rumah kaca disebabkan oleh ...',
      options: ['Penipisan ozon', 'Akumulasi gas rumah kaca (CO₂, CH₄) di atmosfer', 'Hujan asam', 'Letusan gunung api'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Efek rumah kaca disebabkan oleh peningkatan konsentrasi gas rumah kaca seperti CO₂, metana (CH₄), dan N₂O.',
    },
    {
      question: 'Gas rumah kaca utama hasil aktivitas manusia adalah ...',
      options: ['Oksigen', 'Karbon dioksida (CO₂)', 'Nitrogen', 'Hidrogen'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'CO₂ adalah gas rumah kaca utama yang dihasilkan dari pembakaran bahan bakar fosil dan deforestasi.',
    },
    {
      question: 'Dampak pemanasan global terhadap permukaan air laut adalah ...',
      options: ['Menurun', 'Meningkat (naik)', 'Tetap', 'Berkurang drastis'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pemanasan global menyebabkan pencairan es di kutub dan pemuaian air laut, sehingga permukaan air laut naik.',
    },
    {
      question: 'Protokol Kyoto adalah kesepakatan internasional untuk ...',
      options: ['Melindungi hutan hujan', 'Mengurangi emisi gas rumah kaca', 'Mencegah perburuan paus', 'Menjaga laut bersih'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Protokol Kyoto (1997) adalah perjanjian internasional yang mewajibkan negara maju mengurangi emisi gas rumah kaca.',
    },
    {
      question: 'Upaya mitigasi perubahan iklim adalah ...',
      options: ['Membangun lebih banyak pabrik', 'Beralih ke energi terbarukan', 'Meningkatkan konsumsi BBM', 'Membuka lahan gambut'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Mitigasi perubahan iklim meliputi penggunaan energi terbarukan, reboisasi, dan pengurangan emisi karbon.',
    }],

  [quizKey('Geografi', 'Antroposfer', 'Dinamika Penduduk')]: [
    {
      question: 'Antroposfer adalah ...',
      options: ['Lapisan atmosfer', 'Lapisan kehidupan manusia di bumi', 'Lapisan tanah', 'Lapisan air'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Antroposfer adalah ruang atau lingkungan manusia di permukaan bumi, berkaitan dengan persebaran dan aktivitas penduduk.',
    },
    {
      question: 'Rumus pertumbuhan penduduk alami adalah ...',
      options: ['Lahir + mati', 'Lahir - mati', 'Lahir × mati', 'Lahir / mati'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pertumbuhan penduduk alami = kelahiran - kematian, belum termasuk migrasi.',
    },
    {
      question: 'Transisi demografi adalah teori yang menjelaskan ...',
      options: ['Migrasi penduduk', 'Perubahan pola kelahiran dan kematian seiring pembangunan', 'Persebaran penduduk', 'Kepadatan penduduk'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Teori transisi demografi menjelaskan perubahan penduduk dari tingkat kelahiran dan kematian tinggi ke rendah.',
    },
    {
      question: 'Ledakan penduduk terjadi ketika ...',
      options: ['Tingkat kematian tinggi', 'Tingkat kelahiran jauh melebihi kematian', 'Migrasi besar-besaran', 'Penduduk menurun'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Ledakan penduduk terjadi ketika angka kelahiran jauh melampaui angka kematian, menyebabkan pertumbuhan cepat.',
    },
    {
      question: 'Piramida penduduk dengan bentuk segitiga lebar di dasar menunjukkan ...',
      options: ['Penduduk tua', 'Angka kelahiran tinggi', 'Angka kematian tinggi', 'Penduduk stabil'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Piramida dengan dasar lebar menunjukkan angka kelahiran tinggi (penduduk muda banyak), ciri negara berkembang.',
    }],

  [quizKey('Geografi', 'Antroposfer', 'Persebaran Penduduk')]: [
    {
      question: 'Faktor yang mempengaruhi persebaran penduduk adalah ...',
      options: ['Kondisi geografis dan ekonomi', 'Hanya iklim', 'Hanya kesuburan tanah', 'Hanya transportasi'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Persebaran penduduk dipengaruhi oleh faktor geografis (topografi, iklim), ekonomi (lapangan kerja), dan sosial budaya.',
    },
    {
      question: 'Pulau di Indonesia dengan kepadatan penduduk tertinggi adalah ...',
      options: ['Sumatra', 'Jawa', 'Kalimantan', 'Papua'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pulau Jawa memiliki kepadatan penduduk tertinggi di Indonesia, meskipun luasnya hanya sekitar 7% dari total Indonesia.',
    },
    {
      question: 'Transmigrasi adalah program perpindahan penduduk dari ...',
      options: ['Daerah padat ke daerah jarang penduduk', 'Kota ke desa', 'Desa ke kota', 'Luar negeri ke Indonesia'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Transmigrasi adalah program pemerintah memindahkan penduduk dari daerah padat (Jawa, Bali) ke daerah jarang penduduk.',
    },
    {
      question: 'Urbanisasi adalah perpindahan penduduk dari ...',
      options: ['Kota ke desa', 'Desa ke kota', 'Pulau ke pulau', 'Negara ke negara'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Urbanisasi adalah perpindahan penduduk dari desa ke kota dengan tujuan menetap.',
    },
    {
      question: 'Dampak negatif urbanisasi bagi kota tujuan adalah ...',
      options: ['Ketersediaan tenaga kerja', 'Kepadatan penduduk dan permukiman kumuh', 'Pasar semakin luas', 'Pendapatan asli daerah naik'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Urbanisasi berlebihan menyebabkan kepadatan penduduk, permukiman kumuh (slum area), dan tekanan pada fasilitas kota.',
    }],

  [quizKey('Geografi', 'Sumber Daya', 'SDA dan Lingkungan')]: [
    {
      question: 'Sumber daya alam yang dapat diperbarui adalah SDA yang ...',
      options: ['Tidak bisa dipulihkan', 'Dapat dipulihkan/diperbaharui secara alami', 'Berupa mineral', 'Berupa bahan bakar fosil'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'SDA terbarukan: hutan, air, tanah, dan sumber daya hayati yang dapat dipulihkan melalui proses alam.',
    },
    {
      question: 'Contoh sumber daya alam yang tidak dapat diperbarui adalah ...',
      options: ['Hutan', 'Minyak bumi', 'Air', 'Ikan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Minyak bumi adalah SDA tidak terbarukan karena memerlukan jutaan tahun untuk terbentuk.',
    },
    {
      question: 'Prinsip pembangunan berwawasan lingkungan disebut ...',
      options: ['Pembangunan berkelanjutan', 'Industrialisasi', 'Urbanisasi', 'Modernisasi'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Pembangunan berkelanjutan adalah pembangunan yang memperhatikan kelestarian lingkungan dan sumber daya alam.',
    },
    {
      question: 'Deforestasi adalah ...',
      options: ['Penanaman hutan', 'Penggundulan hutan secara besar-besaran', 'Reboisasi', 'Konservasi hutan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Deforestasi adalah penggundulan atau pengubahan lahan hutan menjadi lahan non-hutan secara permanen.',
    },
    {
      question: 'Konservasi sumber daya alam bertujuan untuk ...',
      options: ['Mengeksploitasi SDA maksimal', 'Melindungi dan menjaga SDA agar lestari', 'Mengabaikan lingkungan', 'Meningkatkan polusi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Konservasi adalah upaya perlindungan dan pengelolaan SDA secara bijaksana untuk keberlanjutan.',
    }],

  [quizKey('Geografi', 'Sumber Daya', 'Mitigasi Bencana')]: [
    {
      question: 'Mitigasi bencana adalah ...',
      options: ['Tindakan setelah bencana', 'Upaya mengurangi risiko bencana sebelum terjadi', 'Evakuasi korban', 'Rehabilitasi pasca bencana'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Mitigasi adalah serangkaian upaya untuk mengurangi risiko bencana, baik secara struktural maupun non-struktural.',
    },
    {
      question: 'Bencana alam yang paling sering terjadi di Indonesia adalah ...',
      options: ['Gunung meletus', 'Gempa bumi dan tsunami', 'Badai salju', 'Tornado'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Indonesia berada di Cincin Api Pasifik sehingga rawan gempa bumi, tsunami, dan letusan gunung api.',
    },
    {
      question: 'Mitigasi struktural untuk mengurangi risiko banjir adalah ...',
      options: ['Sosialisasi', 'Pembangunan tanggul dan drainase', 'Pendidikan bencana', 'Peta rawan banjir'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Mitigasi struktural: pembangunan fisik seperti tanggul, bendungan, kanal, dan drainase yang baik.',
    },
    {
      question: 'Tsunami early warning system di Indonesia bernama ...',
      options: ['BMKG', 'InaTEWS (Indonesia Tsunami Early Warning System)', 'BNPB', 'PVMBG'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'InaTEWS adalah sistem peringatan dini tsunami Indonesia yang dikelola BMKG.',
    },
    {
      question: 'Yang termasuk mitigasi non-struktural adalah ...',
      options: ['Membangun tanggul', 'Penyuluhan dan pelatihan kebencanaan', 'Membuat kanal', 'Reboisasi'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Mitigasi non-struktural meliputi pendidikan, pelatihan, penyusunan peta risiko, dan peraturan tata ruang.',
    }],

  // ═══════════════════════════════════════════════════════════════════════════
  //  SOSIOLOGI — 13 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Sosiologi', 'Sosiologi Dasar', 'Objek dan Ruang Lingkup')]: [
    {
      question: 'Sosiologi adalah ilmu yang mempelajari tentang ...',
      options: ['Pemerintahan dan politik', 'Masyarakat dan interaksi sosial', 'Ekonomi dan bisnis', 'Geografi dan lingkungan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sosiologi adalah ilmu yang mempelajari struktur sosial, proses sosial, dan perubahan sosial dalam masyarakat.',
    },
    {
      question: 'Objek kajian sosiologi adalah ...',
      options: ['Individu secara psikologis', 'Masyarakat dan hubungan antar manusia', 'Negara dan pemerintahan', 'Alam dan lingkungan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Objek sosiologi adalah masyarakat dalam hubungan antar individu, antar kelompok, dan proses sosial yang terjadi.',
    },
    {
      question: 'Auguste Comte dikenal sebagai ...',
      options: ['Bapak Sosiologi', 'Bapak Ekonomi', 'Bapak Psikologi', 'Bapak Geografi'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Auguste Comte adalah tokoh yang pertama kali menggunakan istilah sosiologi dan disebut Bapak Sosiologi.',
    },
    {
      question: 'Sosiologi bersifat non-etis artinya ...',
      options: ['Menilai baik buruknya fakta sosial', 'Tidak menilai baik buruk suatu fakta sosial, tapi menjelaskannya', 'Melarang penelitian sosial', 'Fokus pada etika'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Sosiologi non-etis: tidak mempersoalkan baik-buruknya fenomena sosial, melainkan menjelaskan fakta sosial secara objektif.',
    },
    {
      question: 'Masyarakat adalah ...',
      options: ['Kumpulan individu yang tidak terorganisir', 'Sekelompok orang yang saling berinteraksi dan memiliki kebudayaan yang sama', 'Kumpulan hewan', 'Wilayah geografis'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Masyarakat adalah kelompok manusia yang hidup bersama, saling berinteraksi, dan memiliki kebudayaan bersama.',
    }],

  [quizKey('Sosiologi', 'Sosiologi Dasar', 'Teori-Teori Sosiologi')]: [
    {
      question: 'Teori konflik sosial dikemukakan oleh ...',
      options: ['Emile Durkheim', 'Karl Marx', 'Max Weber', 'Auguste Comte'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Karl Marx mengemukakan teori konflik kelas sosial antara kaum borjuis (pemilik modal) dan proletar (buruh).',
    },
    {
      question: 'Teori solidaritas organik dan mekanik dikemukakan oleh ...',
      options: ['Karl Marx', 'Emile Durkheim', 'Max Weber', 'Herbert Spencer'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Durkheim membedakan solidaritas mekanik (masyarakat tradisional) dan organik (masyarakat modern dengan pembagian kerja).',
    },
    {
      question: 'Max Weber mengemukakan konsep ...',
      options: ['Kelas sosial', 'Tindakan sosial', 'Solidaritas sosial', 'Evolusi sosial'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Weber memperkenalkan konsep tindakan sosial (social action) sebagai dasar analisis sosiologi.',
    },
    {
      question: 'Teori fungsionalisme struktural melihat masyarakat sebagai ...',
      options: ['Medan konflik', 'Sistem yang saling terkait dan berfungsi untuk stabilitas', 'Kumpulan individu bebas', 'Arena pertarungan kekuasaan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Fungsionalisme struktural (Parsons, Merton) memandang masyarakat sebagai sistem yang bagian-bagiannya saling bergantung.',
    },
    {
      question: 'Teori interaksionisme simbolik menekankan pada ...',
      options: ['Struktur makro', 'Interaksi antar individu melalui simbol dan makna', 'Konflik kelas', 'Fungsi institusi sosial'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Interaksionisme simbolik (Mead, Blumer) fokus pada interaksi tatap muka dan makna simbol dalam komunikasi.',
    }],

  [quizKey('Sosiologi', 'Interaksi Sosial', 'Bentuk Interaksi Sosial')]: [
    {
      question: 'Interaksi sosial adalah ...',
      options: ['Hubungan individu dengan benda', 'Hubungan timbal balik antar individu atau kelompok', 'Kegiatan individu sendirian', 'Komunikasi dengan hewan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Interaksi sosial adalah hubungan timbal balik yang dinamis antar individu, antar kelompok, atau individu dengan kelompok.',
    },
    {
      question: 'Syarat terjadinya interaksi sosial adalah ...',
      options: ['Kontak sosial dan komunikasi', 'Jarak fisik dan persamaan', 'Uang dan kekuasaan', 'Pendidikan dan status'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Dua syarat interaksi sosial: adanya kontak sosial (hubungan) dan komunikasi (penyampaian pesan).',
    },
    {
      question: 'Kerja sama (cooperation) adalah bentuk interaksi sosial ...',
      options: ['Disosiatif', 'Asosiatif', 'Kompetitif', 'Konfliktual'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Bentuk interaksi asosiatif meliputi kerja sama, akomodasi, asimilasi, dan akulturasi yang mengarah pada persatuan.',
    },
    {
      question: 'Contoh interaksi sosial disosiatif adalah ...',
      options: ['Gotong royong', 'Pertandingan sepak bola', 'Kerja bakti', 'Akulturasi budaya'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Interaksi disosiatif meliputi persaingan, kontravensi, dan konflik. Pertandingan sepak bola adalah bentuk persaingan.',
    },
    {
      question: 'Akomodasi adalah bentuk interaksi sosial yang bertujuan ...',
      options: ['Memperbesar konflik', 'Meredakan ketegangan dan menyelesaikan konflik', 'Menciptakan persaingan', 'Menghindari kontak sosial'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Akomodasi adalah upaya menyelesaikan pertentangan tanpa menghancurkan pihak lawan, demi tercapainya kestabilan.',
    }],

  [quizKey('Sosiologi', 'Interaksi Sosial', 'Faktor Pendorong Interaksi')]: [
    {
      question: 'Faktor internal yang mendorong interaksi sosial adalah ...',
      options: ['Norma sosial', 'Dorongan biologis dan psikologis', 'Struktur sosial', 'Lembaga sosial'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Faktor internal meliputi dorongan biologis (makan, minum) dan psikologis (kebutuhan berafiliasi, penghargaan).',
    },
    {
      question: 'Sugesti adalah faktor pendorong interaksi di mana seseorang ...',
      options: ['Meniru orang lain', 'Menerima pandangan dari orang yang berwenang tanpa kritik', 'Merasa iri pada orang lain', 'Bersaing dengan orang lain'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Sugesti adalah penerimaan pandangan atau sikap dari orang lain yang memiliki otoritas tanpa berpikir kritis.',
    },
    {
      question: 'Imitasi adalah ...',
      options: ['Persaingan antar individu', 'Tindakan meniru perilaku, sikap, atau penampilan orang lain', 'Konflik terbuka', 'Penolakan terhadap perubahan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Imitasi adalah proses meniru orang lain, bisa berupa cara berpakaian, berbicara, atau perilaku.',
    },
    {
      question: 'Identifikasi adalah proses ...',
      options: ['Meniru penampilan luar', 'Menyamakan diri secara mendalam dengan tokoh idola', 'Bersaing dengan orang lain', 'Bekerja sama'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Identifikasi adalah kecenderungan seseorang untuk menjadi sama (identik) dengan orang lain yang dikagumi secara mendalam.',
    },
    {
      question: 'Faktor emosi seperti simpati dan empati mendorong interaksi karena ...',
      options: ['Menimbulkan persaingan', 'Menumbuhkan rasa tertarik dan kepedulian terhadap orang lain', 'Menghindari orang lain', 'Menciptakan konflik'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Simpati (rasa tertarik) dan empati (ikut merasakan) mendorong seseorang untuk berinteraksi dan membantu orang lain.',
    }],

  [quizKey('Sosiologi', 'Stratifikasi', 'Stratifikasi Sosial')]: [
    {
      question: 'Stratifikasi sosial adalah ...',
      options: ['Persamaan status dalam masyarakat', 'Pengelompokan masyarakat secara hierarkis', 'Persebaran penduduk', 'Pertukaran budaya'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Stratifikasi sosial adalah pembedaan anggota masyarakat ke dalam lapisan (kelas) secara bertingkat (hierarkis).',
    },
    {
      question: 'Dasar stratifikasi sosial di masyarakat adalah ...',
      options: ['Usia, jenis kelamin, hobi', 'Kekayaan, kekuasaan, pendidikan, dan keturunan', 'Warna kulit, rambut, tinggi badan', 'Agama dan kepercayaan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Dasar stratifikasi: kekayaan (ekonomi), kekuasaan (politik), kehormatan (prestise), dan pendidikan.',
    },
    {
      question: 'Status sosial yang diperoleh melalui usaha sendiri disebut status ...',
      options: ['Ascribed status', 'Achieved status', 'Assigned status', 'Kasta'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Achieved status adalah kedudukan yang dicapai melalui usaha, kemampuan, dan prestasi, misal: dokter, profesor.',
    },
    {
      question: 'Ascribed status adalah status yang diperoleh ...',
      options: ['Melalui prestasi', 'Secara otomatis sejak lahir (keturunan)', 'Melalui pendidikan', 'Dengan bekerja keras'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ascribed status diperoleh tanpa usaha, seperti jenis kelamin, kasta, atau status anak bangsawan.',
    },
    {
      question: 'Sistem kasta termasuk bentuk stratifikasi sosial yang bersifat ...',
      options: ['Terbuka', 'Tertutup', 'Campuran', 'Fleksibel'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Sistem kasta bersifat tertutup: seseorang tidak dapat pindah kasta. Contoh: sistem kasta di India dan Bali tradisional.',
    }],

  [quizKey('Sosiologi', 'Stratifikasi', 'Diferensiasi Sosial')]: [
    {
      question: 'Diferensiasi sosial adalah ...',
      options: ['Pengelompokan vertikal', 'Pengelompokan horizontal berdasarkan perbedaan tanpa tingkatan', 'Pengelompokan hierarkis', 'Persamaan status'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Diferensiasi sosial adalah pembedaan anggota masyarakat secara horizontal (sejajar) berdasarkan ras, etnis, gender, agama.',
    },
    {
      question: 'Contoh diferensiasi sosial berdasarkan etnis adalah ...',
      options: ['Kaya-miskin', 'Suku Jawa, Sunda, Batak', 'Atasan-bawahan', 'Pejabat-rakyat'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Diferensiasi etnis: pembedaan berdasarkan suku bangsa, seperti Jawa, Sunda, Batak, Minang, dll.',
    },
    {
      question: 'Masyarakat multikultural adalah masyarakat yang ...',
      options: ['Homogen', 'Terdiri dari beragam suku, budaya, dan agama', 'Hanya satu budaya', 'Tidak ada perbedaan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Masyarakat multikultural memiliki keragaman suku, budaya, bahasa, dan agama yang hidup berdampingan.',
    },
    {
      question: 'Diskriminasi adalah ...',
      options: ['Perlakuan sama terhadap semua orang', 'Perlakuan tidak adil berdasarkan perbedaan tertentu', 'Penghargaan terhadap perbedaan', 'Penerimaan keragaman'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Diskriminasi adalah perlakuan yang tidak adil atau membeda-bedakan berdasarkan ras, gender, agama, atau etnis.',
    },
    {
      question: 'Primordialisme adalah ...',
      options: ['Penerimaan terhadap budaya asing', 'Ikatan kesukuan yang berlebihan dan menganggap kelompoknya paling baik', 'Persatuan nasional', 'Keragaman budaya'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Primordialisme adalah pandangan yang menekankan ikatan kesukuan, kedaerahan, atau kelompok sendiri secara berlebihan.',
    }],

  [quizKey('Sosiologi', 'Konflik', 'Konflik Sosial')]: [
    {
      question: 'Konflik sosial adalah ...',
      options: ['Kerja sama antar kelompok', 'Pertentangan antar individu atau kelompok karena perbedaan kepentingan', 'Persamaan pandangan', 'Interaksi sosial yang harmonis'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Konflik sosial adalah pertentangan atau benturan antar individu/kelompok akibat perbedaan tujuan, nilai, atau kepentingan.',
    },
    {
      question: 'Penyebab konflik sosial antara lain ...',
      options: ['Persamaan budaya', 'Perbedaan kepentingan ekonomi dan politik', 'Kesamaan agama', 'Kerja sama yang baik'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Konflik disebabkan oleh perbedaan kepentingan ekonomi, politik, nilai, dan status sosial.',
    },
    {
      question: 'Konflik vertikal adalah konflik antara ...',
      options: ['Individu dengan individu', 'Atasan dan bawahan (kelas berbeda)', 'Kelompok setingkat', 'Kelompok sebaya'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Konflik vertikal terjadi antara lapisan masyarakat yang berbeda hierarkinya, seperti majikan-buruh atau pemerintah-rakyat.',
    },
    {
      question: 'Dampak positif konflik adalah ...',
      options: ['Perpecahan total', 'Mendorong perubahan sosial dan memperjelas isu yang terpendam', 'Kekacauan permanen', 'Kemunduran pembangunan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Dampak positif konflik: memperjelas masalah yang semula terpendam, mendorong perubahan, dan memperkuat solidaritas kelompok.',
    },
    {
      question: 'Menurut teori konflik, perubahan sosial terjadi karena ...',
      options: ['Konsensus bersama', 'Pertentangan antar kelas atau kelompok kepentingan', 'Adaptasi budaya', 'Evolusi bertahap'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Teori konflik (Marx) menyatakan bahwa perubahan sosial didorong oleh pertentangan antar kelas sosial.',
    }],

  [quizKey('Sosiologi', 'Konflik', 'Integrasi Sosial')]: [
    {
      question: 'Integrasi sosial adalah ...',
      options: ['Perpecahan masyarakat', 'Proses penyatuan unsur-unsur sosial yang berbeda menjadi satu kesatuan', 'Konflik berkepanjangan', 'Pemisahan kelompok'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Integrasi sosial adalah proses penyesuaian dan penyatuan kelompok-kelompok sosial yang berbeda dalam masyarakat.',
    },
    {
      question: 'Faktor pendorong integrasi sosial adalah ...',
      options: ['Primordialisme', 'Toleransi dan sikap saling menghargai', 'Diskriminasi', 'Etnosentrisme'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Toleransi, saling menghargai, dan kesadaran akan keragaman mendorong integrasi sosial.',
    },
    {
      question: 'Asimilasi adalah proses ...',
      options: ['Pemisahan budaya', 'Peleburan dua budaya menjadi budaya baru yang berbeda', 'Penolakan budaya asing', 'Konflik budaya'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Asimilasi adalah proses sosial ketika kelompok dengan latar belakang berbeda melebur menjadi satu kelompok dengan budaya baru.',
    },
    {
      question: 'Akulturasi adalah ...',
      options: ['Penolakan budaya asing', 'Penerimaan unsur budaya asing tanpa menghilangkan budaya asli', 'Peleburan total budaya', 'Konflik budaya'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Akulturasi: perpaduan dua budaya menghasilkan bentuk baru tanpa menghilangkan ciri khas masing-masing.',
    },
    {
      question: 'Semboyan "Bhinneka Tunggal Ika" mencerminkan ...',
      options: ['Primordialisme', 'Integrasi nasional dalam keragaman', 'Diskriminasi', 'Konflik horizontal'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Bhinneka Tunggal Ika (berbeda-beda tetapi tetap satu) adalah dasar integrasi nasional Indonesia dalam keragaman.',
    }],

  [quizKey('Sosiologi', 'Konflik', 'Resolusi Konflik')]: [
    {
      question: 'Resolusi konflik adalah ...',
      options: ['Memperbesar konflik', 'Upaya menyelesaikan konflik secara damai dan konstruktif', 'Membiarkan konflik', 'Mengabaikan konflik'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Resolusi konflik adalah upaya mengelola dan menyelesaikan konflik melalui cara-cara damai dan konstruktif.',
    },
    {
      question: 'Mediasi adalah resolusi konflik dengan bantuan ...',
      options: ['Pihak berwenang', 'Pihak ketiga yang netral', 'Kekerasan', 'Voting'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Mediasi melibatkan pihak ketiga netral (mediator) yang membantu pihak berkonflik mencapai kesepakatan.',
    },
    {
      question: 'Arbitrase adalah penyelesaian konflik di mana keputusan pihak ketiga bersifat ...',
      options: ['Tidak mengikat', 'Mengikat dan wajib dipatuhi', 'Hanya saran', 'Opsional'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Arbitrase: pihak ketiga (arbiter) memberikan keputusan yang mengikat dan wajib dipatuhi kedua belah pihak.',
    },
    {
      question: 'Ajudikasi adalah penyelesaian konflik melalui ...',
      options: ['Musyawarah', 'Pengadilan', 'Mediasi', 'Negosiasi'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ajudikasi adalah penyelesaian konflik melalui jalur hukum di pengadilan dengan putusan hakim.',
    },
    {
      question: 'Kompromi adalah resolusi konflik di mana ...',
      options: ['Satu pihak menang semua', 'Masing-masing pihak mengurangi tuntutannya demi kesepakatan', 'Konflik dibiarkan', 'Pihak ketiga memutuskan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kompromi: kedua pihak saling mengurangi tuntutan atau mengorbankan sebagian kepentingan untuk mencapai kesepakatan.',
    }],

  [quizKey('Sosiologi', 'Perubahan Sosial', 'Modernisasi')]: [
    {
      question: 'Modernisasi adalah ...',
      options: ['Kembali ke tradisi', 'Proses perubahan menuju kehidupan yang lebih maju dan modern', 'Penolakan teknologi', 'Mempertahankan tradisi lama'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Modernisasi adalah proses transformasi dari masyarakat tradisional ke masyarakat modern di berbagai bidang kehidupan.',
    },
    {
      question: 'Syarat utama modernisasi adalah ...',
      options: ['Sikap tradisional', 'Sistem pendidikan dan ilmu pengetahuan yang maju', 'Ekonomi agraris', 'Masyarakat tertutup'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Modernisasi membutuhkan pendidikan, penguasaan IPTEK, dan sistem administrasi yang baik.',
    },
    {
      question: 'Dampak positif modernisasi bagi masyarakat adalah ...',
      options: ['Kesenjangan sosial', 'Kemudahan akses informasi dan teknologi', 'Lunturnya budaya lokal', 'Ketergantungan teknologi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Modernisasi memberikan kemudahan akses informasi, peningkatan efisiensi, dan kemajuan teknologi.',
    },
    {
      question: 'Dampak negatif modernisasi adalah ...',
      options: ['Peningkatan pendapatan', 'Westernisasi (gaya hidup kebarat-baratan) yang berlebihan', 'Pendidikan lebih maju', 'Sarana transportasi lebih baik'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Dampak negatif modernisasi: westernisasi (meniru budaya Barat secara berlebihan), kesenjangan, dan krisis identitas.',
    },
    {
      question: 'Ciri masyarakat modern menurut sosiologi adalah ...',
      options: ['Primordialisme kuat', 'Rasionalitas dan orientasi ke masa depan', 'Sistem kasta', 'Ekonomi subsisten'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Masyarakat modern bersifat rasional (berdasarkan akal), berorientasi masa depan, dan terbuka terhadap perubahan.',
    }],

  [quizKey('Sosiologi', 'Perubahan Sosial', 'Globalisasi')]: [
    {
      question: 'Globalisasi adalah ...',
      options: ['Proses isolasi antar negara', 'Proses integrasi internasional yang meliputi ekonomi, budaya, dan teknologi', 'Kembali ke tradisi', 'Penolakan budaya asing'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Globalisasi adalah proses saling terhubungnya masyarakat dunia dalam bidang ekonomi, politik, budaya, dan teknologi.',
    },
    {
      question: 'Faktor pendorong globalisasi adalah ...',
      options: ['Isolasi negara', 'Perkembangan teknologi informasi dan transportasi', 'Nasionalisme sempit', 'Proteksionisme'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Globalisasi didorong oleh kemajuan teknologi informasi, transportasi, dan liberalisasi perdagangan.',
    },
    {
      question: 'Dampak positif globalisasi adalah ...',
      options: ['Homogenisasi budaya', 'Pertukaran informasi dan pengetahuan global', 'Hilangnya identitas lokal', 'Kesenjangan digital'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Dampak positif: akses ke informasi global, pertukaran pengetahuan, dan pasar global yang lebih luas.',
    },
    {
      question: 'Globalisasi budaya dapat menyebabkan ...',
      options: ['Penguatan budaya lokal', 'Homogenisasi budaya (budaya dominan menggeser budaya lokal)', 'Keragaman budaya', 'Isolasi budaya'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Globalisasi dapat menggeser budaya lokal dengan budaya global dominan (McDonaldization, budaya pop).',
    },
    {
      question: 'Sikap yang tepat menghadapi globalisasi adalah ...',
      options: ['Menolak semua budaya asing', 'Selektif: mengambil yang positif, menyaring yang negatif', 'Menerima semua tanpa filter', 'Mengisolasi diri'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sikap selektif: menerima pengaruh global yang positif (teknologi, pengetahuan) dan menolak yang negatif.',
    }],

  [quizKey('Sosiologi', 'Lembaga Sosial', 'Lembaga Kemasyarakatan')]: [
    {
      question: 'Lembaga sosial adalah ...',
      options: ['Bangunan fisik', 'Sistem norma dan aturan yang mengatur perilaku masyarakat', 'Organisasi pemerintah', 'Perusahaan swasta'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lembaga sosial adalah sistem norma dan prosedur yang mengatur hubungan antar anggota masyarakat untuk memenuhi kebutuhan.',
    },
    {
      question: 'Lembaga keluarga adalah lembaga sosial terkecil yang berfungsi untuk ...',
      options: ['Mencari keuntungan', 'Mengatur hubungan darah, perkawinan, dan pengasuhan anak', 'Menegakkan hukum', 'Menyelenggarakan pendidikan formal'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Keluarga berfungsi mengatur hubungan darah, perkawinan, reproduksi, sosialisasi, dan perlindungan anak.',
    },
    {
      question: 'Lembaga pendidikan berfungsi untuk ...',
      options: ['Mencari laba', 'Mentransfer pengetahuan dan nilai-nilai budaya', 'Menegakkan hukum', 'Memproduksi barang'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lembaga pendidikan berfungsi sebagai sosialisasi, transfer ilmu, dan pengembangan potensi individu.',
    },
    {
      question: 'Lembaga ekonomi mengatur kegiatan ...',
      options: ['Pendidikan', 'Produksi, distribusi, dan konsumsi barang/jasa', 'Politik', 'Agama'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lembaga ekonomi mengatur kegiatan produksi, distribusi, dan konsumsi untuk memenuhi kebutuhan materi masyarakat.',
    },
    {
      question: 'Lembaga politik berfungsi untuk ...',
      options: ['Mengatur tata cara peribadatan', 'Mengatur kekuasaan dan pemerintahan', 'Mendidik anak', 'Mencari keuntungan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lembaga politik mengatur tata cara memperoleh dan menjalankan kekuasaan serta mengelola pemerintahan.',
    }],

  [quizKey('Sosiologi', 'Lembaga Sosial', 'Fungsi Lembaga Sosial')]: [
    {
      question: 'Fungsi manifes lembaga sosial adalah ...',
      options: ['Fungsi tersembunyi yang tidak disadari', 'Fungsi yang disadari dan menjadi tujuan utama lembaga', 'Fungsi negatif', 'Fungsi sampingan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Fungsi manifes adalah fungsi yang tampak, disadari, dan menjadi tujuan utama didirikannya lembaga sosial.',
    },
    {
      question: 'Fungsi laten lembaga sosial adalah ...',
      options: ['Fungsi utama yang disadari', 'Fungsi tidak langsung atau tersembunyi di luar tujuan utama', 'Fungsi yang direncanakan', 'Tujuan resmi lembaga'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Fungsi laten adalah fungsi yang tidak disadari dan berada di luar tujuan resmi lembaga.',
    },
    {
      question: 'Fungsi lembaga keluarga dalam reproduksi adalah ...',
      options: ['Mengatur produksi barang', 'Mengatur kelangsungan keturunan dan regenerasi', 'Mengatur pendidikan formal', 'Mengatur ekonomi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Fungsi reproduksi keluarga: mengatur kelahiran anak untuk melanjutkan keturunan.',
    },
    {
      question: 'Lembaga agama berfungsi untuk ...',
      options: ['Mengatur kegiatan ekonomi', 'Memberi pedoman hidup dan mengatur hubungan manusia dengan Tuhan', 'Mengatur pemerintahan', 'Menyelenggarakan pendidikan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Fungsi lembaga agama: mengatur kehidupan spiritual, memberi pedoman moral, dan memperkuat solidaritas sosial.',
    },
    {
      question: 'Disfungsi lembaga sosial adalah ...',
      options: ['Fungsi yang berjalan baik', 'Ketidakmampuan lembaga menjalankan fungsinya secara optimal', 'Fungsi utama lembaga', 'Fungsi manifes'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Disfungsi terjadi ketika lembaga sosial tidak mampu menjalankan fungsinya, sehingga menimbulkan masalah sosial.',
    }],

  // ═══════════════════════════════════════════════════════════════════════════
  //  PJOK — 13 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('PJOK', 'Permainan Bola Besar', 'Sepak Bola')]: [
    {
      question: 'Jumlah pemain dalam satu tim sepak bola adalah ...',
      options: ['9 orang', '10 orang', '11 orang', '12 orang'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Satu tim sepak bola terdiri dari 11 pemain termasuk penjaga gawang.',
    },
    {
      question: 'Tendangan gawang (goal kick) dilakukan ketika ...',
      options: ['Bola keluar garis samping', 'Bola melewati garis gawang setelah disentuh pemain lawan', 'Pelanggaran di kotak penalti', 'Offside'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Goal kick diberikan kepada tim bertahan ketika bola melewati garis gawang setelah terakhir disentuh pemain lawan.',
    },
    {
      question: 'Teknik menghentikan bola dalam sepak bola menggunakan ...',
      options: ['Tangan', 'Kaki, dada, atau paha', 'Kepala saja', 'Siku'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Bola dapat dihentikan menggunakan kaki, dada, paha, dan kepala. Tangan hanya untuk penjaga gawang.',
    },
    {
      question: 'Kartu merah dalam sepak bola berarti ...',
      options: ['Peringatan', 'Pemain dikeluarkan dari pertandingan', 'Pergantian pemain', 'Waktu tambahan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kartu merah berarti pemain mendapat hukuman dikeluarkan dari lapangan dan tidak bisa digantikan.',
    },
    {
      question: 'Induk organisasi sepak bola dunia adalah ...',
      options: ['FIFA', 'PSSI', 'UEFA', 'AFC'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'FIFA (Fédération Internationale de Football Association) adalah induk organisasi sepak bola internasional.',
    }],

  [quizKey('PJOK', 'Permainan Bola Besar', 'Bola Voli')]: [
    {
      question: 'Jumlah pemain bola voli dalam satu tim adalah ...',
      options: ['4 orang', '5 orang', '6 orang', '7 orang'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Satu tim bola voli terdiri dari 6 pemain di lapangan.',
    },
    {
      question: 'Pukulan pertama dalam permainan bola voli disebut ...',
      options: ['Smash', 'Servis', 'Block', 'Passing'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Servis adalah pukulan pertama yang memulai permainan bola voli.',
    },
    {
      question: 'Teknik passing bawah pada bola voli dilakukan dengan ...',
      options: ['Kepalan tangan', 'Lengan bawah menyatu', 'Telapak tangan terbuka', 'Punggung tangan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Passing bawah dilakukan dengan kedua lengan bawah menyatu (forearm pass) untuk menerima bola rendah.',
    },
    {
      question: 'Pukulan keras menukik ke area lawan dalam bola voli disebut ...',
      options: ['Servis', 'Smash/spike', 'Block', 'Passing'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Smash atau spike adalah pukulan keras dan menukik ke arah lapangan lawan.',
    },
    {
      question: 'Rotasi dalam bola voli dilakukan ketika ...',
      options: ['Setiap kali bola mati', 'Tim penerima servis berhasil mendapatkan poin', 'Setiap awal set', 'Saat timeout'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Rotasi dilakukan oleh tim penerima servis ketika berhasil memenangkan reli dan mendapat hak servis.',
    }],

  [quizKey('PJOK', 'Permainan Bola Besar', 'Bola Basket')]: [
    {
      question: 'Jumlah pemain bola basket dalam satu tim adalah ...',
      options: ['3 orang', '4 orang', '5 orang', '6 orang'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Satu tim bola basket terdiri dari 5 pemain di lapangan.',
    },
    {
      question: 'Teknik memasukkan bola ke ring dengan melompat disebut ...',
      options: ['Dribbling', 'Shooting (lay-up)', 'Passing', 'Rebound'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Shooting atau tembakan adalah upaya memasukkan bola ke ring lawan. Lay-up adalah tembakan dengan melompat mendekati ring.',
    },
    {
      question: 'Pelanggaran berjalan tanpa mendribel bola dalam basket disebut ...',
      options: ['Double dribble', 'Traveling', 'Out of bound', 'Foul'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Traveling adalah pelanggaran bergerak (berjalan/lari) tanpa memantulkan bola (dribble).',
    },
    {
      question: 'Operan bola setinggi dada dalam basket disebut ...',
      options: ['Bounce pass', 'Chest pass', 'Overhead pass', 'Baseball pass'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Chest pass adalah operan dari depan dada yang cepat dan akurat untuk jarak pendek.',
    },
    {
      question: 'Poin untuk tembakan dari luar garis three point adalah ...',
      options: ['1 poin', '2 poin', '3 poin', '4 poin'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Tembakan dari luar garis three point (garis setengah lingkaran) bernilai 3 poin.',
    }],

  [quizKey('PJOK', 'Permainan Bola Kecil', 'Bulutangkis')]: [
    {
      question: 'Pukulan melambung ke belakang lapangan dalam bulutangkis disebut ...',
      options: ['Smash', 'Lob', 'Drop shot', 'Drive'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Lob adalah pukulan yang melambung tinggi ke arah belakang lapangan lawan.',
    },
    {
      question: 'Pukulan keras menukik ke bawah dalam bulutangkis disebut ...',
      options: ['Lob', 'Smash', 'Netting', 'Clear'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Smash adalah pukulan keras dan tajam menukik ke bawah yang sulit dikembalikan lawan.',
    },
    {
      question: 'Permainan bulutangkis menggunakan ...',
      options: ['Bola', 'Shuttlecock (kok)', 'Bola karet', 'Bola tenis'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Bulutangkis menggunakan shuttlecock (kok) yang terbuat dari bulu angsa atau sintetis.',
    },
    {
      question: 'Posisi siap di tengah lapangan bulutangkis disebut ...',
      options: ['Attack position', 'Ready position/center position', 'Defensive position', 'Net position'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ready position adalah posisi siap di tengah lapangan dengan lutut ditekuk untuk bergerak cepat ke berbagai arah.',
    },
    {
      question: 'Jumlah pemain dalam ganda bulutangkis adalah ...',
      options: ['1 orang per tim', '2 orang per tim', '3 orang per tim', '4 orang per tim'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Ganda bulutangkis dimainkan oleh 2 orang pemain dalam satu tim.',
    }],

  [quizKey('PJOK', 'Permainan Bola Kecil', 'Tenis Meja')]: [
    {
      question: 'Alat pemukul dalam tenis meja disebut ...',
      options: ['Raket', 'Bet', 'Stik', 'Pemukul'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Alat pemukul dalam tenis meja disebut bet (atau paddle).',
    },
    {
      question: 'Pukulan dengan efek putaran ke depan dalam tenis meja disebut ...',
      options: ['Backspin', 'Topspin', 'Sidespin', 'Drive'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Topspin adalah pukulan dengan putaran bola ke depan (atas), menyebabkan bola melengkung turun lebih cepat.',
    },
    {
      question: 'Servis dalam tenis meja harus ...',
      options: ['Dipukul langsung ke arah lawan', 'Dipantulkan di meja sendiri dulu, lalu melewati net', 'Langsung ke lapangan lawan', 'Tidak perlu melewati net'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Servis tenis meja: bola harus dipantulkan di meja sendiri, melewati net, lalu memantul di meja lawan.',
    },
    {
      question: 'Pertandingan tenis meja dimenangkan oleh pemain yang mencapai ... poin.',
      options: ['11', '15', '21', '25'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Set tenis meja dimenangkan oleh pemain yang mencapai 11 poin terlebih dahulu, dengan selisih 2 poin.',
    },
    {
      question: 'Pukulan backhand dalam tenis meja dilakukan dengan ...',
      options: ['Telapak tangan menghadap bola', 'Punggung tangan menghadap bola', 'Samping badan', 'Atas kepala'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Backhand: pukulan dengan punggung tangan/bet menghadap ke arah bola.',
    }],

  [quizKey('PJOK', 'Atletik', 'Lari Jarak Pendek')]: [
    {
      question: 'Lari jarak pendek disebut juga ...',
      options: ['Marathon', 'Sprint', 'Jogging', 'Cross country'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lari jarak pendek (100 m, 200 m, 400 m) disebut sprint, mengutamakan kecepatan maksimal.',
    },
    {
      question: 'Start yang digunakan dalam lari jarak pendek adalah ...',
      options: ['Start berdiri', 'Start jongkok', 'Start melayang', 'Start duduk'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lari jarak pendek menggunakan start jongkok (crouching start) dengan aba-aba "bersedia, siap, yak!"',
    },
    {
      question: 'Abak-aba dalam start lari jarak pendek adalah ...',
      options: ['Siap, mulai', 'Bersedia, siap, yak!', 'Satu, dua, tiga', 'Go'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Aba-aba resmi: "BERSEDIA" (siap di garis), "SIAP" (angkat pinggul), "YAK" (lari).',
    },
    {
      question: 'Teknik lari jarak pendek yang benar adalah ...',
      options: ['Bertumpu pada tumit', 'Bertumpu pada ujung kaki, badan condong ke depan', 'Badan tegak lurus', 'Langkah lebar dan lambat'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Lari sprint: bertumpu pada ujung kaki, badan condong ke depan, ayunan lengan kuat, langkah cepat dan lebar.',
    },
    {
      question: 'Salah satu nomor lari jarak pendek adalah ...',
      options: ['5.000 m', '100 m', 'Marathon', '3.000 m halang rintang'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Nomor lari jarak pendek: 100 m, 200 m, dan 400 m.',
    }],

  [quizKey('PJOK', 'Atletik', 'Lompat Jauh')]: [
    {
      question: 'Tujuan lompat jauh adalah ...',
      options: ['Melompat setinggi mungkin', 'Melompat sejauh mungkin ke bak pasir', 'Melompat dengan gaya tertentu', 'Lari cepat lalu melompat'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lompat jauh bertujuan mencapai jarak lompatan sejauh mungkin ke bak pasir.',
    },
    {
      question: 'Urutan gerakan lompat jauh yang benar adalah ...',
      options: ['Awalan, tolakan, melayang, mendarat', 'Tolakan, awalan, mendarat, melayang', 'Awalan, melayang, tolakan, mendarat', 'Mendarat, awalan, tolakan, melayang'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Urutan lompat jauh: awalan (lari), tolakan (tumpuan satu kaki), melayang di udara, mendarat di bak pasir.',
    },
    {
      question: 'Tolakan dalam lompat jauh dilakukan dengan ...',
      options: ['Kedua kaki', 'Satu kaki terkuat', 'Kepala', 'Tangan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tolakan dilakukan dengan satu kaki (kaki terkuat) pada papan tumpuan.',
    },
    {
      question: 'Gaya lompat jauh yang melayang dengan langkah di udara disebut gaya ...',
      options: ['Jongkok (tuck)', 'Menggantung (hang style)', 'Berjalan di udara (walking in the air)', 'Gunting'],
      correctIndex: 2,
      difficulty: 'medium',
      explanation: 'Gaya berjalan di udara (walking in the air): setelah tolakan, atlet melangkahkan kaki di udara seperti berjalan.',
    },
    {
      question: 'Pendaratan lompat jauh yang benar adalah ...',
      options: ['Tumit duluan, kaki lurus', 'Kedua kaki bersamaan, lutut ditekuk, badan condong ke depan', 'Satu kaki dulu', 'Badan jatuh ke belakang'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pendaratan: kedua kaki bersamaan, lutut menekuk untuk mengurangi benturan, badan condong ke depan.',
    }],

  [quizKey('PJOK', 'Kebugaran', 'Program Kebugaran')]: [
    {
      question: 'Kebugaran jasmani adalah ...',
      options: ['Kemampuan melakukan pekerjaan sehari-hari tanpa kelelahan berarti', 'Kemampuan berlari cepat', 'Kekuatan otot maksimal', 'Kelenturan tubuh'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Kebugaran jasmani adalah kemampuan tubuh melakukan aktivitas sehari-hari tanpa kelelahan berlebihan.',
    },
    {
      question: 'Komponen kebugaran jasmani meliputi ...',
      options: ['Kekuatan, daya tahan, kelenturan, kecepatan', 'Hanya kekuatan otot', 'Hanya kelenturan', 'Tinggi dan berat badan'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Komponen kebugaran: kekuatan (strength), daya tahan (endurance), kelenturan (flexibility), kecepatan (speed), daya ledak (power).',
    },
    {
      question: 'Latihan yang meningkatkan daya tahan jantung-paru adalah ...',
      options: ['Angkat beban', 'Lari jarak jauh (kardiovaskuler)', 'Push up', 'Sit up'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Latihan kardiovaskuler seperti lari, renang, bersepeda meningkatkan daya tahan jantung dan paru-paru.',
    },
    {
      question: 'Frekuensi latihan kebugaran yang dianjurkan adalah ...',
      options: ['1 kali seminggu', '3-5 kali seminggu', 'Setiap hari', '2 kali sebulan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Frekuensi latihan ideal: 3-5 kali per minggu dengan durasi 30-60 menit setiap sesi.',
    },
    {
      question: 'Prinsip latihan FITT adalah ...',
      options: ['Frequency, Intensity, Time, Type', 'Fast, Intense, Training, Test', 'Flexibility, Interval, Tempo, Tension', 'Focus, Inhale, Tense, Timing'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'FITT: Frequency (frekuensi), Intensity (intensitas), Time (durasi), Type (jenis latihan).',
    }],

  [quizKey('PJOK', 'Kebugaran', 'Latihan Kekuatan dan Daya Tahan')]: [
    {
      question: 'Latihan push-up bertujuan untuk melatih kekuatan otot ...',
      options: ['Kaki', 'Lengan dan dada', 'Perut', 'Punggung'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Push-up melatih otot lengan (triceps), dada (pectoralis), dan bahu.',
    },
    {
      question: 'Sit-up adalah latihan untuk menguatkan otot ...',
      options: ['Kaki', 'Perut', 'Lengan', 'Punggung'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sit-up melatih otot perut (abdominal muscles).',
    },
    {
      question: 'Latihan squat jump melatih daya ledak otot ...',
      options: ['Lengan', 'Kaki', 'Perut', 'Leher'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Squat jump melatih daya ledak (power) otot kaki melalui gerakan melompat dari posisi jongkok.',
    },
    {
      question: 'Latihan interval adalah ...',
      options: ['Latihan terus menerus tanpa istirahat', 'Latihan dengan selang-seling kerja dan istirahat', 'Latihan ringan saja', 'Latihan tanpa target'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Latihan interval: bergantian antara periode latihan intensif dan periode pemulihan (istirahat aktif).',
    },
    {
      question: 'Latihan daya tahan otot dilakukan dengan ...',
      options: ['Beban berat, sedikit repetisi', 'Beban ringan-sedang, banyak repetisi', 'Satu repetisi maksimal', 'Tanpa beban'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Daya tahan otot dilatih dengan beban ringan-sedang dan repetisi tinggi (15-20 kali).',
    }],

  [quizKey('PJOK', 'Kebugaran', 'Komposisi Tubuh Ideal')]: [
    {
      question: 'Komposisi tubuh ideal adalah ...',
      options: ['Proporsi lemak dan massa otot yang seimbang', 'Berat badan serendah mungkin', 'Tinggi badan maksimal', 'Otot sebesar mungkin'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Komposisi tubuh ideal adalah perbandingan antara massa lemak tubuh dengan massa bebas lemak (otot, tulang, organ) yang sehat.',
    },
    {
      question: 'IMT (Indeks Massa Tubuh) dihitung dari ...',
      options: ['Berat badan (kg) / Tinggi badan (m)²', 'Tinggi badan / Berat badan', 'Berat badan × Tinggi badan', 'Umur × Berat badan'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'IMT = BB (kg) / TB (m)². Klasifikasi: <18,5 (kurus), 18,5-24,9 (normal), 25-29,9 (gemuk), ≥30 (obesitas).',
    },
    {
      question: 'Seseorang dengan IMT 27 termasuk kategori ...',
      options: ['Normal', 'Kelebihan berat badan (overweight)', 'Kurus', 'Obesitas'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'IMT 27 berada dalam rentang 25-29,9 yang dikategorikan overweight (kelebihan berat badan).',
    },
    {
      question: 'Cara mengukur lemak tubuh yang sederhana adalah ...',
      options: ['X-ray', 'Pengukuran lipatan kulit (skin fold)', 'MRI', 'CT Scan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pengukuran lipatan kulit (skin fold) menggunakan kaliper di beberapa titik tubuh adalah metode sederhana mengukur lemak tubuh.',
    },
    {
      question: 'Faktor yang mempengaruhi komposisi tubuh adalah ...',
      options: ['Pola makan, aktivitas fisik, dan genetik', 'Hanya genetik', 'Hanya olahraga', 'Hanya usia'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Komposisi tubuh dipengaruhi oleh pola makan, aktivitas fisik/latihan, faktor genetik, usia, dan hormon.',
    }],

  [quizKey('PJOK', 'Pola Hidup Sehat', 'Pola Makan Seimbang')]: [
    {
      question: 'Pola makan seimbang adalah ...',
      options: ['Makan makanan favorit saja', 'Mengonsumsi makanan dengan gizi lengkap sesuai kebutuhan tubuh', 'Makan sebanyak-banyaknya', 'Tidak makan nasi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pola makan seimbang: mengonsumsi karbohidrat, protein, lemak, vitamin, mineral, dan serat dalam proporsi tepat.',
    },
    {
      question: 'Prinsip "Isi Piringku" dari Kemenkes meliputi ...',
      options: ['1/3 karbohidrat, 1/3 lauk, 1/3 sayur dan buah', 'Setengah piring sayur dan buah, setengah lainnya karbohidrat dan protein', 'Nasi saja', 'Hanya protein'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: '"Isi Piringku": 1/2 piring sayur dan buah, 1/4 karbohidrat (nasi/roti/kentang), 1/4 protein (lauk).',
    },
    {
      question: 'Fungsi karbohidrat sebagai ...',
      options: ['Pembangun sel', 'Sumber energi utama', 'Regulator tubuh', 'Cadangan energi jangka panjang'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Karbohidrat (nasi, roti, pasta) berfungsi sebagai sumber energi utama bagi tubuh.',
    },
    {
      question: 'Protein hewani banyak terdapat pada ...',
      options: ['Tahu dan tempe', 'Daging, ikan, telur', 'Nasi', 'Buah-buahan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Protein hewani: daging, ikan, telur, susu. Protein nabati: tahu, tempe, kacang-kacangan.',
    },
    {
      question: 'Minum air putih yang cukup per hari adalah sekitar ...',
      options: ['500 ml', '1-2 liter (8 gelas)', '3-4 liter', '5 liter'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kebutuhan air per hari sekitar 2 liter atau 8 gelas (1 gelas = 250 ml).',
    }],

  [quizKey('PJOK', 'Pola Hidup Sehat', 'Bahaya NAPZA')]: [
    {
      question: 'NAPZA adalah singkatan dari ...',
      options: ['Narkotika, Psikotropika, dan Zat Adiktif', 'Narkoba, Alkohol, dan Psikotropika', 'Nikotin, Alkohol, dan Zat Berbahaya', 'Nasi, Air, Protein, Zat besi'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'NAPZA: Narkotika, Psikotropika, dan Zat Adiktif lainnya yang berbahaya bagi kesehatan.',
    },
    {
      question: 'Ganja termasuk golongan narkotika yang menimbulkan efek ...',
      options: ['Stimulan', 'Halusinogen', 'Depresan', 'Penambah tenaga'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ganja bersifat halusinogen: menyebabkan pemakai berhalusinasi (melihat sesuatu yang tidak nyata).',
    },
    {
      question: 'Efek negatif penyalahgunaan NAPZA adalah ...',
      options: ['Meningkatkan konsentrasi', 'Kerusakan otak, ketergantungan, dan kematian', 'Memperkuat imunitas', 'Memperpanjang umur'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'NAPZA merusak sistem saraf, menyebabkan ketergantungan, overdosis, dan kematian.',
    },
    {
      question: 'Upaya pencegahan penyalahgunaan NAPZA dilakukan melalui ...',
      options: ['Pendidikan dan sosialisasi bahaya NAPZA', 'Mencoba sekali saja', 'Membiarkan saja', 'Menggunakan secara terkontrol'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Pencegahan: pendidikan tentang bahaya NAPZA, kegiatan positif, pengawasan orang tua, dan rehabilitasi.',
    },
    {
      question: 'Rehabilitasi bagi pecandu NAPZA bertujuan untuk ...',
      options: ['Menghukum pecandu', 'Memulihkan pecandu dari ketergantungan NAPZA', 'Mengucilkan pecandu', 'Memberi pekerjaan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Rehabilitasi bertujuan memulihkan kondisi fisik dan mental pecandu serta mengembalikan ke masyarakat.',
    }],

  [quizKey('PJOK', 'Pola Hidup Sehat', 'Perilaku Hidup Bersih dan Sehat')]: [
    {
      question: 'PHBS (Perilaku Hidup Bersih dan Sehat) adalah ...',
      options: ['Perilaku yang dilakukan atas kesadaran untuk menjaga kesehatan', 'Olahraga profesional', 'Makan makanan mahal', 'Hidup mewah'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'PHBS adalah perilaku yang dipraktikkan atas kesadaran sendiri untuk menjaga kesehatan dan mencegah penyakit.',
    },
    {
      question: 'Contoh PHBS di sekolah adalah ...',
      options: ['Membuang sampah sembarangan', 'Cuci tangan dengan sabun sebelum makan', 'Tidak olahraga', 'Makan sambil jalan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Cuci tangan dengan sabun dan air mengalir adalah contoh PHBS sederhana yang mencegah penyakit.',
    },
    {
      question: 'Mencuci tangan yang benar sebaiknya dilakukan ...',
      options: ['Sesekali saja', 'Sebelum dan sesudah makan, setelah dari toilet', 'Hanya setelah olahraga', 'Seminggu sekali'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Cuci tangan: sebelum makan, sesudah makan, setelah dari toilet, setelah menyentuh hewan, setelah beraktivitas di luar.',
    },
    {
      question: 'Langkah cuci tangan yang benar minimal selama ...',
      options: ['5 detik', '20 detik', '1 menit', '5 menit'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'WHO merekomendasikan cuci tangan dengan sabun selama minimal 20 detik untuk membunuh kuman.',
    },
    {
      question: 'PHBS di rumah meliputi ...',
      options: ['Merokok di dalam rumah', 'Membuka jendela setiap pagi untuk sirkulasi udara', 'Menumpuk sampah', 'Tidak membersihkan kamar'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'PHBS rumah tangga: ventilasi baik, tidak merokok di rumah, olahraga teratur, makan bergizi, dan jamban sehat.',
    }],

  // ═══════════════════════════════════════════════════════════════════════════
  //  PENDIDIKAN PANCASILA — 12 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Pendidikan Pancasila', 'Pancasila', 'Pancasila sebagai Ideologi')]: [
    {
      question: 'Pancasila sebagai ideologi negara berarti ...',
      options: ['Pancasila menjadi dasar filosofis dalam penyelenggaraan negara', 'Pancasila hanya simbol negara', 'Pancasila hanya untuk kalangan tertentu', 'Pancasila bisa diganti sewaktu-waktu'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Sebagai ideologi, Pancasila menjadi pandangan hidup, dasar filosofis, dan pedoman dalam penyelenggaraan negara.',
    },
    {
      question: 'Pancasila sebagai ideologi terbuka memiliki arti ...',
      options: ['Dapat diubah kapan saja', 'Terbuka menerima perkembangan zaman tanpa kehilangan jati diri', 'Tertutup terhadap perubahan', 'Hanya untuk satu golongan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Ideologi terbuka: dinamis, mampu menyesuaikan dengan perkembangan tanpa kehilangan nilai-nilai dasarnya.',
    },
    {
      question: 'Nilai-nilai Pancasila bersumber dari ...',
      options: ['Budaya asing', 'Budaya dan kepribadian bangsa Indonesia', 'Ideologi komunis', 'Pemikiran penjajah'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Nilai Pancasila digali dari budaya, adat istiadat, dan kepribadian bangsa Indonesia sendiri.',
    },
    {
      question: 'Perbedaan Pancasila dengan ideologi lain adalah ...',
      options: ['Pancasila mengakui Ketuhanan Yang Maha Esa', 'Pancasila tidak mengakui hak asasi', 'Pancasila bersifat diktator', 'Pancasila anti demokrasi'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Keunikan Pancasila: sila pertama mengakui Ketuhanan, berbeda dengan ideologi sekuler atau komunis.',
    },
    {
      question: 'Ideologi Pancasila bersifat ...',
      options: ['Kaku dan statis', 'Dinamis dan adaptif', 'Dipaksakan dari atas', 'Tertutup'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pancasila bersifat dinamis, mampu beradaptasi dengan zaman, namun nilai intinya tetap.',
    }],

  [quizKey('Pendidikan Pancasila', 'Pancasila', 'Pancasila sebagai Dasar Negara')]: [
    {
      question: 'Pancasila sebagai dasar negara tercantum dalam ...',
      options: ['Pembukaan UUD 1945 alinea ke-4', 'Pasal 1 UUD 1945', 'Pembukaan UUD 1945 alinea ke-3', 'Pasal 37 UUD 1945'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Rumusan Pancasila sebagai dasar negara tercantum dalam alinea ke-4 Pembukaan UUD 1945.',
    },
    {
      question: 'Fungsi Pancasila sebagai dasar negara adalah ...',
      options: ['Pedoman hidup sehari-hari', 'Sumber dari segala sumber hukum di Indonesia', 'Simbol negara', 'Lambang partai'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sebagai dasar negara, Pancasila menjadi sumber dari segala sumber hukum (staatsfundamentalnorm).',
    },
    {
      question: 'Tanggal pengesahan Pancasila sebagai dasar negara adalah ...',
      options: ['17 Agustus 1945', '18 Agustus 1945', '1 Juni 1945', '22 Juni 1945'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pancasila disahkan sebagai dasar negara pada 18 Agustus 1945 oleh PPKI.',
    },
    {
      question: 'Kedudukan Pancasila sebagai dasar negara bersifat ...',
      options: ['Sementara', 'Tetap dan final', 'Dapat diubah setiap 5 tahun', 'Tidak mengikat'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Kedudukan Pancasila sebagai dasar negara bersifat tetap, final, dan tidak dapat diubah.',
    },
    {
      question: 'Konsekuensi Pancasila sebagai dasar negara adalah ...',
      options: ['Semua peraturan perundang-undangan harus sesuai Pancasila', 'Pancasila tidak mengikat peraturan hukum', 'Hanya sukarela', 'Tidak ada sanksi'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Semua peraturan perundang-undangan di Indonesia harus berpedoman dan tidak bertentangan dengan Pancasila.',
    }],

  [quizKey('Pendidikan Pancasila', 'Pancasila', 'Implementasi Pancasila')]: [
    {
      question: 'Implementasi sila ke-1 Pancasila dalam kehidupan sehari-hari adalah ...',
      options: ['Beribadah sesuai agama dan kepercayaan masing-masing', 'Gotong royong', 'Musyawarah', 'Saling menghargai pendapat'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Sila ke-1 (Ketuhanan Yang Maha Esa): beribadah sesuai agama, toleransi beragama, tidak memaksakan agama.',
    },
    {
      question: 'Bentuk implementasi sila ke-3 Pancasila adalah ...',
      options: ['Mementingkan golongan sendiri', 'Cinta tanah air dan menjaga persatuan bangsa', 'Individualisme', 'SARA'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sila ke-3 (Persatuan Indonesia): cinta tanah air, menjaga persatuan, rela berkorban untuk bangsa.',
    },
    {
      question: 'Musyawarah mufakat merupakan implementasi dari sila ke ...',
      options: ['2', '3', '4', '5'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'Sila ke-4 (Kerakyatan): musyawarah untuk mufakat, mengutamakan kepentingan bersama.',
    },
    {
      question: 'Gotong royong mencerminkan sila ke ...',
      options: ['1', '2', '3', '5'],
      correctIndex: 3,
      difficulty: 'medium',
      explanation: 'Sila ke-5 (Keadilan Sosial): gotong royong, kerja sama, dan sikap adil terhadap sesama.',
    },
    {
      question: 'Contoh implementasi sila ke-2 Pancasila di sekolah adalah ...',
      options: ['Mencontek saat ujian', 'Menghormati guru dan membantu teman yang kesulitan', 'Berkelahi dengan teman', 'Membeda-bedakan teman'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sila ke-2 (Kemanusiaan): menghormati sesama, membantu yang kesulitan, tidak membeda-bedakan.',
    }],

  [quizKey('Pendidikan Pancasila', 'Hukum', 'Sistem Hukum Indonesia')]: [
    {
      question: 'Sistem hukum Indonesia menganut sistem ...',
      options: ['Common law', 'Eropa Kontinental (Civil law)', 'Hukum Islam murni', 'Hukum adat saja'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Indonesia menganut sistem hukum Eropa Kontinental (civil law) yang menekankan pada peraturan tertulis (undang-undang).',
    },
    {
      question: 'Hierarki peraturan perundang-undangan di Indonesia diatur dalam ...',
      options: ['UUD 1945', 'UU No. 12 Tahun 2011', 'Perpres', 'Tap MPR'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'UU No. 12 Tahun 2011 mengatur hierarki: UUD 1945, Tap MPR, UU/Perppu, Perpres, Perda.',
    },
    {
      question: 'Lembaga yang berwenang menguji undang-undang terhadap UUD adalah ...',
      options: ['Mahkamah Agung (MA)', 'Mahkamah Konstitusi (MK)', 'Komisi Yudisial (KY)', 'DPR'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Mahkamah Konstitusi berwenang menguji undang-undang terhadap UUD 1945 (judicial review).',
    },
    {
      question: 'Asas legalitas dalam hukum pidana menyatakan ...',
      options: ['Seseorang dapat dihukum tanpa undang-undang', 'Tidak ada perbuatan pidana tanpa undang-undang yang mengaturnya', 'Hakim bebas menghukum siapa saja', 'Hukum berlaku surut'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Asas legalitas: nullum delictum nulla poena sine praevia lege (tidak ada pidana tanpa undang-undang sebelumnya).',
    },
    {
      question: 'Lembaga yudikatif di Indonesia adalah ...',
      options: ['DPR, MPR, DPD', 'Mahkamah Agung, Mahkamah Konstitusi, Komisi Yudisial', 'Presiden, Wakil Presiden', 'Kementerian dan LPNK'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kekuasaan yudikatif (kehakiman): MA, MK, dan KY yang bebas dari campur tangan eksekutif.',
    }],

  [quizKey('Pendidikan Pancasila', 'Hukum', 'Sumber Hukum Nasional')]: [
    {
      question: 'Sumber hukum tertinggi di Indonesia adalah ...',
      options: ['Undang-Undang', 'Peraturan Presiden', 'UUD 1945', 'Peraturan Daerah'],
      correctIndex: 2,
      difficulty: 'easy',
      explanation: 'UUD 1945 adalah sumber hukum tertinggi (staatsfundamentalnorm) dalam hierarki peraturan perundang-undangan Indonesia.',
    },
    {
      question: 'Undang-undang dibuat oleh ...',
      options: ['Presiden', 'Presiden bersama DPR', 'Mahkamah Agung', 'BPK'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'UU dibuat oleh Presiden bersama DPR (Pasal 20 UUD 1945).',
    },
    {
      question: 'Peraturan Pemerintah Pengganti Undang-Undang (Perppu) dikeluarkan oleh ...',
      options: ['DPR', 'Presiden dalam hal ihwal kegentingan memaksa', 'Mahkamah Konstitusi', 'Menteri'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Presiden dapat mengeluarkan Perppu dalam keadaan kegentingan memaksa (Pasal 22 UUD 1945).',
    },
    {
      question: 'Peraturan Daerah (Perda) dibuat oleh ...',
      options: ['Gubernur/Bupati/Walikota bersama DPRD', 'Presiden', 'DPR RI', 'MA'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Perda dibuat oleh kepala daerah bersama DPRD untuk mengatur urusan otonomi daerah.',
    },
    {
      question: 'Tap MPR pernah menjadi sumber hukum tertinggi sebelum amandemen UUD 1945. Setelah amandemen, kedudukan Tap MPR ...',
      options: ['Masih sama', 'Berada di bawah UUD 1945, setingkat dengan UU', 'Dihapus total', 'Lebih tinggi dari UUD'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Setelah amandemen UUD 1945, Tap MPR berada di bawah UUD 1945 dan setingkat dengan Undang-Undang.',
    }],

  [quizKey('Pendidikan Pancasila', 'Hukum', 'Penegakan Hukum')]: [
    {
      question: 'Penegakan hukum bertujuan untuk ...',
      options: ['Melindungi kepentingan penguasa', 'Menciptakan keadilan, kepastian, dan kemanfaatan hukum', 'Menghukum semua orang', 'Mengabaikan hak asasi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Penegakan hukum bertujuan mewujudkan keadilan, kepastian hukum, dan kemanfaatan bagi masyarakat.',
    },
    {
      question: 'Lembaga yang bertugas menegakkan hukum di Indonesia adalah ...',
      options: ['DPR', 'Kepolisian, Kejaksaan, dan KPK', 'BPK', 'Bank Indonesia'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Lembaga penegak hukum: Kepolisian (penyidik), Kejaksaan (penuntut), KPK (tindak pidana korupsi).',
    },
    {
      question: 'Faktor yang menghambat penegakan hukum di Indonesia adalah ...',
      options: ['Kesadaran hukum masyarakat tinggi', 'Budaya korupsi dan rendahnya integritas aparat', 'Sistem hukum modern', 'Pengawasan ketat'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Faktor penghambat: korupsi, mafia hukum, rendahnya integritas aparat, dan kesadaran hukum masyarakat.',
    },
    {
      question: 'Asas praduga tidak bersalah (presumption of innocence) berarti ...',
      options: ['Tersangka dianggap bersalah sampai terbukti tidak bersalah', 'Seseorang dianggap tidak bersalah sampai putusan pengadilan berkekuatan tetap', 'Semua orang bersalah', 'Tidak perlu pengadilan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Asas presumption of innocence: seseorang dianggap tidak bersalah hingga ada putusan pengadilan yang berkekuatan hukum tetap.',
    },
    {
      question: 'KPK adalah lembaga yang fokus memberantas ...',
      options: ['Narkoba', 'Tindak pidana korupsi', 'Terorisme', 'Pelanggaran lalu lintas'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Komisi Pemberantasan Korupsi (KPK) dibentuk untuk memberantas tindak pidana korupsi di Indonesia.',
    }],

  [quizKey('Pendidikan Pancasila', 'HAM', 'Hak Asasi Manusia')]: [
    {
      question: 'HAM adalah ...',
      options: ['Hak yang diberikan oleh negara', 'Hak dasar yang melekat pada setiap manusia sejak lahir', 'Hak istimewa bagi pejabat', 'Hak yang bisa dibeli'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'HAM adalah hak dasar yang melekat pada manusia sejak lahir sebagai anugerah Tuhan, bukan pemberian negara.',
    },
    {
      question: 'Ciri-ciri HAM adalah ...',
      options: ['Dapat dicabut sepihak', 'Hakiki, universal, tidak dapat dicabut, dan tidak dapat dibagi', 'Hanya untuk warga negara tertentu', 'Bergantung pada status sosial'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'HAM bersifat hakiki (melekat), universal (berlaku di mana-mana), tidak dapat dicabut, dan tidak dapat dibagi.',
    },
    {
      question: 'Hak untuk mendapatkan pendidikan termasuk jenis HAM ...',
      options: ['HAM pribadi', 'HAM ekonomi, sosial, dan budaya', 'HAM politik', 'HAM hukum'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Hak pendidikan termasuk HAM ekonomi, sosial, dan budaya (Ekosob) yang diatur dalam Kovenan Internasional.',
    },
    {
      question: 'Hak untuk menyampaikan pendapat termasuk HAM ...',
      options: ['Pribadi', 'Politik', 'Ekonomi', 'Sosial'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Hak politik meliputi hak berserikat, berkumpul, dan menyampaikan pendapat.',
    },
    {
      question: 'UU yang mengatur tentang HAM di Indonesia adalah ...',
      options: ['UU No. 1 Tahun 1970', 'UU No. 39 Tahun 1999 tentang HAM', 'UU No. 12 Tahun 2011', 'UU No. 5 Tahun 1999'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'UU No. 39 Tahun 1999 adalah undang-undang yang mengatur tentang Hak Asasi Manusia di Indonesia.',
    }],

  [quizKey('Pendidikan Pancasila', 'HAM', 'Kasus Pelanggaran HAM')]: [
    {
      question: 'Pelanggaran HAM adalah ...',
      options: ['Tindakan sesuai hukum', 'Tindakan yang melanggar hak asasi manusia yang dijamin hukum', 'Pelaksanaan hak dan kewajiban', 'Pembatasan yang wajar'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pelanggaran HAM adalah setiap tindakan yang mengurangi, menghalangi, atau mencabut HAM seseorang tanpa dasar hukum.',
    },
    {
      question: 'Contoh pelanggaran HAM berat adalah ...',
      options: ['Menerobos lampu merah', 'Genosida (pemusnahan kelompok) dan kejahatan terhadap kemanusiaan', 'Terlambat membayar pajak', 'Membuang sampah sembarangan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pelanggaran HAM berat meliputi genosida, kejahatan terhadap kemanusiaan, kejahatan perang, dan agresi.',
    },
    {
      question: 'Komnas HAM adalah lembaga yang ...',
      options: ['Menghukum pelanggar HAM', 'Memantau, menyelidiki, dan mediasi kasus pelanggaran HAM', 'Membuat undang-undang', 'Menjadi pengadilan HAM'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Komnas HAM berfungsi memantau, menyelidiki, dan memediasi kasus pelanggaran HAM, bukan mengadili.',
    },
    {
      question: 'Pengadilan HAM dibentuk untuk mengadili ...',
      options: ['Semua pelanggaran hukum', 'Pelanggaran HAM berat', 'Pelanggaran lalu lintas', 'Kasus perdata'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pengadilan HAM khusus mengadili pelanggaran HAM berat (genosida dan kejahatan terhadap kemanusiaan).',
    },
    {
      question: 'Salah satu contoh kasus pelanggaran HAM berat di Indonesia adalah ...',
      options: ['Kasus korupsi', 'Tragedi 1965 dan Tragedi 1998', 'Pelanggaran lalu lintas', 'Sengketa tanah'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Beberapa kasus HAM berat di Indonesia: Tragedi 1965, Tragedi 1998, Penculikan aktivis 1998, dan Kasus Tanjung Priok.',
    }],

  [quizKey('Pendidikan Pancasila', 'Demokrasi', 'Demokrasi di Indonesia')]: [
    {
      question: 'Demokrasi adalah ...',
      options: ['Pemerintahan oleh satu orang', 'Pemerintahan dari rakyat, oleh rakyat, dan untuk rakyat', 'Pemerintahan militer', 'Pemerintahan tanpa aturan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Demokrasi adalah sistem pemerintahan di mana kekuasaan tertinggi berada di tangan rakyat.',
    },
    {
      question: 'Indonesia menganut sistem demokrasi ...',
      options: ['Demokrasi langsung', 'Demokrasi Pancasila', 'Demokrasi liberal', 'Demokrasi komunis'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Indonesia menganut Demokrasi Pancasila yang berdasarkan musyawarah mufakat dan nilai-nilai Pancasila.',
    },
    {
      question: 'Pemilihan umum di Indonesia dilaksanakan setiap ...',
      options: ['3 tahun', '5 tahun', '4 tahun', '6 tahun'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pemilu di Indonesia dilaksanakan setiap 5 tahun untuk memilih presiden, DPR, DPD, dan DPRD.',
    },
    {
      question: 'Ciri demokrasi Pancasila adalah ...',
      options: ['Dominasi mayoritas', 'Musyawarah untuk mufakat dan penghormatan HAM', 'Kebebasan tanpa batas', 'Kekuasaan presiden absolut'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Demokrasi Pancasila: musyawarah mufakat, keseimbangan hak-kewajiban, dan penghormatan HAM.',
    },
    {
      question: 'Pemilu langsung oleh rakyat merupakan perwujudan sila ke ... Pancasila.',
      options: ['3', '4', '5', '2'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pemilu langsung mencerminkan sila ke-4: Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan.',
    }],

  [quizKey('Pendidikan Pancasila', 'Demokrasi', 'Pemilu dan Partisipasi')]: [
    {
      question: 'Pemilu adalah sarana ...',
      options: ['Kediktatoran', 'Pelaksanaan kedaulatan rakyat', 'Pertukaran kekuasaan secara paksa', 'Pembubaran negara'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pemilu adalah perwujudan kedaulatan rakyat untuk memilih wakil rakyat dan pemimpin negara.',
    },
    {
      question: 'Asas Pemilu di Indonesia adalah ...',
      options: ['Langsung, Umum, Bebas, Rahasia, Jujur, Adil (LUBER JURDIL)', 'Terbatas, Tertutup', 'Dipilih, Ditunjuk', 'Sukarela, Sewaktu-waktu'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Asas Pemilu: Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil (LUBER JURDIL).',
    },
    {
      question: 'Partisipasi politik masyarakat dalam Pemilu adalah ...',
      options: ['Hak memilih dan dipilih', 'Kewajiban membayar pajak', 'Hak beragama', 'Kewajiban belajar'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Partisipasi Pemilu: menggunakan hak pilih (memilih) dan hak dipilih (mencalonkan diri).',
    },
    {
      question: 'Golongan Putih (Golput) adalah ...',
      options: ['Kelompok yang menggunakan hak pilih', 'Kelompok yang tidak menggunakan hak pilih secara sengaja', 'Partai politik', 'Penyelenggara Pemilu'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Golput adalah golongan yang sengaja tidak menggunakan hak pilihnya dalam Pemilu.',
    },
    {
      question: 'Lembaga penyelenggara Pemilu di Indonesia adalah ...',
      options: ['KPU, Bawaslu, dan DKPP', 'KPK, BPK, dan MA', 'DPR, MPR, dan DPD', 'Presiden dan Wakil Presiden'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Penyelenggara Pemilu: KPU (pelaksana), Bawaslu (pengawas), DKPP (etik penyelenggara).',
    }],

  [quizKey('Pendidikan Pancasila', 'Globalisasi', 'Dampak Globalisasi')]: [
    {
      question: 'Globalisasi membawa dampak positif berupa ...',
      options: ['Isolasi budaya', 'Kemudahan akses informasi dan teknologi', 'Lunturnya bahasa daerah', 'Dominasi budaya asing'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Dampak positif globalisasi: kemajuan teknologi, akses informasi global, dan pasar yang lebih luas.',
    },
    {
      question: 'Dampak negatif globalisasi bagi Pancasila adalah ...',
      options: ['Memperkuat nilai gotong royong', 'Masuknya budaya asing yang bertentangan dengan nilai Pancasila', 'Meningkatkan nasionalisme', 'Memperkuat identitas bangsa'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Globalisasi membawa budaya asing yang bisa bertentangan dengan nilai Pancasila, seperti individualisme dan hedonisme.',
    },
    {
      question: 'Westernisasi adalah ...',
      options: ['Penghargaan budaya lokal', 'Gaya hidup yang meniru budaya Barat secara berlebihan', 'Pelestarian budaya tradisional', 'Integrasi budaya'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Westernisasi adalah peniruan gaya hidup, nilai, dan budaya Barat secara berlebihan tanpa seleksi.',
    },
    {
      question: 'Sikap selektif dalam menghadapi globalisasi berarti ...',
      options: ['Menolak semua budaya asing', 'Menerima yang sesuai dengan nilai bangsa, menolak yang bertentangan', 'Menerima semua tanpa filter', 'Mengabaikan globalisasi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Sikap selektif: menerima pengaruh global yang positif dan sesuai nilai budaya bangsa, menolak yang negatif.',
    },
    {
      question: 'Pengaruh globalisasi terhadap semangat gotong royong adalah ...',
      options: ['Memperkuat gotong royong', 'Mengikis semangat gotong royong karena individualisme', 'Tidak berpengaruh', 'Mengubah gotong royong jadi modern'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Globalisasi mendorong individualisme yang mengikis semangat gotong royong tradisional masyarakat Indonesia.',
    }],

  [quizKey('Pendidikan Pancasila', 'Globalisasi', 'Identitas Nasional')]: [
    {
      question: 'Identitas nasional Indonesia adalah ...',
      options: ['Ciri khas yang membedakan bangsa Indonesia dari bangsa lain', 'Bendera saja', 'Bahasa Inggris', 'Pakaian modern'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Identitas nasional adalah ciri khas yang melekat pada bangsa Indonesia dan membedakannya dari bangsa lain.',
    },
    {
      question: 'Yang termasuk identitas nasional Indonesia adalah ...',
      options: ['Pancasila, Bahasa Indonesia, Bendera Merah Putih', 'Bahasa Inggris, Dolar', 'Bendera Union Jack', 'Lagu kebangsaan asing'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Identitas nasional: Pancasila, UUD 1945, Bahasa Indonesia, Bendera Merah Putih, Garuda Pancasila, dan lagu Indonesia Raya.',
    },
    {
      question: 'Bahasa Indonesia sebagai identitas nasional berfungsi sebagai ...',
      options: ['Bahasa asing', 'Alat pemersatu bangsa yang beragam suku dan bahasa daerah', 'Bahasa internasional', 'Bahasa dagang'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Bahasa Indonesia mempersatukan suku-suku yang beragam dengan bahasa daerah berbeda-beda.',
    },
    {
      question: 'Ancaman terhadap identitas nasional di era globalisasi adalah ...',
      options: ['Penguatan budaya lokal', 'Lunturnya nilai-nilai tradisional dan budaya asli', 'Semangat nasionalisme', 'Pelestarian bahasa daerah'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Globalisasi mengancam identitas nasional melalui lunturnya budaya tradisional dan nilai-nilai asli bangsa.',
    },
    {
      question: 'Upaya memperkuat identitas nasional di era global adalah ...',
      options: ['Mempelajari dan mencintai budaya sendiri, serta menyaring budaya asing', 'Meniru semua budaya asing', 'Mengabaikan budaya lokal', 'Berbahasa Inggris saja'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Memperkuat identitas nasional: mempelajari budaya sendiri, menggunakan produk lokal, dan selektif terhadap budaya asing.',
    }],

  // ═══════════════════════════════════════════════════════════════════════════
  //  INFORMATIKA — 10 sub-topik
  // ═══════════════════════════════════════════════════════════════════════════

  [quizKey('Informatika', 'Algoritma', 'Algoritma Lanjutan')]: [
    {
      question: 'Algoritma adalah ...',
      options: ['Bahasa pemrograman', 'Langkah-langkah sistematis untuk menyelesaikan masalah', 'Hardware komputer', 'Sistem operasi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Algoritma adalah urutan langkah logis dan sistematis untuk menyelesaikan suatu masalah.',
    },
    {
      question: 'Algoritma pencarian biner (binary search) bekerja pada data yang ...',
      options: ['Acak', 'Terurut (sorted)', 'Berapapun urutannya', 'Tidak terurut'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Binary search membutuhkan data yang sudah terurut. Algoritma ini membagi data menjadi dua dan mencari di bagian yang relevan.',
    },
    {
      question: 'Kompleksitas waktu algoritma binary search adalah ...',
      options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
      correctIndex: 1,
      difficulty: 'hard',
      explanation: 'Binary search memiliki kompleksitas O(log n) karena setiap iterasi mengurangi ruang pencarian menjadi setengahnya.',
    },
    {
      question: 'Algoritma sorting yang membandingkan dan menukar elemen bersebelahan disebut ...',
      options: ['Bubble sort', 'Selection sort', 'Merge sort', 'Quick sort'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Bubble sort bekerja dengan membandingkan dan menukar elemen bersebelahan berulang kali hingga data terurut.',
    },
    {
      question: 'Rekursi adalah teknik algoritma di mana fungsi ...',
      options: ['Memanggil dirinya sendiri', 'Berhenti total', 'Tidak mengembalikan nilai', 'Hanya berjalan sekali'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'Rekursi adalah teknik pemrograman di mana sebuah fungsi memanggil dirinya sendiri untuk menyelesaikan sub-masalah.',
    }],

  [quizKey('Informatika', 'Algoritma', 'Flowchart dan Pseudocode')]: [
    {
      question: 'Flowchart adalah ...',
      options: ['Bahasa pemrograman', 'Diagram alir yang menggambarkan langkah-langkah algoritma', 'Kode program', 'Database'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Flowchart adalah representasi grafis dari algoritma menggunakan simbol-simbol standar.',
    },
    {
      question: 'Simbol flowchart berbentuk oval digunakan untuk ...',
      options: ['Proses', 'Mulai/selesai (terminator)', 'Keputusan', 'Input/output'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Simbol oval (terminator) menandai awal (start) atau akhir (end) dari suatu algoritma.',
    },
    {
      question: 'Simbol belah ketupat dalam flowchart menunjukkan ...',
      options: ['Proses perhitungan', 'Pengambilan keputusan (kondisional)', 'Input data', 'Output data'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Simbol diamond/belah ketupat digunakan untuk percabangan atau pengambilan keputusan (if/else).',
    },
    {
      question: 'Pseudocode adalah ...',
      options: ['Kode yang sudah bisa dijalankan', 'Penulisan algoritma dengan bahasa yang mirip kode tapi tidak terikat sintaks', 'Flowchart digital', 'Database'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Pseudocode menulis algoritma dalam format yang mirip kode pemrograman tetapi menggunakan bahasa sehari-hari.',
    },
    {
      question: 'Dalam flowchart, simbol jajar genjang digunakan untuk ...',
      options: ['Proses', 'Input/output', 'Keputusan', 'Mulai/selesai'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Simbol jajar genjang (parallelogram) menunjukkan operasi input (membaca data) atau output (menampilkan hasil).',
    }],

  [quizKey('Informatika', 'Struktur Data', 'Array dan Matriks')]: [
    {
      question: 'Array adalah ...',
      options: ['Kumpulan data dengan tipe yang sama yang disimpan dalam satu variabel', 'Fungsi matematika', 'Jenis database', 'Sistem operasi'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Array adalah struktur data yang menyimpan kumpulan elemen dengan tipe data yang sama dalam satu variabel.',
    },
    {
      question: 'Indeks array dimulai dari nomor ...',
      options: ['0', '1', '-1', 'Tergantung bahasa'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Di sebagian besar bahasa pemrograman (C, Java, Python, JavaScript), indeks array dimulai dari 0.',
    },
    {
      question: 'Matriks adalah ...',
      options: ['Array satu dimensi', 'Array dua dimensi (seperti tabel)', 'Tipe data primitif', 'Fungsi rekursif'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Matriks adalah array dua dimensi yang menyimpan data dalam baris dan kolom, mirip tabel.',
    },
    {
      question: 'Untuk mengakses elemen array a pada indeks ke-i, digunakan notasi ...',
      options: ['a(i)', 'a[i]', 'a{i}', 'a_i'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Notasi a[i] digunakan untuk mengakses elemen array a pada indeks ke-i di banyak bahasa pemrograman.',
    },
    {
      question: 'Jika array dua dimensi (matriks) berukuran 3×4, jumlah total elemennya adalah ...',
      options: ['7', '12', '34', '16'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Matriks 3 baris × 4 kolom = 12 elemen total.',
    }],

  [quizKey('Informatika', 'Struktur Data', 'Stack dan Queue')]: [
    {
      question: 'Stack (tumpukan) menggunakan prinsip ...',
      options: ['FIFO (First In First Out)', 'LIFO (Last In First Out)', 'LILO (Last In Last Out)', 'FILO (First In Last Out)'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Stack menggunakan prinsip LIFO: elemen yang terakhir masuk akan menjadi yang pertama keluar.',
    },
    {
      question: 'Queue (antrian) menggunakan prinsip ...',
      options: ['LIFO', 'FIFO (First In First Out)', 'LILO', 'FILO'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Queue menggunakan prinsip FIFO: elemen yang pertama masuk akan menjadi yang pertama keluar.',
    },
    {
      question: 'Operasi push pada stack berarti ...',
      options: ['Menghapus elemen', 'Menambahkan elemen ke dalam stack', 'Membaca elemen teratas', 'Mengosongkan stack'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Push adalah operasi menambahkan elemen baru ke bagian atas (top) stack.',
    },
    {
      question: 'Operasi pop pada stack berarti ...',
      options: ['Menambahkan elemen', 'Menghapus elemen teratas', 'Mengubah elemen', 'Menyalin stack'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Pop adalah operasi menghapus elemen teratas (top) dari stack.',
    },
    {
      question: 'Contoh penggunaan stack dalam kehidupan nyata adalah ...',
      options: ['Antrian kasir', 'Tumpukan piring', 'Garis start lomba', 'Nomor antrian bank'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Tumpukan piring: piring terakhir yang diletakkan di atas akan diambil pertama (LIFO), mirip stack.',
    }],

  [quizKey('Informatika', 'Pemrograman', 'Pemrograman Lanjutan')]: [
    {
      question: 'Fungsi (function) dalam pemrograman adalah ...',
      options: ['Tipe data', 'Blok kode yang dapat dipanggil dan digunakan kembali', 'Variabel global', 'Struktur data'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Fungsi adalah blok kode yang memiliki nama, dapat dipanggil, dan digunakan kembali (reusable).',
    },
    {
      question: 'Parameter fungsi adalah ...',
      options: ['Nilai yang dikembalikan fungsi', 'Input yang diberikan ke fungsi saat dipanggil', 'Nama fungsi', 'Tipe fungsi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Parameter adalah variabel yang menerima nilai input ketika fungsi dipanggil.',
    },
    {
      question: 'Return value adalah ...',
      options: ['Parameter fungsi', 'Nilai yang dikembalikan fungsi setelah dieksekusi', 'Nama fungsi', 'Tipe data fungsi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Return value adalah hasil yang dikembalikan fungsi setelah selesai menjalankan tugasnya.',
    },
    {
      question: 'Object-Oriented Programming (OOP) adalah paradigma yang berfokus pada ...',
      options: ['Fungsi dan prosedur', 'Objek dan kelas', 'Algoritma sorting', 'Database'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'OOP adalah paradigma pemrograman yang menggunakan objek (gabungan data dan method) sebagai unit utama.',
    },
    {
      question: 'Kelas (class) dalam OOP adalah ...',
      options: ['Instans dari suatu objek', 'Blueprint atau cetakan untuk membuat objek', 'Tipe data primitif', 'Fungsi bawaan'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Kelas adalah blueprint atau cetakan yang mendefinisikan properti dan method suatu objek.',
    }],

  [quizKey('Informatika', 'Pemrograman', 'Debugging dan Testing')]: [
    {
      question: 'Debugging adalah ...',
      options: ['Menulis kode baru', 'Proses mencari dan memperbaiki kesalahan (bug) dalam program', 'Mengoptimalkan program', 'Mendokumentasikan kode'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Debugging adalah proses identifikasi, isolasi, dan perbaikan bug atau kesalahan dalam program.',
    },
    {
      question: 'Syntax error terjadi ketika ...',
      options: ['Program berjalan lambat', 'Kode melanggar aturan tata bahasa pemrograman', 'Output salah', 'Program berhenti tiba-tiba'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Syntax error adalah kesalahan penulisan kode yang melanggar aturan sintaks bahasa pemrograman.',
    },
    {
      question: 'Runtime error adalah kesalahan yang terjadi ...',
      options: ['Saat penulisan kode', 'Saat program sedang dijalankan', 'Saat kompilasi', 'Saat instalasi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Runtime error terjadi ketika program sedang dieksekusi, misal: pembagian dengan nol, akses indeks array di luar batas.',
    },
    {
      question: 'Unit testing adalah pengujian yang berfokus pada ...',
      options: ['Seluruh sistem', 'Unit terkecil kode (fungsi/metode)', 'Tampilan antarmuka', 'Performa sistem'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Unit testing menguji fungsi atau metode terkecil secara terisolasi untuk memastikan kebenaran logika.',
    },
    {
      question: 'Breakpoint dalam debugging adalah ...',
      options: ['Akhir program', 'Titik berhenti sementara yang ditentukan untuk memeriksa nilai variabel', 'Kesalahan program', 'Optimasi kode'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Breakpoint adalah titik yang ditentukan untuk menjeda eksekusi program agar dapat memeriksa nilai variabel dan alur program.',
    }],

  [quizKey('Informatika', 'Basis Data', 'Konsep Basis Data')]: [
    {
      question: 'Basis data (database) adalah ...',
      options: ['Kumpulan file acak', 'Kumpulan data terorganisir yang dapat diakses, dikelola, dan diperbarui', 'Aplikasi spreadsheet', 'Sistem operasi'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'Database adalah kumpulan data yang terorganisir secara sistematis untuk memudahkan akses dan pengelolaan.',
    },
    {
      question: 'DBMS adalah ...',
      options: ['Database Management System (perangkat lunak untuk mengelola database)', 'Data Backup System', 'Digital Base System', 'Database Modeling Software'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'DBMS adalah software yang digunakan untuk mengelola, menyimpan, dan memanipulasi database (contoh: MySQL, PostgreSQL).',
    },
    {
      question: 'Tabel dalam basis data terdiri dari ...',
      options: ['Baris dan kolom', 'Hanya baris', 'Hanya kolom', 'Grafik'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Tabel database terdiri dari baris (record) dan kolom (field/atribut).',
    },
    {
      question: 'Primary key dalam sebuah tabel adalah ...',
      options: ['Kolom yang boleh kosong', 'Kolom yang secara unik mengidentifikasi setiap baris', 'Kolom duplikat', 'Kolom yang bisa diubah'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Primary key adalah satu atau kombinasi kolom yang nilainya unik untuk setiap baris (tidak boleh duplikat).',
    },
    {
      question: 'Foreign key adalah ...',
      options: ['Kunci utama tabel', 'Kolom yang merujuk ke primary key tabel lain (relasi)', 'Kunci untuk enkripsi', 'Tipe data khusus'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Foreign key adalah kolom yang merujuk ke primary key tabel lain untuk membangun relasi antar tabel.',
    }],

  [quizKey('Informatika', 'Basis Data', 'SQL Dasar')]: [
    {
      question: 'SQL adalah singkatan dari ...',
      options: ['Structured Query Language', 'Simple Query Language', 'Standard Question Language', 'System Query Logic'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'SQL adalah bahasa standar untuk mengelola dan memanipulasi basis data relasional.',
    },
    {
      question: 'Perintah SQL untuk mengambil data dari tabel adalah ...',
      options: ['INSERT', 'SELECT', 'UPDATE', 'DELETE'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'SELECT digunakan untuk mengambil/menampilkan data dari satu atau lebih tabel.',
    },
    {
      question: 'Perintah SQL untuk menambahkan data ke tabel adalah ...',
      options: ['SELECT', 'INSERT INTO', 'UPDATE', 'DELETE'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'INSERT INTO digunakan untuk menambahkan baris data baru ke dalam tabel.',
    },
    {
      question: 'Klausa WHERE dalam SQL digunakan untuk ...',
      options: ['Mengurutkan data', 'Memfilter data berdasarkan kondisi', 'Menggabungkan tabel', 'Menghitung jumlah data'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'WHERE digunakan untuk memfilter baris yang memenuhi kondisi tertentu.',
    },
    {
      question: 'Perintah SQL untuk menghapus semua data dalam tabel tanpa menghapus struktur tabel adalah ...',
      options: ['DROP TABLE', 'DELETE FROM', 'ALTER TABLE', 'TRUNCATE'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'DELETE FROM menghapus baris data (bisa dengan kondisi WHERE). DROP TABLE menghapus tabel beserta strukturnya.',
    }],

  [quizKey('Informatika', 'Jaringan', 'Jaringan Komputer')]: [
    {
      question: 'Jaringan komputer adalah ...',
      options: ['Kumpulan komputer yang saling terhubung untuk berbagi sumber daya', 'Satu komputer saja', 'Sistem operasi', 'Program aplikasi'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Jaringan komputer menghubungkan dua atau lebih komputer untuk berbagi data, file, printer, dan koneksi internet.',
    },
    {
      question: 'Jaringan yang mencakup wilayah geografis luas seperti antar kota atau negara disebut ...',
      options: ['LAN', 'WAN', 'MAN', 'PAN'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'WAN (Wide Area Network) mencakup area geografis luas, menghubungkan beberapa LAN antar kota/negara.',
    },
    {
      question: 'LAN (Local Area Network) mencakup area ...',
      options: ['Satu gedung atau kantor', 'Antar negara', 'Seluruh dunia', 'Kota besar'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'LAN mencakup area terbatas seperti satu gedung, sekolah, atau kantor.',
    },
    {
      question: 'Alat yang menghubungkan dua jaringan berbeda dan meneruskan paket data disebut ...',
      options: ['Switch', 'Router', 'Hub', 'Modem'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Router menghubungkan dua jaringan berbeda dan meneruskan paket data berdasarkan alamat IP.',
    },
    {
      question: 'IP address adalah ...',
      options: ['Alamat fisik perangkat', 'Alamat unik yang mengidentifikasi perangkat dalam jaringan', 'Nama perangkat', 'Password jaringan'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'IP address adalah alamat numerik unik yang diberikan ke setiap perangkat dalam jaringan komputer.',
    }],

  [quizKey('Informatika', 'Jaringan', 'Topologi dan Protokol')]: [
    {
      question: 'Topologi jaringan adalah ...',
      options: ['Cara pengkabelan atau konfigurasi fisik/koneksi perangkat dalam jaringan', 'Protokol komunikasi', 'Sistem operasi jaringan', 'Alamat IP'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Topologi jaringan menggambarkan bagaimana perangkat dalam jaringan terhubung satu sama lain.',
    },
    {
      question: 'Topologi bintang (star) memiliki ciri ...',
      options: ['Semua perangkat terhubung ke satu pusat (hub/switch)', 'Perangkat terhubung berurutan', 'Setiap perangkat terhubung ke semua perangkat', 'Tidak ada pola tertentu'],
      correctIndex: 0,
      difficulty: 'easy',
      explanation: 'Topologi star: setiap perangkat terhubung ke perangkat pusat (hub/switch). Jika satu kabel putus, lainnya tidak terganggu.',
    },
    {
      question: 'Protokol TCP/IP berfungsi untuk ...',
      options: ['Mengatur komunikasi antar perangkat di jaringan internet', 'Mengetik dokumen', 'Mengedit gambar', 'Menyimpan file'],
      correctIndex: 0,
      difficulty: 'medium',
      explanation: 'TCP/IP adalah protokol standar yang mengatur komunikasi data antar perangkat di internet.',
    },
    {
      question: 'HTTP adalah protokol yang digunakan untuk ...',
      options: ['Mengirim email', 'Mengakses halaman web', 'Transfer file', 'Remote desktop'],
      correctIndex: 1,
      difficulty: 'easy',
      explanation: 'HTTP (Hypertext Transfer Protocol) digunakan untuk mentransfer data halaman web antara server dan browser.',
    },
    {
      question: 'Kelebihan topologi bus adalah ...',
      options: ['Mudah rusak jika kabel utama putus', 'Murah dan mudah instalasi untuk jaringan kecil', 'Kecepatan tinggi', 'Aman dari tabrakan data'],
      correctIndex: 1,
      difficulty: 'medium',
      explanation: 'Topologi bus: hemat kabel dan murah untuk jaringan kecil. Kelemahan: jika kabel utama putus, seluruh jaringan mati.',
    }],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function getQuiz(
  subject: string,
  topic: string,
  subTopic: string,
): QuestionData[] {
  const key = quizKey(subject, topic, subTopic);
  return QUIZ_MAP[key] ?? [];
}

export function getAllQuizzes(): Record<string, QuestionData[]> {
  return { ...QUIZ_MAP };
}

export default QUIZ_MAP;
