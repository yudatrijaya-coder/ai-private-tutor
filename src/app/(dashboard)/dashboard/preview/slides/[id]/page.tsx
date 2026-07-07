"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const SUBJECT_THEMES: Record<string, { primary: string; gradient: string; accent: string; emoji: string }> = {
  IPA:        { primary: "#059669", gradient: "linear-gradient(135deg, #064e3b, #059669)", accent: "#34d399", emoji: "🔬" },
  Matematika: { primary: "#6366f1", gradient: "linear-gradient(135deg, #312e81, #6366f1)", accent: "#a5b4fc", emoji: "🔢" },
  "Bahasa Indonesia": { primary: "#d97706", gradient: "linear-gradient(135deg, #78350f, #d97706)", accent: "#fbbf24", emoji: "📖" },
  Inggris:    { primary: "#db2777", gradient: "linear-gradient(135deg, #831843, #db2777)", accent: "#f9a8d4", emoji: "🌍" },
  IPS:        { primary: "#0891b2", gradient: "linear-gradient(135deg, #164e63, #0891b2)", accent: "#67e8f9", emoji: "🌏" },
  PPKn:       { primary: "#dc2626", gradient: "linear-gradient(135deg, #7f1d1d, #dc2626)", accent: "#fca5a5", emoji: "🤝" },
  PJOK:       { primary: "#ea580c", gradient: "linear-gradient(135deg, #7c2d12, #ea580c)", accent: "#fdba74", emoji: "🏃" },
  Seni:       { primary: "#c026d3", gradient: "linear-gradient(135deg, #701a75, #c026d3)", accent: "#f0abfc", emoji: "🎨" },
};

function getTheme(subject: string) {
  return SUBJECT_THEMES[subject] || { primary: "#6366f1", gradient: "linear-gradient(135deg, #1e1b4b, #4338ca)", accent: "#a5b4fc", emoji: "📚" };
}

export default function SlideViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [slides, setSlides] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("IPA");
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    fetch(`/api/students/material/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.slides) {
          const parts = data.slides.split("\n---\n").map((s: string) => s.trim());
          setSlides(parts);
          setTitle(data.topic || "Materi");
          setSubject(data.subject || "IPA");
          setAudioUrl(data.audioUrl || null);
          setVideoUrl(data.videoUrl || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // ...

  const renderVideoFile = useCallback(async () => {
    setRendering(true);
    try {
      const res = await fetch("/api/media/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: id, slides }),
      });
      const data = await res.json();
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setShowVideo(true);
      }
    } catch {}
    setRendering(false);
  }, [id, slides]);

  const togglePlay = useCallback(() => {
    if (!audioUrl) return;
    if (audio && playing) {
      audio.pause();
      setPlaying(false);
    } else if (audio) {
      audio.play();
      setPlaying(true);
    } else {
      const a = new Audio(audioUrl);
      a.onended = () => setPlaying(false);
      a.play();
      setAudio(a);
      setPlaying(true);
    }
  }, [audioUrl, audio, playing]);

  const generateAudio = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/media/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: id }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
      }
    } catch {}
    setGenerating(false);
  }, [id]);

  const goNext = useCallback(() => {
    setDirection("right");
    setCurrent((p) => Math.min(slides.length - 1, p + 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setDirection("left");
    setCurrent((p) => Math.max(0, p - 1));
  }, []);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
      <div className="text-center text-white/60 text-lg animate-pulse">Memuat slide...</div>
    </div>
  );

  if (slides.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
      <div className="text-center">
        <div className="text-7xl mb-4">📄</div>
        <h1 className="text-2xl font-bold text-white mb-2">Belum Ada Slide</h1>
        <p className="text-white/50 mb-6">Materi ini belum memiliki slide presentasi.</p>
        <Link href="/dashboard/curriculum" className="px-6 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: "var(--su-primary)" }}>
          Ke Kurikulum →
        </Link>
      </div>
    </div>
  );

  const theme = getTheme(subject);
  const slide = slides[current];
  const slideTitle = slide.match(/^##?\s+(.+)/m)?.[1] || `Slide ${current + 1}`;

  // Extract emoji from slide
  const slideEmoji = slide.match(/[\u{1F300}-\u{1FAFF}]/u)?.[0] || theme.emoji;

  // Convert markdown to HTML
  const html = slide
    .replace(/^##\s+(.+)/gm, "")
    .replace(/^#\s+(.+)/gm, "")
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:white">$1</strong>')
    .replace(/\n- (.+)/g, '<div class="flex items-start gap-3 mb-2"><span class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style="background:' + theme.accent + '"></span><span>$1</span></div>')
    .replace(/\n---\n?/g, "")
    .replace(/\n\n/g, '<div class="h-4"></div>')
    .replace(/\n/g, '<br/>');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.gradient }}>
      {/* Top bar */}
      <div className="px-6 py-3 flex items-center justify-between" style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.3)" }}>
        <Link href="/dashboard" className="text-white/70 hover:text-white text-sm transition-colors">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs">{subject}</span>
          <span className="text-white/40">•</span>
          <span className="text-white/70 text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Audio button */}
          {audioUrl ? (
            <button
              onClick={togglePlay}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 flex items-center gap-1.5"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white" }}
            >
              {playing ? "⏸ Pause" : "▶ Putar Suara"}
            </button>
          ) : (
            <button
              onClick={generateAudio}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >
              {generating ? "⏳ Generate..." : "🎤 Buat Suara"}
            </button>
          )}
          {videoUrl ? (
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 flex items-center gap-1.5"
              style={{ backgroundColor: showVideo ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.15)", color: "white" }}
            >
              {showVideo ? "✕ Tutup Video" : "🎬 Tonton Video"}
            </button>
          ) : (
            <button
              onClick={renderVideoFile}
              disabled={rendering}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >
              {rendering ? "⏳ Render..." : "🎬 Buat Video"}
            </button>
          )}
          <span className="text-white/40 text-xs">{current + 1}/{slides.length}</span>
        </div>
      </div>

      {/* Slide area */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-10" style={{ background: theme.accent }} />
        <div className="absolute bottom-20 left-20 w-48 h-48 rounded-full opacity-10" style={{ background: theme.accent }} />

        {/* Side arrows for desktop */}
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl transition-all hover:scale-110 disabled:opacity-0 disabled:pointer-events-none"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
        >
          ◀
        </button>

        <button
          onClick={goNext}
          disabled={current === slides.length - 1}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white text-xl transition-all hover:scale-110 disabled:opacity-0 disabled:pointer-events-none"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
        >
          ▶
        </button>

        {/* Slide card or Video player */}
        {showVideo && videoUrl ? (
          <div className="relative max-w-4xl w-full rounded-3xl overflow-hidden" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <video
              controls
              autoPlay
              className="w-full"
              style={{ maxHeight: "70vh" }}
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
          </div>
        ) : (
        <div
          className="relative max-w-4xl w-full rounded-3xl p-8 md:p-16 min-h-[450px] flex flex-col items-center justify-center text-center transition-all duration-500"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            transform: `translateX(0)`,
            opacity: 1,
          }}
          key={current}
        >
          {/* Emoji */}
          <div className="text-6xl mb-6 animate-bounce" style={{ animationDuration: "2s" }}>
            {slideEmoji}
          </div>

          {/* Title */}
          <h2
            className="text-2xl md:text-3xl font-bold mb-6 text-white"
            style={{ fontFamily: "'Fredoka', sans-serif", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
          >
            {slideTitle}
          </h2>

          {/* Content */}
          <div
            className="text-base md:text-lg leading-relaxed max-w-2xl"
            style={{ color: "rgba(255,255,255,0.9)" }}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Page indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? "right" : "left"); setCurrent(i); }}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === current ? 24 : 8,
                  height: 8,
                  backgroundColor: i === current ? theme.accent : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        </div>
        )}
      </main>

      {/* Bottom controls */}
      <div className="px-6 py-4 flex items-center justify-center gap-6" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white", backdropFilter: "blur(8px)" }}
        >
          ◀ Sebelumnya
        </button>

        <span className="text-white/50 text-xs">
          Gunakan ← → panah keyboard
        </span>

        <button
          onClick={goNext}
          disabled={current === slides.length - 1}
          className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
          style={{ backgroundColor: theme.primary, color: "white" }}
        >
          Selanjutnya ▶
        </button>
      </div>
    </div>
  );
}
