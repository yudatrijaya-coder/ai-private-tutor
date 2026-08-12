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
      "/moodle-files/3664_PPT_SISTEM_PENCERNAAN_NEW.pdf",
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
    // Course 4164 — Bahasa Indonesia VII
    "Bahasa Indonesia": [
      "/moodle-files/3659_Program_Semester_2627_XI_Bahasa_Indonesia_Ganjil.pdf",
      "/moodle-files/3659_Program_Semester_2627_XI_Bahasa_Indonesia_Genap.pdf",
    ],
    // Course 4166 — Bahasa Mandarin VII
    "Bahasa Mandarin": [
      "/moodle-files/4166_E-book_HSK_3.0_Level_1_.pdf",
      "/moodle-files/4166_Program_Semester_Kelas_7_TP_20262027.xlsx",
    ],
    // Course 4169 — Biologi VII
    Biologi: [
      "/moodle-files/4169_BAB_1_IDENTIFIKASI_MAKHLUK_HIDUP__1_.pdf",
      "/moodle-files/4169_LKPD_CIRI_MAKHLUK_HIDUP.pdf",
      "/moodle-files/4169_LKPD_CIRI_MAKHLUK_HIDUP_2.pdf",
    ],
    // Course 4171 — Fisika VII
    Fisika: [
      "/moodle-files/4171_Modul_Physics_VII_semester_ganjil__2_.pdf",
      "/moodle-files/4171_bab-1-besaran-pengukuran_2.pdf",
    ],
    // Course 4173 — Informatika VII
    Informatika: [
      "/moodle-files/4173_PPT-Pengenalan_Dasar_Komputer-hardware.pdf",
      "/moodle-files/4173_Program_Semester_2627_kelas_VII_Ganjil.pdf",
    ],
    // Course 4174 — Kimia VII
    Kimia: [
      "/moodle-files/4174_MOODLE-Hakikat_Ilmu_Kimia_dan_Metode_Ilmiah.pdf",
      "/moodle-files/4174_1_Hakikat_Ilmu_Kimia.pdf",
      "/moodle-files/4174_2_Keselamatan_Kerja_Lab.pdf",
    ],
    // Course 4179 — Sejarah VII
    Sejarah: [
      "/moodle-files/4179_Masa_praaksara.pdf",
      "/moodle-files/4179_Revisi_Formulir_Program_Semester_2627_kelas_VII.pdf",
    ],
  },
  SMA_2: {
    // Course 3659 — Bahasa Indonesia XI
    "Bahasa Indonesia": [
      "/moodle-files/3659_Program_Semester_2627_XI_Bahasa_Indonesia_Ganjil.pdf",
      "/moodle-files/3659_Program_Semester_2627_XI_Bahasa_Indonesia_Genap.pdf",
    ],
    // Course 3975 — Bahasa Mandarin XI
    "Bahasa Mandarin": [
      "/moodle-files/3975_SOP_MAPEL_BAHASA_MANDARIN.pdf",
      "/moodle-files/3975_01__新HSK教程2_第1课.pptx.pdf",
      "/moodle-files/3975_02__新HSK教程2_第2课.pptx.pdf",
      "/moodle-files/3975_03__新HSK教程2_第3课.pptx.pdf",
      "/moodle-files/3975_04__新HSK教程2_第4课.pptx.pdf",
      "/moodle-files/3975_Program_Semester_Ganjil_Genap_XI_2627.pdf",
    ],
    "Pendidikan Agama Katolik": [
      "/moodle-files/3582_Katolik-BS-KLS-XI.pdf",
    ],
    // Course 3674 — Matematika Tingkat Lanjut XI
    "Matematika Tingkat Lanjut": [
      "/moodle-files/sibi-books/Matematika_BS_KLS_XI_TL_Rev.pdf",
      "https://moodle.kumbang.sch.id/mod/resource/view.php?id=53030",
      "https://moodle.kumbang.sch.id/mod/resource/view.php?id=54390",
    ],
    // Course 3673 — Matematika Penalaran XI
    "Bahasa Inggris Tingkat Lanjut": [
      "/moodle-files/sibi-books/Inggris_BS_KLS_XI_TL_Rev.pdf",
    ],
    // Course 3664 — Biologi XI
    Biologi: [
      "/moodle-files/3664_BAB_1_-_SISTEM_PENCERNAAN.pdf",
      "/moodle-files/3664_PPT_SISTEM_PENCERNAAN_NEW.pdf",
      "/moodle-files/3664_Program_Semester_Biologi_2627_kelas_XI.pdf",
    ],
    // Course 3666 — Fisika XI
    Fisika: [
      "/moodle-files/3666_MODUL_FISIKA_XI_SEMESTER_1_update.pdf",
      "/moodle-files/3666_Revisi_Formulir_Program_Semester_2627_kelas_XI_ganjil.pdf",
    ],
    // Course 3668 — Kimia XI
    Kimia: [
      "/moodle-files/3668_Termokimia_Update_2627.pdf",
    ],
    // Course 3667 — Informatika XI
    Informatika: [
      "/moodle-files/3667_kelas_11.pdf",
      "/moodle-files/3667_Kelas_XI.pdf",
      "/moodle-files/3667_MODUL_MATERI_PEMBELAJARAN_KELAS_XI.pdf",
      "/moodle-files/3667_Progsem_Ganjil_XI.pdf",
      "/moodle-files/3667_Progsem_Genap_XI.pdf",
    ],
    // Course 3673 — Matematika Penalaran XI
    "Matematika Penalaran": [
      "/moodle-files/3673_Penalaran_P1.pdf",
      "/moodle-files/3673_Bahasa_Indonesia_Penalaran_P2.pdf",
      "/moodle-files/3673_Program_Semester_Matematika_Penalaran.xlsx",
    ],
    // Course 3675 — Matematika XI
    Matematika: [
      "/moodle-files/3675_Matriks__Bagian_1-2_.pdf",
      "/moodle-files/3675_Latihan_Soal_Operasi_Matriks.pdf",
      "/moodle-files/3675_Perkalian_2_matriks.pdf",
      "/moodle-files/3675_Latihan_Soal_Matriks.pdf",
      "/moodle-files/3675_Transpose_Matriks.pdf",
      "/moodle-files/3675_Determinan_Matriks.pdf",
      "/moodle-files/3675_Invers_Matriks.pdf",
      "/moodle-files/3675_Program_Semester_Matematika_Umum_2627_kelas_XI.xlsx",
    ],
    // Course 3670 — Literasi XI
    "Literasi dalam Bahasa Indonesia": [
      "/moodle-files/3670_1-15_Bank_Soal__Penalaran_Umum.pdf",
      "/moodle-files/3670_Latihan_UTBK_2_-_TPS.pdf",
      "/moodle-files/3670_Program_Semester_2627_XI_Literasi.xlsx",
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
