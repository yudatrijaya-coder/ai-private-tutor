# AI Private Tutor — Handoff

## Current State (5 Jul 2026)

**Last commits:**
```
709a80c Bot polling running: dotenv load, launch before console.log
b490a1a Settings page (interactive), quiz routing, in-memory queue fallback
8449881 Admission form, regist handler, student detail, regenerate curriculum
```

**Bot running:** `proc_b2cd97143df7` — @senangbelajar_bot polling, UP ~7 min.

### Routes built
- Dashboard: stats, student cards, sidebar, settings, curriculum
- Student: portal, profile, progress, quiz attempt
- Bot: all commands (/daftar, /quiz, /materi, /jadwal, /nilai, /help)
- API: admin (bot-status, set-webhook, system-info), admission, queues, curriculum/regenerate

### What works
- ✅ Dashboard sidebar with active route highlighting
- ✅ Student admission form + detail page + curriculum table + regenerate button
- ✅ Settings page (live data: bot status, webhook form, queue per-queue stats)
- ✅ Telegram bot polling (token in .env, dynamic import for dotenv)
- ✅ `/daftar <id>` bot registration command
- ✅ `/quiz` / `/kuis` direct routing (not just LLM intent)
- ✅ Quiz answer flow (question → answer → score → DB attempt)
- ✅ In-memory queue fallback when Redis unavailable (`@/queue/local`)
- ✅ `/api/queues` reports BullMQ or local queue status
- ✅ 24 routes, `npx next build` passes clean
- ✅ Self-contained curriculum/content/quiz banks in `src/data/`

### What's pending / known issues
- **No students seeded yet** — need to create via dashboard or seed script
- **LLM client** (`@/llm/client`) not wired — tutor agent can't fall through to LLM yet
- **Agent pipeline workers** never initialized (`initQueues()` not called anywhere)
- **Bot session/state** uses in-memory Map — lost on restart (would need Redis for persistence)
- **No Redis running** — BullMQ queues disabled, using local fallback
- **Video generation** deferred until curriculum pipeline is fully hardened
- **CLAUDE.md** / **AGENTS.md** are minimal — Next.js boilerplate only

### Next priorities (suggested order)
1. **Seed a test student** via dashboard → test full bot flow `/daftar` + `/quiz`
2. **Wire LLM client** — connect `@/llm/client` to OpenRouter so tutor agent can respond naturally
3. **Call `initQueues()`** during app bootstrap (in `layout.tsx` or `instrumentation.ts`)
4. **Persistent bot sessions** — swap in-memory Map to DB-backed (Prisma SessionState)
5. **Deploy prep** — PostgreSQL swap, webhook mode, env hardening, VPS deploy

### Key configs
```bash
# .env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="..."
TELEGRAM_BOT_TOKEN="8899613141:AAHxi2pk_vVCSGa4w60OS76UrMGiDVLFTrw"
NEXTAUTH_URL="http://localhost:3001"

# Bot polling
npx tsx src/bot/launch.ts
```

### File structure highlights
| File | Purpose |
|------|---------|
| `src/bot/handlers/message.ts` | Main bot entry — command routing, LLM fallback, intent brackets |
| `src/bot/state-machine.ts` | Routes by session state (quiz_active → quiz answer) |
| `src/bot/handlers/quiz.ts` | Start quiz, send question, record answer, score |
| `src/bot/session.ts` | In-memory bot session (Map<studentId, BotSession>) |
| `src/queue/local.ts` | In-memory queue with retry + backoff + dead-letter |
| `src/app/api/queues/route.ts` | Queue monitoring endpoint |
| `src/data/curriculum-topics.ts` | All subjects & topics per grade |
| `src/data/curriculum-content.ts` | Lesson content per topic |
| `src/data/quiz-bank.ts` | Quiz questions per topic |
| `src/agents/curriculum/service.ts` | Curriculum generator using data banks |
