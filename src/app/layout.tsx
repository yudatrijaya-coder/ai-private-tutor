import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-st-display" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-st-body" });

export const metadata: Metadata = {
  metadataBase: new URL("https://senangbelajar.web.id"),
  title: {
    default: "Senang Belajar — AI Tutor untuk SD, SMP, SMA",
    template: "%s | Senang Belajar",
  },
  description:
    "AI Tutor pribadi untuk siswa SD, SMP, dan SMA. Kuis interaktif, video penjelasan, peta materi visual, dan laporan mingguan otomatis untuk orang tua via Telegram.",
  applicationName: "Senang Belajar",
  keywords: [
    "AI tutor",
    "les online",
    "belajar online SD",
    "belajar online SMP",
    "belajar online SMA",
    "tutor privat online",
    "kuis interaktif",
    "kurikulum merdeka",
  ],
  authors: [{ name: "Senang Belajar" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://senangbelajar.web.id",
    siteName: "Senang Belajar",
    title: "Senang Belajar — AI Tutor untuk SD, SMP, SMA",
    description:
      "Kakak AI siap bantu anak kapan saja. Kuis interaktif, video penjelasan, dan laporan mingguan untuk orang tua.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Senang Belajar — AI Tutor untuk SD, SMP, SMA",
    description:
      "Kakak AI siap bantu anak kapan saja. Kuis interaktif, video penjelasan, dan laporan mingguan untuk orang tua.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${outfit.variable} ${fredoka.variable} ${nunito.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
