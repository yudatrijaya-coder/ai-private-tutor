#!/usr/bin/env python3.12
"""Regression test for `sibi_content_guard` (ledger B-02).

The guard is the write-path half of the B-02 fix: without it, re-running any
`sibi-generate-*.py` script can recreate the contamination that took 268 slide
and 289 mindmap rows to clean up. These cases pin the behaviour.

Run: python3.12 scripts/test-sibi-content-guard.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sibi_content_guard import is_reasoning_dump, looks_like_outline, looks_like_slides, is_usable

failures = []


def check(name, got, want):
    ok = got == want
    print(f"  {'PASS' if ok else 'FAIL'}  {name}  (got={got!r} want={want!r})")
    if not ok:
        failures.append(name)


# ── Reasoning dumps observed in production (must all be rejected) ──────────
DUMPS = [
    "1.  **Analyze the Request:**\n    - Topic: Struktur Bumi\n    Target audience: 7th-grade students",
    "Let me analyze the request first.\n- Topic: Ekosistem",
    "The user wants a mindmap about Biologi.\n- Main Topic\n  - Detail",
    "I need to generate 3-5 markdown slides for this topic.",
    "Thinking. 1. **Deconstruct the request**",
    "Constraints:\n- Must be in Indonesian\n- 3-5 slides",
    "Step 1: Analyze the SIBI content provided.",
    "Identify the Goal:\nCreate a mindmap.",
]

print("=== 1. reasoning dump terdeteksi ===")
for i, d in enumerate(DUMPS):
    check(f"dump #{i+1} terdeteksi", is_reasoning_dump(d), True)
    check(f"dump #{i+1} ditolak is_usable(mindmap)", is_usable(d, "mindmap"), False)
    check(f"dump #{i+1} ditolak is_usable(slides)", is_usable(d, "slides"), False)

# ── Genuine content (must be accepted) ────────────────────────────────────
GOOD_OUTLINE = """- Struktur Bumi
  - Kerak Bumi
    - Terdiri dari batuan padat
  - Mantel
    - Magma dan batuan cair
  - Inti Bumi
    - Inti luar dan inti dalam"""

GOOD_SLIDES = """## Struktur Bumi

Bumi tersusun dari beberapa lapisan utama.

- **Kerak** — lapisan terluar, tipis dan padat
- **Mantel** — lapisan paling tebal, berisi magma
- **Inti** — pusat bumi, suhu sangat tinggi

## Kesimpulan

Setiap lapisan punya peran berbeda bagi kehidupan di permukaan."""

print("\n=== 2. konten asli diterima ===")
check("outline asli bukan dump", is_reasoning_dump(GOOD_OUTLINE), False)
check("outline asli lolos is_usable(mindmap)", is_usable(GOOD_OUTLINE, "mindmap"), True)
check("slides asli lolos is_usable(slides)", is_usable(GOOD_SLIDES, "slides"), True)

# ── Edge cases ────────────────────────────────────────────────────────────
print("\n=== 3. kasus tepi ===")
check("None bukan dump", is_reasoning_dump(None), False)
check("string kosong bukan dump", is_reasoning_dump(""), False)
check("None ditolak is_usable(mindmap)", is_usable(None, "mindmap"), False)
check("None ditolak is_usable(slides)", is_usable(None, "slides"), False)
check("prosa tanpa dash bukan outline", looks_like_outline("Bumi memiliki tiga lapisan utama."), False)
check("satu dash bukan outline", looks_like_outline("- Hanya satu baris"), False)
check("acknowledgement pendek bukan slides", looks_like_slides("Tentu!"), False)
check("kind tak dikenal ditolak", is_usable(GOOD_OUTLINE, "quiz"), False)

# Markdown fence sudah dibersihkan script sebelum guard, jadi guard melihat
# teks polos. Kasus ini memastikan guard tidak ikut bergantung pada fence.
print("\n=== 4. dump di dalam fence tetap terdeteksi ===")
check(
    "dump tetap ditolak walau diformat list",
    is_usable("Analyze the Request:\n- a\n- b", "mindmap"),
    False,
)

# ── Family 2: the model restates the brief as a spec line per node ─────────
# Found 2026-09-11 on 91 live rows. The tell is a label that *starts* with a
# spec key; the same words mid-sentence are legitimate subject matter.
print("\n=== 5. spec line per node (keluarga 2) ===")
SPEC_LABELS = [
    "- Goal: Create a mind map outline.\n  - Kekalahan Jepang",
    "- Level 1: Konsep Dasar, Contoh, Alat Ukur\n  - Besaran Pokok",
    "- Level 0 (Root): Besaran Turunan\n  - Besaran Pokok",
    "- Format: Dash (-) and indentation.\n  - Kerak Bumi",
]
for i, s in enumerate(SPEC_LABELS):
    check(f"spec line #{i+1} ditolak is_usable(mindmap)", is_usable(s, "mindmap"), False)

# Regression: these are real syllabus entries, not leaked specs. Both were
# wrongly blanked by an earlier, wider version of the rule.
check(
    "label 'Constraints (PRIMARY KEY, ...)' tetap diterima",
    is_usable("- SQL Dasar\n  - Constraints (PRIMARY KEY, NOT NULL, UNIQUE)\n  - CREATE TABLE", "mindmap"),
    True,
)

# Regression: the spec-line rule must NOT apply to slides. `Format:` is normal
# teaching content — the row that exposed this (bfa07aa1) teaches date layout,
# and cf0a7394 teaches a username pattern. Rejecting them would loop the
# generator on good material.
print("\n=== 6. spec line TIDAK berlaku untuk slide ===")
SLIDE_WITH_FORMAT = (
    "## Menyusun Tanggal dan Waktu\n\n"
    "Urutan: Tahun + 月 + 日 + 星期 + 点 + 分.\n"
    "Format: [Tahun]年[Bulan]月[Tanggal]日[Jam]点[Menit]分.\n"
    "Contoh: 2024年5月12日星期日上午9点20分.\n\n"
    "## Latihan\n\nTulislah tanggal lahirmu dalam bahasa Mandarin."
)
check("slide ber-'Format:' tetap diterima", is_usable(SLIDE_WITH_FORMAT, "slides"), True)
check(
    "slide ber-'Format:' bukan dump",
    is_reasoning_dump(SLIDE_WITH_FORMAT),
    False,
)

print()
if failures:
    print(f"❌ {len(failures)} gagal: {failures}")
    sys.exit(1)
print("✅ semua lulus")
