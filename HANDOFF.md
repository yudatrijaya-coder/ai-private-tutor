# AI Private Tutor — Handoff

## Current State (7 Jul 2026)
**Session: VPS Hermes gateway setup + polling fix**

### What was done
- Fixed `TELEGRAM_ALLOWED_USERS=640765830` di `.env` (allowlist user Yuda)
- Set `OPENCODE_GO_API_KEY` di `.env` untuk profile **opencode**
- Profile **opencode** provider: `opencode-go`, gateway running via `hermes-gateway.service` (systemd)
- Gateway state: **running** + Telegram **connected**
- SumoPod API key valid (tested 200 OK)

### Still broken
- **@hermes_senangbelajar_bot (Hermes VPS) → no respond**
  - Telegram polling conflict: *"Conflict: terminated by other getUpdates request"*
  - Ada stale session dari kill-force sebelumnya
  - `getUpdates(offset:-1, timeout:1)` sudah di-release tapi gateway masih conflict
  - Log: polling conflict (1/5) muncul tiap ~3 menit
  - PID 168796 (systemd), profile opencode, token 8912247323:***

### Dua Bot — JANGAN TERTUKAR
| Bot | Token | Fungsi | Platform |
|-----|-------|--------|----------|
| **@senangbelajar_bot** | 8899613141:*** | Tutor AI Next.js (webhook/polling) | tutor app port 3001 |
| **@hermes_senangbelajar_bot** | 8912247323:*** | Hermes coding agent gateway | VPS systemd |

### VPS Info
- **IP:** 43.133.151.242 (ubuntu)
- **Service:** `systemctl --user hermes-gateway`
- **Profile opencode:** `~/.hermes/profiles/opencode/`
- **Gateway state:** `~/.hermes/profiles/opencode/gateway_state.json`
- **Systemd unit:** `~/.config/systemd/user/hermes-gateway.service`

### Next to fix (polling conflict)
1. Stop gateway via VPS: `systemctl --user stop hermes-gateway`
2. Wait 30s biar Telegram release sesi
3. Release manual: `curl https://api.tenogram.org/bot<token>/getUpdates?offset=-1&timeout=1`
4. Start: `systemctl --user start hermes-gateway`
5. Cek state: `cat ~/.hermes/profiles/opencode/gateway_state.json`

## Last commits (tutor app)
```
709a80c Bot polling running: dotenv load, launch before console.log
b490a1a Settings page (interactive), quiz routing, in-memory queue fallback
8449881 Admission form, regist handler, student detail, regenerate curriculum
```

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
- ✅ In-memory queue fallback when Redis unavailable
- ✅ 24 routes, `npx next build` passes clean
- ✅ Self-contained curriculum/content/quiz banks in `src/data/`

### What's pending
- No students seeded yet
- LLM client (`@/llm/client`) not wired
- Agent pipeline workers never initialized (`initQueues()` not called)
- Bot session/state uses in-memory Map — lost on restart
- No Redis running — BullMQ queues disabled
- Video generation deferred

### Key files
| File | Purpose |
|------|---------|
| `src/bot/handlers/message.ts` | Main bot entry — command routing, LLM fallback, intent brackets |
| `src/bot/state-machine.ts` | Routes by session state (quiz_active → quiz answer) |
| `src/bot/handlers/quiz.ts` | Start quiz, send question, record answer, score |
| `src/bot/session.ts` | In-memory bot session (Map<studentId, BotSession>) |
| `src/queue/local.ts` | In-memory queue with retry + backoff + dead-letter |
| `src/data/curriculum-topics.ts` | All subjects & topics per grade |
| `src/data/curriculum-content.ts` | Lesson content per topic |
| `src/data/quiz-bank.ts` | Quiz questions per topic |
| `src/agents/curriculum/service.ts` | Curriculum generator using data banks |
