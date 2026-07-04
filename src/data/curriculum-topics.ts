/**
 * Kurikulum Merdeka — Full Topic Map
 *
 * Complete topic hierarchy for all subjects across SD/5, SMP/1, and SMA/2.
 * Each entry maps to a weekly lesson with a priority score.
 *
 * @module @/data/curriculum-topics
 */

export interface TopicEntry {
  subject: string;
  topic: string;
  subTopic: string;
  weekOrder: number;
  priority: number;
}

export const GRADE_TOPICS: Record<string, TopicEntry[]> = {
  SD_5: [
    // ── Matematika ──
    { subject: 'Matematika', topic: 'Pecahan', subTopic: 'Mengenal Pecahan', weekOrder: 1, priority: 10 },
    { subject: 'Matematika', topic: 'Pecahan', subTopic: 'Penjumlahan Pecahan', weekOrder: 2, priority: 9 },
    { subject: 'Matematika', topic: 'Pecahan', subTopic: 'Pengurangan Pecahan', weekOrder: 3, priority: 8 },
    { subject: 'Matematika', topic: 'Pecahan', subTopic: 'Perkalian Pecahan', weekOrder: 4, priority: 7 },
    { subject: 'Matematika', topic: 'Pecahan', subTopic: 'Pembagian Pecahan', weekOrder: 5, priority: 7 },
    { subject: 'Matematika', topic: 'Desimal', subTopic: 'Mengenal Desimal', weekOrder: 6, priority: 8 },
    { subject: 'Matematika', topic: 'Desimal', subTopic: 'Operasi Desimal', weekOrder: 7, priority: 7 },
    { subject: 'Matematika', topic: 'Bangun Datar', subTopic: 'Luas Bangun Datar', weekOrder: 8, priority: 9 },
    { subject: 'Matematika', topic: 'Bangun Datar', subTopic: 'Keliling Bangun Datar', weekOrder: 9, priority: 8 },
    { subject: 'Matematika', topic: 'Bangun Ruang', subTopic: 'Volume Bangun Ruang', weekOrder: 10, priority: 7 },
    { subject: 'Matematika', topic: 'Statistika', subTopic: 'Membaca Data', weekOrder: 11, priority: 6 },
    { subject: 'Matematika', topic: 'Statistika', subTopic: 'Diagram', weekOrder: 12, priority: 6 },

    // ── Bahasa Indonesia ──
    { subject: 'Bahasa Indonesia', topic: 'Membaca Pemahaman', subTopic: 'Ide Pokok', weekOrder: 1, priority: 10 },
    { subject: 'Bahasa Indonesia', topic: 'Membaca Pemahaman', subTopic: 'Kesimpulan', weekOrder: 2, priority: 9 },
    { subject: 'Bahasa Indonesia', topic: 'Menulis', subTopic: 'Kalimat Efektif', weekOrder: 3, priority: 8 },
    { subject: 'Bahasa Indonesia', topic: 'Menulis', subTopic: 'Paragraf', weekOrder: 4, priority: 7 },
    { subject: 'Bahasa Indonesia', topic: 'Sastra', subTopic: 'Puisi', weekOrder: 5, priority: 6 },
    { subject: 'Bahasa Indonesia', topic: 'Sastra', subTopic: 'Dongeng', weekOrder: 6, priority: 6 },

    // ── IPA ──
    { subject: 'IPA', topic: 'Sistem Pencernaan', subTopic: 'Organ Pencernaan', weekOrder: 1, priority: 10 },
    { subject: 'IPA', topic: 'Sistem Pencernaan', subTopic: 'Proses Pencernaan', weekOrder: 2, priority: 9 },
    { subject: 'IPA', topic: 'Sistem Pernapasan', subTopic: 'Organ Pernapasan', weekOrder: 3, priority: 8 },
    { subject: 'IPA', topic: 'Sistem Pernapasan', subTopic: 'Mekanisme Bernapas', weekOrder: 4, priority: 7 },
    { subject: 'IPA', topic: 'Sistem Peredaran Darah', subTopic: 'Jantung dan Pembuluh Darah', weekOrder: 5, priority: 9 },
    { subject: 'IPA', topic: 'Sistem Peredaran Darah', subTopic: 'Golongan Darah', weekOrder: 6, priority: 7 },
    { subject: 'IPA', topic: 'Tumbuhan', subTopic: 'Fotosintesis', weekOrder: 7, priority: 8 },
    { subject: 'IPA', topic: 'Tumbuhan', subTopic: 'Perkembangbiakan Tumbuhan', weekOrder: 8, priority: 7 },

    // ── IPS ──
    { subject: 'IPS', topic: 'Kerajaan Nusantara', subTopic: 'Kerajaan Hindu-Buddha', weekOrder: 1, priority: 8 },
    { subject: 'IPS', topic: 'Kerajaan Nusantara', subTopic: 'Kerajaan Islam', weekOrder: 2, priority: 7 },
    { subject: 'IPS', topic: 'Pahlawan Nasional', subTopic: 'Pahlawan Kemerdekaan', weekOrder: 3, priority: 6 },
    { subject: 'IPS', topic: 'Pahlawan Nasional', subTopic: 'Pahlawan Reformasi', weekOrder: 4, priority: 5 },

    // ── PPKn ──
    { subject: 'PPKn', topic: 'Pancasila', subTopic: 'Nilai-Nilai Pancasila', weekOrder: 1, priority: 9 },
    { subject: 'PPKn', topic: 'Hak dan Kewajiban', subTopic: 'Hak Anak', weekOrder: 2, priority: 7 },
    { subject: 'PPKn', topic: 'Hak dan Kewajiban', subTopic: 'Kewajiban di Sekolah', weekOrder: 3, priority: 6 },

    // ── Agama ──
    { subject: 'Agama', topic: 'Akhlak', subTopic: 'Akhlak Terpuji', weekOrder: 1, priority: 8 },
    { subject: 'Agama', topic: 'Akhlak', subTopic: 'Akhlak Tercela', weekOrder: 2, priority: 7 },
    { subject: 'Agama', topic: 'Ibadah', subTopic: 'Shalat', weekOrder: 3, priority: 7 },

    // ── Seni Budaya ──
    { subject: 'Seni Budaya', topic: 'Seni Rupa', subTopic: 'Menggambar', weekOrder: 1, priority: 5 },
    { subject: 'Seni Budaya', topic: 'Seni Musik', subTopic: 'Alat Musik Daerah', weekOrder: 2, priority: 5 },

    // ── PJOK ──
    { subject: 'PJOK', topic: 'Olahraga', subTopic: 'Permainan Bola Besar', weekOrder: 1, priority: 5 },
    { subject: 'PJOK', topic: 'Kebugaran', subTopic: 'Latihan Kelenturan', weekOrder: 2, priority: 4 },
  ],

  SMP_1: [
    // ── Matematika ──
    { subject: 'Matematika', topic: 'Aljabar', subTopic: 'Bentuk Aljabar', weekOrder: 1, priority: 10 },
    { subject: 'Matematika', topic: 'Aljabar', subTopic: 'Operasi Aljabar', weekOrder: 2, priority: 9 },
    { subject: 'Matematika', topic: 'Persamaan Linear', subTopic: 'PLSV', weekOrder: 3, priority: 10 },
    { subject: 'Matematika', topic: 'Persamaan Linear', subTopic: 'PtLSV', weekOrder: 4, priority: 9 },
    { subject: 'Matematika', topic: 'Himpunan', subTopic: 'Konsep Himpunan', weekOrder: 5, priority: 8 },
    { subject: 'Matematika', topic: 'Himpunan', subTopic: 'Operasi Himpunan', weekOrder: 6, priority: 7 },
    { subject: 'Matematika', topic: 'Perbandingan', subTopic: 'Skala dan Rasio', weekOrder: 7, priority: 7 },
    { subject: 'Matematika', topic: 'Aritmatika Sosial', subTopic: 'Untung dan Rugi', weekOrder: 8, priority: 6 },
    { subject: 'Matematika', topic: 'Aritmatika Sosial', subTopic: 'Bunga Tabungan', weekOrder: 9, priority: 5 },
    { subject: 'Matematika', topic: 'Statistika', subTopic: 'Mean, Median, Modus', weekOrder: 10, priority: 7 },

    // ── Bahasa Indonesia ──
    { subject: 'Bahasa Indonesia', topic: 'Teks Deskripsi', subTopic: 'Ciri Teks Deskripsi', weekOrder: 1, priority: 10 },
    { subject: 'Bahasa Indonesia', topic: 'Teks Narasi', subTopic: 'Struktur Narasi', weekOrder: 2, priority: 9 },
    { subject: 'Bahasa Indonesia', topic: 'Teks Eksposisi', subTopic: 'Tesis dan Argumen', weekOrder: 3, priority: 8 },
    { subject: 'Bahasa Indonesia', topic: 'Teks Eksposisi', subTopic: 'Fakta dan Opini', weekOrder: 4, priority: 7 },
    { subject: 'Bahasa Indonesia', topic: 'Teks Negosiasi', subTopic: 'Unsur Negosiasi', weekOrder: 5, priority: 6 },

    // ── Bahasa Inggris ──
    { subject: 'Bahasa Inggris', topic: 'Tenses', subTopic: 'Simple Present', weekOrder: 1, priority: 10 },
    { subject: 'Bahasa Inggris', topic: 'Tenses', subTopic: 'Present Continuous', weekOrder: 2, priority: 9 },
    { subject: 'Bahasa Inggris', topic: 'Tenses', subTopic: 'Simple Past', weekOrder: 3, priority: 8 },
    { subject: 'Bahasa Inggris', topic: 'Vocabulary', subTopic: 'Daily Activities', weekOrder: 4, priority: 7 },
    { subject: 'Bahasa Inggris', topic: 'Vocabulary', subTopic: 'School Life', weekOrder: 5, priority: 6 },
    { subject: 'Bahasa Inggris', topic: 'Reading', subTopic: 'Descriptive Text', weekOrder: 6, priority: 7 },

    // ── IPA ──
    { subject: 'IPA', topic: 'Sistem Pernapasan', subTopic: 'Organ Pernapasan Manusia', weekOrder: 1, priority: 10 },
    { subject: 'IPA', topic: 'Sistem Pernapasan', subTopic: 'Gangguan Pernapasan', weekOrder: 2, priority: 8 },
    { subject: 'IPA', topic: 'Sistem Ekskresi', subTopic: 'Ginjal', weekOrder: 3, priority: 9 },
    { subject: 'IPA', topic: 'Sistem Ekskresi', subTopic: 'Kulit dan Hati', weekOrder: 4, priority: 8 },
    { subject: 'IPA', topic: 'Gerak Benda', subTopic: 'Gaya dan Gerak', weekOrder: 5, priority: 7 },
    { subject: 'IPA', topic: 'Gerak Benda', subTopic: 'Hukum Newton', weekOrder: 6, priority: 7 },
    { subject: 'IPA', topic: 'Pesawat Sederhana', subTopic: 'Tuas', weekOrder: 7, priority: 6 },
    { subject: 'IPA', topic: 'Pesawat Sederhana', subTopic: 'Bidang Miring', weekOrder: 8, priority: 5 },

    // ── IPS ──
    { subject: 'IPS', topic: 'Kerajaan Hindu-Buddha', subTopic: 'Kerajaan Kutai', weekOrder: 1, priority: 9 },
    { subject: 'IPS', topic: 'Kerajaan Hindu-Buddha', subTopic: 'Kerajaan Majapahit', weekOrder: 2, priority: 8 },
    { subject: 'IPS', topic: 'Kolonialisme', subTopic: 'VOC', weekOrder: 3, priority: 7 },
    { subject: 'IPS', topic: 'Kolonialisme', subTopic: 'Penjajahan Belanda', weekOrder: 4, priority: 6 },
    { subject: 'IPS', topic: 'Pergerakan Nasional', subTopic: 'Budi Utomo', weekOrder: 5, priority: 6 },

    // ── PPKn ──
    { subject: 'PPKn', topic: 'Norma', subTopic: 'Macam-Macam Norma', weekOrder: 1, priority: 9 },
    { subject: 'PPKn', topic: 'UUD 1945', subTopic: 'Hak dan Kewajiban Warga Negara', weekOrder: 2, priority: 8 },
    { subject: 'PPKn', topic: 'UUD 1945', subTopic: 'Bunyi dan Makna Pembukaan', weekOrder: 3, priority: 7 },

    // ── Agama ──
    { subject: 'Agama', topic: 'Ibadah', subTopic: 'Shalat Wajib', weekOrder: 1, priority: 8 },
    { subject: 'Agama', topic: 'Ibadah', subTopic: 'Puasa', weekOrder: 2, priority: 7 },
    { subject: 'Agama', topic: 'Al-Quran', subTopic: 'Membaca Al-Quran', weekOrder: 3, priority: 7 },
  ],

  SMA_2: [
    // ── Matematika ──
    { subject: 'Matematika', topic: 'Fungsi Komposisi', subTopic: 'Definisi Fungsi', weekOrder: 1, priority: 10 },
    { subject: 'Matematika', topic: 'Fungsi Komposisi', subTopic: 'Komposisi Fungsi', weekOrder: 2, priority: 9 },
    { subject: 'Matematika', topic: 'Fungsi Invers', subTopic: 'Invers Fungsi', weekOrder: 3, priority: 8 },
    { subject: 'Matematika', topic: 'Limit', subTopic: 'Konsep Limit', weekOrder: 4, priority: 9 },
    { subject: 'Matematika', topic: 'Limit', subTopic: 'Limit Fungsi Aljabar', weekOrder: 5, priority: 8 },
    { subject: 'Matematika', topic: 'Turunan', subTopic: 'Konsep Turunan', weekOrder: 6, priority: 7 },
    { subject: 'Matematika', topic: 'Turunan', subTopic: 'Aplikasi Turunan', weekOrder: 7, priority: 6 },
    { subject: 'Matematika', topic: 'Integral', subTopic: 'Integral Tak Tentu', weekOrder: 8, priority: 7 },

    // ── Fisika ──
    { subject: 'Fisika', topic: 'Hukum Newton', subTopic: 'Hukum I Newton', weekOrder: 1, priority: 10 },
    { subject: 'Fisika', topic: 'Hukum Newton', subTopic: 'Hukum II Newton', weekOrder: 2, priority: 10 },
    { subject: 'Fisika', topic: 'Hukum Newton', subTopic: 'Hukum III Newton', weekOrder: 3, priority: 9 },
    { subject: 'Fisika', topic: 'Usaha dan Energi', subTopic: 'Konsep Usaha', weekOrder: 4, priority: 8 },
    { subject: 'Fisika', topic: 'Usaha dan Energi', subTopic: 'Energi Kinetik dan Potensial', weekOrder: 5, priority: 8 },
    { subject: 'Fisika', topic: 'Gelombang', subTopic: 'Gelombang Bunyi', weekOrder: 6, priority: 7 },
    { subject: 'Fisika', topic: 'Gelombang', subTopic: 'Gelombang Cahaya', weekOrder: 7, priority: 6 },
    { subject: 'Fisika', topic: 'Listrik', subTopic: 'Hukum Ohm', weekOrder: 8, priority: 7 },

    // ── Kimia ──
    { subject: 'Kimia', topic: 'Ikatan Kimia', subTopic: 'Ikatan Ion', weekOrder: 1, priority: 10 },
    { subject: 'Kimia', topic: 'Ikatan Kimia', subTopic: 'Ikatan Kovalen', weekOrder: 2, priority: 9 },
    { subject: 'Kimia', topic: 'Stoikiometri', subTopic: 'Konsep Mol', weekOrder: 3, priority: 8 },
    { subject: 'Kimia', topic: 'Larutan', subTopic: 'Konsentrasi Larutan', weekOrder: 4, priority: 7 },
    { subject: 'Kimia', topic: 'Larutan', subTopic: 'Asam Basa', weekOrder: 5, priority: 7 },
    { subject: 'Kimia', topic: 'Termokimia', subTopic: 'Reaksi Eksoterm dan Endoterm', weekOrder: 6, priority: 6 },

    // ── Biologi ──
    { subject: 'Biologi', topic: 'Sistem Ekskresi', subTopic: 'Ginjal', weekOrder: 1, priority: 10 },
    { subject: 'Biologi', topic: 'Sistem Ekskresi', subTopic: 'Kulit', weekOrder: 2, priority: 9 },
    { subject: 'Biologi', topic: 'Sistem Koordinasi', subTopic: 'Sistem Saraf', weekOrder: 3, priority: 8 },
    { subject: 'Biologi', topic: 'Sistem Reproduksi', subTopic: 'Alat Reproduksi', weekOrder: 4, priority: 7 },
    { subject: 'Biologi', topic: 'Genetika', subTopic: 'Hukum Mendel', weekOrder: 5, priority: 8 },
    { subject: 'Biologi', topic: 'Genetika', subTopic: 'Persilangan Monohibrid', weekOrder: 6, priority: 7 },

    // ── Bahasa Indonesia ──
    { subject: 'Bahasa Indonesia', topic: 'Teks Editorial', subTopic: 'Struktur Editorial', weekOrder: 1, priority: 8 },
    { subject: 'Bahasa Indonesia', topic: 'Teks Editorial', subTopic: 'Opini dan Fakta', weekOrder: 2, priority: 7 },
    { subject: 'Bahasa Indonesia', topic: 'Cerpen', subTopic: 'Unsur Intrinsik', weekOrder: 3, priority: 7 },

    // ── Bahasa Inggris ──
    { subject: 'Bahasa Inggris', topic: 'Tenses', subTopic: 'Past Perfect', weekOrder: 1, priority: 8 },
    { subject: 'Bahasa Inggris', topic: 'Passive Voice', subTopic: 'Active vs Passive', weekOrder: 2, priority: 7 },
    { subject: 'Bahasa Inggris', topic: 'Passive Voice', subTopic: 'Passive dalam Berbagai Tense', weekOrder: 3, priority: 6 },

    // ── Sejarah ──
    { subject: 'Sejarah', topic: 'Reformasi', subTopic: 'Latar Belakang Reformasi', weekOrder: 1, priority: 8 },
    { subject: 'Sejarah', topic: 'Orde Baru', subTopic: 'Kebijakan Orde Baru', weekOrder: 2, priority: 7 },
    { subject: 'Sejarah', topic: 'Orde Baru', subTopic: 'Akhir Orde Baru', weekOrder: 3, priority: 6 },
  ],
};

/** Get topic entries for a specific grade level */
export function getGradeTopics(grade: string): TopicEntry[] {
  return GRADE_TOPICS[grade] ?? [];
}

/** Get unique subjects for a grade level (ordered by priority) */
export function getSubjectsForGrade(grade: string): string[] {
  const topics = getGradeTopics(grade);
  return [...new Set(topics.map((t) => t.subject))];
}

/** Get topics for the first N weeks of a grade */
export function getFirstWeeks(grade: string, weeks: number): TopicEntry[] {
  return getGradeTopics(grade).filter((t) => t.weekOrder <= weeks);
}
