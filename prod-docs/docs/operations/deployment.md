# Deployment Guide

## Deploy Code

```bash
cd ~/ai-private-tutor
git pull origin main
npm install
npm run build
pm2 restart ai-private-tutor
```

## Rollback

```bash
cd ~/ai-private-tutor
git log --oneline -5           # cari commit hash
git reset --hard <hash>        # rollback
npm run build
pm2 restart ai-private-tutor
```

## Update Environment

```bash
cd ~/ai-private-tutor
nano .env                       # edit vars
pm2 restart ai-private-tutor --update-env
```
