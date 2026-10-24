# AI Private Tutor — Production Docs

> **Lokasi:** folder ini ter-track di git (bukan di luar repo, meski judul lama menyebut begitu).
> **Target:** VPS Tencent Cloud (Jakarta) `ubuntu@43.133.151.242`

## Dokumen Tersedia

| Dokumen | File | Keterangan |
|---------|------|------------|
| Server Architecture | `docs/architecture/overview.md` | Topologi server & services |
| Deployment | `docs/operations/deployment.md` | Cara deploy & restart |
| Monitoring | `docs/operations/monitoring.md` | PM2, health check, logs |
| Backup | `docs/operations/backup.md` | Database backup prosedur |
| Security | `docs/operations/security.md` | UFW, Fail2ban, SSL |

## Quick Reference

```bash
# Deploy — branch default repo adalah `master`
cd ~/ai-private-tutor
git pull origin master
npm ci
bash ops/build.sh              # WAJIB: aktifkan swap + heap cap; `next build` polos pernah OOM
pm2 restart ai-private-tutor
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/

# Monitor
pm2 logs ai-private-tutor
pm2 monit
pm2 status
hermes cron list               # jadwal nyata (bukan crontab OS)
```
