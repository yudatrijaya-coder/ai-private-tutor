# Curriculum Agent — Safety Rules & Guardrails

> **Priority: HIGH** — Menentukan APA yang dipelajari anak. Kalau salah, dampaknya panjang.

## 1. Source Integrity

### 1.1 Hanya dari Sumber Terverifikasi
Curriculum Agent hanya boleh mengambil data kurikulum dari:

```typescript
const APPROVED_SOURCES = {
  sd: [
    'kemdikbud.go.id',
    'kurikulum.kemdikbud.go.id',
    'static.kemdikbud.go.id',
    'sibbelajar.kemdikbud.go.id',
  ],
  smp: [
    'kemdikbud.go.id',
    'kurikulum.kemdikbud.go.id',
    'static.kemdikbud.go.id',
  ],
  sma: [
    'kemdikbud.go.id',
    'kurikulum.kemdikbud.go.id',
  ]
};
```

- Kalau sumber di luar daftar → flag `unverified_source` → manual review
- Kalau sumber kontradiktif (2 sumber beda topik) → ambil dari sumber prioritas tertinggi

### 1.2 No Non-Educational Content
Curriculum draft tidak boleh mengandung:
- Iklan / sponsored content
- Konten politik / agama ekstrim
- Pseudoscience (homeopathy, flat earth, dll)
- Konten dewasa

### 1.3 Versioning
Setiap perubahan kurikulum harus:
- Tandai `version` (increment otomatis)
- Simpan `changelog` (apa yang berubah, kenapa)
- Notif Guardian Agent: "[student] kurikulum update v2 → topik baru: [list]"

## 2. Grade-Level Appropriateness

### 2.1 Strict Grade Mapping
```typescript
const GRADE_LEVELS = {
  'SD/5': {
    subjects: ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'PPKn', 'SBdP', 'PJOK'],
    max_depth: 'basic',
    forbidden: ['trigonometri', 'fisika kuantum', 'ekonomi makro', 'reaksi kimia',
                'sejarah politik mendalam', 'debat ideologi'],
    complexity_level: 'SD'
  },
  'SMP/1': {
    max_depth: 'intermediate',
    forbidden: ['kalkulus', 'fisika nuklir', 'ekonomi mikro'],
    complexity_level: 'SMP'
  },
  'SMA/2': {
    max_depth: 'advanced',
    forbidden: [],  // almost anything goes, within reason
    complexity_level: 'SMA'
  }
};
```

- Curriculum Agent harus cek: topik masuk range kelas ini?
- Kalau ragu → cari referensi silabus resmi dulu

### 2.2 Prerequisite Chain
- Topik B gak boleh diajarin sebelum topik A kalau A adalah prerequisite
- Contoh: "Persamaan Linear" sebelum "Sistem Persamaan Linear Dua Variabel"
- Curriculum Agent harus maintain `prerequisites` di draft

## 3. Safety in Drafting

### 3.1 Topic Sensitivity Review
Sebelum finalisasi draft, scan tiap topik:
```typescript
const SENSITIVE_TOPIC_TAGS = [
  'evolusi'           → SD: skip, SMP: factual only, SMA: factual only
  'reproduksi'        → SD: skip, SMP: scientific terms only, SMA: full coverage
  'perang'            → factual chronology, no glorification
  'agama'             → PPKn only, comparative with neutrality
  'politik'           → PPKn only, factual system explanation
];
```

### 3.2 No Extraneous Load
- Jangan assign > 15 sub-topik per minggu (max sesuai kapasitas jadwal)
- Kalau student dilebihi → Curriculum Agent notif Guardian

## 4. Delivery Classification Safety

### 4.1 Video Classification Rules
Topik WAJIB video kalau:
- Membutuhkan demonstrasi visual (percobaan IPA, geometri 3D)
- Proses / urutan (siklus air, sistem pencernaan)
- Konsep abstrak yang susah dijelaskan teks (gaya gravitasi, medan magnet)

Topik WAJIB text/PDF kalau:
- Definisi murni, tabel, rumus statis
- Bacaan panjang (sejarah, biografi)

Topik BISA video ATAU text → pilih berdasarkan kapasitas render queue.
