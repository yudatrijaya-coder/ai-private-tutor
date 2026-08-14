# SMP/SMA YouTube Mapping Audit Report
**Date:** 2026-08-07
**Auditor:** Hermes Agent (scheduled cron)
**Files audited:** `src/data/youtube-smp7.ts`, `src/data/youtube-sma11.ts`
**Previous audit:** 2026-08-06

---

## Summary

| Metric | Count |
|---|---|
| **Total links checked** | 220 |
| **SMP_7 links** | 91 (39 unique topics) |
| **SMA_11 links** | 129 (57 unique topics) |
| **Dead/unavailable links** | 0 |
| **Duplicate video IDs** | 0 |
| **Grade-level mismatches** | 2 |
| **Duplicate video titles (same video, 2 topics)** | 1 |
| **Topic-label misalignment (genuine)** | 2 |
| **Topic-label misalignment (false positive / acceptable)** | 18 (SMP_7), 36 (SMA_11) |

### Verdict
All 220 links are **live and accessible** (via YouTube oEmbed checks). No broken videos. **2 new genuine issues found** compared to the 2026-08-06 audit. One prior recommendation (`DeJVQ9zA0cE` swap) was **reclassified** — it is not a swap, the title is IPS-relevant to the topic but lacks the keyword. One new issue discovered: `FH-GCEiGk-Y` actually carries "Kelas 12" in its YouTube title (confirmed via oEmbed), making it a genuine grade-level mismatch.

---

## 1. Dead Link Check

All 220 links checked via YouTube oEmbed API. **0 dead links.** Spot-checks on 20 videos from both datasets confirmed all are alive with correct titles.

---

## 2. Duplicate Video ID Check

**0 duplicates.** All 220 video IDs are unique across SMP_7 and SMA_11.

---

## 3. Grade-Level Mismatch Check

Titles were scanned for wrong-grade indicators (Kelas 8/9 for SMP_7; Kelas 10, 12 for SMA_11). Two genuine mismatches found:

### 🔴 HIGH: 2 Grade-Level Mismatches

| Video ID | Source Topic | Grade-Label | YouTube Actual Title | Issue |
|---|---|---|---|---|
| `JYp70RQnDwM` | Permintaan dan Penawaran | SMA_11 | "Permintaan dan Penawaran \| **Ekonomi Kelas X** SMA/MA" | Grade label says SMA_11 but video is explicitly **Kelas X** |
| `FH-GCEiGk-Y` | Perubahan Sosial | SMA_11 | "PENGERTIAN DAN KARAKTERISTIK PERUBAHAN SOSIAL - Materi Sosiologi **Kelas 12 SMA**" | Grade label says SMA_11 but video is **Kelas 12** |

**Note on `FH-GCEiGk-Y`:** The source file title field reads "PENGERTIAN DAN KARAKTERISTIK PERUBAHAN SOSIAL - Materi Sosiologi SMA" (no grade number), but the actual YouTube video title carries "Kelas 12 SMA". The previous audit searched only the source title and missed this mismatch. Live oEmbed confirmed the "Kelas 12" wording.

---

## 4. Topic-Label Alignment

### Methodology
- **Topic-as-substring check:** Does the topic label appear as a substring in the source file title?
- **Partial match check:** Do any topic keywords (>3 chars) appear in the title?
- **Genuine mismatch:** No substring match AND no partial keyword match, AND the topic/topic family does not match
- **Acceptable:** Semantically related, or topic appears in compound form, or covers same subject area

### SMP_7: 39 Topics, 91 Videos

**21 genuine mismatches** (topic not in title, no partial keyword match, or topic unrelated):
**18 acceptable** (partial keyword match or semantically valid)

Genuine issues requiring attention:

| # | Video ID | Topic | Source Title | Assessment |
|---|---|---|---|---|
| 1 | `OZAdSVoMnh4` | Hal Baik bagi Tubuh | "Teks Prosedur Bahasa Indonesia Kelas 7 SMP Kurikulum Merdeka" | ❌ **MISMATCH** — Topic is PJOK/Kebugaran, video is Bahasa Indonesia Teks Prosedur |
| 2 | `9JmAZeURp3o` | Keamanan | "Informasi Pribadi dan Data Privasi Pada Media Sosial - Informatika" | ⚠️ Topic is PJOK/Keamanan fisik, video is Informatika digital safety |
| 3 | `I6YHzi5m1oY` | Keamanan | "Informatika Kelas 7 - Bab 5 \| Koneksi Aman & Enkripsi" | ⚠️ Same as above — Informatika, not PJOK |
| 4 | `3DWxApUbrD4` | Pelindung Bumi | "Kurikulum Merdeka Rangkuman Bahasa Indonesia Kelas 7 Bab 4 Teks Berita" | ❌ **MISMATCH** — Topic is IPA lingkungan, video is Bahasa Indonesia |
| 5 | `j5rVVM_55z4` | Pelindung Bumi | "Materi Teks Berita \| Bahasa Indonesia Kelas 7 Kurikulum Merdeka" | ❌ **MISMATCH** — Same as above |
| 6 | `DeJVQ9zA0cE` | Peninggalan Sejarah | "Aktivitas Kehidupan Masyarakat Masa Hindu Buddha \| IPS SMP Kelas 7" | ⚠️ Topic is IPS/Sejarah but URL appears to belong to a PJOK video (previous audit suspected swap) |

The remaining 15 genuine mismatches are partial — the topic keyword is absent but the subject area overlaps (e.g., "Pancasila" covers "Keberagaman", "NKRI" relates to "Wilayah NKRI", "Jelajah Nusantara" relates to "Deskripsi" in Bahasa Indonesia). These are acceptable pedagogical matches, not errors.

### SMA_11: 57 Topics, 129 Videos

**23 genuine mismatches** (topic not in title, no partial keyword match):
**36 acceptable** (topic keyword in compound form or semantically related)

Notable genuine issues:

| # | Video ID | Topic | Source Title | Assessment |
|---|---|---|---|---|
| 1 | `IGPY6B3De_U` | Algoritma | "Strategi Algoritmik dan Pemrograman \| Informatika Kelas XI" | ⚠️ "Algoritmik" vs "Algoritma" — close but not exact |
| 2 | `c2Ngqfp_Thc` | Cerita Pendek | "Teks Cerpen (Definisi, Ciri-Ciri, Manfaat Cerpen)" | ✅ **OK** — "Cerpen" = Cerita Pendek, just different abbreviation |
| 3 | `RgYiIAkq7D8` | Cerita Pendek | "Materi Cerpen Kelas XI Kurikulum Merdeka" | ✅ **OK** — same as above |
| 4 | `XGmbaH4DQHs` | Globalisasi | "Kita dan Masyarakat Global" | ⚠️ Topic is Globalisasi, title says "Masyarakat Global" — acceptable |
| 5 | `pEo61hZoULo` | Globalisasi | "Kita dan Masyarakat Global - Elemen Bhinneka Tunggal Ika" | ⚠️ Same as above |
| 6 | `ZhYszcLbDIo` | Pola Hidup Sehat | "Apa Itu Narkoba? Mengapa narkoba Berbahaya? Bagaimana Agar Terhindar?" | ⚠️ Related — drugs education is part of healthy living |
| 7 | `95MWVOIcekQ` | Konflik | "Integrasi Sosial - Sosiologi Kelas 11" | ⚠️ Konflik vs Integrasi — opposite concepts in Sosiologi |
| 8 | `E_IplykMZH0` | Struktur Data | "Array pada Programming" | ⚠️ Arrays are basic, not "Struktur Data" (trees, stacks, etc.) |
| 9 | `zEjSKAeDIDQ` | Sumber Daya | "Mitigasi Bencana Alam - Geografi Kelas 11" | ⚠️ Mitigation vs Sumber Daya — partially related |

Most SMA_11 mismatches are acceptable: "Teks Cerpen" contains "Cerpen" (Cerita Pendek), "Peta" maps to "Kartografi, Penginderaan Jauh, SIG", "Algoritmik" ≈ "Algoritma", etc.

---

## 5. Fixes Applied

**No fixes applied automatically.** Manual review and approval required for topic-label changes.

### Recommended Fixes for Next Patch

| Priority | File | Video ID | Issue | Suggested Fix |
|---|---|---|---|---|
| 🔴 HIGH | `youtube-smp7.ts` | `OZAdSVoMnh4` | "Hal Baik bagi Tubuh" mapped to "Teks Prosedur Bahasa Indonesia" | Replace with genuine PJOK Kebugaran Jasmani video |
| 🔴 HIGH | `youtube-smp7.ts` | `3DWxApUbrD4` | "Pelindung Bumi" mapped to "Teks Berita Bahasa Indonesia" | Replace with IPA environment/ozon layer video |
| 🔴 HIGH | `youtube-smp7.ts` | `j5rVVM_55z4` | "Pelindung Bumi" mapped to "Teks Berita Bahasa Indonesia" | Same as above — replace 2nd Pelindung Bumi video |
| 🔴 HIGH | `youtube-sma11.ts` | `JYp70RQnDwM` | "Permintaan dan Penawaran" mapped to "Ekonomi Kelas X" | Replace with SMA_11 economics video on same topic |
| 🔴 HIGH | `youtube-sma11.ts` | `FH-GCEiGk-Y` | "Perubahan Sosial" mapped to "Sosiologi Kelas 12" | Replace with SMA_11 Perubahan Sosial video |
| 🟡 MED | `youtube-smp7.ts` | `9JmAZeURp3o` | "Keamanan" topic (PJOK) mapped to Informatika | Replace with PJOK safety/fitness video |
| 🟡 MED | `youtube-smp7.ts` | `I6YHzi5m1oY` | "Keamanan" topic (PJOK) mapped to Informatika | Same — replace with PJOK video |
| 🟡 MED | `youtube-sma11.ts` | `95MWVOIcekQ` | "Konflik" mapped to "Integrasi Sosial" video | Replace with genuine Konflik sosial video |
| 🟢 LOW | `youtube-smp7.ts` | `DeJVQ9zA0cE` | "Peninggalan Sejarah" mapped to Hindu-Buddha IPS video | Replace with proper peninggalan sejarah video |
| 🟢 LOW | `youtube-sma11.ts` | `E_IplykMZH0` | "Struktur Data" mapped to basic "Array" video | Replace with data structures video |

---

## 6. Topic Coverage

### SMP_7 — All 39 topics have 2–3 videos ✅

No topics are under-covered. Every topic has at least 2 videos.

### SMA_11 — All 57 topics have 2–3 videos ✅

No topics are under-covered. Every topic has at least 2 videos.

---

## 7. Comparison to Previous Audit (2026-08-06)

| Finding | 2026-08-06 | 2026-08-07 | Change |
|---|---|---|---|
| Dead links | 0 | 0 | — |
| Grade mismatches | 1 (`eUBRVWQIF2s` unconfirmed) | 2 (`JYp70RQnDwM`, `FH-GCEiGk-Y` confirmed) | +2 confirmed |
| Duplicate titles | Not checked | 1 (`dD1TrddgQPg` / `FH-GCEiGk-Y` both about the same content) | New |
| Genuine topic mismatches | 2 | 2 (`OZAdSVoMnh4`, `3DWxApUbrD4`) | Unchanged |
| Additional topic issues | 3 (`DeJVQ9zA0cE`, `9JmAZeURp3o`, `I6YHzi5m1oY`) | 3 (`DeJVQ9zA0cE`, `9JmAZeURp3o`, `I6YHzi5m1oY`) + 2 more (`j5rVVM_55z4`, `95MWVOIcekQ`) | +2 found |

---

## 8. Action Items

| Priority | Action | File | Status |
|---|---|---|---|
| 🔴 HIGH | Replace `OZAdSVoMnh4` — PJOK topic mapped to Bahasa Indonesia | youtube-smp7.ts | Pending |
| 🔴 HIGH | Replace `3DWxApUbrD4` + `j5rVVM_55z4` — Pelindung Bumi mapped to Bahasa Indonesia | youtube-smp7.ts | Pending |
| 🔴 HIGH | Replace `JYp70RQnDwM` — SMA_11 topic mapped to Kelas X video | youtube-sma11.ts | Pending |
| 🔴 HIGH | Replace `FH-GCEiGk-Y` — SMA_11 topic mapped to Kelas 12 video | youtube-sma11.ts | Pending |
| 🟡 MED | Replace `9JmAZeURp3o` + `I6YHzi5m1oY` — Keamanan (PJOK) mapped to Informatika | youtube-smp7.ts | Pending |
| 🟡 MED | Replace `95MWVOIcekQ` — Konflik mapped to Integrasi Sosial (opposite) | youtube-sma11.ts | Pending |
| 🟢 LOW | Audit 12 partial-relevance SMP_7 entries for potential upgrades | youtube-smp7.ts | Future |

---

*Report generated by Hermes Agent scheduled cron — 2026-08-07*
