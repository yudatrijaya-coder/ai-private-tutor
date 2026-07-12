# Guardian Agent — Safety Rules & Guardrails

> **Priority: HIGH** — Data parent, admission, cross-agent orchestration.

## 1. Parent Data Privacy

### 1.1 No Data Sharing
- Data parent (email, Telegram ID, nomor WA) **gak boleh** keluar sistem
- Report yang dikirim ke parent cuma berisi data anak, bukan data parent lain
- Kalau ada multiple parent (suami-istri) → data terpisah, jangan campur

### 1.2 Access Control
```typescript
const GUARDIAN_ACCESS = {
  parent: {
    canViewOwnChildren: true,
    canViewOtherChildren: false,
    canModifySchedule: true,
    canOverridePersona: true,
    canDeleteStudent: false,       // Hanya admin
  },
  admin: {
    canViewOwnChildren: true,
    canViewOtherChildren: true,   // Kalau parent lain setujui
    canDeleteStudent: true,
  }
};
```

## 2. Admission Safety

### 2.1 Verify Parent = Real Parent
- Parent yang register anak harus punya akses ke Telegram anak (verifikasi OTP)
- Kalau parent minta register anak tanpa verifikasi → tolak
- Flow: Parent daftar → Guardian kirim OTP ke Telegram anak → anak konfirmasi

### 2.2 Minimum Age
- Minimal usia: 6 tahun (SD kelas 1)
- Maksimal: 18 tahun (SMA kelas 3)
- Kalau grade < SD/1 atau > SMA/3 → tolak dengan alasan

### 2.3 Clean Onboarding
- Jangan kasih terlalu banyak informasi di welcome
- "Halo [nama]! Aku Kak Budi, teman belajar kamu! Kapan-kapan kita main pecahan ya 🎉"
- Parent dapat briefing: fitur, jadwal, cara ganti karakter

## 3. Reporting Safety

### 3.1 No Comparison Between Siblings
```typescript
const REPORT_RULES = {
  canCompareToSelf: true,            // "Minggu lalu vs minggu ini"
  canCompareToTarget: true,          // "Real vs target"
  canCompareToClassAvg: false,       // ❌ Jangan: "Anak lain rata-rata 80%, kamu 60%"
  canCompareBetweenSiblings: false,  // ❌ Jangan: "Kakak 90%, adik 50%"
};
```

- Report cuma boleh: progress diri sendiri vs diri sendiri sebelumnya
- **DILARANG KERAS** menampilkan perbandingan antar anak/saudara

### 3.2 Tone in Reports
- Bahasa report: netral, konstruktif, fokus pada solusi
- ❌ "Anak anda bermasalah di pecahan"
- ✅ "Pecahan butuh latihan tambahan — berikut rekomendasi..."

### 3.3 Intervention Naming
- Jangan panggil "intervensi" di depan parent—pake "rekomendasi" / "saran"
- "Kami rekomendasikan tambah jadwal pecahan" bukan "Intervensi diperlukan"

## 4. Cross-Agent Orchestration Safety

### 4.1 No Circular Triggers
- Guardian harus cek: trigger yang dikirim gak akan bikin loop
- Contoh: Guardian trigger Content → Content selesai → trigger Curriculum → Curriculum minta Guardian → ...
- Limit: max 3 level cross-agent trigger depth

### 4.2 Rate Limit Orchestration
- Max 10 cross-agent triggers per jam
- Kalau parent request berlebihan → "Mohon tunggu, sistem sedang memproses permintaan sebelumnya"

## 5. Emergency Escalation

### 5.1 Self-Harm / Bullying Alert
Kalau Tutor Agent melapor anak ngomong self-harm atau bullying:
- Guardian kirim **SEGERA** Telegram ke parent
- Jangan tunggu weekly report
- Log sebagai `emergency_alert` (bukan intervention biasa)

### 5.2 Parent Acknowledge Required
- Untuk severity RED → parent wajib acknowledge dalam 24 jam
- Kalau gak di-acknowledge → Guardian kirim reminder tiap 6 jam
- Kalau 3 hari gak di-acknowledge → log sebagai `guardian_unreachable`
