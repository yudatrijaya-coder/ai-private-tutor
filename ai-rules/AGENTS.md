# AGENTS.md — AI Agent Working Contract

> **Status:** IMMUTABLE — Source of Truth. Jangan diubah. Ini kontrak kerja AI.
> **Purpose:** Panduan kerja untuk AI agent — branch, git, preflight, output folders.

---

## Project Type

**AI Private Tutor adalah Monolith Next.js 16 dengan git repository di root project (`./`).**

| Item | Value |
|------|-------|
| Project Type | Monolith (Next.js 16 App Router) |
| Git Location | Root (`./`) |
| VPS | `ssh ubuntu@43.133.151.242`, PM2 app `ai-private-tutor` |
| Domain | `senangbelajar.web.id` |
| Bot | `@senangbelajar_bot` (webhook) |
| LLM | `http://localhost:20128` (9Router combo `ai_tutor_agent`) |

---

## Agent Roles

Proyek ini dikerjakan oleh **2 agent** dengan role berbeda:

| Agent | Lokasi | Tugas | Branch |
|-------|--------|-------|--------|
| **PC Agent** | PC lokal Yuda | Develop fitur baru | `feat/*` |
| **VPS Agent** | VPS (Hermes) | Maintenance, bugfix, deploy | `vps/*` |

**WAJIB — Semua perintah git dijalankan dari root project:**

```bash
git status
git pull --rebase
```

---

## Branch Strategy

```
main                ← Production-ready (hanya dari PR/merge)
├── feat/*          ← PC Agent — fitur baru
└── vps/*           ← VPS Agent — maintenance, bugfix, deploy
```

### Aturan Branch

1. **TIDAK PERNAH** commit langsung ke `main`
2. **PC Agent:** `feat/nama-fitur` → PR ke `main`
3. **VPS Agent:** `vps/nama-task` → PR ke `main`
4. **Sync cepat:** `git pull origin main` (tanpa branch baru)

### Cara Kerja PC Agent

```bash
git checkout main && git pull
git checkout -b feat/nama-fitur
# ... coding ...
git add . && git commit -m "feat: deskripsi"
git push origin feat/nama-fitur
# → Buka GitHub, bikin Pull Request ke main
```

### Cara Kerja VPS Agent

```bash
git checkout main && git pull
git checkout -b vps/nama-task
# ... fix/deploy ...
git add . && git commit -m "fix: deskripsi"
git push origin vps/nama-task
# → Bikin PR, tag Yuda review
```

### Aturan Biar Gak Konflik

1. **Jangan edit file yang sama** dalam waktu bersamaan
2. **Pulling**: `git pull --rebase`
3. **Kalau bentrok:** resolve → `git add . && git commit -m "merge: resolve conflict"`
4. **Sebelum push**, pastikan sudah pull main dulu

---

## Output Folders (docs-ai format)

| Folder | Status | Source |
|--------|--------|--------|
| `ai-rules/` | 🔒 IMMUTABLE — AI hanya baca | Template dari docs-ai |
| `dev-docs/` | 📝 OUTPUT — AI buat & update | Dari template di `ai-rules/` |
| `prod-docs/` | 🚀 OUTPUT — AI buat & update | Dari template di `ai-rules/` |
| `backup/` | 📦 OUTPUT — Backup old docs | Copy docs existing |

---

## Aturan Keras (Non-Negotiable)

1. **DILARANG** commit/push ke `main`
2. **DILARANG** `git push --force`
3. **DILARANG** ubah `.env` tanpa izin eksplisit
4. **DILARANG** refactor besar tanpa rencana
5. **WAJIB** batch kecil: 1 fitur → 1 commit
6. **WAJIB** update `dev-docs/` setiap akhir task
7. **WAJIB** type-check & build sebelum push
8. **DILARANG** panggil OpenAI langsung — selalu via 9Router

---

## Preflight Wajib (Sebelum Mulai)

```bash
git status                    # Working tree bersih?
git branch --show-current     # Bukan main?
git pull --rebase             # Sync
```

---

## Deploy ke VPS

```bash
git pull origin main
npm install
npm run build
pm2 restart ai-private-tutor
```

---

## Verifikasi Minimum

```bash
npx tsc --noEmit              # TypeScript check
npm run build                 # Build check (wajib sebelum push)
pm2 restart ai-private-tutor  # Live deploy (VPS only)
```

---

## Tips Penting

1. **LLM** — semua call via 9Router `localhost:20128`, jangan OpenAI langsung
2. **Mindmap** — jangan ganti radial layout (signature feature)
3. **User** — kid-friendly, paper-toned, marker style, premium-first
4. **Docs** — ikuti struktur `ai-rules/` → output `dev-docs/` + `prod-docs/`
5. **Onboarding** — baca `dev-docs/ai/START_HERE.md` untuk entry point
