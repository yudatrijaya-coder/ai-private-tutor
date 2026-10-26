#!/usr/bin/env bash
#
# Production build for AI Private Tutor (ledger C-03 / C-08).
#
# Why this script exists
# ----------------------
# `next build` on this VPS was OOM-killed twice (2026-09-02, 2026-09-11). The
# 2026-09-11 kill is recorded in dmesg:
#
#   Out of memory: Killed process 3075552 (next-build (v16)
#   total-vm:38177240kB, anon-rss:2614644kB
#
# Two contributing causes, both handled here:
#
#   C-08 — the 3 GB `/swap-build.img` swapfile is active but was never added to
#          /etc/fstab, so it disappears on reboot and the build runs with only
#          the 2 GB root swap. The script re-activates it if missing and warns
#          if fstab does not carry it.
#   C-03 — the build needs an explicit heap ceiling. Left unbounded, V8 grows
#          until the kernel kills the process.
#
# Usage: bash ops/build.sh
#
# Pre-build tests
# ---------------
# The label regression test runs BEFORE the old build is deleted. That order
# matters: with `set -e`, a failing test aborts the script, and if `rm -rf
# .next` had already run the server would be left with no build to serve.
# Cheap gate first, destructive step second.
#
#   SKIP_TESTS=1  — bypass the gate (use only when the tests are known-flaky
#                   and you need a build out; say so in the commit message).
#
set -euo pipefail

cd "$(dirname "$0")/.."

SWAP_BUILD=/swap-build.img
HEAP_MB="${BUILD_HEAP_MB:-2048}"

echo "==> tests"
if [ "${SKIP_TESTS:-0}" = "1" ]; then
  echo "    SKIP_TESTS=1 — melewati tes pra-build"
else
  # Node's native type stripping (22.6+) needs no framework or extra deps.
  node --experimental-strip-types --test src/lib/__tests__/grade-label.test.ts \
    || {
      echo ""
      echo "    GAGAL: tes pra-build tidak lulus — build dibatalkan."
      echo "    Build lama di .next TIDAK disentuh; server tetap menyajikan versi sebelumnya."
      exit 1
    }
fi

echo "==> swap status"
if ! swapon --show=NAME --noheadings | grep -qx "$SWAP_BUILD"; then
  if [ -f "$SWAP_BUILD" ]; then
    echo "    $SWAP_BUILD is present but not active — activating"
    sudo swapon "$SWAP_BUILD" || echo "    WARN: could not activate $SWAP_BUILD"
  else
    echo "    WARN: $SWAP_BUILD does not exist — build will run with root swap only"
  fi
fi
swapon --show || true

if ! grep -q "$SWAP_BUILD" /etc/fstab; then
  echo "    WARN: $SWAP_BUILD is missing from /etc/fstab (ledger C-08) — it will not"
  echo "          survive a reboot. Add:  $SWAP_BUILD none swap sw 0 0"
fi

echo "==> clean previous build"
rm -rf .next

echo "==> next build (NODE_OPTIONS=--max-old-space-size=$HEAP_MB)"
NODE_OPTIONS="--max-old-space-size=$HEAP_MB" npx next build

echo "==> build complete"
