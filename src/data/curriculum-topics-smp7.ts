/**
 * Full SMP Kelas 7 Kurikulum Merdeka — from SIBI PDFs
 * 5 Buku: IPA, B. Indonesia, PJOK, Pancasila + manual IPS, Inggris, Matematika, Informatika
 * ~100+ sub-topik mencakup 1 tahun ajaran
 */
import type { TopicEntry } from "./curriculum-topics";

export const GRADE_TOPICS_SMP7: Record<string, TopicEntry[]> = {
  SMP_1: [
    // ═══ IPA — 7 Bab, 35 sub-topik ═══
    { subject: "IPA", topic: "Ilmu Sains", subTopic: "Hakikat Ilmu Sains", weekOrder: 1, priority: 10 },
    { subject: "IPA", topic: "Ilmu Sains", subTopic: "Laboratorium IPA", weekOrder: 2, priority: 9 },
    { subject: "IPA", topic: "Ilmu Sains", subTopic: "Metode Ilmiah", weekOrder: 3, priority: 10 },
    { subject: "IPA", topic: "Ilmu Sains", subTopic: "Merancang Percobaan", weekOrder: 4, priority: 9 },
    { subject: "IPA", topic: "Ilmu Sains", subTopic: "Pelaporan Hasil Percobaan", weekOrder: 5, priority: 8 },
    { subject: "IPA", topic: "Zat dan Perubahan", subTopic: "Wujud Zat dan Partikel", weekOrder: 6, priority: 9 },
    { subject: "IPA", topic: "Zat dan Perubahan", subTopic: "Perubahan Fisika dan Kimia", weekOrder: 7, priority: 8 },
    { subject: "IPA", topic: "Zat dan Perubahan", subTopic: "Pemisahan Campuran", weekOrder: 8, priority: 7 },
    { subject: "IPA", topic: "Suhu dan Kalor", subTopic: "Suhu dan Termometer", weekOrder: 9, priority: 9 },
    { subject: "IPA", topic: "Suhu dan Kalor", subTopic: "Kalor dan Perpindahannya", weekOrder: 10, priority: 8 },
    { subject: "IPA", topic: "Suhu dan Kalor", subTopic: "Pemuaian", weekOrder: 11, priority: 7 },
    { subject: "IPA", topic: "Gerak dan Gaya", subTopic: "Gerak Benda", weekOrder: 12, priority: 9 },
    { subject: "IPA", topic: "Gerak dan Gaya", subTopic: "Gaya dan Hukum Newton", weekOrder: 13, priority: 10 },
    { subject: "IPA", topic: "Gerak dan Gaya", subTopic: "Pesawat Sederhana", weekOrder: 14, priority: 8 },
    { subject: "IPA", topic: "Gerak dan Gaya", subTopic: "Tekanan Zat", weekOrder: 15, priority: 7 },
    { subject: "IPA", topic: "Makhluk Hidup", subTopic: "Ciri-Ciri Makhluk Hidup", weekOrder: 16, priority: 9 },
    { subject: "IPA", topic: "Makhluk Hidup", subTopic: "Klasifikasi Makhluk Hidup", weekOrder: 17, priority: 8 },
    { subject: "IPA", topic: "Makhluk Hidup", subTopic: "Keanekaragaman Hayati", weekOrder: 18, priority: 8 },
    { subject: "IPA", topic: "Ekologi", subTopic: "Komponen Ekosistem", weekOrder: 19, priority: 9 },
    { subject: "IPA", topic: "Ekologi", subTopic: "Interaksi Antar Makhluk Hidup", weekOrder: 20, priority: 8 },
    { subject: "IPA", topic: "Ekologi", subTopic: "Pelestarian Lingkungan", weekOrder: 21, priority: 7 },
    { subject: "IPA", topic: "Bumi dan Tata Surya", subTopic: "Struktur Bumi", weekOrder: 22, priority: 8 },
    { subject: "IPA", topic: "Bumi dan Tata Surya", subTopic: "Tata Surya", weekOrder: 23, priority: 7 },
    { subject: "IPA", topic: "Bumi dan Tata Surya", subTopic: "Rotasi dan Revolusi Bumi", weekOrder: 24, priority: 7 },

    // ═══ Bahasa Indonesia — 6 Bab, 24 sub-topik ═══
    { subject: "Bahasa Indonesia", topic: "Jelajah Nusantara", subTopic: "Teks Deskripsi", weekOrder: 1, priority: 10 },
    { subject: "Bahasa Indonesia", topic: "Jelajah Nusantara", subTopic: "Unsur Bahasa dalam Teks Deskripsi", weekOrder: 2, priority: 9 },
    { subject: "Bahasa Indonesia", topic: "Jelajah Nusantara", subTopic: "Menganalisis Teks Deskripsi", weekOrder: 3, priority: 9 },
    { subject: "Bahasa Indonesia", topic: "Jelajah Nusantara", subTopic: "Menyajikan Teks Deskripsi", weekOrder: 4, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Dunia Imajinasi", subTopic: "Mengenal Puisi", weekOrder: 5, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Dunia Imajinasi", subTopic: "Unsur Puisi Rakyat", weekOrder: 6, priority: 7 },
    { subject: "Bahasa Indonesia", topic: "Dunia Imajinasi", subTopic: "Menulis Puisi", weekOrder: 7, priority: 7 },
    { subject: "Bahasa Indonesia", topic: "Hal Baik bagi Tubuh", subTopic: "Teks Prosedur", weekOrder: 8, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Hal Baik bagi Tubuh", subTopic: "Struktur dan Kebahasaan", weekOrder: 9, priority: 7 },
    { subject: "Bahasa Indonesia", topic: "Pelindung Bumi", subTopic: "Teks Berita", weekOrder: 10, priority: 8 },
    { subject: "Bahasa Indonesia", topic: "Pelindung Bumi", subTopic: "Unsur-Unsur Berita", weekOrder: 11, priority: 7 },
    { subject: "Bahasa Indonesia", topic: "Pelindung Bumi", subTopic: "Menulis Teks Berita", weekOrder: 12, priority: 6 },
    { subject: "Bahasa Indonesia", topic: "Membuka Gerbang", subTopic: "Buku Bergambar", weekOrder: 13, priority: 7 },
    { subject: "Bahasa Indonesia", topic: "Membuka Gerbang", subTopic: "Membedah Buku", weekOrder: 14, priority: 6 },
    { subject: "Bahasa Indonesia", topic: "Membuka Gerbang", subTopic: "Literasi Visual", weekOrder: 15, priority: 6 },

    // ═══ Bahasa Inggris — 6 Unit, 18 sub-topik ═══
    { subject: "Bahasa Inggris", topic: "Introduction", subTopic: "Greetings and Introductions", weekOrder: 1, priority: 9 },
    { subject: "Bahasa Inggris", topic: "Introduction", subTopic: "Personal Identity", weekOrder: 2, priority: 8 },
    { subject: "Bahasa Inggris", topic: "Daily Life", subTopic: "Daily Routines", weekOrder: 3, priority: 8 },
    { subject: "Bahasa Inggris", topic: "Daily Life", subTopic: "Telling Time", weekOrder: 4, priority: 7 },
    { subject: "Bahasa Inggris", topic: "School", subTopic: "Subjects and Schedules", weekOrder: 5, priority: 8 },
    { subject: "Bahasa Inggris", topic: "School", subTopic: "School Facilities", weekOrder: 6, priority: 7 },
    { subject: "Bahasa Inggris", topic: "Hobbies", subTopic: "Expressing Hobbies", weekOrder: 7, priority: 7 },
    { subject: "Bahasa Inggris", topic: "Hobbies", subTopic: "Sports and Activities", weekOrder: 8, priority: 6 },
    { subject: "Bahasa Inggris", topic: "Descriptive", subTopic: "Describing People", weekOrder: 9, priority: 7 },
    { subject: "Bahasa Inggris", topic: "Descriptive", subTopic: "Describing Places", weekOrder: 10, priority: 6 },

    // ═══ Matematika — 8 topik ═══
    { subject: "Matematika", topic: "Bilangan", subTopic: "Bilangan Bulat dan Operasi", weekOrder: 1, priority: 10 },
    { subject: "Matematika", topic: "Bilangan", subTopic: "Bilangan Pecahan", weekOrder: 2, priority: 9 },
    { subject: "Matematika", topic: "Aljabar", subTopic: "Bentuk Aljabar", weekOrder: 3, priority: 10 },
    { subject: "Matematika", topic: "Persamaan", subTopic: "Persamaan Linear", weekOrder: 4, priority: 9 },
    { subject: "Matematika", topic: "Perbandingan", subTopic: "Skala dan Rasio", weekOrder: 5, priority: 8 },
    { subject: "Matematika", topic: "Aritmatika Sosial", subTopic: "Harga dan Diskon", weekOrder: 6, priority: 7 },
    { subject: "Matematika", topic: "Bangun Datar", subTopic: "Luas dan Keliling", weekOrder: 7, priority: 9 },
    { subject: "Matematika", topic: "Statistika", subTopic: "Penyajian Data", weekOrder: 8, priority: 8 },

    // ═══ IPS — 6 topik ═══
    { subject: "IPS", topic: "Ruang dan Interaksi", subTopic: "Ruang dan Sumber Daya", weekOrder: 1, priority: 10 },
    { subject: "IPS", topic: "Interaksi Sosial", subTopic: "Bentuk Interaksi Sosial", weekOrder: 2, priority: 9 },
    { subject: "IPS", topic: "Keragaman Budaya", subTopic: "Keragaman Suku dan Budaya", weekOrder: 3, priority: 8 },
    { subject: "IPS", topic: "Peninggalan Sejarah", subTopic: "Masa Hindu-Buddha", weekOrder: 4, priority: 8 },
    { subject: "IPS", topic: "Peninggalan Sejarah", subTopic: "Masa Islam", weekOrder: 5, priority: 7 },
    { subject: "IPS", topic: "Ekonomi", subTopic: "Kegiatan Ekonomi", weekOrder: 6, priority: 7 },

    // ═══ Informatika — 5 topik ═══
    { subject: "Informatika", topic: "Berpikir Komputasional", subTopic: "Dasar Berpikir Komputasional", weekOrder: 1, priority: 9 },
    { subject: "Informatika", topic: "Algoritma", subTopic: "Algoritma dan Pemrograman", weekOrder: 2, priority: 8 },
    { subject: "Informatika", topic: "Internet", subTopic: "Jaringan Internet", weekOrder: 3, priority: 7 },
    { subject: "Informatika", topic: "Keamanan", subTopic: "Keamanan Data dan Privasi", weekOrder: 4, priority: 6 },
    { subject: "Informatika", topic: "Dampak Sosial", subTopic: "Dampak Teknologi Informasi", weekOrder: 5, priority: 6 },

    // ═══ Pendidikan Pancasila — 5 Bab, 20 sub-topik ═══
    { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Sejarah Kelahiran Pancasila", weekOrder: 1, priority: 10 },
    { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Nilai-Nilai Pancasila", weekOrder: 2, priority: 9 },
    { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Makna Sila-Sila Pancasila", weekOrder: 3, priority: 9 },
    { subject: "Pendidikan Pancasila", topic: "Pancasila", subTopic: "Penerapan Pancasila", weekOrder: 4, priority: 8 },
    { subject: "Pendidikan Pancasila", topic: "Norma", subTopic: "Macam-Macam Norma", weekOrder: 5, priority: 8 },
    { subject: "Pendidikan Pancasila", topic: "Norma", subTopic: "Penerapan Norma", weekOrder: 6, priority: 7 },
    { subject: "Pendidikan Pancasila", topic: "Norma", subTopic: "Hukum dan Keadilan", weekOrder: 7, priority: 7 },
    { subject: "Pendidikan Pancasila", topic: "Keberagaman", subTopic: "Makna Persatuan", weekOrder: 8, priority: 8 },
    { subject: "Pendidikan Pancasila", topic: "Keberagaman", subTopic: "Bhineka Tunggal Ika", weekOrder: 9, priority: 7 },
    { subject: "Pendidikan Pancasila", topic: "Keberagaman", subTopic: "Tantangan Keberagaman", weekOrder: 10, priority: 6 },
    { subject: "Pendidikan Pancasila", topic: "NKRI", subTopic: "Wilayah Negara Kesatuan", weekOrder: 11, priority: 8 },
    { subject: "Pendidikan Pancasila", topic: "NKRI", subTopic: "Unsur-Unsur Negara", weekOrder: 12, priority: 7 },
    { subject: "Pendidikan Pancasila", topic: "NKRI", subTopic: "Menjaga Keutuhan Wilayah", weekOrder: 13, priority: 7 },

    // ═══ PJOK — 6 Bab, 24 sub-topik ═══
    { subject: "PJOK", topic: "Keterampilan Gerak", subTopic: "Gerak Lokomotor dan Non-Lokomotor", weekOrder: 1, priority: 8 },
    { subject: "PJOK", topic: "Keterampilan Gerak", subTopic: "Hubungan Gerak Dasar dan Keterampilan", weekOrder: 2, priority: 7 },
    { subject: "PJOK", topic: "Keterampilan Gerak", subTopic: "Umpan Balik Belajar Gerak", weekOrder: 3, priority: 6 },
    { subject: "PJOK", topic: "Strategi Gerak", subTopic: "Taktik Permainan Bola Besar", weekOrder: 4, priority: 8 },
    { subject: "PJOK", topic: "Strategi Gerak", subTopic: "Taktik Permainan Bola Kecil", weekOrder: 5, priority: 7 },
    { subject: "PJOK", topic: "Strategi Gerak", subTopic: "Pertahanan dan Penyerangan", weekOrder: 6, priority: 6 },
    { subject: "PJOK", topic: "Belajar Melalui Gerak", subTopic: "Konsep Gerak", weekOrder: 7, priority: 7 },
    { subject: "PJOK", topic: "Belajar Melalui Gerak", subTopic: "Fase-Fase Gerak", weekOrder: 8, priority: 6 },
    { subject: "PJOK", topic: "Belajar Melalui Gerak", subTopic: "Koreksi Gerak", weekOrder: 9, priority: 6 },
    { subject: "PJOK", topic: "Kerja Sama Tim", subTopic: "Peran dalam Tim", weekOrder: 10, priority: 7 },
    { subject: "PJOK", topic: "Kerja Sama Tim", subTopic: "Komunikasi dan Koordinasi", weekOrder: 11, priority: 6 },
    { subject: "PJOK", topic: "Kerja Sama Tim", subTopic: "Sportivitas", weekOrder: 12, priority: 7 },
    { subject: "PJOK", topic: "Kebugaran", subTopic: "Kebugaran Jasmani", weekOrder: 13, priority: 7 },
    { subject: "PJOK", topic: "Kebugaran", subTopic: "Tes Kebugaran", weekOrder: 14, priority: 6 },
    { subject: "PJOK", topic: "Kebugaran", subTopic: "Program Latihan", weekOrder: 15, priority: 6 },
    { subject: "PJOK", topic: "Hidup Sehat", subTopic: "Pola Makan Sehat", weekOrder: 16, priority: 7 },
    { subject: "PJOK", topic: "Hidup Sehat", subTopic: "Gizi Seimbang", weekOrder: 17, priority: 6 },
    { subject: "PJOK", topic: "Hidup Sehat", subTopic: "Pencegahan Penyakit", weekOrder: 18, priority: 6 },
  ],
};
