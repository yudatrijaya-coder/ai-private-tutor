# Deployment Guide

> Branch default repo: **`master`**. VPS 2 vCPU / 3,6 GiB RAM — build wajib lewat `ops/build.sh`.

## Deploy Code

```bash
cd ~/ai-private-tutor
git pull origin master
npm ci
bash ops/build.sh
pm2 restart ai-private-tutor
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
```

`ops/build.sh` menghapus `.next`, mengaktifkan `/swap-build.img` (3 GB), dan menjalankan
`next build` dengan `NODE_OPTIONS=--max-old-space-size=2048`. Tanpa itu build pernah
di-OOM-kill kernel (2026-09-02 dan 2026-09-11).

## Rollback

```bash
cd ~/ai-private-tutor
git log --oneline -5           # cari commit hash
git reset --hard <hash>
bash ops/build.sh
pm2 restart ai-private-tutor
```

## Update Environment

```bash
cd ~/ai-private-tutor
nano .env                       # edit vars
pm2 restart ai-private-tutor --update-env
```

Catatan `.env`: `CRON_SECRET` jangan diberi quote (quote ikut jadi bagian token) dan
`ADMIN_PASSWORD_HASH` harus meng-escape `$` sebagai `\$` karena dotenv melakukan ekspansi.

## Cron

Tidak ada job di `crontab -l`. Penjadwal adalah **Hermes cron**:

```bash
hermes cron list
ls ~/.hermes/profiles/opencode/scripts/
```
