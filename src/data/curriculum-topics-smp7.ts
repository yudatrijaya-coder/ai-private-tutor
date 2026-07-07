/**
 * SMP Kelas 7 Kurikulum Merdeka — from official SIBI PDFs
 */
import type { TopicEntry } from "./curriculum-topics";

export const GRADE_TOPICS_SMP7: Record<string, TopicEntry[]> = {
  SMP_1: [
    // ── Matematika ──
    { subject: "Matematika", topic: "Bilangan", subTopic: "Bilangan Bulat", weekOrder: 1, priority: 10 },
    { subject: "Matematika", topic: "Bilangan", subTopic: "Bilangan Pecahan", weekOrder: 2, priority: 9 },
    { subject: "Matematika", topic: "Aljabar", subTopic: "Bentuk Aljabar", weekOrder: 3, priority: 10 },
    { subject: "Matematika", topic: "Persamaan", subTopic: "PLSV", weekOrder: 4, priority: 9 },
    { subject: "Matematika", topic: "Perbandingan", subTopic: "Skala dan Rasio", weekOrder: 5, priority: 8 },
    { subject: "Matematika", topic: "Aritmatika Sosial", subTopic: "Harga dan Diskon", weekOrder: 6, priority: 7 },
    { subject: "Matematika", topic: "Bangun Datar", subTopic: "Luas dan Keliling", weekOrder: 7, priority: 9 },
    { subject: "Matematika", topic: "Statistika", subTopic: "Penyajian Data", weekOrder: 8, priority: 8 },

    // ── IPA ──
    { subject: "IPA", topic: "Pengukuran", subTopic: "Besaran dan Satuan", weekOrder: 1, priority: 10 },
    { subject: "IPA", topic: "Zat", subTopic: "Wujud Zat", weekOrder: 2, priority: 9 },
    { subject: "IPA", topic: "Suhu dan Kalor", subTopic: "Suhu dan Termometer", weekOrder: 3, priority: 9 },
    { subject: "IPA", topic: "Gerak", subTopic: "Gaya dan Gerak", weekOrder: 4, priority: 8 },
    { subject: "IPA", topic: "Ekosistem", subTopic: "Komponen Ekosistem", weekOrder: 5, priority: 8 },
    { subject: "IPA", topic: "Keanekaragaman Hayati", subTopic: "Makhluk Hidup", weekOrder: 6, priority: 7 },
    { subject: "IPA", topic: "Pencemaran", subTopic: "Pencemaran Lingkungan", weekOrder: 7, priority: 7 },
    { subject: "IPA", topic: "Bumi", subTopic: "Struktur Bumi", weekOrder: 8, priority: 6 },

    // ── IPS ──
    { subject: "IPS", topic: "Ruang dan Interaksi", subTopic: "Ruang dan Sumber Daya", weekOrder: 1, priority: 10 },
    { subject: "IPS", topic: "Interaksi Sosial", subTopic: "Bentuk Interaksi Sosial", weekOrder: 2, priority: 9 },
    { subject: "IPS", topic: "Keragaman Budaya", subTopic: "Keragaman Suku dan Budaya", weekOrder: 3, priority: 8 },
    { subject: "IPS", topic: "Peninggalan Sejarah", subTopic: "Masa Hindu-Buddha", weekOrder: 4, priority: 8 },
    { subject: "IPS", topic: "Peninggalan Sejarah", subTopic: "Masa Islam", weekOrder: 5, priority: 7 },
    { subject: "IPS", topic: "Ekonomi", subTopic: "Kegiatan Ekonomi", weekOrder: 6, priority: 7 },

    // ── Bahasa Indonesia ──
    { subject: "Bahasa Indonesia", topic: "Teks Deskripsi", subTopic: "Ciri Teks Deskripsi", weekOrder: 1, priority: 10 },
    { subject: "Bahasa Indonesia", topic: "Teks Narasi", subTopic: "Struktur Narasi", weekOrder: 2, priority: 9 },
    { subject: "Bahasa Indonesia", topic: "Teks Prosedur", subTopic: "Langkah dan Tujuan", weekOrder: 3, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Teks Laporan", subTopic: "Observasi", weekOrder: 4, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Puisi Rakyat", subTopic: "Pantun dan Syair", weekOrder: 5, priority: 7 },
    { subject: "Bahasa Indonesia", topic: "Fabel", subTopic: "Cerita Binatang", weekOrder: 6, priority: 6 },

    // ── Bahasa Inggris ──
    { subject: "Bahasa Inggris", topic: "Greetings", subTopic: "Introduction", weekOrder: 1, priority: 9 },
    { subject: "Bahasa Inggris", topic: "Daily Life", subTopic: "Daily Routines", weekOrder: 2, priority: 8 },
    { subject: "Bahasa Inggris", topic: "School", subTopic: "School Activities", weekOrder: 3, priority: 8 },
    { subject: "Bahasa Inggris", topic: "Hobbies", subTopic: "Expressing Hobbies", weekOrder: 4, priority: 7 },
    { subject: "Bahasa Inggris", topic: "Food", subTopic: "Food and Drinks", weekOrder: 5, priority: 7 },
    { subject: "Bahasa Inggris", topic: "Descriptive", subTopic: "Describing People", weekOrder: 6, priority: 6 },

    // ── Informatika ──
    { subject: "Informatika", topic: "Berpikir Komputasional", subTopic: "Dasar Berpikir Komputasional", weekOrder: 1, priority: 9 },
    { subject: "Informatika", topic: "Algoritma", subTopic: "Algoritma Dasar", weekOrder: 2, priority: 8 },
    { subject: "Informatika", topic: "Pemrograman", subTopic: "Dasar Pemrograman", weekOrder: 3, priority: 8 },
    { subject: "Informatika", topic: "Internet", subTopic: "Jaringan Internet", weekOrder: 4, priority: 7 },
    { subject: "Informatika", topic: "Keamanan", subTopic: "Keamanan Data", weekOrder: 5, priority: 6 },

    // ── Pendidikan Pancasila ──
    { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Nilai-Nilai Pancasila", weekOrder: 1, priority: 10 },
    { subject: "Pendidikan Pancasila", topic: "Norma", subTopic: "Norma dalam Masyarakat", weekOrder: 2, priority: 9 },
    { subject: "Pendidikan Pancasila", topic: "UUD 1945", subTopic: "Hak dan Kewajiban", weekOrder: 3, priority: 8 },
    { subject: "Pendidikan Pancasila", topic: "Bhinneka", subTopic: "Keberagaman", weekOrder: 4, priority: 8 },
    { subject: "Pendidikan Pancasila", topic: "NKRI", subTopic: "Wilayah NKRI", weekOrder: 5, priority: 7 },
    { subject: "Pendidikan Pancasila", topic: "Demokrasi", subTopic: "Musyawarah", weekOrder: 6, priority: 7 },

    // ── PJOK ──
    { subject: "PJOK", topic: "Permainan Bola", subTopic: "Bola Besar", weekOrder: 1, priority: 8 },
    { subject: "PJOK", topic: "Permainan Bola", subTopic: "Bola Kecil", weekOrder: 2, priority: 7 },
    { subject: "PJOK", topic: "Atletik", subTopic: "Lari dan Lompat", weekOrder: 3, priority: 7 },
    { subject: "PJOK", topic: "Senam", subTopic: "Gerakan Senam", weekOrder: 4, priority: 6 },
    { subject: "PJOK", topic: "Aktivitas Air", subTopic: "Renang", weekOrder: 5, priority: 6 },
    { subject: "PJOK", topic: "Kebugaran", subTopic: "Latihan Kebugaran", weekOrder: 6, priority: 7 },

    // ── Seni Budaya ──
    { subject: "Seni Budaya", topic: "Seni Rupa", subTopic: "Menggambar", weekOrder: 1, priority: 6 },
    { subject: "Seni Budaya", topic: "Seni Musik", subTopic: "Alat Musik", weekOrder: 2, priority: 6 },
    { subject: "Seni Budaya", topic: "Seni Tari", subTopic: "Gerak Tari", weekOrder: 3, priority: 5 },
    { subject: "Seni Budaya", topic: "Seni Teater", subTopic: "Dasar Teater", weekOrder: 4, priority: 5 },
  ],
};
