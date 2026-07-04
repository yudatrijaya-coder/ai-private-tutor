import type { Metadata } from "next";
import { Inter, Outfit, Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-st-display" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-st-body" });

export const metadata: Metadata = {
  title: "AI Private Tutor",
  description: "Belajar seru bareng Kak Budi, Kak Dewi, dan Kak Raka",
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
