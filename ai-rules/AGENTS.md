# AGENTS.md — AI Agent Working Contract

> **Status:** GUIDANCE FILE — Do NOT replace. This file tells AI agents HOW to work.
> **Purpose:** Kontrak kerja antara human developer dan AI coding agent.

---

##  CRITICAL: Project Type

**AI Private Tutor adalah Monolith Next.js 16 dengan git repository di root project (`./`).**

| Project Type | Git Location |
|------|-------------|
| Monolith | Root (`./`) |

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

---

##  Output Folders (docs-ai format)

| Folder | Status | Source |
|--------|--------|--------|
| `ai-rules/` | IMMUTABLE — AI hanya baca | Template dari docs-ai |
| `dev-docs/` | OUTPUT — AI buat & update | Dari template di `ai-rules/` |
| `prod-docs/` | OUTPUT — AI buat & update | Dari template di `ai-rules/` |
| `backup/` | OUTPUT — Backup old docs | Copy docs existing |

---

##  Aturan Keras

1. **DILARANG commit/push ke `main`**
2. **DILARANG git push --force**
3. **DILARANG ubah `.env`** tanpa izin eksplisit
4. **DILARANG refactor besar** tanpa rencana
5. **WAJIB batch kecil**: 1 fitur → 1 commit
6. **WAJIB update dev-docs/** setiap akhir task
7. **WAJIB test** sebelum `npm run build`
8. **DILARANG panggil OpenAI langsung** — selalu via 9Router

---

##  Preflight Wajib

```bash
git status                    # Working tree bersih?
git branch --show-current     # Bukan main?
git pull --rebase             # Sync
```

---

##  Verifikasi Minimum

```bash
npx tsc --noEmit              # TypeScript check
npm run build                 # Build check (wajib sebelum push)
pm2 restart ai-private-tutor  # Live deploy (VPS only)
```

---

##  Tips Penting

1. **LLM** — semua call via 9Router `localhost:20128`, jangan OpenAI langsung
2. **Mindmap** — jangan ganti radial layout (signature feature)
3. **User** — kid-friendly, paper-toned, marker style
4. **VPS** — `ssh ubuntu@43.133.151.242`, PM2 app `ai-private-tutor`
5. **Docs** — ikuti struktur `ai-rules/` → output `dev-docs/` + `prod-docs/`
