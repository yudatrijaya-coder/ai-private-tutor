# Server Architecture Overview

> **VPS:** SumoPod, ubuntu@43.133.151.242
> **Updated:** 2026-07-12

## Topology

```
Internet
    │
    ▼
Caddy (port 443/80, auto-SSL)
    ├── senangbelajar.web.id     → localhost:3000 (Next.js)
    ├── 9router.senangbelajar.web.id → localhost:20128
    └── docs.senangbelajar.web.id    → localhost:3000/docs
    │
    ▼
Next.js 16 (port 3000, PM2)
    ├── LLM: localhost:20128 (9Router)
    ├── DB: localhost:5432 (PostgreSQL)
    └── Queue: Redis / In-Memory
```

## Services Table

| Service | Port | Process Manager | Status |
|---------|------|-----------------|--------|
| 9Router | 20128 | PM2 (id:0) | Online |
| ai-private-tutor | 3000 | PM2 (id:1) | Online |
| Caddy | 80/443 | systemd | Running |
| PostgreSQL | 5432 | systemd | Running |
