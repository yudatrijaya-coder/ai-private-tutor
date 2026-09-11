/**
 * YouTube Learning Resources — Kurasi SD Kelas 5 Kurikulum Merdeka
 * SEMUA LINK TERVERIFIKASI via YouTube oEmbed API (10 Juli 2026)
 * Minimal 3 video per topik jika tersedia
 */

export interface YouTubeResource {
  title: string;
  url: string;
  channel: string;
  topic: string;
}

export const YOUTUBE_RECOMMENDATIONS: YouTubeResource[] = [
  // ══════ CAHAYA (3 video) ══════
  {
    title: "Cahaya Dan Sifatnya - IPAS Bab 1 Kelas 5",
    url: "https://www.youtube.com/watch?v=hs1Cz1B7MVs",
    channel: "BIMBEL ONLINE",
    topic: "Cahaya",
  },
  {
    title: "Sifat-Sifat Cahaya (Lagu) - IPAS Kelas 5",
    url: "https://www.youtube.com/watch?v=Trdcf34FSbw",
    channel: "SDIT AN NUUR PURWOSARI",
    topic: "Cahaya",
  },
  {
    title: "Sifat-sifat Cahaya & Macam Cacat Mata | IPA",
    url: "https://www.youtube.com/watch?v=tEiTBJaGwPU",
    channel: "SayaBisa",
    topic: "Cahaya",
  },

  // ══════ BUNYI (3 video) ══════
  {
    title: "Bunyi dan Sifatnya - Materi IPAS Kelas 5",
    url: "https://www.youtube.com/watch?v=zTehAP1I_uQ",
    channel: "Guru Belajar86 Media",
    topic: "Bunyi",
  },
  {
    title: "TOPIK D : Mendengar Karena Bunyi - IPAS Bab 1",
    url: "https://www.youtube.com/watch?v=gr8xb4NWHyg",
    channel: "Video Materi SD",
    topic: "Bunyi",
  },
  {
    title: "Bunyi | IPA SD (animasi)",
    url: "https://www.youtube.com/watch?v=654uXOx_S6A",
    channel: "kejarcita",
    topic: "Bunyi",
  },

  // ══════ EKOSISTEM (3 video) ══════
  {
    title: "Rantai Makanan - IPAS Bab 2 Kelas 5",
    url: "https://www.youtube.com/watch?v=S5JxFmJgZyk",
    channel: "BIMBEL ONLINE",
    topic: "Ekosistem",
  },
  {
    title: "Ekosistem | IPA SD (animasi)",
    url: "https://www.youtube.com/watch?v=ThxJOMUCYds",
    channel: "kejarcita",
    topic: "Ekosistem",
  },
  {
    title: "Komponen Ekosistem dan Interaksi di Dalamnya",
    url: "https://www.youtube.com/watch?v=mL-XRVugc1E",
    channel: "MUCAGRA 7",
    topic: "Ekosistem",
  },

  // ══════ INDONESIA KAYA (3 video) ══════
  {
    title: "Negara Maritim dan Agraris - IPAS Kelas 5",
    url: "https://www.youtube.com/watch?v=KO-eLEWsifY",
    channel: "Guru Belajar86 Media",
    topic: "Indonesia Kaya",
  },
  {
    title: "Karakteristik Geografis Wilayah Indonesia",
    url: "https://www.youtube.com/watch?v=8Yi0rhvp5fo",
    channel: "kejarcita",
    topic: "Indonesia Kaya",
  },
  {
    title: "IPAS Kelas 5 - Indonesiaku Kaya Raya (Bab 6)",
    url: "https://www.youtube.com/watch?v=9oKfme81bH4",
    channel: "Ika Rismay",
    topic: "Indonesia Kaya",
  },

  // ══════ AIR SUMBER KEHIDUPAN (3 video) ══════
  {
    title: "Siklus Air - Materi IPAS Kelas 5",
    url: "https://www.youtube.com/watch?v=JsRRL8ajhWc",
    channel: "Guru Belajar86 Media",
    topic: "Air Sumber Kehidupan",
  },
  {
    title: "Air Sumber Kehidupan - IPA Kelas 5",
    url: "https://www.youtube.com/watch?v=0qyFKIc3XTg",
    channel: "bang Nurdin",
    topic: "Air Sumber Kehidupan",
  },
  {
    title: "Siklus Air | Cara Hemat Air - Kelas 5 SD",
    url: "https://www.youtube.com/watch?v=qvLWHjx3_Tc",
    channel: "Cawan Belajar Online",
    topic: "Air Sumber Kehidupan",
  },

  // ══════ EKONOMI (3 video) ══════
  {
    title: "Aktivitas Ekonomi Masyarakat - IPAS Kelas 5",
    url: "https://www.youtube.com/watch?v=Sysh19KOjbM",
    channel: "Guru Belajar86 Media",
    topic: "Ekonomi",
  },
  {
    title: "Kegiatan Ekonomi (Produksi, Distribusi, Konsumsi)",
    url: "https://www.youtube.com/watch?v=CFGL1yVBPTk",
    channel: "mirna chrisma",
    topic: "Ekonomi",
  },
  {
    title: "Kegiatan Ekonomi || Produksi-Distribusi-Konsumsi",
    url: "https://www.youtube.com/watch?v=oQKT01sGtNE",
    channel: "Sumber Belajar",
    topic: "Ekonomi",
  },

  // ══════ PERUBAHAN FISIK (3 video) ══════
  {
    title: "Bijak dalam Masa Pubertas - IPAS Kelas 5",
    url: "https://www.youtube.com/watch?v=gvocfmnZBao",
    channel: "Mashindra Prisma Saputra",
    topic: "Perubahan Fisik",
  },
  {
    title: "Apa yang Terjadi pada Tubuhku Saat Remaja?",
    url: "https://www.youtube.com/watch?v=uae4f_8xyW0",
    channel: "Plan Indonesia",
    topic: "Perubahan Fisik",
  },
  {
    title: "Yuk Kenali Pubertas Pada Remaja",
    url: "https://www.youtube.com/watch?v=rRMnleVQzI8",
    channel: "RemajaGenre Warungpring",
    topic: "Perubahan Fisik",
  },

  // ══════ DAERAH BERSEJARAH (3 video) ══════
  {
    title: "Benda Peninggalan Sejarah - IPAS Bab 5 Kelas 5",
    url: "https://www.youtube.com/watch?v=zFszMem7eMk",
    channel: "Video Materi SD",
    topic: "Daerah Bersejarah",
  },
  {
    title: "Sejarah Kerajaan Hindu, Buddha, dan Islam",
    url: "https://www.youtube.com/watch?v=S7GVz-YGWrY",
    channel: "kejarcita",
    topic: "Daerah Bersejarah",
  },
  {
    title: "Kedatangan Bangsa Asing ke Nusantara - IPAS Kelas 5",
    url: "https://www.youtube.com/watch?v=MfapNhdbLTc",
    channel: "Guru Belajar86 Media",
    topic: "Daerah Bersejarah",
  },

  // ══════ MATEMATIKA (5 video) ══════
  {
    title: "Pecahan | Matematika SD",
    url: "https://www.youtube.com/watch?v=0hPRfqPFtt8",
    channel: "kejarcita",
    topic: "Pecahan",
  },
  {
    title: "MATEMATIKA KELAS 5 PECAHAN | PENJUMLAHAN DAN PENGURANGAN PECAHAN",
    url: "https://www.youtube.com/watch?v=4VFsHwtJY30",
    channel: "Nita Cahyo",
    topic: "Pecahan",
  },
  {
    title: "Perbandingan Dua Besaran | Kecepatan dan Debit | Matematika SD",
    url: "https://www.youtube.com/watch?v=XVGRdkoJrsU",
    channel: "kejarcita",
    topic: "Kecepatan dan Debit",
  },
  {
    title: "Matematika Kelas 5: Perbandingan dan Skala (Perbandingan) Part. 2",
    url: "https://www.youtube.com/watch?v=VE7cUXJ6vLQ",
    channel: "kejarcita",
    topic: "Skala",
  },
  {
    title: "Volume Bangun Ruang - Materi Matematika Kelas 5 Kurikulum Merdeka",
    url: "https://www.youtube.com/watch?v=MSaNs15yP6w",
    channel: "Guru Belajar86 Media",
    topic: "Bangun Ruang",
  },

  // ══════ BAHASA INDONESIA (3 video) ══════
  {
    title: "Bab 1 Aku Yang Unik | Bahasa Indonesia Kelas 5 SD",
    url: "https://www.youtube.com/watch?v=fqBKoTROVe0",
    channel: "Kelas Pak Syam",
    topic: "Aku yang Unik",
  },

  // ══════ Daily Life (3 video — curated 11 Sep 2026) ══════
  {
    title: "Cara Menyampaikan Kegiatan Sehari-hari dalam Bahasa Inggris | Daily Activities",
    url: "https://www.youtube.com/watch?v=jP5dKwTaHNw",
    channel: "Yuli Andawa",
    topic: "Daily Life",
  },
  {
    title: "Daily Activities Bahasa Inggris kelas 5 SD Mutual",
    url: "https://www.youtube.com/watch?v=8ghJaJDDQh4",
    channel: "Hani Hendraswati",
    topic: "Daily Life",
  },
  {
    title: "Daily Activity - Bahasa Inggris kelas 5 SD",
    url: "https://www.youtube.com/watch?v=ngJjWGXROVo",
    channel: "olip ihsan",
    topic: "Daily Life",
  },

  // ══════ Direction (3 video — curated 11 Sep 2026) ══════
  {
    title: "Asking for and giving directions: Easy English Conversations 💬 Episode 5",
    url: "https://www.youtube.com/watch?v=SHXPpsIJTb0",
    channel: "BBC Learning English",
    topic: "Direction",
  },
  {
    title: "BAHASA INGGRIS KELAS 5 (GIVING DIRECTION)",
    url: "https://www.youtube.com/watch?v=j0OGPxB--U0",
    channel: "SD Unggulan 'Aisyiyah Taman Harapan Curup",
    topic: "Direction",
  },
  {
    title: "PEMBAHASAN SOAL BAHASA INGGRIS KELAS 5 SD : GIVING DIRECTIONS",
    url: "https://www.youtube.com/watch?v=lnHPEdUuPF8",
    channel: "Adis Kinanthi",
    topic: "Direction",
  },

  // ══════ Reading (1 video — curated 11 Sep 2026) ══════
  {
    title: "Materi : Reading Comprehention || Bahasa Inggris (Kelas 5)",
    url: "https://www.youtube.com/watch?v=GAo-KXU4ecw",
    channel: "SD Al Irsyad BWI",
    topic: "Reading",
  },

  // ══════ Shopping (1 video — curated 11 Sep 2026) ══════
  {
    title: "Kelas 5 Semester 2 Pelajaran Bahasa Inggris “Shopping”",
    url: "https://www.youtube.com/watch?v=JRLPV81bsss",
    channel: "Semangat Pintar",
    topic: "Shopping",
  },

  // ══════ Berpikir Komputasional (3 video — curated 11 Sep 2026) ══════
  {
    title: "Belajar Berpikir Komputasional dengan Seru! | KKA Kelas 5 SD_Suwandinik",
    url: "https://www.youtube.com/watch?v=tAkQc0kDVvI",
    channel: "Andhien Channel",
    topic: "Berpikir Komputasional",
  },
  {
    title: "Materi kelas 5 SD \"Berpikir Komputasional\"",
    url: "https://www.youtube.com/watch?v=STvVOoJW99g",
    channel: "Dipo channel",
    topic: "Berpikir Komputasional",
  },
  {
    title: "Bab 1 Berpikir Komputasional Kelas 5",
    url: "https://www.youtube.com/watch?v=unAV47wT-Xc",
    channel: "Veetha Cantik",
    topic: "Berpikir Komputasional",
  },

  // ══════ Kecerdasan Artifisial (3 video — curated 11 Sep 2026) ══════
  {
    title: "Modul 4A - Pengenalan Kecerdasan Artifisial untuk Anak SD (Video Pembelajaran KKA SD Kelas 5)",
    url: "https://www.youtube.com/watch?v=4KpLBaopTqg",
    channel: "Sakura Edukasi",
    topic: "Kecerdasan Artifisial",
  },
  {
    title: "Modul 4A: Pengenalan Kecerdasan Artifisial untuk Anak (Kurikulum Nasional Koding KA SD Kelas 5)",
    url: "https://www.youtube.com/watch?v=rHW7VSscTFM",
    channel: "Artificial Intelligence Center Indonesia",
    topic: "Kecerdasan Artifisial",
  },
  {
    title: "Modul 3B: Cara Kerja dan Jenis Kecerdasan Artifisial (Kurikulum Nasional Koding KA SD Kelas 5)",
    url: "https://www.youtube.com/watch?v=HcclOCbkIKk",
    channel: "Artificial Intelligence Center Indonesia",
    topic: "Kecerdasan Artifisial",
  },

  // ══════ Proyek Digital (3 video — curated 11 Sep 2026) ══════
  {
    title: "INFORMATIKA Kelas 5: Jejak Digital",
    url: "https://www.youtube.com/watch?v=FCYT9kLAa-U",
    channel: "Mr. Tungkir",
    topic: "Proyek Digital",
  },
  {
    title: "2.1 Teknologi Digital | SD Kelas 5",
    url: "https://www.youtube.com/watch?v=CTAT21sNgB8",
    channel: "Kelas Pak Syam",
    topic: "Proyek Digital",
  },
  {
    title: "Konsep Dasar Teknologi Digital (Koding Kelas 5 SD)",
    url: "https://www.youtube.com/watch?v=XEZ9BsljAH0",
    channel: "aprizadisc",
    topic: "Proyek Digital",
  },

  // ══════ Teknologi Digital (3 video — curated 11 Sep 2026) ══════
  {
    title: "2.1 Teknologi Digital | SD Kelas 5",
    url: "https://www.youtube.com/watch?v=CTAT21sNgB8",
    channel: "Kelas Pak Syam",
    topic: "Teknologi Digital",
  },
  {
    title: "Konsep Dasar Teknologi Digital (Koding Kelas 5 SD)",
    url: "https://www.youtube.com/watch?v=XEZ9BsljAH0",
    channel: "aprizadisc",
    topic: "Teknologi Digital",
  },
  {
    title: "Teknologi - Materi IPAS Kelas 5 Kurikulum Merdeka",
    url: "https://www.youtube.com/watch?v=XovUgev0JHw",
    channel: "Guru Belajar86 Media",
    topic: "Teknologi Digital",
  },

  // ══════ Budaya Daerah (3 video — curated 11 Sep 2026) ══════
  {
    title: "Pendidikan pancasila kelas 5 Bab 3 Keragaman Budaya Indonesia tentang \" Budaya Daerah Indonezia",
    url: "https://www.youtube.com/watch?v=0Ik2fO9u50s",
    channel: "Neni Sumarni",
    topic: "Budaya Daerah",
  },
  {
    title: "Video Pembelajaran Pendidikan Pancasila (Budaya Daerah Indonesia) Kelas 5 SD",
    url: "https://www.youtube.com/watch?v=DBoknmLyVyk",
    channel: "Aila Humeiroh Childa",
    topic: "Budaya Daerah",
  },
  {
    title: "Bahan Ajar Kelas 5 - Pancasila, Keberagaman Budaya",
    url: "https://www.youtube.com/watch?v=82R_H8lbFgw",
    channel: "Nanda Yurani",
    topic: "Budaya Daerah",
  },

  // ══════ Gotong Royong (3 video — curated 11 Sep 2026) ══════
  {
    title: "Gotong Royong dalam Keberagaman di Sekolah  - Pendidikan Pancasila",
    url: "https://www.youtube.com/watch?v=wxuv84jLwko",
    channel: "Channel Edukasi EKSIS",
    topic: "Gotong Royong",
  },
  {
    title: "Gotong Royong - Materi Pendidikan Pancasila Kelas 5 Kurikulum Merdeka",
    url: "https://www.youtube.com/watch?v=Yf0tZ5n9eQk",
    channel: "Guru Belajar86 Media",
    topic: "Gotong Royong",
  },
  {
    title: "Penerapan Gotong Royong di Wilayah Kota - Pendidikan Pancasila Kelas V Semester 1 Kurikulum Merdeka",
    url: "https://www.youtube.com/watch?v=7ovsVdYabt0",
    channel: "Learning vi",
    topic: "Gotong Royong",
  },

  // ══════ NKRI (3 video — curated 11 Sep 2026) ══════
  {
    title: "Mengenal sejarah NKRI kelas 5 SD",
    url: "https://www.youtube.com/watch?v=TmlTmpCr56U",
    channel: "Ni KadekKrisnadewi",
    topic: "NKRI",
  },
  {
    title: "Video Pembelajaran Kewarganegaraan Materi NKRI (Negara Kesatuan Republik Indonesia)",
    url: "https://www.youtube.com/watch?v=pgyx_OtnuEQ",
    channel: "Arkara Edumedia",
    topic: "NKRI",
  },
  {
    title: "Mengenali Sejarah NKRI # Pendidikan Pancasila Kelas 5 Kurikulum Merdeka",
    url: "https://www.youtube.com/watch?v=KEUnyxkqtkQ",
    channel: "Vee Nipong Channel",
    topic: "NKRI",
  },

  // ══════ Norma (3 video — curated 11 Sep 2026) ══════
  {
    title: "Lagu Macam-Macam Norma |Pendidikan Pancasila SD",
    url: "https://www.youtube.com/watch?v=j_ldANEJ624",
    channel: "Markhamah",
    topic: "Norma",
  },
  {
    title: "Rangkuman Materi Macam-Macam Norma | Pendidikan Pancasila Kelas 5",
    url: "https://www.youtube.com/watch?v=Vc6zRll9yhc",
    channel: "Ruang Belajar",
    topic: "Norma",
  },
  {
    title: "Latihan Soal - soal tentang Norma # Kelas 5  Kurikulum Merdeka",
    url: "https://www.youtube.com/watch?v=HruLfGdHozg",
    channel: "Vee Nipong Channel",
    topic: "Norma",
  },

  // ══════ Pancasila (3 video — curated 11 Sep 2026) ══════
  {
    title: "Penerapan Pancasila dalam Kehidupan Sehari-hari - Materi Pendidikan Pancasila Kelas 5",
    url: "https://www.youtube.com/watch?v=ahnB_N7RL6I",
    channel: "Guru Belajar86 Media",
    topic: "Pancasila",
  },
  {
    title: "Rangkuman Materi Pendidikan Pancasila Kelas 5 Bab 1 | Pancasila dalam Kehidupanku",
    url: "https://www.youtube.com/watch?v=dvS8f1jrMK0",
    channel: "Mudah Belajar Official",
    topic: "Pancasila",
  },
  {
    title: "Norma - Materi Pendidikan Pancasila Kelas 5 Kurikulum Merdeka",
    url: "https://www.youtube.com/watch?v=FxxcSHiaq4k",
    channel: "Guru Belajar86 Media",
    topic: "Pancasila",
  },

  // ══════ Aktivitas Air (3 video — curated 11 Sep 2026) ══════
  {
    title: "Pembelajaran Aktivitas Air.  Renang Gaya Dada Kelas 5",
    url: "https://www.youtube.com/watch?v=2B8E-XeJIVE",
    channel: "wildan gufron",
    topic: "Aktivitas Air",
  },
  {
    title: "Aktivitas Bermain Air",
    url: "https://www.youtube.com/watch?v=cqOmcFq0O0E",
    channel: "fokus sindunata",
    topic: "Aktivitas Air",
  },
  {
    title: "AKTIVITAS AIR |MATERI PJOK KELAS 3_ part 1",
    url: "https://www.youtube.com/watch?v=hkm7eF3BwaY",
    channel: "DeKaTe Channel",
    topic: "Aktivitas Air",
  },

  // ══════ Eksplorasi Gerak (3 video — curated 11 Sep 2026) ══════
  {
    title: "Aktivitas Air Apa yang Dilakukan? | Eksplorasi Gerak | PJOK SD",
    url: "https://www.youtube.com/watch?v=ONI5prQK5z8",
    channel: "Bank Soal kejarcita",
    topic: "Eksplorasi Gerak",
  },
  {
    title: "Rangkuman Materi, LKPD & Asesmen Sumatif PJOK Kelas  5 Bab 1 Eksplorasi Gerak  Kurikulum Merdeka",
    url: "https://www.youtube.com/watch?v=bNY9yX7fDHs",
    channel: "Mudah Belajar Official",
    topic: "Eksplorasi Gerak",
  },
  {
    title: "Rangkuman PJOK Kelas 5 Bab 1 Kurikulum Merdeka - Eksplorasi Gerak (Penjelasan Lengkap)",
    url: "https://www.youtube.com/watch?v=Jpq5zH3Pxek",
    channel: "Yandi Syahwendar",
    topic: "Eksplorasi Gerak",
  },

  // ══════ Kebugaran Jasmani (3 video — curated 11 Sep 2026) ══════
  {
    title: "Latihan Kebugaran Jasmani",
    url: "https://www.youtube.com/watch?v=PAjv6nyP-6g",
    channel: "SnR TV",
    topic: "Kebugaran Jasmani",
  },
  {
    title: "Pengertian Kebugaran Jasmani - Materi Pembelajaran PJOK",
    url: "https://www.youtube.com/watch?v=64VcB8X0JNo",
    channel: "Agus Setiawan PJOK",
    topic: "Kebugaran Jasmani",
  },
  {
    title: "AKTIVITAS PEMBELAJARAN JASMANI PJOK KELAS 5 - LATIHAN KEBUGARAN JASMANI - KURIKULUM MERDEKA BELAJAR",
    url: "https://www.youtube.com/watch?v=Y4c30T6EsZM",
    channel: "Yosi Winandar",
    topic: "Kebugaran Jasmani",
  },

  // ══════ Permainan Bola (2 video — curated 11 Sep 2026) ══════
  {
    title: "MATERI PERMAINAN BOLA BESAR - SEPAK BOLA KELAS 5 SD",
    url: "https://www.youtube.com/watch?v=2lDkvzfheKc",
    channel: " Abung Teja",
    topic: "Permainan Bola",
  },
  {
    title: "Materi Permainan Bola Besar dan Permainan Bola Kecil - Materi Pembelajaran PJOK",
    url: "https://www.youtube.com/watch?v=kz4vppJu2XQ",
    channel: "Agus Setiawan PJOK",
    topic: "Permainan Bola",
  },

  // ══════ Permainan Tradisional (2 video — curated 11 Sep 2026) ══════
  {
    title: "Mengenal Permainan Tradisional",
    url: "https://www.youtube.com/watch?v=L2f5bL6gHzI",
    channel: "Mimiow_Tutor",
    topic: "Permainan Tradisional",
  },
  {
    title: "Keseruan Bermain Gobak Sodor | Permainan Tradisional Anak Indonesia | Video Belajar Anak",
    url: "https://www.youtube.com/watch?v=o0tPTGtCbq4",
    channel: "Studycle Kids",
    topic: "Permainan Tradisional",
  },

  // ══════ Culture (4 video — kurasi manual 11 Sep 2026) ══════
  // Topik "Culture" di kurikulum = Fables and Moral Values + Indonesian Folktales.
  // Video dipilih yang eksplisit menyebut folklore/cerita rakyat atau moral value.
  {
    title: "Malin Kundang | Dongeng Bahasa Inggris | Folklore | Cerita Rakyat",
    url: "https://www.youtube.com/watch?v=x40K7rlMHjI",
    channel: "sok English",
    topic: "Culture",
  },
  {
    title: "Legenda Danau Toba Versi Bahasa Inggris - Sub Indo",
    url: "https://www.youtube.com/watch?v=Ax8Lmo-01UE",
    channel: "Story Weaver ZinnQyu",
    topic: "Culture",
  },
  {
    title: "Popular Fable Story Telling: The Lion and the Mouse — Narrative Text & Moral Value",
    url: "https://www.youtube.com/watch?v=9ccJWSsES6Q",
    channel: "Bibi Sugiaswati",
    topic: "Culture",
  },
  {
    title: "Merpati dan Semut | Fable Bahasa Inggris - Sub Indo",
    url: "https://www.youtube.com/watch?v=njaWaFA9TQc",
    channel: "Story Weaver ZinnQyu",
    topic: "Culture",
  },
];

import { YOUTUBE_SMP7 } from "./youtube-smp7";
import { YOUTUBE_SMA11 } from "./youtube-sma11";

const ALL_YOUTUBE = [
  ...YOUTUBE_RECOMMENDATIONS,
  ...YOUTUBE_SMP7,
  ...YOUTUBE_SMA11,
];

export function getYouTubeForTopic(
  _subject: string,
  topic: string,
  gradeLevel?: string,
): YouTubeResource[] {
  // Jika grade diketahui, filter hanya video untuk grade tsb
  const pool = !gradeLevel
    ? ALL_YOUTUBE
    : gradeLevel === "SD_5"
      ? YOUTUBE_RECOMMENDATIONS
      : gradeLevel === "SMP_1"
        ? YOUTUBE_SMP7
        : gradeLevel === "SMA_2"
          ? YOUTUBE_SMA11
          : ALL_YOUTUBE;

  const t = topic.toLowerCase();
  
  // 1) Exact / contains fuzzy match
  let matches = pool.filter(
    (yt) =>
      yt.topic.toLowerCase() === t ||
      t.includes(yt.topic.toLowerCase()) ||
      yt.topic.toLowerCase().includes(t),
  );
  
  // 2) Fallback: token-level matching — split topic into words, find videos whose topic has ≥2 matching words
  if (matches.length === 0) {
    const tokens = t.split(/\s+/).filter(w => w.length > 3);
    matches = pool.filter((yt) => {
      const ytTokens = yt.topic.toLowerCase().split(/\s+/);
      const common = tokens.filter(w => ytTokens.some(ytw => ytw.includes(w) || w.includes(ytw)));
      return common.length >= 2;
    });
  }
  
  // 3) Fallback: subject-level — match by subject keywords in video title
  if (matches.length === 0) {
    const subjLower = _subject.toLowerCase();
    
    // Strategy A: full subject name appears in title (e.g. "bahasa indonesia")
    matches = pool.filter((yt) => {
      const title = yt.title.toLowerCase();
      return title.includes(subjLower);
    });
    
    // Strategy B: ALL significant tokens appear in title
    if (matches.length === 0) {
      const subjTokens = subjLower.split(/\s+/).filter(t => t.length > 2);
      if (subjTokens.length >= 2) {
        matches = pool.filter((yt) => {
          const title = yt.title.toLowerCase();
          return subjTokens.every(t => title.includes(t));
        });
      }
    }
  }
  
  return matches;
}
