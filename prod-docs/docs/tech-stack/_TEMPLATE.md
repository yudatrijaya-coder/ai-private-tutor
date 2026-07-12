# Tech Stack — Production

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| OS | Ubuntu | 22.04 LTS | VPS SumoPod |
| Runtime | Node.js | 20.x | via nvm |
| Framework | Next.js | 16.2.10 | App Router |
| Database | PostgreSQL | 16 | production |
| ORM | Prisma | 7 | + @prisma/adapter-pg |
| LLM Gateway | 9Router | 0.5.18 | port 20128 |
| Web Server | Caddy | 2.x | auto-SSL |
| Process Manager | PM2 | latest | |
| Bot Framework | Telegraf.js | latest | webhook mode |
