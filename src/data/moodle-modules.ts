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
    "Bahasa Mandarin": [
      "/moodle-files/3975_NEW_HSK1_3.0_VOCABULARY.pdf",
      "/moodle-files/3975_NEW_HSK2_3.0_VOCABULARY.pdf",
      "/moodle-files/3975_NEW_HSK3_3.0_VOCABULARY.pdf",
      "/moodle-files/3975_NEW_HSK4_3.0_VOCABULARY.pdf",
    ],
    "Pendidikan Agama Katolik": [
      "/moodle-files/3582_Katolik-BS-KLS-XI.pdf",
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
      "/moodle-files/3975_Program_Semester_Ganjil_Genap_XI_2627.pdf",
      "/moodle-files/3975_SOP_MAPEL_BAHASA_MANDARIN.pdf",
      "/moodle-files/3975_01_《新HSK教程2》第1课.pptx.pdf",
      "/moodle-files/3975_02_《新HSK教程2》第2课.pptx.pdf",
      "/moodle-files/3975_03_《新HSK教程2》第3课.pptx.pdf",
      "/moodle-files/3975_04_《新HSK教程2》第4课.pptx.pdf",
    ],
    "Pendidikan Agama Katolik": [
      "/moodle-files/3582_Katolik-BS-KLS-XI.pdf",
    ],
    "Bahasa Indonesia": [
      "/moodle-files/3659_Program_Semester_2627_XI_Bahasa_Indonesia_Ganjil.pdf",
      "/moodle-files/3659_Program_Semester_2627_XI_Bahasa_Indonesia_Genap.pdf",
    ],
    "Matematika Tingkat Lanjut": [
      "/moodle-files/sibi-books/Matematika_BS_KLS_XI_TL_Rev.pdf",
      "https://moodle.kumbang.sch.id/mod/resource/view.php?id=53030",
      "https://moodle.kumbang.sch.id/mod/resource/view.php?id=54390",
    ],
    "Bahasa Inggris Tingkat Lanjut": [
      "/moodle-files/sibi-books/Inggris_BS_KLS_XI_TL_Rev.pdf",
    ],
    // --- MODUL dari scraping Moodle ---
    Biologi: [
      "/moodle-files/3664_Program_Semester_Biologi_2627_kelas_XI.pdf",
      "/moodle-files/3664_BAB_1_-_SISTEM_PENCERNAAN.pdf",
    ],
    Fisika: [
      "/moodle-files/3666_Revisi_Formulir_Program_Semester_2627_kelas_XI_ganjil.pdf",
      "/moodle-files/3666_MODUL_FISIKA_XI_SEMESTER_1_update.pdf",
    ],
    Kimia: [
      "/moodle-files/3668_Formulir_Program_Semester_2627_kimia_kelas_XI_1_.xlsx",
      "/moodle-files/3668_Termokimia_Update_2627.pdf",
    ],
    Informatika: [
      "/moodle-files/3667_Progsem_Ganjil_XI.pdf",
      "/moodle-files/3667_Progsem_Genap_XI.pdf",
      "/moodle-files/3667_kelas_11.pdf",
    ],
    "Matematika Penalaran": [
      "/moodle-files/3673_Program_Semester_Matematika_Penalaran.xlsx",
      "/moodle-files/3673_Penalaran_P1.pdf",
    ],
    Matematika: [
      "/moodle-files/3675_Program_Semester_Matematika_Umum_2627_kelas_XI.xlsx",
      "/moodle-files/3675_Matriks_Bagian_1-2_.pdf",
    ],
    "Pendidikan Pancasila": [
      "/moodle-files/3676_Progsem_kelas_XI_2627.xlsx",
    ],
    Sejarah: [
      "/moodle-files/3677_PROSEM_KELAS_XI_2627.xlsx",
    ],
    "Literasi dalam Bahasa Indonesia": [
      "/moodle-files/3670_Program_Semester_2627_XI_Literasi.xlsx",
      "/moodle-files/3670_1-15_Bank_Soal__Penalaran_Umum.pdf",
    ],
    "English Literacy": [],
    "Peminatan Ekonomi": [],
    "Peminatan Bahasa Inggris Tingkat Lanjut": [],
    "Literasi dalam Bahasa Inggris": [],
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
