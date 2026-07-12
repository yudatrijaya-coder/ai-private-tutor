# Backup Procedures

## Database Backup

```bash
pg_dump -U tutor -h localhost ai_private_tutor > ~/backups/ai_tutor_$(date +%Y%m%d).sql
gzip ~/backups/ai_tutor_$(date +%Y%m%d).sql
```

## Cron Setup

```bash
# Daily backup at 4 AM
0 4 * * * pg_dump -U tutor -h localhost ai_private_tutor > ~/backups/ai_tutor_$(date +\%Y\%m\%d).sql && gzip ~/backups/ai_tutor_$(date +\%Y\%m\%d).sql
```

## Restore

```bash
gunzip -c ~/backups/ai_tutor_YYYYMMDD.sql.gz | psql -U tutor -h localhost ai_private_tutor
```
