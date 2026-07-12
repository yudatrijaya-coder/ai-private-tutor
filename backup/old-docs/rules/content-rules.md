# Content Agent — Safety Rules & Guardrails

> **Priority: HIGH** — Scraping dari internet. Sumber konten mentah untuk semua agent hilir.

## 1. Content Filtering

### 1.1 Pre-Scrape Domain Check
Hanya scrape dari domain yang di-approve. Cek sebelum scraping:

```typescript
const SCRAPE_DOMAIN_BLOCKLIST = [
  '*.porn.*', '*.xxx', 'dewasa.*', 
  'forum.*', 'chat.*', 'social.*',
  'wiki.*',  // Wikipedia: boleh sementara, tapi bukan sumber utama
  'blogspot.com', 'wordpress.com',  // hanya kalau verified educational
];

const SCRAPE_DOMAIN_ALLOWLIST = [
  '*.kemdikbud.go.id',
  '*.kemendikbud.go.id',
  '*.sch.id',
  '*.ac.id',
  'rumahbelajar.id',
  'sibbelajar.kemdikbud.go.id',
  'buku.kemdikbud.go.id',
];
```

- Kalau domain gak ada di allowlist → flag `unreviewed_domain` → manual review
- Kalau domain di blocklist → reject, jangan scrape

### 1.2 Post-Scrape Content Filter
Setiap hasil scrape wajib di-filter sebelum disimpan:

```typescript
async function filterContent(raw: string): Promise<FilterResult> {
  const blocked = [
    'dewasa', 'porno', 'bokep', 'sex', 'nude',
    'judi', 'slot online', 'togel',
    'narkoba', 'obat terlarang',
    // regex patterns for adult ads, malicious scripts
  ];
  
  const symbols = [
    'sex', 'porn', 'adult', 'casino', 'gambling',
    'pharmacy', 'viagra', 'crypto', 'forex signal',
  ];
  
  // Check content
  const violations = blocked.filter(w => raw.toLowerCase().includes(w));
  const symbolViolations = symbols.filter(s => raw.toLowerCase().includes(s));
  
  if (violations.length > 0 || symbolViolations.length > 2) {
    return { status: 'rejected', reason: 'CONTENT_BLOCKED', violations };
  }
  
  return { status: 'approved' };
}
```

### 1.3 Image/Media Safety
- Gambar yang di-extract dari halaman → scan URL
- Kalau URL mencurigakan (domain gak dikenal, ekstensi aneh) → jangan simpan
- download image → simpan sebagai reference, jangan embed langsung dari source

## 2. Scraping Ethics

### 2.1 Rate Limiting
```typescript
const RATE_LIMITS = {
  'kemdikbud.go.id': { max_req_per_min: 5, delay_ms: 12000 },
  'sch.id': { max_req_per_min: 3, delay_ms: 20000 },
  'ac.id': { max_req_per_min: 5, delay_ms: 12000 },
  'default': { max_req_per_min: 3, delay_ms: 20000 },
};
```

- Jangan overload server sekolah
- Wajib set User-Agent yang jelas: `AIPrivateTutor/1.0 (Educational Bot)`
- Hormati `robots.txt`

### 2.2 Jangan Scrape Data Pribadi
- Halaman yang mengandung data siswa/guru (nama, foto, alamat) → skip
- Flag `contains_personal_data` → jangan simpan

### 2.3 No Deep Crawl
- Cuma scrape halaman yang explicit di URL list
- Jangan crawl internal link tanpa batas
- Max depth: 2 klik dari halaman utama

## 3. Content Integrity

### 3.1 Multi-Source Verification
- Setiap topik minimal dari 2 sumber berbeda
- Kalau kedua sumber kontradiktif → flag `content_conflict` → Curriculum Agent decide
- Simpan semua source_url (bisa dicek parent)

### 3.2 No Hallucination
- Content Agent hanya **mengekstrak**, **bukan meringkas dengan interpretasi sendiri**
- Ringkasan / processed_content → tugas Curriculum Agent (verification step)
- Content Agent dilarang menambah interpretasi ke raw_content

### 3.3 Attribution
- Setiap raw_content wajib disimpan dengan `source_url` asli
- Student/parent bisa klik link ke sumber asli

## 4. Error Handling

### 4.1 Scrape Failure Flow
```typescript
if (scrapeFailed) {
  if (attempt < MAX_RETRY) {
    // Try next source
    queueRetry({ delay: RETRY_DELAY * attempt, newSource: true });
  } else {
    // All sources failed
    flagMaterial('scrape_failed');
    notifyGuardian(`Scrape gagal: ${topic} - semua ${sourceCount} sumber tidak dapat diakses`);
  }
}
```

### 4.2 Partial Content
Kalau konten terpotong / kurang lengkap:
- Flag `partial_content: true`
- Tambah note: "Konten mungkin tidak lengkap — dari [source] hanya mencakup [X%]"
- Curriculum Agent akan tentuin apakah perlu scrape ulang
