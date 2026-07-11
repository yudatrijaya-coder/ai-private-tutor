"use client";

import { Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createMindmapNodes } from "@/lib/mindmap-template";

const ReactFlowMindmap = dynamic(
  () => import("@/app/(student)/student/mindmap/[subject]/ReactFlowMindmap").then((m) => ({ default: m.ReactFlowMindmap })),
  { ssr: false },
);

const centerTitle = "AI Private Tutor";

const rawNodes = createMindmapNodes(centerTitle, [
  {
    label: "Frontend",
    children: [
      "Next.js 16 App Router + Tailwind CSS 4",
      "Student Dashboard — belajar & progress",
      "Admin Dashboard — agents, quizzes, curriculum",
      "Docs Pages — architecture, mindmap, getting started",
    ],
  },
  {
    label: "7 AI Agents",
    children: [
      "Tutor Agent — chat/quiz/vision via Telegram",
      "Curriculum Agent — SIBI kurikulum per student",
      "Content Agent — scrape materi dari internet",
      "Assessment Agent — generate & koreksi quiz",
      "Media Agent — video pembelajaran karakter",
      "Guardian Agent — admission & weekly report",
      "Scheduler Agent — jadwal harian & reminder",
    ],
  },
  {
    label: "Mindmap Fitur",
    children: [
      "Radial quadrant layout — 360° spacing no dagre",
      "Lucide Icons — auto-resolve per topik",
      "Per-Node CSS Animations — float/wiggle/spin",
      "Custom Nodes — 3-level (center/branch/leaf)",
    ],
  },
  {
    label: "Quiz & Kurikulum",
    children: [
      "1650 Soal — SD108 (540) SMP99 (495) SMA123 (615)",
      "SIBI 2026/2027 — kurikulum resmi Kemendikdasmen",
      "Exam Auto-Generator — dari weekly timeline",
      "Quiz Detail & Seed Backup via Telegram",
    ],
  },
  {
    label: "LLM & Pipeline",
    children: [
      "9Router Gateway — combo ai_tutor_agent",
      "Fallback Chain — 9Router ke SumoPod ke Hermes",
      "Pipeline Trigger — curriculum/content/quiz/jadwal",
      "BullMQ + In-Memory fallback queue",
    ],
  },
  {
    label: "Telegram Bot",
    children: [
      "Webhook Mode — /api/bot/webhook",
      "3 Persona — Kak Budi (SD), Dewi (SMP), Raka (SMA)",
      "Vision Handler — foto soal via AI",
      "Safety System — filter & guardian monitoring",
    ],
  },
  {
    label: "Infrastruktur",
    children: [
      "VPS SumoPod — ubuntu@43.133.151.242",
      "PM2 + Caddy — auto-SSL senangbelajar.web.id",
      "PostgreSQL (prod) / SQLite (dev) via Prisma 7",
      "Next.js 16.2.10 — minimal bundle, maksimal performa",
    ],
  },
  {
    label: "File Structure",
    children: [
      "src/app/ — App Router pages & API routes",
      "src/components/ — UI & mindmap components",
      "src/lib/ — utilities (mindmap-template, prisma)",
      "src/agents/ — 7 agent logic worker",
      "src/data/ — quiz bank & curriculum data",
      "docs/ — offline documentation",
    ],
  },
]);

export default function AppMapPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fef9ef, #fdf2e9, #fef7e6)" }}>
      <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-amber-200/50 bg-white/60 backdrop-blur-sm z-10">
        <Link href="/docs" className="text-sm text-amber-700 hover:text-amber-900 transition-colors">
          &larr; Kembali ke Docs
        </Link>
        <h1
          className="text-lg font-bold text-amber-900 truncate mx-2"
          style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}
        >
          Peta Fungsional App
        </h1>
        <div className="text-xs text-amber-400 hidden sm:block">interaktif &mdash; scroll, zoom, drag</div>
      </div>

      <div className="flex-1 min-h-0">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-amber-400 text-sm">
              <span className="animate-bounce text-4xl mr-3"></span> Memuat peta konsep...
            </div>
          }
        >
          <ReactFlowMindmap centerTitle={centerTitle} rawNodes={rawNodes} />
        </Suspense>
      </div>

      <div className="px-6 py-3 border-t border-amber-200/50 shrink-0 bg-white/40 z-10">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-amber-600">
          <span><strong>Center</strong> &mdash; Project root</span>
          <span><strong>Branch</strong> &mdash; Fitur utama (8 area)</span>
          <span><strong>Leaf</strong> &mdash; Detail implementasi</span>
          <span>Scroll & zoom &mdash; explore semua area</span>
        </div>
      </div>
    </div>
  );
}
