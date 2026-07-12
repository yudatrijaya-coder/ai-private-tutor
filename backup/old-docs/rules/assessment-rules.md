# Assessment Agent — Safety Rules & Guardrails

> **Priority: MEDIUM** — Evaluasi kemampuan anak. Sensitif secara psikologis.

## 1. Quiz Safety

### 1.1 Question Validation
Setiap soal harus lulus validasi sebelum disimpan:
```typescript
const VALIDATION_RULES = {
  answerExistsInMaterial: true,        // Jawaban harus ada di processed_content
  distractorsArePlausible: true,       // Pilihan salah harus masuk akal
  noTrickQuestions: true,              // Jangan soal jebakan yang gak fair
  ageAppropriateLanguage: true,        // Bahasa sesuai jenjang
  noNegativeWording: true,             // "Mana yang SALAH" → minimal
};
```

### 1.2 No Demoralizing Questions
- Jangan tanya soal yang terlalu susah untuk level anak
- Difficulty curve: easy → medium → hard (dalam 1 quiz)
- Soal pertama HARUS easy (biar anak pede)
- Kalau anak jawab salah 3x berturut-turut → sesuaikan difficulty turun

### 1.3 Answer Checking Safety
- Jangan kasih nilai 0 untuk anak yang gak selesai → kasih partial score
- Jangan timeout anak yang lagi mikir (gak ada batas waktu per soal, yang ada per sesi)

## 2. Score & Feedback Safety

### 2.1 Positive Reinforcement
```typescript
const FEEDBACK_RULES = {
  score_100: "SEMPURNA! 🎉🎉🎉 Kak [Persona] banget banget bangga!",
  score_80_99: "Mantap banget! Hampir sempurna! 👍",
  score_60_79: "Bagus! Masih ada yang salah dikit, yuk belajar lagi! 💪",
  score_40_59: "Lumayan! Kita ulang bagian yang susah ya 😊",
  score_20_39: "Gapapa, Kak [Persona] juga dulu susah. Coba lagi yuk! 🤝",
  score_0_19: "Wah ini topiknya masih baru. Kak [Persona] ajarin pelan-pelan ya 👨‍🏫",
};
```

- **TIDAK BOLEH** ada nada negatif / menghukum:
  - ❌ "Kok kamu bodoh sih?"
  - ❌ "Anak lain bisa, kamu kenapa enggak?"
  - ✅ "Belum berhasil? Gpp, kita coba cara lain!"

### 2.2 Mastery Update — Jangan Stigmatize
- Mastery rendah → jangan tampilkan sebagai "gagal" tapi sebagai "perlu latihan"
- Di dashboard: label "Perlu Latihan" bukan "Tidak Mampu"
- Weak areas: "Topik yang perlu diulang" bukan "Kelemahan"

## 3. Cheating Prevention

### 3.1 Pattern Detection
```typescript
const CHEAT_PATTERNS = {
  allCorrectTooFast: { threshold: 3, action: 'random_questions' },
  // Kalau semua benar dalam < 5 detik → curiga
  perfectScoreEveryTime: { threshold: 5, action: 'increase_difficulty' },
  // Kalau selalu 100% → soalnya terlalu gampang
  sameAnswerAlways: { threshold: 0.8, action: 'flag_review' },
  // "B" terus → random?
};
```

Kalau terdeteksi:
- Jangan konfrontasi anak ("kamu curang ya?")
- Diam-diam random soal & increase difficulty
- Flag di Guardian report: "[anak] suspect pattern — perlu observasi"

## 4. Exam Safety

### 4.1 Exam Duration Limit
- Max 60 menit untuk exam 20-30 soal
- Reminder: 10 menit, 5 menit, 1 menit
- Auto-submit kalau waktu habis (jawaban yang terisi)

### 4.2 Exam Frequency
- Max 1 exam per 2 minggu per student
- Jangan overload — exam bukan hukuman
