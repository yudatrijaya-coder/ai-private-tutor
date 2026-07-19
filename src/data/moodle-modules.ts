/**
 * 📘 BUKU MOODLE — buku pegangan dari Moodle/internal sekolah (setara SIBI)
 * Ditampilkan berdampingan dengan Buku SIBI di halaman subject
 */
const MOODLE_BOOKS: Record<string, Record<string, string[]>> = {
  SMP_1: {
    "Bahasa Indonesia": [
      "/moodle-files/4164_Bahasa_Indonesia_BS_KLS_VII_Rev.pdf",
    ],
  },
  SMA_2: {
    "Bahasa Mandarin": [
      "/moodle-files/3975_NEW_HSK1_3.0_VOCABULARY.pdf",
      "/moodle-files/3975_NEW_HSK2_3.0_VOCABULARY.pdf",
      "/moodle-files/3975_NEW_HSK3_3.0_VOCABULARY.pdf",
      "/moodle-files/3975_NEW_HSK4_3.0_VOCABULARY.pdf",
    ],
    "Matematika Tingkat Lanjut": [
      "https://moodle.kumbang.sch.id/mod/resource/view.php?id=53029",
    ],
    "Bahasa Inggris Tingkat Lanjut": [
      "/moodle-files/sibi-books/Inggris_BS_KLS_XI_TL_Rev.pdf",
    ],
    Biologi: [
      "/moodle-files/3664_BAB_1_-_SISTEM_PENCERNAAN.pdf",
    ],
    Fisika: [
      "/moodle-files/3666_MODUL_FISIKA_XI_SEMESTER_1_update.pdf",
    ],
    Kimia: [
      "/moodle-files/3668_Termokimia_Update_2627.pdf",
    ],
    Informatika: [
      "/moodle-files/3667_kelas_11.pdf",
    ],
  },
};

/**
 * 📄 MODUL MOODLE — materi ajar per-topik dari Moodle (PPT, PDF modul, dsb)
 */
const MOODLE_MODULES: Record<string, Record<string, string[]>> = {
  SMP_1: {
    // Course 4166 — Bahasa Mandarin VII
    "Bahasa Mandarin": [
      "/moodle-files/4166_E-book_HSK_3.0_Level_1.pdf",
    ],
    // Course 4169 — Biologi VII
    Biologi: [
      "/moodle-files/4169_BAB_1_IDENTIFIKASI_MAKHLUK_HIDUP.pdf",
    ],
    // Course 4171 — Fisika VII
    Fisika: [
      "/moodle-files/4171_Modul_Physics_VII_semester_ganjil.pdf",
      "/moodle-files/4171_bab-1-besaran-pengukuran.pdf",
    ],
    // Course 4173 — Informatika VII
    Informatika: [
      "/moodle-files/4173_PPT-Pengenalan_Dasar_Komputer-hardware.pdf",
    ],
    // Course 4174 — Kimia VII
    Kimia: [
      "/moodle-files/4174_MOODLE-Hakikat_Ilmu_Kimia_dan_Metode_Ilmiah.pdf",
    ],
    // Course 4179 — Sejarah VII
    Sejarah: [
      "/moodle-files/4179_Masa_praaksara.pdf",
    ],
  },
  SMA_2: {
    "Bahasa Mandarin": [
      "/moodle-files/3975_SOP_MAPEL_BAHASA_MANDARIN.pdf",
      "/moodle-files/3975_01_《新HSK教程2》第1课.pptx.pdf",
      "/moodle-files/3975_02_《新HSK教程2》第2课.pptx.pdf",
      "/moodle-files/3975_03_《新HSK教程2》第3课.pptx.pdf",
      "/moodle-files/3975_04_《新HSK教程2》第4课.pptx.pdf",
    ],
    "Pendidikan Agama Katolik": [
      "/moodle-files/3582_Katolik-BS-KLS-XI.pdf",
    ],
    "Matematika Tingkat Lanjut": [
      "/moodle-files/sibi-books/Matematika_BS_KLS_XI_TL_Rev.pdf",
      "https://moodle.kumbang.sch.id/mod/resource/view.php?id=53030",
      "https://moodle.kumbang.sch.id/mod/resource/view.php?id=54390",
    ],
    "Bahasa Inggris Tingkat Lanjut": [
      "/moodle-files/sibi-books/Inggris_BS_KLS_XI_TL_Rev.pdf",
    ],
    Biologi: [
      "/moodle-files/3664_BAB_1_-_SISTEM_PENCERNAAN.pdf",
    ],
    Fisika: [
      "/moodle-files/3666_MODUL_FISIKA_XI_SEMESTER_1_update.pdf",
    ],
    Kimia: [
      "/moodle-files/3668_Termokimia_Update_2627.pdf",
    ],
    Informatika: [
      "/moodle-files/3667_kelas_11.pdf",
    ],
    "Matematika Penalaran": [
      "/moodle-files/3673_Penalaran_P1.pdf",
    ],
    Matematika: [
      "/moodle-files/3675_Matriks_Bagian_1-2_.pdf",
    ],
    "Literasi dalam Bahasa Indonesia": [
      "/moodle-files/3670_1-15_Bank_Soal__Penalaran_Umum.pdf",
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
