"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

/* ── Types ── */
interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

const DUMMY_QUESTIONS: Record<string, Question[]> = {
  Matematika: [
    { question: "Hasil dari 25 × 4 adalah...", options: ["80", "90", "100", "110"], correctIndex: 2, explanation: "25 × 4 = 100" },
    { question: "Berapa luas persegi dengan sisi 7 cm?", options: ["14 cm²", "28 cm²", "49 cm²", "56 cm²"], correctIndex: 2, explanation: "7 × 7 = 49 cm²" },
    { question: "120 ÷ 5 = ...", options: ["20", "24", "25", "30"], correctIndex: 1, explanation: "120 ÷ 5 = 24" },
    { question: "Bilangan prima antara 10 dan 20 adalah...", options: ["11,13,17,19", "12,14,16,18", "11,13,15,17", "13,15,17,19"], correctIndex: 0, explanation: "11, 13, 17, 19 adalah bilangan prima" },
    { question: "3/4 + 1/2 = ...", options: ["1", "1 1/4", "1 1/2", "4/6"], correctIndex: 1, explanation: "3/4 + 2/4 = 5/4 = 1 1/4" },
    { question: "Faktor dari 36 adalah...", options: ["1,2,3,4,6,9,12,18,36", "1,2,3,4,6,8,12,18,36", "1,2,4,6,9,12,18,24,36", "1,3,4,6,9,12,18,36"], correctIndex: 0 },
    { question: "Berapa hasil dari -5 + 8?", options: ["-13", "-3", "3", "13"], correctIndex: 2, explanation: "-5 + 8 = 3" },
    { question: "Sebuah lingkaran memiliki jari-jari 7 cm. Berapa kelilingnya? (π = 22/7)", options: ["22 cm", "44 cm", "154 cm", "88 cm"], correctIndex: 1, explanation: "2 × 22/7 × 7 = 44 cm" },
    { question: "Rata-rata dari 6, 8, 10, 12, 14 adalah...", options: ["8", "9", "10", "11"], correctIndex: 2, explanation: "(6+8+10+12+14)/5 = 50/5 = 10" },
    { question: "20% dari 250 adalah...", options: ["25", "50", "75", "100"], correctIndex: 1, explanation: "20/100 × 250 = 50" },
  ],
  Bahasa: [
    { question: "Sinonim kata 'cerdas' adalah...", options: ["Bodoh", "Pintar", "Malas", "Lemah"], correctIndex: 1, explanation: "Cerdas = pintar" },
    { question: "Kalimat berikut yang menggunakan kata baku adalah...", options: ["Aku lagi makan nasi", "Saya sedang makan nasi", "Aku lg makan nasi", "Gw lagi makan"], correctIndex: 1 },
    { question: "'Bunga' dalam puisi bisa berarti...", options: ["Tanaman", "Kekasih/keindahan", "Warna", "Air"], correctIndex: 1 },
    { question: "Awalan 'me-' pada kata 'menulis' berfungsi sebagai...", options: ["Kata benda", "Kata kerja aktif", "Kata sifat", "Kata keterangan"], correctIndex: 1 },
    { question: "Antonim kata 'rajin' adalah...", options: ["Tekun", "Malas", "Giat", "Semangat"], correctIndex: 1 },
    { question: "Yang termasuk kata ganti orang pertama adalah...", options: ["Kamu", "Dia", "Saya", "Mereka"], correctIndex: 2 },
    { question: "Kalimat efektif adalah kalimat yang...", options: ["Panjang dan rumit", "Singkat, jelas, dan mudah dipahami", "Banyak kata asing", "Berima"], correctIndex: 1 },
    { question: "Huruf kapital digunakan pada...", options: ["Semua kata", "Awal kalimat dan nama orang", "Kata kerja", "Kata sifat"], correctIndex: 1 },
    { question: "'Kambing hitam' termasuk jenis...", options: ["Peribahasa", "Puisi", "Pantun", "Cerpen"], correctIndex: 0 },
    { question: "Tanda baca yang tepat untuk akhir kalimat perintah adalah...", options: ["(.)", "(?)", "(!)", "(,)"], correctIndex: 2 },
  ],
  IPA: [
    { question: "Proses perubahan air menjadi uap disebut...", options: ["Kondensasi", "Evaporasi", "Presipitasi", "Sublimasi"], correctIndex: 1 },
    { question: "Organ pernapasan manusia yang paling utama adalah...", options: ["Hati", "Jantung", "Paru-paru", "Lambung"], correctIndex: 2 },
    { question: "Planet terbesar di tata surya kita adalah...", options: ["Bumi", "Mars", "Jupiter", "Saturnus"], correctIndex: 2 },
    { question: "Fotosintesis menghasilkan...", options: ["Air dan oksigen", "Karbohidrat dan oksigen", "Karbohidrat dan air", "Oksigen dan karbon dioksida"], correctIndex: 1 },
    { question: "Hewan yang berkembang biak dengan bertelur disebut...", options: ["Vivipar", "Ovipar", "Ovovivipar", "Mamalia"], correctIndex: 1 },
    { question: "Gaya yang menyebabkan benda jatuh ke bawah adalah...", options: ["Gaya magnet", "Gaya gravitasi", "Gaya gesek", "Gaya pegas"], correctIndex: 1 },
    { question: "Bagian mata yang mengatur jumlah cahaya masuk adalah...", options: ["Kornea", "Iris", "Lensa", "Retina"], correctIndex: 1 },
    { question: "Air mendidih pada suhu...", options: ["80°C", "90°C", "100°C", "120°C"], correctIndex: 2 },
    { question: "Simpanan energi pada tumbuhan disimpan dalam bentuk...", options: ["Protein", "Lemak", "Amilum (pati)", "Vitamin"], correctIndex: 2 },
    { question: "Arah gerak jarum kompas menunjuk ke arah...", options: ["Timur", "Barat", "Utara", "Selatan"], correctIndex: 2 },
  ],
  IPS: [
    { question: "Ibukota Indonesia adalah...", options: ["Surabaya", "Bandung", "Jakarta", "Yogyakarta"], correctIndex: 2 },
    { question: "Suku Baduy berasal dari provinsi...", options: ["Jawa Barat", "Banten", "Lampung", "Sumatera Selatan"], correctIndex: 1 },
    { question: "Mata uang Indonesia adalah...", options: ["Ringgit", "Rupiah", "Peso", "Baht"], correctIndex: 1 },
    { question: "Teks Proklamasi dibacakan pada tanggal...", options: ["16 Agustus 1945", "17 Agustus 1945", "18 Agustus 1945", "19 Agustus 1945"], correctIndex: 1 },
    { question: "Danau terbesar di Indonesia adalah...", options: ["Danau Toba", "Danau Singkarak", "Danau Maninjau", "Danau Poso"], correctIndex: 0 },
    { question: "Sumber daya alam yang dapat diperbarui adalah...", options: ["Minyak bumi", "Batu bara", "Air", "Emas"], correctIndex: 2 },
    { question: "Hasil tambang utama di Pulau Timika adalah...", options: ["Minyak bumi", "Emas dan tembaga", "Batu bara", "Timah"], correctIndex: 1 },
    { question: "Letak astronomis Indonesia berada di...", options: ["6°LU-11°LS dan 95°BT-141°BT", "0°-15°LS dan 90°BT-140°BT", "6°LU-11°LS dan 90°BT-140°BT", "0°-10°LS dan 95°BT-145°BT"], correctIndex: 0 },
    { question: "Pulau terluar Indonesia di sebelah utara adalah...", options: ["Pulau We", "Pulau Rote", "Pulau Sebatik", "Pulau Miangas"], correctIndex: 3, explanation: "Pulau Miangas di Sulawesi Utara berbatasan dengan Filipina" },
    { question: "Organisasi ASEAN didirikan pada tahun...", options: ["1965", "1967", "1970", "1975"], correctIndex: 1 },
  ],
};

const EMOJI_PER_SUBJECT: Record<string, string> = {
  Matematika: "🔢",
  Bahasa: "📖",
  IPA: "🔬",
  IPS: "🌍",
};

function QuizContent() {
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject") || "Matematika";
  const questions = DUMMY_QUESTIONS[subject] ?? DUMMY_QUESTIONS["Matematika"]!;

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [quizDone, setQuizDone] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [showXp, setShowXp] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const question = questions[currentQ];

  const reset = useCallback(() => {
    setCurrentQ(0);
    setSelected(null);
    setIsCorrect(null);
    setShowResult(false);
    setScore(0);
    setStreak(0);
    setHearts(3);
    setQuizDone(false);
    setShaking(false);
    setShowXp(false);
    setShowExplanation(false);
  }, []);

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === question.correctIndex;
    setIsCorrect(correct);
    setShowResult(true);
    setShowExplanation(true);

    if (correct) {
      setScore((s) => s + 10 + streak * 2);
      setStreak((s) => s + 1);
      setShowXp(true);
      setTimeout(() => setShowXp(false), 1500);
    } else {
      setHearts((h) => h - 1);
      setStreak(0);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  const handleSkip = () => {
    if (selected !== null) return;
    setHearts((h) => h - 1);
    setStreak(0);
    setSelected(-1);
    setShowResult(true);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (hearts <= 0 || hearts === 0) {
      setQuizDone(true);
      return;
    }
    const next = currentQ + 1;
    if (next >= questions.length) {
      setQuizDone(true);
      return;
    }
    setCurrentQ(next);
    setSelected(null);
    setIsCorrect(null);
    setShowResult(false);
    setShowExplanation(false);
  };

  if (quizDone) {
    const percentage = Math.round((score / (questions.length * 10)) * 100);
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-5">
        <span className="text-6xl">{hearts > 0 ? "🎉" : "😅"}</span>
        <h2
          className="text-2xl font-bold text-center"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          {hearts > 0
            ? "Quiz Selesai! 🎉"
            : "Aduh, kehabisan nyawa!"}
        </h2>
        <div
          className="rounded-2xl p-6 w-full text-center"
          style={{ backgroundColor: "var(--st-bg-card)" }}
        >
          <p className="text-sm mb-1" style={{ color: "var(--st-text-dim)" }}>
            Skor kamu
          </p>
          <p
            className="text-4xl font-bold"
            style={{ color: "var(--st-primary)", fontFamily: "var(--font-st-display)" }}
          >
            {score}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--st-text-dim)" }}>
            {percentage}% · {questions.length} soal
          </p>
          {streak > 0 && (
            <p className="text-sm mt-2">🔥 Streak {streak} jawaban benar!</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{
              backgroundColor: "var(--st-primary)",
              color: "#fff",
              fontFamily: "var(--font-st-display)",
            }}
          >
            Coba Lagi
          </button>
          <a
            href="/student"
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-center"
            style={{
              backgroundColor: "var(--st-bg-card)",
              color: "var(--st-text)",
              border: "1px solid #e5e7eb",
              fontFamily: "var(--font-st-display)",
            }}
          >
            Beranda
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`text-xl ${i >= hearts ? "opacity-20" : ""}`}>
              ❤️
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">🔥 {streak}</span>
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--st-text-dim)" }}
          >
            {EMOJI_PER_SUBJECT[subject] ?? "📚"} {subject}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full mb-4" style={{ backgroundColor: "#e5e7eb" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${((currentQ) / Math.max(questions.length - 1, 1)) * 100}%`,
            backgroundColor: "var(--st-primary)",
          }}
        />
      </div>

      {/* Question Card */}
      <div
        className={`rounded-2xl p-6 mb-4 transition-all ${
          shaking ? "animate-shake" : ""
        }`}
        style={{
          backgroundColor: "var(--st-bg-card)",
          ...(isCorrect === true ? { boxShadow: "0 0 0 3px var(--st-success)" } : {}),
          ...(isCorrect === false ? { boxShadow: "0 0 0 3px var(--st-error)" } : {}),
        }}
      >
        <p className="text-xs mb-2" style={{ color: "var(--st-text-dim)" }}>
          Soal {currentQ + 1} dari {questions.length}
        </p>
        <h3
          className="text-lg font-bold mb-5"
          style={{ fontFamily: "var(--font-st-display)" }}
        >
          {question.question}
        </h3>

        <div className="space-y-2.5">
          {question.options.map((opt, idx) => {
            let bgColor = "var(--st-bg)";
            let borderColor = "transparent";
            let textColor = "var(--st-text)";

            if (selected === idx) {
              if (idx === question.correctIndex) {
                bgColor = "rgba(34,197,94,0.1)";
                borderColor = "var(--st-success)";
                textColor = "var(--st-success)";
              } else {
                bgColor = "rgba(239,68,68,0.1)";
                borderColor = "var(--st-error)";
                textColor = "var(--st-error)";
              }
            } else if (
              selected !== null &&
              idx === question.correctIndex
            ) {
              bgColor = "rgba(34,197,94,0.1)";
              borderColor = "var(--st-success)";
              textColor = "var(--st-success)";
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={selected !== null}
                className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all border-2 disabled:cursor-default"
                style={{
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  color: textColor,
                }}
              >
                {String.fromCharCode(65 + idx)}. {opt}
              </button>
            );
          })}
        </div>

        {showXp && (
          <div className="mt-4 text-center animate-bounce">
            <span className="text-lg font-bold" style={{ color: "var(--st-gold)" }}>
              +{10 + (streak - 1) * 2} XP 🔥
            </span>
          </div>
        )}
      </div>

      {/* Result feedback */}
      {showResult && (
        <div
          className={`rounded-2xl p-4 mb-4 ${
            isCorrect ? "" : ""
          }`}
          style={{
            backgroundColor: isCorrect
              ? "rgba(34,197,94,0.1)"
              : "rgba(239,68,68,0.1)",
          }}
        >
          <p
            className="font-bold text-sm mb-1"
            style={{
              color: isCorrect ? "var(--st-success)" : "var(--st-error)",
              fontFamily: "var(--font-st-display)",
            }}
          >
            {isCorrect ? "✅ Benar!" : "😅 Gak papa, coba lagi!"}
          </p>
          {showExplanation && question.explanation && (
            <p className="text-xs" style={{ color: "var(--st-text-dim)" }}>
              {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {selected === null && (
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: "var(--st-bg-card)",
              color: "var(--st-text-dim)",
              border: "1px solid #e5e7eb",
            }}
          >
            Skip ⏭
          </button>
        )}
        {selected !== null && (
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{
              backgroundColor: "var(--st-primary)",
              color: "#fff",
              fontFamily: "var(--font-st-display)",
            }}
          >
            {currentQ + 1 >= questions.length ? "Selesai ➜" : "Lanjut ➜"}
          </button>
        )}
      </div>
    </>
  );
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <span className="text-2xl">⏳</span>
        </div>
      }
    >
      <QuizContent />
    </Suspense>
  );
}
