# AI Private Tutor — Handoff

## Current State (7 Jul 2026)

### Hermes Gateway Setup (VPS)
- Profile **opencode** provider: `opencode-go`, gateway via `systemctl --user hermes-gateway`
- Gateway state: **running** + Telegram **connected**
- SumoPod API key valid

### Dua Bot — JANGAN TERTUKAR

| Bot | Token | Fungsi | Platform |
|-----|-------|--------|----------|
| **@senangbelajar_bot** | 8899613141:*** | Tutor AI Next.js (webhook/polling) | tutor app port 3000 |
| **@hermes_senangbelajar_bot** | 8912247323:*** | Hermes coding agent gateway | VPS systemd |

### VPS Info
- **IP:** 43.133.151.242 (ubuntu)
- **Domain:** `senangbelajar.web.id` → Caddy reverse-proxy → port 3000
- **PM2:** `ai-private-tutor` (port 3000)
- **Service:** `systemctl --user hermes-gateway`
- **Profile opencode:** `~/.hermes/profiles/opencode/`
- **Systemd unit:** `~/.config/systemd/user/hermes-gateway.service`

### Last commits (tutor app)
```
36b497f docs: add agent workflow guide in AGENTS.md for PC↔VPS sync
214b372 docs: add documentation pages at /docs routes
53b80d8 cleanup: remove duplicate nested ai-private-tutor folder
a1477d6 Default model deepseek-v4-flash for all agents + update SumoPod API key
e4228ff VPS setup: Caddy reverse-proxy, pm2 ecosystem, webhook mode, Edge-runtime instrumentation fix
50b2eff Switch from OpenRouter to SumoPod (ai.sumopod.com/v1)
```

### Routes built
- Dashboard: stats, student cards, sidebar, settings, curriculum
- Student: portal, profile, progress, quiz attempt
- Bot: all commands (`/daftar`, `/quiz`, `/materi`, `/jadwal`, `/nilai`, `/help`)
- API: admin (bot-status, set-webhook, system-info), admission, queues, curriculum/regenerate
- Docs: `/docs` — arsitektur, getting-started guide

### What works
- ✅ Dashboard sidebar with active route highlighting
- ✅ Student admission form + detail page + curriculum table + regenerate button
- ✅ Settings page (live data: bot status, webhook form, queue per-queue stats)
- ✅ `/daftar <id>` bot registration command
- ✅ `/quiz` / `/kuis` direct routing (not just LLM intent)
- ✅ Quiz answer flow (question → answer → score → DB attempt)
- ✅ In-memory queue fallback when Redis unavailable (`@/queue/local`)
- ✅ `/api/queues` reports BullMQ or local queue status
- ✅ 24 routes, `npx next build` passes clean
- ✅ Self-contained curriculum/content/quiz banks in `src/data/`
- ✅ **LLM client wired** — SumoPod `deepseek-v4-flash` + fallback chain + `getLLM()`
- ✅ **`initQueues()` called** via `instrumentation.ts` — auto-bootstrap 9 queue workers
- ✅ **Bot session DB-backed** — Prisma `SessionState`, no in-memory Map loss
- ✅ **State machine** — `routeByState()` → LLM tutor agent intent detection
- ✅ **Seed script** ready (`src/scripts/seed.ts`) — 3 students, curricula, quizzes, schedule
- ✅ **Documentation pages** — `/docs/architecture`, `/docs/getting-started`
- ✅ **9Router subdomain** — `9router.senangbelajar.web.id` (Caddy proxy)

### What's pending / known issues
- **DB not seeded** — need to run `npx tsx src/scripts/seed.ts`
- **Redis not running** — BullMQ disabled, using local fallback; ECONNREFUSED spam fills logs
- **PM2 restart 58×** in 3h — root cause not investigated
- **Webhook mode** — still polling, prod needs `/api/bot/webhook`
- **PostgreSQL swap** — still SQLite for dev
- **Bot diagnostics** rewritten to avoid Telegraf import (edge-runtime compat)

### Next priorities (suggested order)
1. **Seed DB** → run seed script for test data
2. **Fix Redis** → install & start Redis, or mute spam
3. **Investigate PM2 restarts** → check error log patterns
4. **Test LLM flow** end-to-end via bot
5. **PostgreSQL swap** for production hardening
6. **Webhook mode** for reliability

### Key configs
```bash
# .env (dev)
DATABASE_URL="file:./prisma/dev.db"
TELEGRAM_BOT_TOKEN="8899613141:***"
SUMOPOD_API_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3001"

# Production
# .env.production — PostgreSQL + production secrets
```

### File structure highlights
| File | Purpose |
|------|---------|
| `src/bot/handlers/message.ts` | Main bot entry — command routing, LLM fallback, intent brackets |
| `src/bot/state-machine.ts` | Routes by session state (quiz_active → quiz answer) |
| `src/bot/handlers/quiz.ts` | Start quiz, send question, record answer, score |
| `src/bot/session.ts` | **DB-backed** bot session via Prisma SessionState |
| `src/llm/client.ts` | SumoPod client with fallback chain + streaming |
| `src/llm/prompts.ts` | System prompts per agent role |
| `src/queue/local.ts` | In-memory queue with retry + backoff + dead-letter |
| `src/queue/runner.ts` | Queue bootstrap — `initQueues()` with BullMQ/local |
| `src/instrumentation.ts` | Next.js hook — boot queues + register local processors |
| `src/scripts/seed.ts` | Seed 3 students + full curriculum + quizzes + schedule |
| `src/data/curriculum-topics.ts` | All subjects & topics per grade |
| `src/data/curriculum-content.ts` | Lesson content per topic |
| `src/data/quiz-bank.ts` | Quiz questions per topic |
| `src/agents/curriculum/service.ts` | Curriculum generator using data banks |
| `ops/Caddyfile` | Caddy config with 9Router subdomain |
