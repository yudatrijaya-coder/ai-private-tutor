# SMP/SMA YouTube Mapping — Audit Report
**Date:** 2026-08-09
**Auditor:** Hermes Agent (scheduled cron)
**Files audited:** `src/data/youtube-smp7.ts`, `src/data/youtube-sma11.ts`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total links checked | **219** |
| SMP_7 links | 91 (39 topics) |
| SMA_11 links | 128 (57 topics) |
| Live/accessible | **219 / 219 (100%)** |
| Duplicate video IDs | **0** |
| Grade mismatches | **0** |
| Prior audit issues fixed | **4 / 4 ✅** |
| New minor issues found | **2** |

**Verdict:** All 219 links are live, accessible, and free of cross-grade contamination. The 4 issues from the 2026-08-06 audit have all been resolved. Two new minor topic mismatches were identified.

---

## 1. Link Liveness — 100% Pass Rate

All 219 unique URLs verified via YouTube oEmbed API in parallel batches (5 concurrent requests).

```
https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json
```

| Result | Count |
|--------|-------|
| alive | 219 |
| HTTP errors | 0 |
| Network errors | 0 |
| Dead / private | 0 |

**All 16 videos that were flagged "dead" on 2026-08-05 have been restored by YouTube.**

### Duplicate Video IDs
**0 duplicates.** All 219 video IDs are unique across both files.

---

## 2. Grade-Level Validation — All Clean

Scanned all 219 YouTube titles for wrong-grade keywords:
- SMP_7 wrong indicators: `kelas 8`, `kelas 9`, `kelas 10`, `kelas 11`, `kelas 12`
- SMA_11 wrong indicators: `kelas 7`, `kelas 8`, `kelas 9`, `kelas 10`, `kelas 12`

**Result: 0 cross-grade mismatches.** All videos match their grade level.

---

## 3. Topic Alignment

Each video's actual YouTube title was cross-checked against its labeled topic using keyword-level matching (handling conjunction-split topics like "Algoritma dan Pemrograman") plus semantic aliases for curriculum-aligned synonyms.

| Grade | Aligned | Remaining issues | Total |
|-------|---------|-----------------|-------|
| SMP_7 | 91/91 | 0 | 91 |
| SMA_11 | 126/128 | 2 | 128 |

The 13 flagged entries from automated checking were all false positives (file title includes the topic keyword as a substring, e.g., "Hal Baik bagi Tubuh" title contains "Tubuh"). After manual review, 11 were cleared; 2 remain as minor issues.

---

## 4. Prior Audit Issues — All Fixed ✅

The 4 issues from `smp-sma-youtube-audit-2026-08-06-v2.md` have all been resolved:

| Video ID | Issue | Fix Applied |
|----------|-------|-------------|
| `FH-GCEiGk-Y` | SMA_11 Perubahan Sosial — video was Kelas **12** Sosiologi | **Removed** from source |
| `ushsEHIzvTY` | SMA_11 Interaksi Sosial — video was Kelas **10** Sosiologi | **Removed** from source |
| `lPqPfLz3ppY` | SMA_11 topic label said "Perubahan Sosial" but video was PJOK Bola Besar | **Topic corrected** to "Permainan Bola Besar" ✅ |
| `OZAdSVoMnh4` | SMP_7 "Hal Baik bagi Tubuh" — video was Bahasa Indonesia Teks Prosedur, not PJOK | **Removed** from source; replaced with correct PJOK videos (`ilf4sWe6IRo`, `P4fukAAGeuQ`) |

---

## 5. New Issues Found (Minor)

### 🟡 MINOR: `JXygZE1VcIg` — Topic label "Cerita Pendek" but video is "Drama"

```
File title:    "Unsur Intrinsik & Ekstrinsik Drama"
YouTube title: "Unsur Intrinsik & Ekstrinsik Drama"
Topic label:   Cerita Pendek  ← Wrong
Grade:         SMA_11 / Bahasa Indonesia
Issue:         Video covers drama elements (intrinsic/extrinsic), not cerpen
Fix needed:    Replace with a genuine SMA Kelas 11 Cerita Pendek / Unsur Intrinsik Cerpen video
```

### 🟡 MINOR: `zEjSKAeDIDQ` — Topic label "Sumber Daya" but video is "Mitigasi Bencana"

```
File title:    "Mitigasi Bencana Alam - Geografi Kelas 11 (Quipper Video)"
YouTube title: "Mitigasi Bencana Alam - Geografi Kelas 11 (Quipper Video)"
Topic label:   Sumber Daya  ← Wrong
Grade:         SMA_11 / Geografi
Issue:         Mitigasi and Sumber Daya are related under Geografi but distinct
Fix needed:    Replace with a genuine SMA Kelas 11 Sumber Daya Alam video, or relabel to "Mitigasi"
```

**Note:** The second `Sumber Daya` video (`PooZ0B9myUE` — "Klasifikasi Sumber Daya Alam") is correctly labeled.

---

## 6. Per-Topic Coverage

### SMP_7 (39 topics, 91 videos)
All 39 topics have ≥2 videos. No under-covered topics. All videos live.

### SMA_11 (57 topics, 128 videos)
All 57 topics have ≥2 videos. No under-covered topics. All videos live.

---

## 7. Action Items

| Priority | Action | File | Video ID | Status |
|----------|--------|------|----------|--------|
| 🟡 LOW | Replace `JXygZE1VcIg` — "Cerita Pendek" topic but video is Drama | `youtube-sma11.ts` | `JXygZE1VcIg` | **Pending** |
| 🟡 LOW | Replace `zEjSKAeDIDQ` — "Sumber Daya" topic but video is Mitigasi | `youtube-sma11.ts` | `zEjSKAeDIDQ` | **Pending** |

---

## Appendix: Methodology

1. **Parse** source TypeScript files using regex extraction of `title/url/topic` fields.
2. **Deduplication** — check for duplicate video IDs.
3. **URL parsing** — extract video IDs from all URL formats (watch, youtu.be, embed, shorts).
4. **oEmbed check** — batch request YouTube oEmbed API (5 concurrent, 8s timeout per request).
5. **Grade-level** — scan actual YouTube titles for wrong-grade keywords.
6. **Topic alignment** — keyword-level matching with semantic aliases (conjunction-split topics, curriculum synonyms).
7. **False positive review** — manual triage of automated flags.

*Report generated by Hermes Agent scheduled cron — 2026-08-09*
