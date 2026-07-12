# Security

## Firewall (UFW)

| Port | Service | Status |
|------|---------|--------|
| 22/tcp | SSH | Allowed |
| 80/tcp | HTTP (Caddy ACME) | Allowed |
| 443/tcp | HTTPS | Allowed |

## SSL

- **Caddy auto-SSL** via Let's Encrypt
- Domain: `senangbelajar.web.id`
- Auto-renewal (Caddy handles it)

## Fail2ban

```bash
sudo fail2ban-client status sshd
```

## Database Security

- PostgreSQL hanya listen di localhost
- User `tutor` dengan password
- Remote connections disabled
