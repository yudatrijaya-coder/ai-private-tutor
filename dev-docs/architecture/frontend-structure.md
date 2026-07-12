# Frontend Structure

> **Status:** DATA FILE — Update saat ada perubahan UI.

---

## Framework

- **Next.js 16** — App Router dengan Server Components
- **Tailwind CSS 4** — Utility-first styling
- **React Flow (@xyflow/react)** — Interactive mindmap
- **Lucide React** — Icons
- **Telegraf.js** — Telegram bot integration (backend)

## Route Groups

```
src/app/
├── (auth)/             ← Login pages
│   ├── login/student/
│   └── login/
├── (dashboard)/        ← Admin dashboard (parent/admin)
│   └── dashboard/
│       ├── agents/         → Agent pipeline trigger
│       ├── curriculum/     → SIBI curriculum viewer
│       ├── quizzes/        → Quiz management, exam generator
│       ├── students/       → Student profiles, detail, chat
│       ├── preview/slides/ → Slide preview
│       ├── settings/       → Settings, API usage
│       └── page.tsx        → Dashboard home
├── (student)/          ← Student portal
│   └── student/
│       ├── mindmap/[subject]/ → Interactive mindmap
│       ├── slides/[id]/      → Slide viewer
│       ├── subject/[subject]/ → Subject home
│       ├── topic-tree/[subject]/ → Topic navigation
│       ├── quiz/             → Quiz view
│       ├── progress/         → Progress tracking
│       └── profile/          → Student profile
└── docs/               ← Documentation pages
    ├── architecture/        → Architecture docs
    ├── mindmap/             → Mindmap guide
    ├── map/                 → Functional app map (interactive)
    └── getting-started/     → Setup guide
```

## Components

```
src/components/
├── mindmap/
│   ├── CustomNode.tsx     ← Mindmap node (icons, themes, animations)
│   ├── iconMap.ts         ← Topic → Lucide icon mapping
│   └── animMap.ts         ← Per-icon CSS animation definitions
├── ui/ (Tailwind primitives)
```

## UI Design Tokens

| Token | Value |
|-------|-------|
| Primary | Paper-toned, warm (amber-50, amber-900) |
| Backgrounds | Gradient from #fef9ef → #fdf2e9 |
| Mindmap BG | Pastel blobs (SVG radial gradients) |
| Fonts | Fredoka One (headings), Nunito (body) |
| Style | Kid-friendly, playful, glassmorphism |
