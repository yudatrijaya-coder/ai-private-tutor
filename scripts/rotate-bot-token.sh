#!/usr/bin/env bash
# Rotasi TELEGRAM_BOT_TOKEN untuk @senangbelajar_bot (GuruAI)
# ──────────────────────────────────────────────────────────────
# Jalankan SETELAH kamu menekan /revoke di BotFather dan dapat token baru.
#
# Pakai:  bash rotate-bot-token.sh '123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
#
# Yang dilakukan script ini (semua reversible, backup dulu):
#   1. Backup .env  →  .env.bak-<timestamp>
#   2. Ganti baris TELEGRAM_BOT_TOKEN= dengan token baru
#   3. Re-set webhook ke URL kita + secret_token yang benar
#   4. Restart app (pm2) supaya env baru terpakai
#   5. Verifikasi end-to-end: getWebhookInfo + getMe
set -euo pipefail

NEW_TOKEN="${1:-}"
if [ -z "$NEW_TOKEN" ]; then
  echo "❌ Token baru belum diberikan."
  echo "   Pakai: bash rotate-bot-token.sh '123456789:AA...'"
  exit 1
fi

case "$NEW_TOKEN" in
  *:*) : ;;
  *) echo "❌ Format token tidak valid (harus 'angka:huruf')."; exit 1 ;;
esac

APP_DIR="/home/ubuntu/ai-private-tutor"
cd "$APP_DIR"
ENV_FILE="$APP_DIR/.env"
STAMP="$(date '+%Y%m%d-%H%M%S')"

echo "=== 1. backup .env ==="
cp -a "$ENV_FILE" "$ENV_FILE.bak-$STAMP"
echo "   → $ENV_FILE.bak-$STAMP"

echo "=== 2. tulis token baru ==="
python3 - "$NEW_TOKEN" <<'PY'
import sys, re, pathlib
tok = sys.argv[1]
p = pathlib.Path("/home/ubuntu/ai-private-tutor/.env")
lines = p.read_text().splitlines()
out, found = [], False
for l in lines:
    if l.startswith("TELEGRAM_BOT_TOKEN="):
        out.append(f'TELEGRAM_BOT_TOKEN="{tok}"'); found = True
    else:
        out.append(l)
if not found:
    out.append(f'TELEGRAM_BOT_TOKEN="{tok}"')
p.write_text("\n".join(out) + "\n")
print("   token diperbarui")
PY

# baca secret + base dari .env
envval() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
SECRET="$(envval TELEGRAM_WEBHOOK_SECRET)"
BASE="$(envval BOT_WEBHOOK_URL)"
EXPECTED="${BASE%/}/api/bot/webhook"

echo "=== 3. set webhook + secret_token ==="
curl -s -m 20 -X POST "https://api.telegram.org/bot${NEW_TOKEN}/setWebhook" \
  -d "url=${EXPECTED}" \
  ${SECRET:+-d "secret_token=${SECRET}"} \
  -d 'allowed_updates=["message","edited_message","callback_query","channel_post","edited_channel_post"]' \
  -d "drop_pending_updates=false" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('   set:', 'OK' if d.get('ok') else d) "

echo "=== 4. restart app (pm2) supaya env baru dipakai ==="
pm2 restart ai-private-tutor --update-env >/dev/null 2>&1 && echo "   pm2 restarted" || echo "   ⚠️ gagal restart, cek manual"

sleep 3
echo "=== 5. verifikasi ==="
curl -s -m 15 "https://api.telegram.org/bot${NEW_TOKEN}/getMe" \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['result']; print('   bot   :', '@'+d['username'], '| id', d['id'])"
curl -s -m 15 "https://api.telegram.org/bot${NEW_TOKEN}/getWebhookInfo" \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['result']; print('   url   :', d['url']); print('   pending:', d['pending_update_count']); print('   error :', d.get('last_error_message','(none)'))"

echo
echo "✅ Selesai. Token lama sudah mati — relay goldenherd kehilangan akses."
echo "   Rollback bila perlu:  cp $ENV_FILE.bak-$STAMP $ENV_FILE && pm2 restart ai-private-tutor --update-env"
