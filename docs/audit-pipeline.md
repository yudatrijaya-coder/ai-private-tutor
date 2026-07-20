# Audit Pipeline — 2026-07-19

## Design Spec (docs/designs/2026-07-04-ai-private-tutor-design.md)
Pipeline yang benar:
```
SIBI PDF / Moodle PDF / Web
  → content:scrape (raw_content)
  → curriculum:review (processed_content)
  → assessment:generate (quiz dari processed_content)
  → media:render (video dari processed_content)
```

## Kondisi Aktual
Semua konten (slide, quiz, mindmap, YouTube) digenerate **LLM dari nama topik saja**
— Tidak ada PDF SIBI/modul Moodle yang diparse sebagai sumber konten.
— Buku SIBI PDF dan modul Moodle cuma link download — isinya tidak pernah diproses.

## Dampak
- 661 slide "karangan" LLM (bukan dari buku resmi)
- 919 quiz "karangan" LLM (bukan dari sumber)
- Akurasi konten tidak terjamin
- User mengira konten berasal dari SIBI/modul sekolah

## Keputusan
1. Perbaiki pelan-pelan, mulai dari **content agent** — parse PDF SIBI + modul Moodle sebagai sumber konten
2. Setiap langkah harus dicatat di file ini
3. Tidak generate konten LLM tanpa sumber referensi

## Langkah Selanjutnya
| Step | Status |
|:-----|:-------|
| 1. Implementasi content agent — parser PDF SIBI | ✅ |
| 2. Cocokin chapter dengan topic (match SIBI bab → curriculum-topics.ts) | ✅ |
| 3. Regenerate slide dari konten nyata (SIBI raw_content) | ✅ |
| 4. Regenerate quiz dari konten nyata | ❌ |
| 5. Regenerate mindmap dari konten nyata | ❌ |
| 6. Hapus konten lama yang LLM-generated | ❌ |