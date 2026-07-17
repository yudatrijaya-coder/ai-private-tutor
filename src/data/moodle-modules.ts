/**
 * 📘 BUKU MOODLE — buku pegangan dari Moodle/internal sekolah (setara SIBI)
 * Ditampilkan berdampingan dengan Buku SIBI di halaman subject
 */
const MOODLE_BOOKS: Record<string, Record<string, string[]>> = {
  SMP_1: {
    "Bahasa Indonesia": [
      "/moodle-files/Bahasa_Indonesia_BS_KLS_VII_Rev.pdf",
    ],
  },
  SMA_2: {
    "Fisika": [
      "https://buku.kemendikdasmen.go.id/katalog/fisika-untuk-smama-kelas-xi",
    ],
    "Matematika": [
      "https://buku.kemendikdasmen.go.id/katalog/matematika-untuk-smasmk-kelas-xi",
    ],
    "Bahasa Indonesia": [
      "https://buku.kemendikdasmen.go.id/katalog/cerdas-cergas-berbahasa-dan-bersastra-indonesia-untuk-smasmk-kelas-xi",
    ],
  },
};

/**
 * 📄 MODUL MOODLE — materi ajar per-topik dari Moodle (PPT, PDF modul, dsb)
 */
const MOODLE_MODULES: Record<string, Record<string, string[]>> = {
  SMP_1: {
    // Bahasa Indonesia
    "Bahasa Indonesia": [
      "/moodle-files/Bahasa_Indonesia_BS_KLS_VII_Rev.pdf",
    ],
    // Biologi (course 4169) — BAB 1 Identifikasi Makhluk Hidup
    Biologi: [
      "/moodle-files/Biologi_Identifikasi_Makhluk_Hidup.pdf",
    ],
    // Fisika (course 4171)
    Fisika: [
      "/moodle-files/Modul Physics VII semester ganjil (2).pdf",
      "/moodle-files/bab-1-besaran-pengukuran 2.pdf",
    ],
    // Kimia (course 4174)
    Kimia: [
      "/moodle-files/MOODLE-Hakikat Ilmu Kimia dan Metode Ilmiah.pdf",
    ],
    // Informatika (course 4173) — PPT Hardware
    Informatika: [
      "/moodle-files/PPT-Pengenalan_Dasar_Komputer-Hardware.pdf",
    ],
    // Sejarah (course 4179) — Masa Praaksara
    Sejarah: [
      "/moodle-files/Masa_Praaksara.pdf",
    ],
  },
  SMA_2: {
    "Bahasa Mandarin": [
      "/moodle-files/sibi-books/Mandarin_BS_XI.pdf",
      "/moodle-files/NEW HSK1 3.0 VOCABULARY.pdf",
      "/moodle-files/NEW HSK2 3.0 VOCABULARY.pdf",
      "/moodle-files/NEW HSK3 3.0 VOCABULARY.pdf",
      "/moodle-files/NEW HSK4 3.0 VOCABULARY.pdf",
    ],
    "Matematika Tingkat Lanjut": [
      "/moodle-files/sibi-books/Matematika_BS_KLS_XI_TL_Rev.pdf",
    ],
    "Bahasa Inggris Tingkat Lanjut": [
      "/moodle-files/sibi-books/Inggris_BS_KLS_XI_TL_Rev.pdf",
    ],
    // --- MODUL BARU dari scraping Moodle ---
    "Biologi": [
      "/moodle-files/Biologi_Sistem_Pencernaan.pdf",
    ],
    "Kimia": [
      "/moodle-files/Kimia_Termokimia.pdf",
    ],
    "Informatika": [
      "/moodle-files/Informatika_Logika_Algoritma.pptx",
    ],
    "Matematika Penalaran": [
      "/moodle-files/MTK_Penalaran_P1.pdf",
    ],
    "Literasi dalam Bahasa Indonesia": [
      "/moodle-files/Literasi_Bank_Soal.pdf",
    ],
    "Matematika": [
      "/moodle-files/Matematika_Matriks.pdf",
    ],
  },
};

// ─── Public API ───

/**
 * Get Moodle BOOK URLs for a subject+grade (setara SIBI)
 */
export function getMoodleBook(
  subject: string,
  gradeLevel?: string
): { url: string; label: string }[] | null {
  if (!gradeLevel) return null;
  const gradeMap = MOODLE_BOOKS[gradeLevel];
  if (!gradeMap) return null;
  const files = gradeMap[subject];
  if (!files || files.length === 0) return null;
  return files.map((f) => ({
    url: f,
    label: f.startsWith("http")
      ? `Buku ${subject}`
      : f.split("/").pop()?.replace(/\.pdf$/, "").replace(/[_\-]/g, " ") ?? "Buku",
  }));
}

/**
 * Get Moodle MODULE URLs for a subject+grade
 */
export function getMoodleModule(
  subject: string,
  gradeLevel?: string
): { url: string; label: string }[] | null {
  if (!gradeLevel) return null;
  const gradeMap = MOODLE_MODULES[gradeLevel];
  if (!gradeMap) return null;
  const files = gradeMap[subject];
  if (!files || files.length === 0) return null;
  return files.map((f) => ({
    url: f,
    label: f.split("/").pop()?.replace(/\.pdf$/, "").replace(/[_\-]/g, " ") ?? "Modul",
  }));
}

/**
 * Check if any moodle BOOK exists for this grade level (dashboard)
 */
export function getRandomMoodleBook(gradeLevel?: string): { url: string; subject: string } | null {
  if (!gradeLevel) return null;
  const gradeMap = MOODLE_BOOKS[gradeLevel];
  if (!gradeMap) return null;
  const subjects = Object.keys(gradeMap);
  if (subjects.length === 0) return null;
  const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
  const files = gradeMap[randomSubject];
  if (!files || files.length === 0) return null;
  return { url: files[0], subject: randomSubject };
}

/**
 * Check if any moodle MODULE exists for this grade level (dashboard random pick)
 */
export function getRandomMoodleModule(gradeLevel?: string): { url: string; subject: string } | null {
  if (!gradeLevel) return null;
  const gradeMap = MOODLE_MODULES[gradeLevel];
  if (!gradeMap) return null;
  const subjects = Object.keys(gradeMap);
  if (subjects.length === 0) return null;
  const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
  const files = gradeMap[randomSubject];
  if (!files || files.length === 0) return null;
  return { url: files[0], subject: randomSubject };
}
