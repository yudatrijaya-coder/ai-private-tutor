# Handoff — AI Private Tutor

> Terakhir update: 13 Juli 2026

---

## Current State Overview

| Area | Status | Detail |
|------|--------|--------|
| **Mindmap** | ✅ Premium — radial layout, Lucide icons, CSS animations | 7 iterasi berturut-turut |
| **Quiz Bank** | ✅ Complete — 1650 soal (SD108, SMP99, SMA123) | Auto-generated via 9Router LLM |
| **Curriculum** | ✅ SIBI 2026/2027 — SD5, SMP1, SMA2 | Dari PDF resmi Kemendikdasmen |
| **Exam Generator** | ✅ Auto-generate from weekly timeline | Template + detail page + seed |
| **Pipeline Trigger** | ✅ Dashboard UI — curriculum/content/quiz/jadwal | BullMQ + in-memory fallback |
| **LLM** | ✅ 9Router combo `ai_tutor_agent` + fallback chain | localhost:20128 |
| **Database** | ✅ PostgreSQL (prod) / SQLite (dev) | Prisma 7 with `prisma.config.ts` |
| **Deployment** | ✅ PM2 + Caddy + auto-SSL | senangbelajar.web.id |
| **Bot** | ✅ Webhook mode @senangbelajar_bot | Next.js API route `/api/bot/webhook` |

---

## What Was Done Recently (last 15 commits)

### 🧠 Mindmap (7 commits — iterative refinement)
- **Radial quadrant layout** — no dagre, branches evenly spaced 360°, leaves radiate outward
- **Lucide icons** per node with `iconMap.ts` + CSS animation personality per-icon (`animMap.ts`)
- **4 directional handles** per node — computed per-edge via `angleDir()` function
- **3-level hierarchy**: center (gold glow + pulse), branch (solid border), leaf (solid border, thinner)
- **CustomNode.tsx** — image/icon/description slots, SD/SMP/SMA theming, pastel blob backgrounds
- **`src/lib/mindmap-template.ts`** — reusable parseMindmapFromMarkdown + createMindmapNodes utility
- **Files:**
  - `src/app/(student)/student/mindmap/[subject]/ReactFlowMindmap.tsx`
  - `src/app/(student)/student/mindmap/[subject]/page.tsx`
  - `src/components/mindmap/CustomNode.tsx`
  - `src/components/mindmap/iconMap.ts`
  - `src/components/mindmap/animMap.ts`
  - `src/lib/mindmap-template.ts`

### 📝 Quiz Bank & Exam Generator (3 commits)
- **1650 soal** — SD108 (540 Q), SMP99 (495 Q), SMA123 (615 Q)
- Quiz bank data files: `src/data/quiz-bank-sd5.ts`, `quiz-bank-smp7.ts`, `quiz-bank-sma11.ts`
- Auto-generated via `scripts/gen-all-quizzes.ts` using 9Router LLM
- Exam template: auto-generator by weekly timeline at `/dashboard/quizzes/exam/template`
- Quiz detail page at `/dashboard/quizzes/[id]`
- Seed backup via Telegram

### 🧠 Batch Mindmap Generation (13 Jul 2026)
- **330/330 materials** now have `metadata.mindmap` — parsed from existing slides
- **2,414 leaf nodes** across all 3 students
- New endpoint `POST /api/curriculum/batch-mindmap` — parses slides markdown into mindmap node data
- Parser handles 3 slide formats: `## headers`, `- bullets`, `• bullets`, and `1. numbered lists`
- Files:
  - `src/app/api/curriculum/batch-mindmap/route.ts` — new batch generation endpoint

### 📥 Exam Template Generation (13 Jul 2026)
- **92 exams generated** — 30 Syifa, 28 Raihan, 34 SHOFI
- Auto-grouped per 4-week period, balanced difficulty (40/40/20)
- Existing `POST /api/exam/template` endpoint, now populated for all 3 students

### 📚 SIBI PDF & YouTube (13 Jul 2026)
- **PDF Lengkap** — 23 PDF Kurikulum Merdeka: SD5 (6 mapel, 102MB), SMP1 (8 mapel, 170MB), SMA2 (9 mapel, 99MB)
- Fix 2 corrupt SMP PDF + tambah Bahasa Inggris SMP
- **YouTube Links**: SD 28 video, SMP 91 video, SMA 113 video — semua terverifikasi via oEmbed API
  - `src/data/youtube-smp7.ts`, `src/data/youtube-sma11.ts`
  - `getYouTubeForTopic()` now supports grade-level filtering
- **Mindmap Page Fix** — prioritaskan `metadata.mindmap`, fallback ke slide parsing (flat bullets handled)

### 📚 Curriculum SIBI 2026/2027 (3 commits)
- Full curriculum from official Kemendikdasmen PDFs
- Data files: `src/data/curriculum-topics-sd5.ts`, `curriculum-topics-smp7.ts`, `curriculum-topics-sma11.ts`
- Features: PaginatedTable, StudentDetailView, curriculum per student

### 🚀 Agent Pipeline (1 commit)
- `PipelineTrigger.tsx` component in `/dashboard/agents`
- Stages: curriculum → content → assessment → schedule
- POST `/api/students` with `{action:"trigger", studentId, stages}`
- Supports BullMQ (Redis) and in-memory fallback

### 🏗 Infrastructure
- **LLM:** 9Router combo `ai_tutor_agent` at `localhost:20128` with fallback chain (sumopod → hermes → opencode-go native)
- **Prisma 7** with `prisma.config.ts` and `@prisma/adapter-pg`
- **PostgreSQL** at `localhost:5432`, db=`ai_private_tutor`, user=`tutor`
- **Next.js 16.2.10** — App Router
- **VPS:** SumoPod ubuntu@43.133.151.242

---

## Key Files

### Mindmap
| File | Purpose |
|------|---------|
| `src/app/(student)/student/mindmap/[subject]/ReactFlowMindmap.tsx` | Main component — radial layout, edges, directional handles |
| `src/app/(student)/student/mindmap/[subject]/page.tsx` | Page wrapper — parses slide markdown → mindmap nodes |
| `src/components/mindmap/CustomNode.tsx` | Node component — Lucide icons, 3-level theming, CSS animations |
| `src/components/mindmap/iconMap.ts` | Topic → Lucide icon resolution |
| `src/components/mindmap/animMap.ts` | Per-icon CSS animation definitions |
| `src/lib/mindmap-template.ts` | parseMindmapFromMarkdown + createMindmapNodes utilities |

### Quiz, Curriculum & YouTube
| File | Purpose |
|------|---------|
| `src/data/quiz-bank-sd5.ts` | SD Kelas 5 — 540 soal |
| `src/data/quiz-bank-smp7.ts` | SMP Kelas 1 — 495 soal |
| `src/data/quiz-bank-sma11.ts` | SMA Kelas 2 — 615 soal |
| `src/data/curriculum-topics-sd5.ts` | Kurikulum SD5 dari PDF resmi |
| `src/data/curriculum-topics-smp7.ts` | Kurikulum SMP1 dari SIBI |
| `src/data/curriculum-topics-sma11.ts` | Kurikulum SMA2 dari SIBI |
| `src/data/youtube.ts` | YouTube links SD5 (28 video) + getYouTubeForTopic pool |
| `src/data/youtube-smp7.ts` | YouTube links SMP1 (91 video) |
| `src/data/youtube-sma11.ts` | YouTube links SMA2 (113 video) |
| `src/app/api/exam/route.ts` | Exam generation endpoint |
| `src/app/api/exam/template/route.ts` | Template-based exam generator |

### Pipeline & LLM
| File | Purpose |
|------|---------|
| `src/app/(dashboard)/dashboard/agents/PipelineTrigger.tsx` | UI trigger for agent pipeline |
| `src/app/api/students/route.ts` | POST with `{action:"trigger", studentId, stages}` |
| `src/llm/client.ts` | 9Router LLM client with fallback chain |
| `src/queue/definitions.ts` | BullMQ queue definitions |
| `src/queue/runner.ts` | Queue runner with Redis / in-memory |

### Infrastructure
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | 14 models — Student, Curriculum, Quiz, Attempt, etc. |
| `prisma.config.ts` | Prisma 7 config (datasource URL) |
| `src/lib/prisma.ts` | Prisma client singleton with `@prisma/adapter-pg` |
| `ops/Caddyfile` | Reverse proxy config for senangbelajar.web.id |
| `ecosystem.config.cjs` | PM2 ecosystem file |

---

## Tips for Next Agent

1. **Mindmap** — sudah premium. Kalau mau tweak layout, edit `layoutNodes()` di `ReactFlowMindmap.tsx`. Jangan ganti pendekatan radial.
2. **Quiz bank** — data statis di `src/data/`. Kalau perlu regenerate, pakai `scripts/gen-all-quizzes.ts`.
3. **LLM** — semua call via 9Router `localhost:20128`. Fallback chain otomatis. Jangan panggil OpenAI langsung.
4. **User** — kid-friendly, paper-toned, marker style. Premium-first approach.
5. **VPS** — `ssh ubuntu@43.133.151.242`, PM2 app name `ai-private-tutor`.
