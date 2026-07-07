/**
 * SMA Kelas 11 (XI) Kurikulum Merdeka — from official SIBI PDFs
 */
import type { TopicEntry } from "./curriculum-topics";

export const GRADE_TOPICS_SMA11: Record<string, TopicEntry[]> = {
  SMA_2: [
    // ── Matematika Tingkat Lanjut ──
    { subject: "Matematika", topic: "Fungsi", subTopic: "Fungsi dan Grafik", weekOrder: 1, priority: 10 },
    { subject: "Matematika", topic: "Polinomial", subTopic: "Suku Banyak", weekOrder: 2, priority: 9 },
    { subject: "Matematika", topic: "Trigonometri", subTopic: "Fungsi Trigonometri", weekOrder: 3, priority: 9 },
    { subject: "Matematika", topic: "Limit", subTopic: "Konsep Limit", weekOrder: 4, priority: 10 },
    { subject: "Matematika", topic: "Turunan", subTopic: "Diferensial", weekOrder: 5, priority: 9 },
    { subject: "Matematika", topic: "Integral", subTopic: "Anti Turunan", weekOrder: 6, priority: 8 },
    { subject: "Matematika", topic: "Matriks", subTopic: "Operasi Matriks", weekOrder: 7, priority: 8 },
    { subject: "Matematika", topic: "Vektor", subTopic: "Ruang Dimensi", weekOrder: 8, priority: 7 },

    // ── Bahasa Indonesia Tingkat Lanjut ──
    { subject: "Bahasa Indonesia", topic: "Teks Eksposisi", subTopic: "Struktur Eksposisi", weekOrder: 1, priority: 10 },
    { subject: "Bahasa Indonesia", topic: "Teks Argumentasi", subTopic: "Argumen dan Bukti", weekOrder: 2, priority: 9 },
    { subject: "Bahasa Indonesia", topic: "Cerita Pendek", subTopic: "Analisis Cerpen", weekOrder: 3, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Novel", subTopic: "Unsur Intrinsik Novel", weekOrder: 4, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Drama", subTopic: "Naskah Drama", weekOrder: 5, priority: 7 },
    { subject: "Bahasa Indonesia", topic: "Karya Ilmiah", subTopic: "Penulisan Karya Ilmiah", weekOrder: 6, priority: 9 },

    // ── Bahasa Inggris Tingkat Lanjut ──
    { subject: "Bahasa Inggris", topic: "Narrative", subTopic: "Narrative Text", weekOrder: 1, priority: 9 },
    { subject: "Bahasa Inggris", topic: "Explanation", subTopic: "Explanation Text", weekOrder: 2, priority: 8 },
    { subject: "Bahasa Inggris", topic: "Discussion", subTopic: "Discussion Text", weekOrder: 3, priority: 8 },
    { subject: "Bahasa Inggris", topic: "Review", subTopic: "Critical Review", weekOrder: 4, priority: 7 },
    { subject: "Bahasa Inggris", topic: "Speech", subTopic: "Public Speaking", weekOrder: 5, priority: 7 },
    { subject: "Bahasa Inggris", topic: "Academic", subTopic: "Academic Writing", weekOrder: 6, priority: 8 },

    // ── Ekonomi ──
    { subject: "Ekonomi", topic: "Ilmu Ekonomi", subTopic: "Konsep Dasar Ekonomi", weekOrder: 1, priority: 10 },
    { subject: "Ekonomi", topic: "Permintaan dan Penawaran", subTopic: "Hukum Permintaan", weekOrder: 2, priority: 9 },
    { subject: "Ekonomi", topic: "Pasar", subTopic: "Struktur Pasar", weekOrder: 3, priority: 8 },
    { subject: "Ekonomi", topic: "Kebijakan Moneter", subTopic: "Bank dan Inflasi", weekOrder: 4, priority: 7 },
    { subject: "Ekonomi", topic: "Kebijakan Fiskal", subTopic: "APBN", weekOrder: 5, priority: 7 },
    { subject: "Ekonomi", topic: "Pembangunan", subTopic: "Pertumbuhan Ekonomi", weekOrder: 6, priority: 8 },

    // ── Geografi ──
    { subject: "Geografi", topic: "Peta", subTopic: "Dasar Pemetaan", weekOrder: 1, priority: 9 },
    { subject: "Geografi", topic: "Litosfer", subTopic: "Bumi dan Perubahan", weekOrder: 2, priority: 9 },
    { subject: "Geografi", topic: "Hidrosfer", subTopic: "Siklus Air", weekOrder: 3, priority: 8 },
    { subject: "Geografi", topic: "Atmosfer", subTopic: "Cuaca dan Iklim", weekOrder: 4, priority: 8 },
    { subject: "Geografi", topic: "Antroposfer", subTopic: "Dinamika Penduduk", weekOrder: 5, priority: 7 },
    { subject: "Geografi", topic: "Sumber Daya", subTopic: "SDA dan Lingkungan", weekOrder: 6, priority: 7 },

    // ── Sosiologi ──
    { subject: "Sosiologi", topic: "Sosiologi Dasar", subTopic: "Objek Sosiologi", weekOrder: 1, priority: 9 },
    { subject: "Sosiologi", topic: "Interaksi Sosial", subTopic: "Teori Interaksi", weekOrder: 2, priority: 8 },
    { subject: "Sosiologi", topic: "Stratifikasi", subTopic: "Stratifikasi Sosial", weekOrder: 3, priority: 8 },
    { subject: "Sosiologi", topic: "Konflik", subTopic: "Konflik dan Integrasi", weekOrder: 4, priority: 7 },
    { subject: "Sosiologi", topic: "Perubahan Sosial", subTopic: "Modernisasi", weekOrder: 5, priority: 7 },
    { subject: "Sosiologi", topic: "Lembaga Sosial", subTopic: "Lembaga Kemasyarakatan", weekOrder: 6, priority: 6 },

    // ── PJOK ──
    { subject: "PJOK", topic: "Permainan", subTopic: "Permainan Bola Besar", weekOrder: 1, priority: 7 },
    { subject: "PJOK", topic: "Permainan", subTopic: "Permainan Bola Kecil", weekOrder: 2, priority: 6 },
    { subject: "PJOK", topic: "Atletik", subTopic: "Atletik Lanjutan", weekOrder: 3, priority: 6 },
    { subject: "PJOK", topic: "Kebugaran", subTopic: "Program Kebugaran", weekOrder: 4, priority: 7 },
    { subject: "PJOK", topic: "Pola Hidup", subTopic: "Pola Makan Sehat", weekOrder: 5, priority: 6 },

    // ── Pendidikan Pancasila ──
    { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Pancasila sebagai Ideologi", weekOrder: 1, priority: 10 },
    { subject: "Pendidikan Pancasila", topic: "Hukum", subTopic: "Sistem Hukum Indonesia", weekOrder: 2, priority: 9 },
    { subject: "Pendidikan Pancasila", topic: "HAM", subTopic: "Hak Asasi Manusia", weekOrder: 3, priority: 8 },
    { subject: "Pendidikan Pancasila", topic: "Demokrasi", subTopic: "Demokrasi di Indonesia", weekOrder: 4, priority: 8 },
    { subject: "Pendidikan Pancasila", topic: "Globalisasi", subTopic: "Globalisasi dan Dampak", weekOrder: 5, priority: 7 },

    // ── Informatika ──
    { subject: "Informatika", topic: "Algoritma", subTopic: "Algoritma Lanjutan", weekOrder: 1, priority: 8 },
    { subject: "Informatika", topic: "Struktur Data", subTopic: "Array dan Matriks", weekOrder: 2, priority: 7 },
    { subject: "Informatika", topic: "Pemrograman", subTopic: "Pemrograman Lanjutan", weekOrder: 3, priority: 8 },
    { subject: "Informatika", topic: "Basis Data", subTopic: "Pengenalan Basis Data", weekOrder: 4, priority: 7 },
    { subject: "Informatika", topic: "Jaringan", subTopic: "Jaringan Komputer", weekOrder: 5, priority: 6 },
  ],
};
