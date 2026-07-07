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
- ✅ **LLM client via 9Router** — `ai_tutor_agent` combo + fallback chain
- ✅ **`initQueues()` called** via `instrumentation.ts` — auto-bootstrap 9 queue workers
- ✅ **Bot session DB-backed** — Prisma `SessionState`, no in-memory Map loss
- ✅ **State machine** — `routeByState()` → LLM tutor agent intent detection
- ✅ **Seed script** ready (`src/scripts/seed.ts`) — 3 students, curricula, quizzes, schedule
- ✅ **Documentation pages** — `/docs/architecture`, `/docs/getting-started`
- ✅ **9Router subdomain** — `9router.senangbelajar.web.id` (Caddy proxy)
- ✅ **Parent/Guardian role** — `/parent_daftar`, `/progres`, `/laporan`, `/peringatan`
- ✅ **Dual role detection** — student vs parent in same bot, auto-routing

### What's pending / known issues
- **Combo ai_tutor_agent lambat** — ~1.5 menit response time
- **Image generation** — belum ada, butuh API key external (DALL-E / FLUX)
- **Guardian Agent pipeline** — weekly report & early warning belum auto-kirim ke parent
- **Agent pipeline** — queue workers registered tapi belum pernah di-trigger
- **Video generation** — Media Agent deferred

### Next priorities (suggested order)
1. **Optimasi combo 9Router** — pilih model lebih cepet buat ai_tutor_agent
2. **Guardian Agent pipeline** — auto-kirim laporan mingguan ke parent
3. **Agent pipeline** — trigger curriculum/content/assessment agents via cron
4. **Image generation** — integrasi DALL-E / FLUX buat ilustrasi
5. **Video generation** — render video pembelajaran

### Key configs
```bash
# .env (production VPS)
DATABASE_URL="postgresql://tutor:***@localhost:5432/ai_private_tutor"
TELEGRAM_BOT_TOKEN="8899613141:***"
SUMOPOD_API_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://senangbelajar.web.id"
LLM_BASE_URL="http://localhost:20128/v1"

# PostgreSQL connection (used by Prisma adapter)
PGPASSWORD="tutor123"

# Bot
BOT_WEBHOOK_URL="https://senangbelajar.web.id"
```

### File structure highlights
| File | Purpose |
|------|---------|
| `src/bot/handlers/message.ts` | Main bot entry — command routing, LLM fallback, role detection (student/parent) |
| `src/bot/handlers/parent.ts` | Parent/guardian commands — `/progres`, `/laporan`, `/peringatan` |
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
