import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });

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
    <html lang="id" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
