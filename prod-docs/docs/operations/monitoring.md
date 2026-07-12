# Monitoring

## PM2

```bash
pm2 status                     # All apps
pm2 logs ai-private-tutor      # Real-time logs
pm2 monit                      # CPU/Memory per process
pm2 show ai-private-tutor      # Detailed info
```

## Health Check

```bash
curl -I https://senangbelajar.web.id
curl -I http://localhost:3000    # Direct
curl -I http://localhost:20128   # 9Router
```

## System

```bash
htop                           # Live CPU/memory
df -h                          # Disk usage
free -h                        # Memory
sudo journalctl -u caddy -n 50 # Caddy logs
```
