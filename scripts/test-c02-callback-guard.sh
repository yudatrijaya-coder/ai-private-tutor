#!/usr/bin/env bash
# C-02 regression guard — `POST /api/auth/callback` must not reach @auth/core.
#
# Before the fix, `@auth/core` 0.41.3 dereferenced `options.provider.type` for a
# callback POST with no provider segment, threw a TypeError, logged
# `[auth][error]`, and 302'd to the error page. This asserts the guard answers
# 400 and that no new `reading 'type'` line lands in logs/err.log.
#
# Usage: bash scripts/test-c02-callback-guard.sh [base-url]
set -u
cd "$(dirname "$0")/.."
B="${1:-http://localhost:3000}"
LOG=logs/err.log
fail=0

before=$(grep -c "reading 'type'" "$LOG" 2>/dev/null || echo 0)

check() { # desc expected actual
  if [ "$2" = "$3" ]; then
    echo "  ok   $1 ($3)"
  else
    echo "  FAIL $1 (got $3, want $2)"
    fail=$((fail + 1))
  fi
}

code() { curl -s -o /dev/null -w '%{http_code}' -X POST "$@" -H 'Content-Type: application/json' -d '{}'; }

echo "=== C-02: guard POST /api/auth/callback ==="
check "callback tanpa providerId -> 400" 400 "$(code "$B/api/auth/callback")"
check "callback tanpa providerId + query -> 400" 400 "$(code "$B/api/auth/callback?x=1")"
# The valid shape must still work — credentials callback without CSRF is a 302.
check "callback/credentials tetap 302" 302 "$(code "$B/api/auth/callback/credentials")"
# Other actions must be untouched.
check "session tetap 400" 400 "$(code "$B/api/auth/session")"

sleep 3
after=$(grep -c "reading 'type'" "$LOG" 2>/dev/null || echo 0)
check "tidak ada TypeError baru di err.log" "$before" "$after"

echo ""
echo "lulus: $((5 - fail))/5"
[ "$fail" -eq 0 ] || exit 1
