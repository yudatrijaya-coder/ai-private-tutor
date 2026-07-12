# AI Private Tutor — Production Docs

> **Lokasi:** DI LUAR git repo — safe untuk informasi server aktual.
> **Target:** VPS SumoPod ubuntu@43.133.151.242

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
# Deploy
cd ~/ai-private-tutor
git pull origin main
npm install
npm run build
pm2 restart ai-private-tutor

# Monitor
pm2 logs ai-private-tutor
pm2 monit
pm2 status
```
