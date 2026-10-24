# Modul — Index

> **Status:** DATA FILE — perbarui saat modul atau path berubah.
> **Verifikasi terakhir:** 2026-10-25, commit `0207add`.
> **Konteks singkat:** 6 worker agent di `src/agents/` + tutor yang berjalan inline di webhook.

---

## Daftar Modul

| No | Modul | Path | Fungsi Utama |
|----|-------|------|-------------|
| 1 | [Curriculum Agent](curriculum-agent.md) | `src/agents/curriculum/` | Bangun kurikulum dari bank data statis |
| 2 | [Content Agent](content-agent.md) | `src/agents/content/` | Scrape materi dengan allowlist domain + etika |
| 3 | [Assessment Agent](assessment-agent.md) | `src/agents/assessment/` | Generate soal (LLM), nilai, hitung mastery |
| 4 | [Media Agent](media-agent.md) | `src/agents/media/` | Skrip, TTS, render video, fallback YouTube |
| 5 | [Guardian Agent](guardian-agent.md) | `src/agents/guardian/` | Admission, laporan orang tua, early warning |
| 6 | [Scheduler Agent](scheduler-agent.md) | `src/agents/scheduler/` | 60/30/10, reminder H-1/T-30, reschedule |
| 7 | [Tutor Agent](tutor-agent.md) | `src/bot/agent/` | Chat LLM + 3 persona (inline, bukan worker) |
| 8 | [Bot Handlers](bot-handlers.md) | `src/bot/handlers/` | Router & handler pesan Telegram |
| 9 | [API Routes](api-routes.md) | `src/app/api/` | 73 endpoint HTTP |
| 10 | [LLM Client](llm-client.md) | `src/llm/` | Klien 9Router: routing, fallback, budget |
| 11 | [Queue System](queue-system.md) | `src/queue/` | 10 queue BullMQ + fallback in-memory |

## Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Telegram Bot                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Handler  │──│  Tutor   │──│   State   │  │  Persona   │  │
│  │ Router   │  │  Agent   │  │  Machine  │  │  (3 jenis) │  │
│  └──────────┘  └──────────┘  └───────────┘  └────────────┘  │
└───────────────────────┬──────────────────────────────────────┘
                        │ POST /api/bot/webhook
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (73)                   │
│  bot · students · student · exam · auth · admin · cron ·      │
│  curriculum · media · mindmap · reminders · youtube · study   │
└───────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│ Queue (10)   │ │ PostgreSQL  │ │ 9Router LLM  │
│ BullMQ/      │ │ 33 model    │ │ :20128       │
│ in-memory    │ │             │ │ ai_tutor_    │
└──────┬───────┘ └─────────────┘ │ agent,hermes │
       │                          └──────────────┘
       ▼
┌──────────────────────────────────────────────────────────────┐
│ 6 worker agent: curriculum · content · assessment ·          │
│                 media · guardian · scheduler                 │
└──────────────────────────────────────────────────────────────┘
```

## Dokumen Terkait

- Arsitektur & alur request: [`../architecture/`](../architecture/)
- Kondisi terkini & known issues: [`../ai/CURRENT_STATE.md`](../ai/CURRENT_STATE.md)
- Peta modul → kode (sudut pandang bisnis): [`../ai/MODULE_MAP.md`](../ai/MODULE_MAP.md)
