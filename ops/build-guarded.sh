#!/usr/bin/env bash
#
# Build dengan batas memori keras (cgroup v2) agar tidak mematikan VPS.
#
# Kenapa ada
# ----------
# `next build` di host ini butuh ~2.6 GB RSS (tercatat di ops/build.sh:
# `anon-rss:2614644kB`). Pada 2026-10-27 build yang dijalankan tanpa batas
# membuat VPS kehabisan memori dan mati, dan karena `.next` sudah dihapus lebih
# dulu, situs tertinggal 502.
#
# `--max-old-space-size` saja tidak cukup: itu hanya heap V8, bukan total RSS
# (worker, source map, buffer native). Dengan cgroup, kernel membatasi seluruh
# pohon proses build. Kalau terlampaui, yang dibunuh hanya proses build.
#
# Catatan penting soal swap:
# `memory.max` membatasi RAM, bukan RAM+swap. Swap sengaja dibiarkan terbuka
# (`memory.swap.max=max`) supaya build boleh meluber ke /swap-build.img, bukan
# dibunuh cgroup sendiri. RAM host tetap aman karena build tidak bisa memakai
# lebih dari BUILD_MEM_MAX.
#
# Kenapa lewat systemd-run:
# shell ini berjalan di /system.slice/herdr.service, dan cgroup v2 melarang
# proses tanpa privilese pindah antar-slice. `systemd-run --user --scope`
# membuat scope di dalam user@1000.service, jadi batas memori terpasang sejak
# proses lahir.
#
# Usage: bash ops/build-guarded.sh
#   BUILD_MEM_MAX=2800M   batas RAM untuk seluruh pohon proses build
#   BUILD_HEAP_MB=2048    diteruskan sebagai --max-old-space-size
set -euo pipefail

cd "$(dirname "$0")/.."

MEM_MAX="${BUILD_MEM_MAX:-2800M}"
HEAP_MB="${BUILD_HEAP_MB:-2048}"

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/1000}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=/run/user/1000/bus}"

echo "==> build dalam cgroup (MemoryMax=$MEM_MAX, swap diizinkan)"
echo "    heap V8 dibatasi ${HEAP_MB}M"

BUILD_HEAP_MB="$HEAP_MB" \
systemd-run --user --scope --quiet \
  -p MemoryMax="$MEM_MAX" \
  -p MemorySwapMax=infinity \
  -p MemoryAccounting=yes \
  bash -c 'exec bash ops/build.sh'
