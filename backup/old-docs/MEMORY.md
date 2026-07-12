# Memory — AI Private Tutor

## Mindmap
- Premium radial layout (no dagre) — Lucide icons, per-icon CSS animations, 4 directional handles
- 3-level hierarchy: center (pulse glow), branch (solid border, float anim), leaf (solid border)
- Components: ReactFlowMindmap.tsx, CustomNode.tsx, iconMap.ts, animMap.ts, mindmap-template.ts
- Radial layout: `layoutNodes()` in ReactFlowMindmap.tsx — even 360° spread, leaves radiate from branch direction
- `parseMindmapFromMarkdown()` in mindmap-template.ts — parses ## + bullet list → MindmapNode[]

## Quiz Bank
- 1650 total: SD108 (540 Q), SMP99 (495 Q), SMA123 (615 Q)
- Static data files: src/data/quiz-bank-sd5.ts, quiz-bank-smp7.ts, quiz-bank-sma11.ts
- Exam generator: /api/exam + /api/exam/template from weekly timeline

## Curriculum
- SIBI 2026/2027 dari PDF resmi Kemendikdasmen
- Data: curriculum-topics-sd5.ts, smp7.ts, sma11.ts
- PaginatedTable + StudentDetailView

## LLM / Pipeline
- 9Router combo `ai_tutor_agent` at localhost:20128, fallback chain via sumopod → hermes → opencode-go native
- Pipeline trigger: POST /api/students {action, studentId, stages} → streams into BullMQ queues
- Queue auto-fallback: Redis → in-memory if Redis unavailable

## Infrastructure
- Next.js 16.2.10 + Prisma 7 + PostgreSQL (prod) / SQLite (dev)
- VPS: SumoPod ubuntu@43.133.151.242, PM2 app ai-private-tutor
- Caddy reverse-proxy + auto-SSL at senangbelajar.web.id
- Bot: @senangbelajar_bot webhook mode via /api/bot/webhook
