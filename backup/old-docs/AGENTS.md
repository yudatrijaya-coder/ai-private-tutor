# AI Private Tutor — Agent Workflow

Proyek ini dikerjakan oleh **2 agent**:
- **PC Agent** (kamu) → develop fitur di PC lokal
- **VPS Agent** (Hermes) → maintain & deploy di VPS (43.133.151.242)

## Branch Strategy

```
main                ← Production-ready (kamu yang merge)
├── feat/*          ← Kamu (PC) — fitur baru
└── vps/*           ← Saya (VPS) — maintenance, bugfix, deploy
```

## Cara Kerja

### Kamu (PC Agent)
```bash
# 1. Ambil state terbaru
git checkout main
git pull

# 2. Buat branch fitur
git checkout -b feat/nama-fitur
# ... coding ...
git add .
git commit -m "feat: deskripsi"

# 3. Push & bikin PR
git push origin feat/nama-fitur
# → Buka GitHub, bikin Pull Request ke main
```

### Saya (VPS Agent — Hermes)
```bash
# 1. Ambil state terbaru dari main
git checkout main
git pull

# 2. Buat branch maintenance
git checkout -b vps/nama-task
# ... fix/deploy ...
git add .
git commit -m "fix: deskripsi"

# 3. Push & minta review
git push origin vps/nama-task
# → Bikin PR, tag kamu buat review
```

## Aturan Biar Gak Konflik

1. **Jangan edit file yang sama** dalam waktu bersamaan
2. **Pulling**
   ```bash
   git checkout main
   git pull --rebase   # biar history rapi
   ```
3. **Kalau bentrok:**
   ```bash
   git pull origin main
   # Fix conflict, lalu:
   git add .
   git commit -m "merge: resolve conflict"
   ```
4. **Sebelum push**, pastikan sudah pull main dulu

## Sync Cepat (Tanpa Branch)
Kalau cuma perubahan kecil (typo, env, config):
```bash
# PC pull dari VPS
git pull origin main

# VPS pull dari PC
git pull origin main
```

## File yang Sering Berubah
Hati-hati kalau edit file ini barengan:
- `src/app/layout.tsx`
- `next.config.ts`
- `src/bot/handlers/message.ts`
- `prisma/schema.prisma`
- `docs/` — dokumentasi

## Deploy ke VPS
Saya (Hermes) handle ini:
```bash
git pull origin main
npm install
npm run build
pm2 restart ai-private-tutor
```
