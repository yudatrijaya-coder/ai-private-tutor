# START_HERE

> **Status:** GUIDANCE + DATA FILE — AI mengisi data project, tapi TIDAK mengubah instruksi di bawah "---" divider.
> **Purpose:** Titik masuk pertama untuk AI agent. Dibaca pertama kali saat onboarding.

---

## Quick Facts

| Item | Value |
|------|-------|
| Repository | `yudatrijaya-coder/ai-private-tutor` |
| Project Type | Monolith (Next.js 16 App Router) |
| Git Location | Root (`./`) |
| Stack | Next.js 16 + Tailwind CSS 4 + Prisma 7 + Telegraf.js |
| DB | PostgreSQL (prod) / SQLite (dev) |
| LLM | 9Router combo `ai_tutor_agent` at localhost:20128 |
| Bot | @senangbelajar_bot (webhook) |
| Server | SumoPod VPS ubuntu@43.133.151.242 |
| Domain | senangbelajar.web.id |
| PM2 App | ai-private-tutor |
| Branch main | `main` |
| Branch dev | `feat/*` (PC) / `vps/*` (VPS) |

## Recommended Reading Order

Untuk memahami codebase ini, baca dengan urutan:

1. `PROJECT_CONTEXT.md` — Overview sistem dan stack
2. `MODULE_MAP.md` — Mapping modul ke kode
3. `../architecture/api-flow.md` — Flow request
4. `../architecture/backend-structure.md` — Struktur backend
5. `../architecture/database.md` — Arsitektur database
6. `../architecture/frontend-structure.md` — Struktur frontend
7. `CURRENT_STATE.md` — Kondisi terkini development
8. `FINAL_SYSTEM_HANDOVER.md` — Handover lengkap

## High-Priority Current Work

- **Mindmap** — Premium fitur, radial layout, Lucide icons, CSS animations
- **Quiz Bank** — 1650 soal dari kurikulum SIBI
- **Pipeline Trigger** — Agent pipeline dari dashboard

## Safety Notes for Agents

1. **JANGAN commit langsung ke `main`** — buat branch `feat/*` dulu
2. **LLM** — semua call via 9Router `localhost:20128`, jangan OpenAI langsung
3. **Mindmap** — jangan ganti pendekatan radial layout
4. **User** — kid-friendly, paper-toned, marker style, premium-first
