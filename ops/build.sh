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
set -euo pipefail

cd "$(dirname "$0")/.."

SWAP_BUILD=/swap-build.img
HEAP_MB="${BUILD_HEAP_MB:-2048}"

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
