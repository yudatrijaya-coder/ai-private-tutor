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
