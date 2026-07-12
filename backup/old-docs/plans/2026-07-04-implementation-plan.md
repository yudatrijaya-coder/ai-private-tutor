# Implementation Plan — AI Private Tutor

> 3-phase build. Each phase produces a working, deployable increment.
> `[core]` = backend/agent work. `[ui]` = dashboard work.

---

## Phase 1: Foundation & Superuser Dashboard (Week 1-2)

**Goal:** Scaffold + DB + auth + superuser dashboard functional. No agents yet.
**Deliverable:** Parent bisa login, lihat 3 student card placeholder, lihat agent pipeline skeleton.

### Task Breakdown

| # | Task | Est. | Depends |
|---|------|------|---------|
| 1.1 | Next.js init + TypeScript + Tailwind + App Router structure | 2h | - |
| 1.2 | Prisma schema — all 10 tables (Student, Material, Quiz, Attempt, Progress, Schedule, Session, AgentLog, Intervention, Persona) | 4h | - |
| 1.3 | PostgreSQL + Redis via Docker Compose | 1h | - |
| 1.4 | NextAuth.js — email/password for parent, Telegram OTP flow for student | 3h | 1.1 |
| 1.5 | Layout shell — `(dashboard)` dark theme + `(student)` light theme | 3h | 1.1 |
| 1.6 | **Superuser Dashboard:** Stats bar + student grid cards (hardcoded data) | 4h | 1.5 |
| 1.7 | **Superuser Dashboard:** `/students/[id]` — detail page with mastery chart (mock) | 3h | 1.6 |
| 1.8 | **Superuser Dashboard:** `/agents` — pipeline skeleton (queue UI only, no real queues) | 3h | 1.5 |
| 1.9 | Seed script — 3 dummy students, sample topics, sample quiz | 2h | 1.2 |
| 1.10 | **Verification:** Login → lihat 3 student card → klik detail → lihat agent page | 1h | 1.6-1.9 |

**Total Phase 1:** ~26h (3.5 hari kerja)

### Dependencies Diagram
```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7
                              ↘ 1.8
                       1.9 ↗
```

---

## Phase 2: Student App + Telegram Bot (Week 3-4)

**Goal:** Student bisa login web, lihat materi, kerjain quiz. Telegram bot bisa chat dengan Tutor Agent (tanpa LLM — responden pake template dulu).

### Task Breakdown

| # | Task | Est. | Depends |
|---|------|------|---------|
| 2.1 | **Student App:** Home page — hero CTA, subject buttons, jadwal hari ini | 4h | 1.5 |
| 2.2 | **Student App:** Material page — video embed (YouTube placeholder) + ringkasan | 3h | 2.1 |
| 2.3 | **Student App:** Quiz page — Duolingo-style UI (soal, pilihan, hearts, XP popup, confetti) | 6h | 2.1 |
| 2.4 | **Student App:** Progress page — streak calendar, mastery chart, badges | 5h | 2.1 |
| 2.5 | **Student App:** Karakter selection bottom sheet | 2h | 2.1 |
| 2.6 | Telegraf.js setup — webhook, session state manager per student | 3h | 1.2 |
| 2.7 | **Tutor Agent** — template-based responder (hardcoded replies per keyword) | 4h | 2.6 |
| 2.8 | **Tutor Agent** — session state machine (chat, quiz_active, choosing_topic, vision_answer) | 3h | 2.7 |
| 2.9 | **Tutor Agent** — 3 persona configs (Kak Budi/Dewi/Raka) with different tone | 2h | 2.8 |
| 2.10 | **Tutor Agent** — `/start` → admission check + welcome message + persona intro | 2h | 2.9 |
| 2.11 | **Tutor Agent** — `/quiz` → ambil quiz dari DB → kirim 1 soal per chat | 4h | 2.8 |
| 2.12 | **Tutor Agent** — `/jadwal` → lihat jadwal hari ini + reminder | 2h | 2.11 |
| 2.13 | **Tutor Agent** — vision handler (`message.photo` → placeholder: balas "Kakak lagi liat fotonya ya") | 2h | 2.8 |
| 2.14 | **Tutor Agent** — NLU intent detection (rule-based: keyword match untuk "PR", "ulangan", "susah", etc) | 3h | 2.8 |
| 2.15 | Integration test — web + Telegram cross-flow | 2h | 2.1-2.14 |

**Total Phase 2:** ~45h (5.5 hari kerja)

### Key Design Decisions
- **No LLM yet** — Tutor Agent pake template + rule-based. LLM ditambah Phase 3.
- **Quiz via chat** — ikut spec: 1 soal per chat, session_state tracks progress
- **Vision placeholder** — bot balas "Kakak liat fotonya" tapi belum pake vision LLM

---

## Phase 3: Agent Pipeline + LLM Integration (Week 5-7)

**Goal:** All 7 agents running with BullMQ + LLM. Curriculum auto-generate, Content scrape, Media render pipeline, Assessment auto-grade, Guardian weekly report, Scheduler auto-assign.

### Task Breakdown

| # | Task | Est. | Depends |
|---|------|------|---------|
| **3.1 Queue Infrastructure** | | | |
| 3.1.1 | BullMQ setup — Redis connection + worker factory + queue definitions | 3h | 1.3 |
| 3.1.2 | Job payload types + trace_id generation | 1h | 3.1.1 |
| 3.1.3 | Dead Letter Queue + retry policy | 2h | 3.1.1 |
| 3.1.4 | Queue monitoring API (`/api/queues`) → feed dashboard | 2h | 3.1.1 |
| **3.2 LLM Integration** | | | |
| 3.2.1 | OpenRouter client + model routing by agent type | 3h | - |
| 3.2.2 | Per-agent model config (tutor=gemini-flash, curriculum=deepseek, etc) | 1h | 3.2.1 |
| 3.2.3 | Fallback chain (primary down → secondary) | 2h | 3.2.1 |
| **3.3 Curriculum Agent** | | | |
| 3.3.1 | Admission trigger — search internet → generate topic list → store draft | 4h | 3.1.1 |
| 3.3.2 | Web search + extraction pipeline (Tavily/MCP) for curriculum sources | 3h | 3.3.1 |
| 3.3.3 | Delivery classification (video vs text) per topic | 2h | 3.3.1 |
| 3.3.4 | Verify scraped content → approve/reject | 3h | 3.3.1 |
| **3.4 Content Agent** | | | |
| 3.4.1 | Scrape worker — fetch URL → extract text → save raw_content | 4h | 3.1.1 |
| 3.4.2 | Content filter — domain blocklist + adult content detection | 3h | 3.4.1 |
| 3.4.3 | Rate limiter — domain-aware throttling | 2h | 3.4.1 |
| 3.4.4 | Multi-source fallback (source A fails → source B) | 2h | 3.4.1 |
| **3.5 Media Agent** | | | |
| 3.5.1 | LLM script generation — video script from processed_content + character config | 4h | 3.2.1 |
| 3.5.2 | Edge TTS integration — text-to-speech untuk narasi | 3h | 3.5.1 |
| 3.5.3 | FFmpeg render pipeline — slide images + TTS → MP4 | 6h | 3.5.2 |
| 3.5.4 | YouTube upload — unlisted, madeForKids, thumbnail | 3h | 3.5.3 |
| 3.5.5 | YouTube reference fallback — search + embed fallback | 2h | 3.5.4 |
| **3.6 Assessment Agent** | | | |
| 3.6.1 | Quiz generation from processed_content (5-10 soal) | 4h | 3.2.1 |
| 3.6.2 | Auto-grade answer → score + update weak_areas in DB | 3h | 3.6.1 |
| 3.6.3 | Mastery calculation — weighted by attempt count + recency | 2h | 3.6.2 |
| 3.6.4 | Exam generation — 20-30 soal, timed, mixed topics | 3h | 3.6.1 |
| **3.7 Guardian Agent** | | | |
| 3.7.1 | Weekly report generator — mastery trend, weak areas, interventions | 4h | 3.6.3 |
| 3.7.2 | Early warning system — missed sessions, score drop, mastery stuck | 3h | 3.7.1 |
| 3.7.3 | Emergency escalation — self-harm/bullying → Telegram notif to parent | 2h | 3.7.1 |
| 3.7.4 | Intervention tracking — create, update, resolve | 2h | 3.6.3 |
| **3.8 Scheduler Agent** | | | |
| 3.8.1 | Topic assignment algorithm — curriculum priority + weak areas mix | 4h | 3.3.1 |
| 3.8.2 | Daily schedule generation + intensive slot management | 2h | 3.8.1 |
| 3.8.3 | Reminder cron — H-1, 30min before, 5min missed | 2h | 3.8.1 |
| 3.8.4 | Reschedule logic — student request, veto rules | 3h | 3.8.1 |
| **3.9 Tutor Agent Upgrade** | | | |
| 3.9.1 | LLM-powered chat — replace template with OpenRouter streaming | 4h | 3.2.1 |
| 3.9.2 | Vision LLM — foto → GPT-4o/Gemini vision → jawab dengan persona | 3h | 3.9.1 |
| 3.9.3 | NLU upgrade — LLM-based intent detection (bukan rule keyword) | 2h | 3.9.1 |
| 3.9.4 | All commands → LLM-driven (quiz, jadwal, nilai via natural language) | 3h | 3.9.1 |
| **3.10 UI Integration** | | | |
| 3.10.1 | Agent pipeline dashboard — live queue data (not mock) | 3h | 3.1.4 |
| 3.10.2 | Student mastery chart — live from DB | 2h | 3.6.3 |
| 3.10.3 | Guardian report view — in student detail drawer | 2h | 3.7.1 |
| 3.10.4 | Intervention display — active + resolved, with status badges | 2h | 3.7.4 |
| 3.10.5 | Schedule display — in student dashboard, from real scheduler | 2h | 3.8.2 |
| **3.11 Rules Implementation** | | | |
| 3.11.1 | Tutor content filter — sensitive topic detection + alihkan | 2h | 3.9.1 |
| 3.11.2 | Output safety scan — before sending to Telegram | 2h | 3.11.1 |
| 3.11.3 | Session time limits enforcement | 1h | 3.11.1 |
| 3.11.4 | Emergency detection — self-harm keyword → Guardian alert | 2h | 3.11.1 |
| 3.11.5 | All other rules from `docs/rules/*.md` | 4h | - |

**Total Phase 3:** ~130h (16 hari kerja)

---

## Phase 4: Polish & VPS Deploy (Week 8)

| # | Task | Est. |
|---|------|------|
| 4.1 | Error monitoring + logging (Sentry / custom logger) | 3h |
| 4.2 | Responsive mobile — test all pages on phone | 4h |
| 4.3 | Loading states + error boundaries — all pages | 3h |
| 4.4 | VPS setup — Docker Compose + reverse proxy (Caddy/Nginx) + SSL | 4h |
| 4.5 | Environment migration — .env.production, secrets | 1h |
| 4.6 | Backup strategy — DB dump + Redis RDB | 2h |
| 4.7 | **Dry run** — admit student, belajar 1 week, iterate | 8h |
| 4.8 | Bug fixes from dry run | 8h |

**Total Phase 4:** ~33h (4 hari kerja)

---

## Summary

| Phase | Duration | Hours | Deliverable |
|-------|----------|-------|-------------|
| **1** Foundation + Dashboard | Week 1-2 | 26h | Parent login, student cards, agent pipeline skeleton |
| **2** Student App + Telegram | Week 3-4 | 45h | Student web + bot chat (template-based) |
| **3** Agent Pipeline + LLM | Week 5-7 | 130h | All 7 agents + LLM + full integration |
| **4** Polish + Deploy | Week 8 | 33h | Production-ready VPS |
| **Total** | **8 weeks** | **234h** | |

**Potensi parallel:**
- Phase 2 & Phase 3.1 (queue infra) bisa jalan bareng — beda orang atau gantian
- Tiap agent di Phase 3 independen — bisa dibangun parallel (max 2-3 concurrent)
- UI integration (3.10) bisa mulai sebelum semua agent selesai

**Estimasi real:** 8 minggu (jika kerja full-time) atau 12-14 minggu (jika sambilan).

---

## First Step — Phase 1 Kickoff

Setuju mulai? Detail task pertama:

```
1.1 — npx create-next-app ai-private-tutor --typescript --tailwind --app
      Install: prisma, next-auth, @prisma/client, tailwind-merge, framer-motion
1.2 — Define Prisma schema (10 tables)
1.3 — docker-compose.yml (postgres:16 + redis:7)
```

Langsung execute?
