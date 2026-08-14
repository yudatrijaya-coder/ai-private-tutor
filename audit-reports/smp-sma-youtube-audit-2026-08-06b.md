# SMP/SMA YouTube Mapping Audit Report
**Date:** 2026-08-06 (second run, 05:04 UTC)
**Auditor:** Hermes Agent (scheduled cron)
**Files audited:** `src/data/youtube-smp7.ts`, `src/data/youtube-sma11.ts`

---

## Summary

| Metric | Count |
|--------|-------|
| **Total links checked** | 220 |
| **SMP_7 links** | 91 |
| **SMA_11 links** | 129 |
| **All video IDs live** | ✅ 220/220 |
| **Grade-level contamination** | ✅ 0 |
| **Prior fixes applied (verified)** | 3 ✅ |
| **Remaining genuine mismatches** | 2 ❌ |
| **Partial relevance entries** | 0 |

**Audit script result:** `✅ Valid & Matched: 220 (100.0%)` — but the script uses naive keyword rejection; it does not catch semantic/antonym mismatches. Manual review identified 2 genuine failures below.

---

## 1. Video Liveness Check

All 220 URLs verified live via YouTube oEmbed API:
- **0 dead/private/unavailable videos**
- No duplicate video IDs across both datasets

---

## 2. Prior Fixes — Verification

Three broken IDs reported fixed in the prior audit are confirmed removed and replaced:

| Broken ID | Topic | Replacement ID | Status |
|-----------|-------|----------------|--------|
| `eUBRVWQIF2s` | Perubahan Sosial | `FH-GCEiGk-Y` — "PENGERTIAN DAN KARAKTERISTIK PERUBAHAN SOSIAL" | ✅ Present |
| `IFfqduemQV4` | Discussion | `Tofk2V03mI4` — "DISCUSSION TEXT: Bahasa Inggris Peminatan SMA" | ✅ Present |
| `cTE992WmsOc` | Konflik | `I6i3Mrs1T5o` — "Materi Sosiologi SMA Kelas XI Bab 3 Konflik Sosial" | ✅ Present |

All three broken IDs confirmed **absent** from `youtube-sma11.ts`.

---

## 3. Remaining Genuine Mismatches — 2 entries (REQUIRES FIX)

These are semantic failures that the audit script's keyword check does not catch.

### 🔴 HIGH — `OZAdSVoMnh4` in `youtube-smp7.ts` (SMP_7)

| Field | Value |
|-------|-------|
| **Topic assigned** | `Hal Baik bagi Tubuh` |
| **Actual title** | `Teks Prosedur Bahasa Indonesia Kelas 7 SMP Kurikulum Merdeka` |
| **Subject** | Bahasa Indonesia |
| **Correct subject** | PJOK / Kebugaran Jasmani |
| **Why wrong** | "Teks Prosedur" is Bahasa Indonesia; "Hal Baik bagi Tubuh" is a PJOK topic in Kurikulum Merdeka Bab 3 — completely different subject and domain |

**Note:** This entry's sibling (`ilf4sWe6IRo`) is correctly titled:
`"Kurikulum Merdeka Rangkuman Bahasa Indonesia Kelas 7 Bab 3 Hal yang Baik bagi Tubuh"`
— this is a Bahasa Indonesia Bab 3 video, not PJOK. So the **topic label** itself is the error.

**Fix:** Replace this entry with a genuine PJOK kebugaran jasmani video. Suggested replacement:
- `UHZ2ira4wGA` — "MATERI PJOK KELAS 7 KEBUGARAN JASMANI" (already exists in dataset under topic `Kebugaran`, lines 566–576 — **do not duplicate**, find a different video or accept the existing "Kebugaran" topic coverage)

### 🔴 HIGH — `95MWVOIcekQ` in `youtube-sma11.ts` (SMA_11)

| Field | Value |
|-------|-------|
| **Topic assigned** | `Konflik` |
| **Actual title** | `Integrasi Sosial - Sosiologi Kelas 11 (Quipper Video)` |
| **Subject** | Sosiologi |
| **Why wrong** | **Integrasi Sosial is the antonym of Konflik** in the SMA Kurikulum Merdeka Sosiologi curriculum. Bab 3 covers Konflik Sosial; Bab 2 covers Integrasi Sosial. Assigning an Integrasi video to the Konflik topic is semantically backwards. |

**Fix:** Replace with a genuine Konflik Sosial video. The topic already has 2 correct videos:
1. `rhb7oQfdO7c` — "Chapter 11: Konflik Sosial | Sosiologi | Alternatifa"
2. `I6i3Mrs1T5o` — "Materi Sosiologi SMA Kelas XI Bab 3 Konflik Sosial"

→ Only 1 replacement needed. The 3rd slot can be removed entirely (2 videos per topic is sufficient), or a third distinct Konflik video can be found.

---

## 4. Coverage

### SMP_7 (91 videos, 39 topics)
All 39 topics have at least 1 video. IPA core (7 topics) has 3 videos each; most other topics have 2. No uncovered topics.

### SMA_11 (129 videos, 57 topics)
All 57 topics have at least 1 video. Core math topics (Fungsi, Polinomial, Trigonometri, Limit, Turunan, Integral) have 3 videos; others have 2. No uncovered topics.

---

## 5. Topic Mapping Quality Notes

The audit script's `MISMATCH_KEYWORDS` logic flags entries where the video title mentions a different grade level (e.g., "kelas 8" in a kelas 7 dataset). All such flags in the current dataset are **false positives**:

- Topics like "Ilmu Sains", "Zat dan Perubahan", "Suhu dan Kalor" in SMP_7 map to videos titled "IPA Kelas 7 Bab 1/2/3" — the keyword "IPA Kelas 7" does not match any exclusion keyword, so the script passes them.
- Topics labeled "Jelajah Nusantara", "Dunia Imajinasi" map to Bahasa Indonesia videos (e.g., "Teks Deskripsi", "Puisi Rakyat") — these are the **correct Kurikulum Merdeka Bab 1 and Bab 5** for Bahasa Indonesia, not mismatches.

The mismatch detection is only reliable for grade-level contamination, not topic-domain mismatches.

---

## 6. Action Items

| Priority | Action | File | Target |
|----------|--------|------|--------|
| 🔴 HIGH | Replace `OZAdSVoMnh4` — Teks Prosedur ≠ Hal Baik bagi Tubuh (different subject) | `youtube-smp7.ts` | Line ~203 |
| 🔴 HIGH | Replace `95MWVOIcekQ` — Integrasi Sosial ≠ Konflik (antonym) | `youtube-sma11.ts` | Line ~552–556 |
| 🟡 MED | After fixing `95MWVOIcekQ`, decide: remove 3rd Konflik slot or find a 3rd distinct video | `youtube-sma11.ts` | Konflik section |

---

## 7. Comparison: This Audit vs Prior

| Metric | Prior (2026-08-05) | This (2026-08-06) |
|--------|-------------------|-------------------|
| Total links | 220 | 220 |
| Dead links | 16 (false negative) | **0** ✅ |
| Script-flagged mismatches | 176 (false positive) | **0** ✅ |
| Grade-level contamination | 1 | **0** ✅ |
| Genuine mismatches | 2 | **2** ❌ (still present) |
| Prior fixes verified | N/A | **3 verified ✅** |

---

*Report generated by Hermes Agent scheduled cron — 2026-08-06 05:04 UTC*
