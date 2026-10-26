#!/usr/bin/env bash
#
# harden-vps.sh — tutup brute-force SSH, hentikan crash-loop, bersihkan /var/log
#
# Dijalankan sebagai ROOT di VPS:  sudo bash scripts/harden-vps.sh
#
# Kenapa skrip ini ada
# --------------------
# Sampai 2026-10-26 VPS ini menerima ~900.000 percobaan login SSH yang gagal
# (519.155 di /var/log/btmp, 381.284 di btmp.1) karena tiga hal terbuka sekaligus:
# PasswordAuthentication yes, PermitRootLogin yes, dan fail2ban mati. Tidak ada
# bukti ada yang berhasil masuk, tapi peluangnya nyata.
#
# Prinsip skrip ini: JANGAN PERNAH mengunci diri sendiri di luar VPS.
# Setiap perubahan yang berisiko memutus akses diverifikasi dulu, dan ada
# rollback otomatis kalau verifikasi gagal.
#
# Yang dikerjakan, berurutan:
#   1. Preflight   — pastikan ada SSH key yang bisa dipakai, dan config valid
#   2. fail2ban    — pasang + aktifkan untuk sshd
#   3. sshd        — matikan login password & root, dengan rollback otomatis
#   4. annisa      — hentikan service yang crash-loop 44.817 kali
#   5. /var/log    — batasi journal + kosongkan btmp
#
# Bisa dijalankan berulang (idempoten).

set -euo pipefail

# ── Konfigurasi ──────────────────────────────────────────────────────
SSHD_CONFIG="/etc/ssh/sshd_config"
DROPIN_DIR="/etc/ssh/sshd_config.d"
# (drop-in sengaja TIDAK dipakai — lihat catatan di langkah 3)
JOURNALD_CONF="/etc/systemd/journald.conf.d/99-size.conf"
AUTHORIZED_KEYS="/home/ubuntu/.ssh/authorized_keys"
CRASH_SERVICE="annisa-gateway.service"
JOURNAL_MAX="${JOURNAL_MAX:-200M}"

# ── Helper ───────────────────────────────────────────────────────────
c_red=$'\033[31m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_rst=$'\033[0m'
step() { printf '\n%s==> %s%s\n' "$c_grn" "$*" "$c_rst"; }
warn() { printf '%s  WARN: %s%s\n' "$c_ylw" "$*" "$c_rst"; }
die()  { printf '%s  FAIL: %s%s\n' "$c_red" "$*" "$c_rst" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "harus dijalankan sebagai root: sudo bash $0"

# ── 1. Preflight ─────────────────────────────────────────────────────
step "1/5 Preflight"

# Jangan pernah matikan login password kalau tidak ada key yang bisa dipakai.
if [[ ! -s "$AUTHORIZED_KEYS" ]]; then
  die "$AUTHORIZED_KEYS kosong atau tidak ada.
       Menonaktifkan PasswordAuthentication sekarang akan mengunci kamu di luar VPS.
       Pasang SSH key dulu, lalu jalankan ulang skrip ini."
fi
key_count=$(grep -cE '^(ssh-|ecdsa-)' "$AUTHORIZED_KEYS" || true)
[[ "$key_count" -ge 1 ]] || die "tidak ada SSH key yang valid di $AUTHORIZED_KEYS"
echo "  SSH key terpasang: $key_count"
awk '{printf "    %s ... %s\n", $1, $NF}' "$AUTHORIZED_KEYS"

# Validasi config SEBELUM menyentuh apa pun. sshd -t menolak file yang rusak.
/usr/sbin/sshd -t || die "sshd_config saat ini sudah tidak valid — perbaiki dulu sebelum lanjut"
echo "  sshd_config valid"

# Pastikan cloud-init tidak akan menimpa setelan kita di reboot berikutnya.
if [[ -f "$DROPIN_DIR/50-cloud-init.conf" ]]; then
  warn "$DROPIN_DIR/50-cloud-init.conf ada dan dibaca SEBELUM drop-in kita.
        Kalau isinya menyalakan PasswordAuthentication, setelan kita bisa kalah.
        Cek dengan: sudo cat $DROPIN_DIR/50-cloud-init.conf"
fi

# Apakah kita sedang di dalam sesi SSH? Kalau ya, beri peringatan eksplisit.
if [[ -n "${SSH_CONNECTION:-}" ]]; then
  warn "kamu sedang terhubung lewat SSH (${SSH_CONNECTION}).
        JANGAN tutup sesi ini sampai verifikasi di langkah 3 selesai."
fi

# ── 2. fail2ban ──────────────────────────────────────────────────────
step "2/5 fail2ban"

if ! command -v fail2ban-client >/dev/null 2>&1; then
  echo "  memasang fail2ban..."
  DEBIAN_FRONTEND=noninteractive apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban
else
  echo "  fail2ban sudah terpasang"
fi

cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled  = true
port     = ssh
backend  = systemd
maxretry = 4
findtime = 10m
bantime  = 1h
EOF

systemctl enable --now fail2ban
systemctl restart fail2ban
sleep 2
fail2ban-client status sshd || warn "jail sshd belum aktif — cek: journalctl -u fail2ban -n 50"

# ── 3. sshd: matikan password & root login, dengan rollback ───────────
step "3/5 sshd hardening"

mkdir -p "$DROPIN_DIR"
BACKUP_DIR="/root/sshd-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -a "$SSHD_CONFIG" "$BACKUP_DIR/"
cp -a "$DROPIN_DIR" "$BACKUP_DIR/" 2>/dev/null || true
echo "  backup config: $BACKUP_DIR"

# PENTING — dua hal yang membuat pendekatan naif gagal di mesin ini.
#
# 1. sshd memakai nilai PERTAMA yang ditemukan ("for each keyword, the first
#    obtained value will be used" — sshd_config(5)). Di file ini
#    `Include /etc/ssh/sshd_config.d/*.conf` ada di baris 12, jadi drop-in
#    di sshd_config.d/ dibaca PALING AWAL dan akan MENGALAHKAN
#    `PasswordAuthentication yes` di baris 123. Itulah sebabnya skrip ini
#    mengedit sshd_config langsung, bukan menaruh drop-in.
#
# 2. Karena yang pertama menang, cukup ada SATU baris aktif di dekat atas file
#    untuk mengunci perilaku.
#
set_sshd_option() {
  local key="$1" value="$2" file="$SSHD_CONFIG"

  # Hapus baris aktif lama (bukan komentar) agar tidak ada duplikat yang
  # saling bertentangan.
  sed -i -E "/^[[:space:]]*${key}[[:space:]]+/Id" "$file"

  # Sisipkan satu baris aktif sebagai baris pertama file. Aman karena belum
  # ada blok `Match` (sudah diperiksa di preflight); kalau nanti ada, baris
  # ini harus dipindah ke atas blok Match pertama.
  sed -i "1i ${key} ${value}" "$file"
}

# Drop-in lain ikut dibaca lebih awal lagi (baris 12), jadi nyalakan saja
# pemeriksaan: kalau ada yang menyalakan PasswordAuthentication, matikan.
for f in "$DROPIN_DIR"/*.conf; do
  [[ -e "$f" ]] || continue
  if grep -qiE '^[[:space:]]*PasswordAuthentication[[:space:]]+yes' "$f" 2>/dev/null; then
    warn "$f menyalakan PasswordAuthentication — dinonaktifkan juga di file itu"
    sed -i -E 's|^[[:space:]]*PasswordAuthentication.*$|PasswordAuthentication no|I' "$f"
  fi
done

set_sshd_option PasswordAuthentication no
set_sshd_option KbdInteractiveAuthentication no
set_sshd_option PermitRootLogin no
set_sshd_option PubkeyAuthentication yes
set_sshd_option MaxAuthTries 4

# sshd -t memvalidasi seluruh config (termasuk include). Kalau rusak, batalkan
# sebelum ada restart: proses yang berjalan belum tersentuh.
if ! /usr/sbin/sshd -t; then
  cp -a "$BACKUP_DIR/sshd_config" "$SSHD_CONFIG"
  die "config hasil edit tidak valid — dikembalikan, sshd TIDAK direstart."
fi
echo "  config valid"

restart_ssh() {
  # Pada Ubuntu 24.04, ssh bisa jalan sebagai socket-activated. Restart keduanya
  # kalau ada, supaya drop-in benar-benar terbaca.
  systemctl restart ssh.service 2>/dev/null || true
  systemctl restart ssh.socket  2>/dev/null || true
}

restart_ssh
sleep 2

# Verifikasi ke proses sshd yang benar-benar berjalan, bukan hanya ke file.
verify_sshd() {
  local eff
  eff="$(/usr/sbin/sshd -T 2>/dev/null || true)"
  grep -qi '^passwordauthentication no' <<<"$eff" \
    && grep -qi '^permitrootlogin no' <<<"$eff"
}

if verify_sshd; then
  echo "  terverifikasi: password auth OFF, root login OFF"
else
  warn "setelan belum berlaku — restart ulang"
  restart_ssh
  sleep 3
  if verify_sshd; then
    echo "  terverifikasi setelah restart kedua"
  else
    echo "  ROLLBACK: sshd menolak setelan baru. Mengembalikan config awal."
    cp -a "$BACKUP_DIR/sshd_config" "$SSHD_CONFIG"
    [[ -d "$BACKUP_DIR/sshd_config.d" ]] && cp -a "$BACKUP_DIR/sshd_config.d/." "$DROPIN_DIR/" 2>/dev/null || true
    restart_ssh
    die "rollback selesai — SSH kembali seperti semula, kamu tidak terkunci di luar."
  fi
fi

# Uji bahwa port SSH masih mendengarkan.
if ss -tln | grep -qE ':22\s'; then
  echo "  port 22 masih listening"
else
  warn "port 22 tidak terlihat listening — JANGAN tutup sesi ini, cek: systemctl status ssh"
fi

cat <<EOF

  ┌──────────────────────────────────────────────────────────────────┐
  │  SEBELUM MENUTUP SESI INI, UJI DARI TERMINAL LAIN:               │
  │                                                                  │
  │    ssh -i <private-key> -o PreferredAuthentications=publickey \\  │
  │        ubuntu@43.133.151.242                                     │
  │                                                                  │
  │  Berhasil → aman, sesi ini boleh ditutup.                        │
  │  Gagal    → rollback, selagi sesi ini masih terbuka:             │
  │      sudo cp -a $BACKUP_DIR/sshd_config $SSHD_CONFIG             │
  │      sudo systemctl restart ssh                                  │
  └──────────────────────────────────────────────────────────────────┘
EOF

# ── 4. Hentikan service yang crash-loop ──────────────────────────────
step "4/5 $CRASH_SERVICE"

if systemctl list-unit-files | grep -q "^${CRASH_SERVICE}"; then
  restarts="$(systemctl show "$CRASH_SERVICE" -p NRestarts --value 2>/dev/null || echo 0)"
  echo "  restart counter: $restarts"
  systemctl disable --now "$CRASH_SERVICE" 2>/dev/null || true
  echo "  service dimatikan dan di-disable"
  echo "  penyebabnya: EnvironmentFile=/home/ubuntu/.hermes/profiles/annisa/.env tidak ada."
  echo "  kalau gateway itu masih dibutuhkan, buat profil + .env-nya dulu, lalu enable lagi."
else
  echo "  unit tidak ada — dilewati"
fi

# ── 5. Bersihkan /var/log ────────────────────────────────────────────
step "5/5 /var/log"

echo "  journal sebelum: $(journalctl --disk-usage 2>/dev/null | tail -1)"
mkdir -p "$(dirname "$JOURNALD_CONF")"
cat > "$JOURNALD_CONF" <<EOF
[Journal]
SystemMaxUse=$JOURNAL_MAX
SystemKeepFree=1G
EOF
journalctl --vacuum-size="$JOURNAL_MAX" || warn "vacuum gagal"
systemctl restart systemd-journald
echo "  journal sesudah: $(journalctl --disk-usage 2>/dev/null | tail -1)"

# btmp mencatat login gagal; isinya sudah tidak diperlukan dan besarnya ratusan MB.
if [[ -f /var/log/btmp ]]; then
  before=$(du -h /var/log/btmp | cut -f1)
  truncate -s0 /var/log/btmp
  echo "  /var/log/btmp dikosongkan (sebelumnya $before)"
fi
if [[ -f /var/log/btmp.1 ]]; then
  rm -f /var/log/btmp.1
  echo "  /var/log/btmp.1 dihapus"
fi

# ── Ringkasan ────────────────────────────────────────────────────────
step "Selesai"
echo "  disk:        $(df -h / | awk 'NR==2 {print $3" / "$2" ("$5")"}')"
echo "  fail2ban:    $(fail2ban-client status sshd 2>/dev/null | grep -i 'currently banned' || echo 'tidak aktif')"
echo "  passwordauth: $(/usr/sbin/sshd -T 2>/dev/null | grep -i '^passwordauthentication' || echo '?')"
echo "  permitroot:   $(/usr/sbin/sshd -T 2>/dev/null | grep -i '^permitrootlogin' || echo '?')"
echo
echo "  Rollback penuh tersedia di: $BACKUP_DIR"
