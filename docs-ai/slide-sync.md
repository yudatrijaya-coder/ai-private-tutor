# Slide Sync from rawContent to metadata

> Terakhir update: 31 Juli 2026

## Problem

Frontend membaca `metadata->>'slide'` untuk menampilkan slide konten. Tapi 30 material Raihan (Biologi 10, Geografi 10, Sejarah 10) hanya punya `rawContent` — kolom `metadata`-nya tidak punya key `slide`.

## Fix

Sync langsung via SQL:

```sql
UPDATE "Material" m
SET metadata = jsonb_set(
  COALESCE(m.metadata, '{}'),
  ARRAY['slide'],
  to_jsonb(m."rawContent")
)
WHERE m."rawContent" IS NOT NULL
  AND m."rawContent" != ''
  AND (m.metadata->>'slide') IS NULL;
```

**Result:** `UPDATE 30` — semua material Raihan sekarang punya slide.

## Key Insight

- Key yang benar adalah `metadata.slide` (singular), bukan `metadata.slides` (plural)
- 561 material total punya `rawContent`; 1114 punya `metadata->>'slide'`
- Setelah sync: 1144/1144 punya slide (0 gap)
