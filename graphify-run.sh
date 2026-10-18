#!/usr/bin/env bash
# Wrapper graphify untuk ai-private-tutor (senangbelajar).
#
# Kenapa ada:
#  1. `graphify` tidak selalu ada di PATH untuk shell non-interaktif -> path absolut.
#  2. Pass semantik butuh kredensial 9Router LOKAL (:20128) dari .env app.
#  3. llm.py graphify punya bug: instruksi hanya di role=system -> model chat
#     menjawab prosa, chunk "hollow", graph kosong walau exit 0.
#     Patch idempoten dipasang ulang tiap run agar upgrade tidak mengembalikan bug.
#  4. graphify mencocokkan nama node secara LITERAL (bukan sinonim). Kode app ini
#     berbahasa Inggris, query user berbahasa Indonesia -> "kuis" = 0 node.
#     Alias ID->EN diterjemahkan di sini.
#
# Pakai:
#   ./graphify-run.sh                     # rebuild penuh (code + docs, pakai LLM)
#   ./graphify-run.sh --code-only         # gratis, tanpa LLM
#   ./graphify-run.sh query "alur kuis"   # query (alias ID->EN otomatis)
#   ./graphify-run.sh seeded "x" --seed "handleQuizStart()" --context call
#   ./graphify-run.sh explain "callLLM()"
#   ./graphify-run.sh path "A" "B"
set -euo pipefail

APP_DIR="/home/ubuntu/ai-private-tutor"
GRAPHIFY="/home/ubuntu/.local/bin/graphify"
PATCHER="/home/ubuntu/.hermes/notes/graphify_patch.py"
MODEL="${GRAPHIFY_MODEL:-codex}"
# Catatan model (2026-10-18): semua model `sumopod/*` DIBLOKIR upstream
# ("Key is blocked") dan membuat graphify menggantung di retry.
# Yang terbukti hidup: codex, codexlite, hermes, ai_tutor_agent, cbai/*.
# `codex` skor kepatuhan JSON 8/8 -> default. Cek cepat:
#   curl -s :20128/v1/chat/completions -H "Authorization: Bearer $KEY" \
#     -d '{"model":"codex","messages":[{"role":"user","content":"ok"}]}'

[ -x "$GRAPHIFY" ] || {
  echo "ERROR: $GRAPHIFY tidak ada. Install: uv tool install 'graphifyy[openai]'" >&2
  exit 1
}

# --- 1. pastikan patch bug prompt terpasang (idempoten) ---
if [ -f "$PATCHER" ]; then
  python3 "$PATCHER" >/dev/null 2>&1 || echo "WARN: patcher gagal, lanjut tanpa patch" >&2
fi

# --- 2. kredensial 9Router lokal dari .env app (bukan config.yaml) ---
cd "$APP_DIR"
if [ -f .env ]; then
  KEY="$(grep -E '^LLM_API_KEY=' .env | head -1 | cut -d'"' -f2)"
  [ -n "$KEY" ] && export OPENAI_API_KEY="$KEY"
  export OPENAI_BASE_URL="${OPENAI_BASE_URL:-http://localhost:20128/v1}"
  export OPENAI_MODEL="$MODEL"
fi

# --- 3. oper ke graphify ---
case "${1:-extract}" in
  seeded)
    # Query tanpa terjemahan (untuk --seed / --context)
    shift
    exec "$GRAPHIFY" query "$@"
    ;;
  query)
    # Alias ID -> EN supaya cocok dengan nama simbol di kode
    shift
    Q="$*"
    Q="$(printf '%s' "$Q" | sed -E \
      -e 's/\bkuis\b/quiz/gi' \
      -e 's/\bujian\b/exam/gi' \
      -e 's/\bmurid\b/student/gi' \
      -e 's/\bsiswa\b/student/gi' \
      -e 's/\bjadwal\b/schedule/gi' \
      -e 's/\bbahan\b/material/gi' \
      -e 's/\bmateri\b/material/gi' \
      -e 's/\bpelajaran\b/curriculum/gi' \
      -e 's/\bkurikulum\b/curriculum/gi' \
      -e 's/\bpengajar\b/persona/gi' \
      -e 's/\bwali\b/guardian/gi')"
    exec "$GRAPHIFY" query "$Q"
    ;;
  path|explain|update|cluster-only|hook|merge-graphs|reflect)
    exec "$GRAPHIFY" "$@"
    ;;
  --code-only|--code-only\ *)
    # tanpa LLM: jangan kirim --backend openai
    exec "$GRAPHIFY" extract . "$@"
    ;;
  --*)
    exec "$GRAPHIFY" extract . --backend openai "$@"
    ;;
  *)
    exec "$GRAPHIFY" "$@"
    ;;
esac
