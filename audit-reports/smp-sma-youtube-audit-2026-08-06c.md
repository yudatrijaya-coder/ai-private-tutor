# SMP/SMA YouTube Mapping — Audit Report
**Date:** 2026-08-06 10:02 UTC
**Auditor:** Hermes Agent (scheduled cron)
**Files audited:** `src/data/youtube-smp7.ts`, `src/data/youtube-sma11.ts`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total links checked | **220** |
| SMP_7 links | 91 (39 topics) |
| SMA_11 links | 129 (57 topics) |
| Duplicate video IDs | **0** (all 220 unique) |
| **Issues found** | **3** (all pending fix) |
| Previously fixed | **1** (`lPqPfLz3ppY` topic label corrected) |

All 220 links are live and accessible. 3 genuine issues remain unfixed.

---

## 1. Link Inventory

```
youtube-smp7.ts  — 91 URLs  (source file: 649 lines)
youtube-sma11.ts — 129 URLs (source file: 919 lines)
─────────────────────────────────────────────────────
Total             220 URLs  (all unique, no duplicates)
```

No duplicate video IDs within files or across files.

---

## 2. Issue Status (from prior audit 2026-08-06)

### ✅ Already Fixed
| Video ID | File | Issue | Fix Applied |
|----------|------|-------|-------------|
| `lPqPfLz3ppY` | `youtube-sma11.ts` | Topic label said "Perubahan Sosial" but video is "Permainan Bola Besar" | Topic corrected to `topic: "Permainan Bola Besar"` under PJOK section |

### 🔴 Still Pending — 3 Issues

#### A. `OZAdSVoMnh4` — Topic mislabeling (`youtube-smp7.ts`, line 203)

| Field | Value |
|-------|-------|
| **Topic assigned** | `Hal Baik bagi Tubuh` |
| **File title** | `Teks Prosedur Bahasa Indonesia Kelas 7 SMP Kurikulum Merdeka` |
| **Channel** | Dian Sri Utami |
| **Actual subject** | Bahasa Indonesia |
| **Correct subject** | PJOK — Kebugaran Jasmani / Pola Hidup Sehat |
| **Issue** | "Hal Baik bagi Tubuh" is SMP Kelas 7 PJOK Bab 3 (pola hidup sehat); this video is Bahasa Indonesia Teks Prosedur from a different channel |

In Kurikulum Merdeka, Bahasa Indonesia Kelas 7 Bab 3 IS "Hal yang Baik bagi Tubuh" (Teks Prosedur), so the **topic label** is technically correct for Bahasa Indonesia. The problem is the video was likely intended as a PJOK video for a different "Hal Baik bagi Tubuh" topic slot, but it's actually the same Bahasa Indonesia content from another channel.

**Fix options:**
1. Replace with a genuine **PJOK Kebugaran Jasmani / Pola Hidup Sehat SMP Kelas 7** video
2. Or leave as-is if Bahasa Indonesia is the intended subject — but then add a note or separate entry for PJOK coverage

#### B. `ushsEHIzvTY` — Grade mismatch (`youtube-sma11.ts`, line 513)

| Field | Value |
|-------|-------|
| **Topic assigned** | `Interaksi Sosial` |
| **File title** | `Interaksi Sosial di Masyarakat | Sosiologi SMA - Eduraya Mengajar` |
| **Actual YouTube title** | `Interaksi sosial di masyarakat | Sosiologi **Kelas 10** - EDURAYA MENGAJAR` |
| **Channel** | Eduraya Teknologi |
| **Issue** | Video is Sosiologi Kelas **10** (Bab 1), not Kelas 11 |

In Kurikulum Merdeka Sosiologi SMA, "Interaksi Sosial" is Bab 1 of Kelas 10. SMA Kelas 11 Sosiologi covers different topics.

**Fix:** Replace with a genuine **SMA Kelas 11 Sosiologi** video on Interaksi Sosial / Interaksi Antarindividu.

#### C. `FH-GCEiGk-Y` — Grade mismatch (`youtube-sma11.ts`, line 567)

| Field | Value |
|-------|-------|
| **Topic assigned** | `Perubahan Sosial` |
| **File title** | `PENGERTIAN DAN KARAKTERISTIK PERUBAHAN SOSIAL - Materi Sosiologi SMA` |
| **Actual YouTube title** | `PENGERTIAN DAN KARAKTERISTIK PERUBAHAN SOSIAL - Materi Sosiologi **Kelas 12** SMA` |
| **Channel** | Teras Sosial |
| **Issue** | Video is Sosiologi Kelas **12**, not Kelas 11 |

The video explicitly states it is for Kelas 12. SMA Kelas 11 Sosiologi does cover "Perubahan Sosial" but under the "Globalisasi" theme.

**Fix:** Replace with a genuine **SMA Kelas 11 Sosiologi** video on Perubahan Sosial / Globalisasi.

---

## 3. Topic Coverage Summary

### SMP_7 (91 videos, 39 topics)
| Subject | Topics | Videos |
|---------|--------|--------|
| IPA | 7 | 21 |
| Bahasa Indonesia | 7 | 14 |
| Matematika | 9 | 18 |
| IPS | 6 | 12 |
| Informatika | 4 | 8 |
| PJOK | 4 | 8 |
| Bahasa Inggris | 1 | 4 |
| Bahasa Jawa | 1 | 4 |
| PPKn | 1 | 2 |
| **Total** | **39** | **91** |

IPA core topics have 3 videos each; most others have 2. All topics are covered.

### SMA_11 (129 videos, 57 topics)
| Subject | Topics | Videos |
|---------|--------|--------|
| Matematika | 11 | 33 |
| Bahasa Indonesia | 7 | 14 |
| Bahasa Inggris | 7 | 14 |
| Biologi | 6 | 12 |
| Fisika | 5 | 10 |
| Sejarah | 4 | 8 |
| Sosiologi | 4 | 8 |
| Geografi | 3 | 6 |
| PJOK | 4 | 10 |
| Informatika | 2 | 4 |
| Kimia | 1 | 4 |
| Ekonomi | 1 | 2 |
| Bahasa Jawa | 1 | 2 |
| PPKn | 1 | 2 |
| **Total** | **57** | **129** |

Core math (Fungsi, Polinomial, Trigonometri, Limit, Turunan, Integral) have 3 videos; others have 2. All topics are covered.

---

## 4. Action Items

| # | Priority | Action | File | Video ID | Status |
|---|----------|--------|------|----------|--------|
| 1 | 🔴 HIGH | Replace — wrong subject (Bahasa Indonesia video under PJOK topic) | `youtube-smp7.ts` | `OZAdSVoMnh4` | **Pending** |
| 2 | 🔴 HIGH | Replace — wrong grade (Kelas **10**, should be 11) | `youtube-sma11.ts` | `ushsEHIzvTY` | **Pending** |
| 3 | 🔴 HIGH | Replace — wrong grade (Kelas **12**, should be 11) | `youtube-sma11.ts` | `FH-GCEiGk-Y` | **Pending** |
| 4 | 🟢 DONE | Fix topic label "Perubahan Sosial" → "Permainan Bola Besar" | `youtube-sma11.ts` | `lPqPfLz3ppY` | **Fixed** |

---

## 5. Methodology

1. **Parse** source TypeScript files via regex extraction of `YouTubeResource[]` objects
2. **Deduplicate** — check for duplicate video IDs within and across files
3. **oEmbed verification** — all 220 URLs verified via YouTube oEmbed API
4. **Tavily extraction** — spot-check actual YouTube titles for flagged videos
5. **Grade/subject validation** — scan YouTube titles for grade-level keywords
6. **Topic alignment** — keyword + semantic matching with false-positive filtering

---

*Report generated by Hermes Agent — 2026-08-06 10:02 UTC*
