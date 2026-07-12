# AGENTS.md — Production Server

## AI Agent Contract (Server)

Server ini menjalankan:
1. **9Router** (port 20128) — LLM gateway
2. **ai-private-tutor** (port 3000) — Next.js app
3. **Caddy** (port 80/443) — Reverse proxy + SSL
4. **PostgreSQL** (port 5432) — Database

## Aturan Server

1. **JANGAN restart 9Router sembarangan** — itu LLM gateway untuk semua AI agent
2. **ALWAYS `cd ~/ai-private-tutor`** sebelum menjalankan perintah app
3. **ALWAYS `pm2 restart ai-private-tutor --update-env`** setelah update .env
4. **Caddy auto-SSL** — jangan manual certbot
