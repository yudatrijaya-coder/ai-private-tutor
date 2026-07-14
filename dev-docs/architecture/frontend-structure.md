# Frontend Structure — Struktur Frontend

> **Status:** DATA FILE — Update saat ada perubahan UI atau komponen.

---

## Framework & Teknologi

| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Next.js | 16 | App Router, Server Components, RSC |
| Tailwind CSS | 4 | Utility-first styling, responsive design |
| React Flow (@xyflow/react) | ~12 | Interactive mindmap |
| Lucide React | ~0.487 | Icons untuk mindmap & UI |
| Telegraf.js | ~4 | Telegram bot (backend — client-side hanya bot link) |

## Route Groups

```
src/app/
├── (auth)/                       ← Halaman login
│   ├── login/
│   │   └── page.tsx              → Login admin/parent
│   └── login/student/
│       └── page.tsx              → Login student (password)
│
├── (dashboard)/                  ← Admin & Parent Dashboard
│   └── dashboard/
│       ├── page.tsx              → Dashboard home (StatsBar, overview)
│       ├── layout.tsx            → Dashboard layout + sidebar
│       ├── agents/
│       │   ├── page.tsx          → Agent pipeline trigger + monitor
│       │   ├── PipelineTrigger.tsx → Trigger pipeline manual
│       │   ├── AgentPipelineView.tsx → Pipeline visualization
│       │   └── QueueMonitor.tsx  → BullMQ queue status
│       ├── curriculum/
│       │   ├── page.tsx          → SIBI curriculum viewer
│       │   └── PaginatedTable.tsx → Table with pagination
│       ├── quizzes/
│       │   ├── page.tsx          → Quiz management
│       │   ├── [id]/
│       │   │   └── page.tsx      → Quiz detail
│       │   └── exam/
│       │       ├── new/
│       │       │   └── page.tsx  → Create exam from template
│       │       └── template/
│       │           └── page.tsx  → Exam template generator
│       ├── students/
│       │   ├── page.tsx          → Student list + cards
│       │   ├── new/
│       │   │   └── page.tsx      → Add student
│       │   ├── [id]/
│       │   │   ├── page.tsx      → Student detail + profile
│       │   │   ├── chat/
│       │   │   │   └── page.tsx  → Chat history viewer
│       │   │   └── StudentDetailView.tsx → Detail component
│       │   └── StudentCard.tsx   → Student card component
│       ├── preview/
│       │   └── slides/[id]/
│       │       └── page.tsx      → Slide preview
│       ├── settings/
│       │   ├── page.tsx          → Settings page
│       │   └── api-usage/
│       │       ├── page.tsx      → API usage dashboard
│       │       └── UsageView.tsx → Usage visualization
│       └── StatsBar.tsx          → Stats overview bar
│
├── (student)/                    ← Student Portal
│   └── student/
│       ├── page.tsx              → Student home/dashboard
│       ├── layout.tsx            → Student layout + header
│       ├── mindmap/[subject]/
│       │   ├── page.tsx          → Parse markdown → mindmap nodes
│       │   └── ReactFlowMindmap.tsx → Main mindmap component
│       ├── slides/[id]/
│       │   └── page.tsx          → Slide viewer
│       ├── subject/[subject]/
│       │   └── page.tsx          → Subject home page
│       ├── topic-tree/[subject]/
│       │   └── page.tsx          → Topic tree navigation
│       ├── quiz/
│       │   └── page.tsx          → Quiz view
│       ├── progress/
│       │   └── page.tsx          → Progress tracking
│       ├── profile/
│       │   └── page.tsx          → Student profile
│       ├── password/
│       │   └── page.tsx          → Change password
│       └── profile-link/
│           └── page.tsx          → Share profile link
│
├── docs/                         ← Dokumentasi Web
│   ├── page.tsx                  → Docs homepage
│   ├── architecture/
│   │   └── page.tsx              → Architecture deep dive
│   ├── mindmap/
│   │   └── page.tsx              → Mindmap guide
│   ├── map/
│   │   └── page.tsx              → Interactive functional map
│   └── getting-started/
│       └── page.tsx              → Setup & installation guide
│
├── layout.tsx                    → Root layout (fonts, metadata)
├── page.tsx                      → Landing page
├── error.tsx                     → Global error boundary
└── not-found.tsx                 → 404 page
```

## Shared Components

```
src/components/
├── mindmap/
│   ├── CustomNode.tsx       ← Node render: icons, theme, animations
│   ├── iconMap.ts           ← Topic name → Lucide icon resolver
│   └── animMap.ts           ← Per-icon CSS animation definitions
├── Skeleton.tsx             ← Loading skeleton
└── ErrorBoundary.tsx        ← Error boundary wrapper
```

## UI Design Tokens

| Token | Value |
|-------|-------|
| Theme | Paper-toned, warm (amber-50, amber-900) |
| Backgrounds | Gradient `#fef9ef` → `#fdf2e9` |
| Mindmap BG | Pastel blobs (SVG radial gradients) |
| Fonts | Fredoka One (headings), Nunito (body) |
| Style | Kid-friendly, playful, glassmorphism |
| SD Theme | Extra rounded, playful shadows, large font |
| SMP Theme | Medium rounded, balanced shadows |
| SMA Theme | Minimal rounded, professional, tighter spacing |

## Catatan Penting

1. **Server Components by default** — Gunakan `'use client'` hanya jika perlu interaktivitas (state, effects, event handlers)
2. **Mindmap adalah komponen paling kompleks** — Menggunakan React Flow dengan custom node yang punya 3 level (center, branch, leaf)
3. **Dashboard admin vs student dipisah via route groups** — `(dashboard)` dan `(student)` punya layout masing-masing
4. **Middleware auth** — `src/middleware.ts` menangani proteksi route student & dashboard
