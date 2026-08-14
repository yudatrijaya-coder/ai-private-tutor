# Design: AI-Driven Exam & Personalized Improvement Plan

## 1. Overview
Fitur Exam System dirancang untuk mengukur pemahaman siswa melalui dua fase: Pre-test (komprehensif awal) dan Post-test (per modul akhir). Menggunakan pendekatan **Pre-generated Exam Pool** berlabel *mixed difficulties* (Easy, Medium, Hard/HOTS) untuk menjamin stabilitas UX dan Quality Control. Hasil exam diumpankan ke AI (Opsi B) untuk menghasilkan *Personalized Improvement Plan* dan penyesuaian jadwal intensif secara cerdas dan deterministik (anti-halusinasi).

---

## 2. Arsitektur Database (Exam Pool & Result)

Untuk memisahkan Ujian dari Kuis harian, kita membutuhkan entitas baru di Prisma:

### A. Tabel `Exam` & `ExamQuestion`
Menyimpan bank soal pre-generated.
```prisma
model Exam {
  id          String   @id @default(cuid())
  title       String   // e.g., "Post-test Modul Tata Surya" atau "Pre-test IPA SMP 1"
  type        String   // "PRE_TEST" | "POST_TEST"
  subject     String   // "IPA", "Matematika"
  grade       String   // "SMP_1"
  moduleId    String?  // Jika POST_TEST, terikat ke modul tertentu
  isActive    Boolean  @default(true)
  
  questions   ExamQuestion[]
  attempts    ExamAttempt[]
}

model ExamQuestion {
  id            String   @id @default(cuid())
  examId        String
  topic         String   // e.g., "Tata Surya" -> Untuk mapping kelemahan
  subtopic      String   // e.g., "Rotasi Bumi"
  question      String
  options       Json     // Array string
  correctAnswer String
  explanation   String
  difficulty    String   // "EASY" | "MEDIUM" | "HARD"
  
  exam          Exam     @relation(fields: [examId], references: [id])
}
```

### B. Tabel `ExamAttempt` & `ImprovementPlan`
Menyimpan hasil ujian dan rekomendasi AI.
```prisma
model ExamAttempt {
  id          String   @id @default(cuid())
  studentId   String
  examId      String
  score       Float
  details     Json     // { answered: [...], weaknesses: { "Rotasi Bumi": "HARD_FAILED" } }
  status      String   // "IN_PROGRESS" | "COMPLETED" | "ANALYZED"
  createdAt   DateTime @default(now())

  student     Student  @relation(fields: [studentId], references: [id])
  exam        Exam     @relation(fields: [examId], references: [id])
  plan        ImprovementPlan?
}

model ImprovementPlan {
  id              String   @id @default(cuid())
  attemptId       String   @unique
  studentId       String
  aiNarrative     String   // Evaluasi deskriptif dari LLM
  recommendedSch  Json     // Rekomendasi jadwal baru terstruktur
  status          String   // "DRAFT" | "APPLIED" (Bisa di-review dulu jika perlu)
  
  attempt         ExamAttempt @relation(fields: [attemptId], references: [id])
  student         Student     @relation(fields: [studentId], references: [id])
}
```

---

## 3. Komponen Sistem & Workflow

Sistem terdiri dari 3 fase/komponen utama:

### Fase 1: Exam Generation Pipeline (Cron/Admin)
*   **Trigger:** Manual (via script) atau Cron saat subject baru ditambahkan.
*   **Action:** LLM (SumoPod/9Router) men-generate soal berdasarkan SIBI modul.
*   **Hardening:** 
    *   Menggunakan `zod` untuk memaksa output skema: 30% Easy, 40% Medium, 30% Hard.
    *   Jika LLM halusinasi format, script melakukan retry (max 3x).
    *   Disimpan ke `Exam` dan `ExamQuestion`.

### Fase 2: Ujian Siswa (Student Dashboard)
*   **Trigger:** Siswa membuka menu "Ujian" di Web App / Telegram Bot.
*   **Action:** 
    *   Sistem menarik soal dari DB (tidak ada panggilan LLM = instan).
    *   Siswa menjawab. Sistem mengalkulasi `score` dan mengidentifikasi metrik `weaknesses` (misal: "Gagal 3 soal HARD di subtopik X").
*   **Output:** Baris `ExamAttempt` dengan status `COMPLETED`.

### Fase 3: AI Improvement Plan Generator (Background Worker/Queue)
Ini adalah jantung dari "Opsi B Hardened". LLM meracik jadwal tanpa halusinasi.
*   **Trigger:** Event saat `ExamAttempt` tersimpan sebagai `COMPLETED`.
*   **Input Data to LLM (Prompt Konteks Kuat):**
    *   Hasil Exam: (Score: 60/100).
    *   Data Kelemahan Kuat (Fakta DB, bukan tebakan AI): "Siswa salah di soal Medium & Hard topik Pecahan".
    *   Jadwal Intensif & Reguler saat ini (Sen, Rab, Jum: 19.00-21.00).
    *   **Strict Rules:** "You MUST ONLY select topics from the Weakness Data. You MUST output a JSON matching the Zod schema for Next Week's Schedule."
*   **Output:** 
    *   `aiNarrative`: Teks motivasi dan penjelasan kelemahan yang ramah untuk siswa.
    *   `recommendedSch`: Object JSON terstruktur (di-enforce dengan Zod/Instructor) yang memetakan topik lemah ke slot Jadwal Intensif.
*   **Hardening (Anti-Halu):** 
    *   Gunakan library `instructor` (atau validasi Zod ketat) agar LLM *hanya* bisa me-return topik yang memang ada di `weaknesses` list.
    *   Fallback: Jika LLM gagal memenuhi struktur, sistem jatuh ke rule-based (Opsi A) sementara untuk menjamin siswa tetap punya jadwal.

---

## 4. Evaluasi & Keamanan (Cross-Cutting Concerns)

*   **Pemisahan Pre/Post:** Pre-test bersifat diagnostik (mungkin belum dijadwalkan ulang secara brutal), Post-test memicu pemindahan jadwal intensif.
*   **Anti-Halusinasi:** Jadwal belajar adalah data relasional yang krusial. Output `recommendedSch` dari AI **TIDAK** langsung menimpa DB `Schedule` utama. Ia disimpan di `ImprovementPlan`. Jadwal utama baru diperbarui setelah *parsing* aplikasi memastikan validitas referensi subtopiknya.
*   **Parent/Admin Visibility:** Rekomendasi jadwal baru akan muncul di dashboard Admin/Tutor dengan status "Applied by AI" sehingga bisa dilacak (audit trail).