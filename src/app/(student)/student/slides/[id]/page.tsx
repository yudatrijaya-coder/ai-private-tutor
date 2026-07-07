"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function SlideViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [slides, setSlides] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");

  useEffect(() => {
    fetch(`/api/students/material/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.slides) {
          // Split by --- separator
          const parts = data.slides.split("\n---\n").map((s: string) => s.trim());
          setSlides(parts);
          setTitle(data.topic || "Materi");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Memuat slide...</div>;

  if (slides.length === 0) return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--su-bg)", color: "var(--su-text)" }}>
      <div className="text-center p-8">
        <div className="text-6xl mb-4">📄</div>
        <h1 className="text-xl font-bold mb-2">Belum Ada Slide</h1>
        <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>Materi ini belum memiliki slide presentasi.</p>
      </div>
    </div>
  );

  const slide = slides[current];
  // Extract title from markdown heading
  const slideTitle = slide.match(/^##?\s+(.+)/m)?.[1] || `Slide ${current + 1}`;

  // Convert markdown to simple HTML (bold, lists, emoji)
  const html = slide
    .replace(/^##\s+(.+)/gm, '<h2 class="text-2xl font-bold mb-4" style="color:var(--su-primary)">$1</h2>')
    .replace(/^#\s+(.+)/gm, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\n- (.+)/g, '<li class="ml-4 text-lg">• $1</li>')
    .replace(/\n---\n?/g, "")
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--su-bg)", color: "var(--su-text)" }}>
      {/* Header */}
      <header className="px-6 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--su-border)", backgroundColor: "var(--su-bg-card)" }}>
        <Link href="/student" className="text-sm hover:opacity-70">← Kembali</Link>
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs" style={{ color: "var(--su-text-dim)" }}>
          {current + 1} / {slides.length}
        </span>
      </header>

      {/* Slide */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div
          className="max-w-3xl w-full rounded-2xl p-10 min-h-[400px] flex flex-col justify-center"
          style={{
            backgroundColor: "var(--su-bg-card)",
            border: "1px solid var(--su-border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div className="text-center text-5xl mb-2">
            {slide.match(/🌬️|👃|🎤|🚀|🌿|🌾|🏺|😤|😮|✨/)?.[0] || "📖"}
          </div>
          <div
            className="text-center text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </main>

      {/* Navigation */}
      <footer className="px-6 py-4 flex items-center justify-center gap-4 border-t" style={{ borderColor: "var(--su-border)" }}>
        <button
          onClick={() => setCurrent((p) => Math.max(0, p - 1))}
          disabled={current === 0}
          className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-30 transition-all hover:scale-105"
          style={{ backgroundColor: "var(--su-primary)", color: "#fff" }}
        >
          ◀ Sebelumnya
        </button>
        <span className="text-xs px-4" style={{ color: "var(--su-text-dim)" }}>
          {new Array(slides.length).fill(0).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="inline-block w-2.5 h-2.5 rounded-full mx-1 transition-all"
              style={{ backgroundColor: i === current ? "var(--su-primary)" : "var(--su-border)", opacity: i === current ? 1 : 0.5 }}
            />
          ))}
        </span>
        <button
          onClick={() => setCurrent((p) => Math.min(slides.length - 1, p + 1))}
          disabled={current === slides.length - 1}
          className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-30 transition-all hover:scale-105"
          style={{ backgroundColor: "var(--su-primary)", color: "#fff" }}
        >
          Selanjutnya ▶
        </button>
      </footer>
    </div>
  );
}
