# Media Agent — Safety Rules & Guardrails

> **Priority: MEDIUM** — Visual yang dilihat anak. Karakter & konten video.

## 1. Character Safety

### 1.1 Character Approval
```typescript
const APPROVED_CHARACTER_TYPES = [
  'athlete',       // Mbappe, Ronaldo, dll
  'kpop_idol',     // Lisa BLACKPINK (only Lisa confirmed by user)
  'cartoon',       // kartun mainstream
  'mascot',        // maskot, hewan, robot
  'generic',       // Kak Budi/Dewi/Raka
];

const BLOCKED_CHARACTER_TYPES = [
  'political_figure',
  'religious_figure',
  'adult_entertainer',
  'controversial_figure',
  'horror_character',
  'weapon_mascot',
];
```

- Kalau student request karakter yang di-block → Tutor Agent tolak halus
- Kalau ragu → parent approval required

### 1.2 Character Image Safety
- Gambar karakter dari internet wajib di-scan (NSFW detection)
- Kalau terdeteksi NSFW → jangan pake, fallback ke generic
- Simpan gambar karakter di server lokal, jangan hotlink dari source eksternal

## 2. Video Content Safety

### 2.1 Script Review
Sebelum render, script harus lulus review:
- ✅ Sesuai processed_content (tidak menambahkan fakta baru)
- ✅ Mengandung karakter dengan pantas (tidak mengejek/memparodikan)
- ✅ Tidak ada referensi dewasa/kasar
- ✅ Sesuai grade level (SD: sederhana, SMA: boleh kompleks)

Kalau gagal review → return ke LLM untuk regenerate dengan instruksi lebih strict.

### 2.2 Audio/TTS Safety
- TTS hanya untuk narasi edukasi
- Dilarang: mimic suara asli artis tanpa consent
- Dilarang: suara bernada sarkas, marah, mengejek
- Wajib: nada ceria untuk SD, netral-positif untuk SMP/SMA

### 2.3 Visual Safety
- Tidak boleh ada visual yang: mengerikan, kekerasan, dewasa
- Slide background: warna pastel/cerah untuk SD, netral untuk SMP/SMA
- Animasi: halus, tidak menyilaukan (no strobo effect — epilepsi safety)
- Karakter overlay: proporsional, friendly pose

### 2.4 Background Music
- Hanya dari royalty-free library yang sudah diverifikasi
- Volume: < 30% dari volume narasi (jangan ganggu)
- Per grade: SD → playful instrumental, SMP → lofi upbeat, SMA → ambient fokus

## 3. YouTube Safety

### 3.1 Upload Config
```typescript
const YOUTUBE_UPLOAD_CONFIG = {
  privacy: 'unlisted',         // Jangan public — cuma student & parent
  comments: 'disabled',        // Matikan komentar (child safety)
  madeForKids: true,           // YouTube COPPA compliance
  monetization: 'disabled',    // Gak monetize
  category: 'Education',
};
```

- Upload WAJIB `madeForKids: true` untuk SD content
- Deskripsi: cuma link web dashboard + "Video edukasi untuk [student]"

### 3.2 YouTube Reference Safety
Kalau cari YouTube reference sebagai fallback:
- Filter: cuma video edukasi Indonesia
- Durasi: 3-15 menit
- Channel: verified / high subscriber / trusted (kemdikbud, zenius, ruangguru, dll)
- Kalau channel gak dikenal → flag `unverified_yt_source`

## 4. Rendering Safety

### 4.1 Resource Guard
- Max 1 render concurrent (CPU/GPU safety)
- Kalau queue numpuk > 5 → Guardian notif: "Media render queue overflow"
- Render timeout: 30 menit per video. Kalau lebih → kill + retry

### 4.2 File Cleanup
- Delete slide assets, audio temp files setelah upload
- Cuma simpan: video URL, thumbnail URL, script (di DB)
- Gak ada file video besar di server
