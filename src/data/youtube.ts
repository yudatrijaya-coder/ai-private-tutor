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

  // ══════ MATEMATIKA (1 video) ══════
  {
    title: "Pecahan | Matematika SD",
    url: "https://www.youtube.com/watch?v=0hPRfqPFtt8",
    channel: "kejarcita",
    topic: "Pecahan",
  },

  // ══════ BAHASA INDONESIA (1 video) ══════
  {
    title: "Bahasa Indonesia Kelas 5 - Aku Yang Unik (Bab 1)",
    url: "https://youtu.be/EUoX5UYmvYw",
    channel: "BIMBEL ONLINE",
    topic: "Aku yang Unik",
  },
];

export function getYouTubeForTopic(_subject: string, topic: string): YouTubeResource[] {
  // Fuzzy match: cari video yang topiknya cocok
  const t = topic.toLowerCase();
  return YOUTUBE_RECOMMENDATIONS.filter(
    (yt) =>
      yt.topic.toLowerCase() === t ||
      t.includes(yt.topic.toLowerCase()) ||
      yt.topic.toLowerCase().includes(t),
  );
}
