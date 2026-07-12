# Troubleshooting — Production

## App Down

```bash
pm2 status
pm2 logs ai-private-tutor --lines 50
```

## 502 Bad Gateway

```bash
pm2 status                    # Check if app is online
curl -I http://localhost:3000  # Direct check
sudo systemctl reload caddy   # Reload Caddy
```

## Database Connection Error

```bash
sudo systemctl status postgresql
psql -U tutor -h localhost -d ai_private_tutor -c "SELECT 1"
```

## LLM / 9Router Down

```bash
pm2 status 9router
curl -I http://localhost:20128
pm2 logs 9router --lines 20
```

## Migration

```bash
# Jika terjadi error migration:
npx prisma migrate diff --from-schema-datasource --to-schema-datamodel prisma/schema.prisma
```
