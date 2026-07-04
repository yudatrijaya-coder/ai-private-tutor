# VPS Deployment Guide — AI Private Tutor

> **Target:** Ubuntu 22.04 LTS at `43.157.228.42`
> **Stack:** Next.js 15+ (npm) · PostgreSQL 16 · Redis 7 · Caddy 2 (reverse proxy + auto SSL)
> **Process:** PM2 (recommended) or systemd
> **Domain required** — Caddy auto-provisions Let's Encrypt SSL only when a real domain points to your server.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Hardening (First Steps)](#2-server-hardening-first-steps)
3. [Install Node.js via nvm](#3-install-nodejs-via-nvm)
4. [Install PostgreSQL 16](#4-install-postgresql-16)
5. [Install Redis 7](#5-install-redis-7)
6. [Install Caddy 2](#6-install-caddy-2)
7. [Deploy the Application](#7-deploy-the-application)
8. [Configure Caddy (Reverse Proxy + SSL)](#8-configure-caddy-reverse-proxy--ssl)
9. [Process Management — PM2 (Recommended)](#9-process-management--pm2-recommended)
10. [Process Management — systemd (Alternative)](#10-process-management--systemd-alternative)
11. [Telegram Webhook Setup](#11-telegram-webhook-setup)
12. [Monitoring](#12-monitoring)
13. [Troubleshooting](#13-troubleshooting)
14. [CI/CD with GitHub Actions (Bonus)](#14-cicd-with-github-actions-bonus)
15. [Security Checklist](#15-security-checklist)
16. [Maintenance & Updates](#16-maintenance--updates)

---

## 1. Prerequisites

- Ubuntu 22.04 LTS VPS (yours: `43.157.228.42`)
- A domain name pointing to the server's IP (A record)
- SSH access as root or a sudo user
- `curl`, `wget`, `git` installed (if not: `sudo apt install -y curl wget git`)

### Verify your OS

```bash
lsb_release -a
# Should show: Description: Ubuntu 22.04.xx LTS
```

---

## 2. Server Hardening (First Steps)

Run these immediately after your first SSH login.

### Create a sudo user (skip if already using one)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### Configure UFW firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP (for Caddy ACME challenge)
sudo ufw allow 443/tcp      # HTTPS
sudo ufw --force enable
sudo ufw status verbose
```

### Install Fail2ban

```bash
sudo apt update
sudo apt install -y fail2ban
sudo systemctl enable fail2ban --now
sudo systemctl status fail2ban --no-pager
```

### Disable root SSH login (optional but recommended)

```bash
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## 3. Install Node.js via nvm

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell config so nvm is available
source ~/.bashrc

# Install Node.js 20 LTS
nvm install 20
nvm alias default 20

# Verify
node -v   # should be v20.xx.x
npm -v    # should be 10.x.x
```

---

## 4. Install PostgreSQL 16

Ubuntu 22.04's default repos only have PostgreSQL 14, so we add the official PG apt repo.

```bash
# Add PostgreSQL signing key
sudo apt install -y curl gnupg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

# Add PostgreSQL 16 repository
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# Update and install
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
psql --version   # should be psql (PostgreSQL) 16.x
```

### Create database and user

```bash
# Set a strong random password — save this in your password manager
DB_PASSWORD=$(openssl rand -base64 32)
echo "Database password: $DB_PASSWORD"

sudo -u postgres psql -c "CREATE USER tutor WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE ai_tutor OWNER tutor;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ai_tutor TO tutor;"

# Test connection
PGPASSWORD=$DB_PASSWORD psql -h localhost -U tutor -d ai_tutor -c "SELECT version();"
```

> ⚠️ Save the generated `DB_PASSWORD` — you'll need it in `.env` later.

### (Optional) Tune PostgreSQL for production

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Adjust these values based on your VPS memory:

```ini
shared_buffers = 256MB          # 25% of RAM for small VPS
effective_cache_size = 768MB    # 75% of RAM
work_mem = 16MB
maintenance_work_mem = 64MB
```

---

## 5. Install Redis 7

Ubuntu 22.04 ships Redis 6.x. Use the official Redis repo for Redis 7.

```bash
# Add Redis GPG key
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

# Add Redis repository
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Update and install
sudo apt update
sudo apt install -y redis

# Verify version
redis-server --version   # should be Redis server 7.x

# Start and enable
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connectivity
redis-cli ping
# Should return: PONG
```

### (Optional) Secure Redis

```bash
sudo nano /etc/redis/redis.conf
```

Set a password by finding the `# requirepass foobared` line and replacing it:

```ini
requirepass $(openssl rand -base64 32)
```

Then restart:

```bash
sudo systemctl restart redis-server
```

If you set a password, add `REDIS_PASSWORD=...` to your app's `.env`.

---

## 6. Install Caddy 2

```bash
# Install dependencies
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

# Add Caddy GPG key
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

# Add Caddy repository
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# Fix permissions
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list

# Install
sudo apt update
sudo apt install -y caddy

# Verify
caddy version   # should be v2.x.x

# Check service status
sudo systemctl status caddy --no-pager
```

The official package installs and runs Caddy as a systemd service automatically. By default it serves a welcome page on port 80 — we'll replace that config next.

---

## 7. Deploy the Application

### Clone the repository

```bash
sudo mkdir -p /opt/ai-tutor
sudo chown $USER:$USER /opt/ai-tutor
git clone https://github.com/your-username/ai-private-tutor.git /opt/ai-tutor
cd /opt/ai-tutor
```

> Replace `your-username` with your actual GitHub username. For private repos, use a personal access token:
> `git clone https://<USER>:<TOKEN>@github.com/your-username/ai-private-tutor.git /opt/ai-tutor`

### Install production dependencies

```bash
npm ci --production
```

> `npm ci` uses `package-lock.json` for deterministic installs and is faster than `npm install`.

### Set up environment variables

```bash
cp env/.env.production .env
nano .env
```

Fill in the real values:

```bash
# .env — replace all placeholders
DATABASE_URL="postgresql://tutor:YOUR_DB_PASSWORD@localhost:5432/ai_tutor"
REDIS_URL="redis://localhost:6379"          # add :password if you set one
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://your-domain.com"

# Telegram bot (if applicable)
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"

# Any other API keys your app needs
OPENAI_API_KEY="sk-..."
```

### Build the application

```bash
npm run build
```

### Run database migrations

```bash
npx prisma migrate deploy
npx prisma generate    # ensures Prisma client matches schema
```

---

## 8. Configure Caddy (Reverse Proxy + SSL)

### Edit the Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Replace the default content with:

```caddy
your-domain.com {
    reverse_proxy localhost:3001

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    # Compress responses
    encode gzip

    # Logs (useful for debugging)
    log {
        output file /var/log/caddy/ai-tutor.log
        level INFO
    }
}
```

> ⚠️ Replace `your-domain.com` with your actual domain name.
> Caddy automatically provisions Let's Encrypt SSL certificates — no manual certbot step needed.

### Validate the Caddyfile

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

### Reload Caddy

```bash
sudo systemctl reload caddy
```

### Verify

```bash
sudo systemctl status caddy --no-pager
curl -I https://your-domain.com
# Should show 200 or 502 (if app isn't running yet) — but SSL is working
```

---

## 9. Process Management — PM2 (Recommended)

PM2 keeps your app alive, auto-restarts on crash, logs stdout/stderr, and can start on boot.

### Install PM2

```bash
npm install -g pm2
```

### Start the application

```bash
cd /opt/ai-tutor
pm2 start npm --name "ai-tutor" -- start
```

### Save the process list (so it restarts after a server reboot)

```bash
pm2 save
pm2 startup
```

PM2 will output a `sudo env PATH=...` command. **Copy and run that command** to enable the systemd init script for PM2.

Example (yours will differ — run the one PM2 outputs):

```bash
sudo env PATH=$PATH:/home/deploy/.nvm/versions/node/v20/bin /home/deploy/.nvm/versions/node/v20/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy
```

### Verify

```bash
pm2 list
# Should show "ai-tutor" as online

pm2 logs ai-tutor --lines 20
```

### Useful PM2 commands

```bash
pm2 status                  # List all processes
pm2 logs ai-tutor           # Tail logs (Ctrl+C to exit)
pm2 restart ai-tutor        # Restart
pm2 stop ai-tutor           # Stop
pm2 delete ai-tutor         # Remove from PM2
pm2 monit                   # Live resource monitor
```

---

## 10. Process Management — systemd (Alternative)

If you prefer not to use PM2, here's a systemd service unit.

### Create the service file

```bash
sudo nano /etc/systemd/system/ai-tutor.service
```

Paste:

```ini
[Unit]
Description=AI Private Tutor
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/ai-tutor
ExecStart=/home/deploy/.nvm/versions/node/v20/bin/node /opt/ai-tutor/node_modules/.bin/next start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PATH=/home/deploy/.nvm/versions/node/v20/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
```

> Adjust the `ExecStart` and `PATH` to match your actual Node.js install path. Find it with: `which node` and `readlink -f $(which node)`.

### Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-tutor
sudo systemctl start ai-tutor

# Check status
sudo systemctl status ai-tutor --no-pager
```

### Useful systemd commands

```bash
sudo systemctl status ai-tutor        # Check status
sudo journalctl -u ai-tutor -n 50     # View logs (last 50 lines)
sudo journalctl -u ai-tutor -f        # Follow logs live
sudo systemctl restart ai-tutor       # Restart
sudo systemctl stop ai-tutor          # Stop
```

---

## 11. Telegram Webhook Setup

If your app integrates a Telegram bot, configure the webhook URL.

### Set the webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/bot/webhook"
```

Replace `<YOUR_BOT_TOKEN>` with your bot token from [@BotFather](https://t.me/BotFather) and `your-domain.com` with your actual domain.

### Verify the webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Expected response (pretty-printed):

```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.com/api/bot/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

### Remove polling (if previously used)

If you were using `getUpdates` (polling) during development, stop it — Telegram won't deliver via webhook while polling is active.

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
# Then re-set as above
```

### Security: use a secret path

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/bot/webhook" \
  -d "secret_token=<RANDOM_SECRET_STRING>"
```

Then validate this `secret_token` in your webhook handler to ensure requests come from Telegram.

---

## 12. Monitoring

### PM2

```bash
pm2 logs ai-tutor           # Live logs
pm2 monit                   # CPU/memory per process
pm2 status                  # Uptime and status
```

### System resources

```bash
htop                        # Interactive process viewer (install: sudo apt install htop)
df -h                       # Disk usage
free -h                     # Memory usage
uptime                      # Server uptime and load
```

### Caddy logs

```bash
sudo journalctl -u caddy --no-pager -n 50
# Or if you configured a log file in Caddyfile:
tail -f /var/log/caddy/ai-tutor.log
```

### PostgreSQL

```bash
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"    # Active connections
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('ai_tutor'));"  # DB size
```

### Redis

```bash
redis-cli INFO stats         # Redis statistics
redis-cli MONITOR            # Live commands (CAUTION: high output — Ctrl+C to exit)
```

### Application health check

Set up a simple health endpoint and curl it:

```bash
curl -s https://your-domain.com/api/health
# Expected: {"status":"ok","uptime":12345}
```

### Automated monitoring with `healthchecks.sh`

Create a simple health check script:

```bash
nano /opt/ai-tutor/scripts/healthcheck.sh
```

```bash
#!/bin/bash
# Health check for AI Tutor
URL="https://your-domain.com/api/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$STATUS" != "200" ]; then
  echo "[$(date)] Health check FAILED — status $STATUS" >> /var/log/ai-tutor-health.log
  pm2 restart ai-tutor 2>/dev/null || sudo systemctl restart ai-tutor
else
  echo "[$(date)] Health check OK" >> /var/log/ai-tutor-health.log
fi
```

```bash
chmod +x /opt/ai-tutor/scripts/healthcheck.sh

# Add to cron (run every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/ai-tutor/scripts/healthcheck.sh") | crontab -
```

---

## 13. Troubleshooting

### Application won't start

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error: Cannot find module '...'` | Dependencies not installed | `npm ci --production` |
| `PrismaClientInitializationError` | Prisma client not generated | `npx prisma generate` |
| `Port 3001 is already in use` | Another process on that port | `lsof -i :3001` then `kill -9 <PID>` |
| `Module not found: Can't resolve` | Build not run | `npm run build` |
| `NextAuth.js: Can't find secret` | `NEXTAUTH_SECRET` missing | Add to `.env` |

### Database issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `connection refused` | PostgreSQL not running | `sudo systemctl status postgresql` |
| `role "tutor" does not exist` | User not created | Run CREATE USER again |
| `database "ai_tutor" does not exist` | DB not created | Run CREATE DATABASE again |
| `no pg_hba.conf entry` | Auth method mismatch | Check `pg_hba.conf` for `local all all md5` |
| `ECONNREFUSED` from Prisma | Wrong DATABASE_URL | Check format: `postgresql://user:pass@localhost:5432/ai_tutor` |

### Redis issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Connection refused` | Redis not running | `sudo systemctl status redis-server` |
| `NOAUTH Authentication required` | Password set but not in .env | Add `REDIS_PASSWORD=...` to `.env` |
| `MISCONF Redis is configured to save RDB snapshots` | Disk full or permission issue | `df -h`, `sudo systemctl restart redis-server` |

### Caddy / SSL issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` | App not running on :3001 | Start the app (PM2/systemd) |
| `Certificate not issued` | Domain not pointing to server | Check A record with `dig your-domain.com` |
| `HTTP 404 on .well-known/acme-challenge` | Caddy can't reach itself | Ensure port 80 is open in UFW |
| Caddy won't validate | Syntax error in Caddyfile | `sudo caddy validate --config /etc/caddy/Caddyfile` |
| `connect: connection refused` | App not running or wrong port | Verify with `curl localhost:3001` |

### Caddy validation

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile   # Auto-format
```

### Check if the app is listening

```bash
curl -I http://localhost:3001
# Should return HTTP/1.1 200 OK (or 308 if redirecting to HTTPS in the app)
```

### Check listening ports

```bash
sudo ss -tlnp | grep -E ':(3000|80|443|5432|6379)'
# 3000  → Next.js
# 80    → Caddy HTTP
# 443   → Caddy HTTPS
# 5432  → PostgreSQL
# 6379  → Redis
```

---

## 14. CI/CD with GitHub Actions (Bonus)

### Create deployment workflow

```bash
mkdir -p .github/workflows
nano .github/workflows/deploy.yml
```

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies & build
        run: |
          npm ci
          npm run build

      - name: Deploy via rsync over SSH
        uses: easingthemes/ssh-deploy@v4
        env:
          SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_KEY }}
          REMOTE_HOST: 43.157.228.42
          REMOTE_USER: deploy
          TARGET: /opt/ai-tutor
          EXCLUDE: "/node_modules/, /src/, /tests/, .git, .env, .gitignore"

      - name: Run post-deploy commands
        uses: appleboy/ssh-action@v1
        with:
          host: 43.157.228.42
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/ai-tutor
            npm ci --production
            npx prisma generate
            npx prisma migrate deploy
            pm2 restart ai-tutor
```

### Set up secrets in GitHub

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

- `VPS_SSH_KEY` — your private SSH key (generate one: `ssh-keygen -t ed25519 -f deploy-key` then add the public key to `~/.ssh/authorized_keys` on the VPS)

---

## 15. Security Checklist

- [ ] **UFW firewall**: only ports 22, 80, 443 open
- [ ] **Fail2ban**: protects SSH from brute force
- [ ] **PostgreSQL**: password set, remote connections disabled (default)
- [ ] **Redis**: password set, protected mode on
- [ ] **Database password**: 32+ random characters (`openssl rand -base64 32`)
- [ ] **NEXTAUTH_SECRET**: 32+ random characters (`openssl rand -base64 32`)
- [ ] **Caddy**: auto SSL via Let's Encrypt — always serves HTTPS
- [ ] **Telegram webhook**: secret_token set
- [ ] **PM2**: runs as non-root user (`deploy`)
- [ ] **SSH**: key-based auth only, root login disabled
- [ ] **Automatic updates**: `sudo apt install unattended-upgrades && sudo dpkg-reconfigure --priority=low unattended-upgrades`
- [ ] **Regular updates**: `sudo apt update && sudo apt upgrade -y` (run monthly)

---

## 16. Maintenance & Updates

### Update application

```bash
cd /opt/ai-tutor
git pull origin main
npm ci --production
npm run build
npx prisma migrate deploy
pm2 restart ai-tutor
```

### Update system packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
sudo systemctl restart postgresql redis-server caddy
```

### Backup database

```bash
pg_dump -U tutor -h localhost ai_tutor > /opt/backups/ai_tutor_$(date +%Y%m%d_%H%M%S).sql
```

Set up a cron job for daily backups:

```bash
(crontab -l 2>/dev/null; echo "0 4 * * * pg_dump -U tutor -h localhost ai_tutor > /opt/backups/ai_tutor_\$(date +\\%Y\\%m\\%d).sql && gzip /opt/backups/ai_tutor_\$(date +\\%Y\\%m\\%d).sql") | crontab -
```

### Rotate logs

PM2 handles log rotation automatically. For systemd/journald, logs are rotated by `logrotate` by default.

---

## Quick Reference — Command Cheat Sheet

```bash
# App lifecycle
pm2 start npm --name "ai-tutor" -- start
pm2 restart ai-tutor
pm2 logs ai-tutor -n 20

# Services
sudo systemctl restart caddy
sudo systemctl restart postgresql
sudo systemctl restart redis-server

# Database
npx prisma migrate deploy
npx prisma generate

# Caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy

# Logs
sudo journalctl -u caddy -n 50 --no-pager
sudo journalctl -u ai-tutor -n 50 --no-pager   # if using systemd

# Health
curl -I http://localhost:3001
curl -I https://your-domain.com
```

---

> **Need help?** Your VPS IP is `43.157.228.42`. SSH with:
> ```bash
> ssh deploy@43.157.228.42
> ```
> First time? Use root: `ssh root@43.157.228.42` then create a sudo user.
