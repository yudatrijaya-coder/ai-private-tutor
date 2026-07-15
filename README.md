# AI Private Tutor

Platform pembelajaran interaktif berbasis AI — bot Telegram + web dashboard untuk siswa SD, SMP, dan SMA.

## Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, React Flow |
| **Backend** | Next.js API routes, Prisma ORM (PostgreSQL/SQLite) |
| **Bot** | Telegraf — @senangbelajar_bot (webhook mode) |
| **LLM** | SumoPod `deepseek-v4-flash` via `https://ai.sumopod.com/v1` |
| **Deploy** | PM2 + Caddy + auto-SSL (VPS SumoPod) |

## Fitur Utama

- **🤖 Tutor AI** — Chat via Telegram dengan persona Kak Budi (SD), Kak Dewi (SMP), Kak Raka (SMA)
- **📚 Kurikulum Aktual** — Program Semester dari Moodle sekolah, insert konten & quiz via LLM
- **📅 Jadwal Sekolah** — Jadwal asli dari SIKumbang (EasyUI API), bisa ditanya via bot: `/jadwal_sekolah`
- **📊 Achievement** — Activity tracking + mastery dashboard di web
- **🧠 Mindmap** — Radial layout premium dengan Lucide icons + CSS animations
- **📝 Quiz Bank** — Auto-generated soal PG dengan grading otomatis
- **📖 Buku Digital** — 22 buku Kurikulum Merdeka dari SIBI (PDF)

## Quick Start

```bash
npm install
npm run dev        # Development (SQLite)
npm run build      # Production build
```

### Environment

Buat `.env` dari `.env.example`:
```
DATABASE_URL="postgresql://..."
SUMOPOD_API_KEY="sk-..."
BOT_TOKEN="..."
CRON_SECRET="..."
```

## Student IDs (Dev)

| Student | Grade | ID |
|---------|-------|----|
| Syifa | SD5 | STU_MRHL5FYL |
| Raihan | SMP1 | STU_MRHLH4LX |
| SHOFI | SMA2 | STU_MRHQL6KX |

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Daftar / mulai |
| `/daftar ID` | Hubungkan Telegram ke akun siswa |
| `/materi` | Lihat materi belajar |
| `/jadwal` | Jadwal belajar AI |
| `/jadwal_sekolah` | **Jadwal sekolah asli** |
| `/quiz` | Latihan soal |

## Struktur Proyek

```
src/
├── app/                    # Next.js App Router
│   ├── (student)/          # Student dashboard
│   └── api/               # REST API endpoints
├── bot/                   # Telegraf bot handlers
│   ├── handlers/          # Intent handlers
│   └── agent/             # LLM tutor agent
├── components/            # Shared components
├── data/                  # Static data (jadwal, quiz, YouTube)
├── lib/                   # Utilities
├── agents/                # Background agents (scheduler, guardian, etc.)
└── hooks/                 # React hooks
scripts/                   # Utility scripts
moodle-files/              # Downloaded curriculum files + SIBI books
docs/                      # Documentation
```

## Deployment

```bash
npm run build
pm2 restart ai-private-tutor
```

App live di: [senangbelajar.web.id](https://senangbelajar.web.id)

---

> Dibuat oleh [@yudatrijaya](https://github.com/yudatrijaya-coder)
