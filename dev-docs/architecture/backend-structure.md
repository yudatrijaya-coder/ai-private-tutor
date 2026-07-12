# Backend Structure

> **Status:** DATA FILE — Update saat ada perubahan struktur backend.

---

## Architecture Pattern

Monolith Next.js 16 dengan **App Router**. Semua backend logic ada di dalam satu project.

## Key Architecture Decisions

1. **API Routes di `src/app/api/`** — file-based routing sesuai konvensi Next.js
2. **Agents di `src/agents/`** — dipisah per agent, masing-masing punya `worker.ts` + `index.ts`
3. **LLM via 9Router** — gateway lokal di port 20128, bukan OpenAI langsung
4. **Queue abstraction** — BullMQ kalau Redis ada, fallback in-memory
5. **Prisma 7** — ORM dengan adapter-a (pg untuk PostgreSQL, default untuk SQLite)

## Backend Layer Diagram

```
src/
├── app/api/*           ← HTTP layer (Next.js API routes)
├── bot/                ← Telegram bot handlers (webhook receiver)
│   ├── handlers/       ← Per-type handlers (message, quiz, vision, register)
│   ├── agent/          ← Tutor agent logic (LLM-driven)
│   └── safety.ts       ← Content safety filter
├── agents/             ← 7 agent workers (queue-driven)
│   ├── {agent}/worker.ts  ← Queue consumer
│   ├── {agent}/index.ts   ← Agent logic
│   └── {agent}/r
├── llm/                ← LLM client abstraction
│   ├── client.ts       ← 9Router OpenAI-compatible client
│   ├── types.ts        ← Type definitions
│   └── prompts.ts      ← System prompts
├── queue/              ← Queue abstraction layer
│   ├── definitions.ts  ← Queue names & types
│   ├── runner.ts       ← BullMQ runner
│   └── local.ts        ← In-memory fallback
└── lib/                ← Shared utilities
    ├── prisma.ts       ← Prisma client singleton
    └── mindmap-template.ts  ← Mindmap parsing utility
```

## Agent Communication

7 agents communicate through **BullMQ queues** (or in-memory fallback):

1. **Guardian** → admits student → triggers **Curriculum**:generate
2. **Curriculum** → drafts topics → triggers **Content**:scrape
3. **Content** → scrapes material → triggers **Curriculum**:review
4. **Curriculum** → reviews content → triggers **Assessment**:generate
5. **Assessment** → generates quizzes → interacts via **Tutor**
6. **Tutor** → chats/quizzes with student → reports to **Guardian**
7. **Scheduler** → daily reminders → independent cron
