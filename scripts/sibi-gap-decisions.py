#!/usr/bin/env python3.12
"""Verdicts for the 42 reported prosem gaps, with the row that closes each one.

`scripts/sibi-gap-crosscheck.py` scores gaps automatically, and its scores are
not good enough to act on. It called "Hubungan antar tulang" a gap while
`Biologi / Sistem Gerak / Sendi` was sitting right there, and it matched
"Tata Nama Ganda" against the chemistry lesson "Tata Nama Senyawa" — two lessons
that share two generic words and nothing else. Fuzzy overlap cannot tell
"Sendi" from "Gerak Antagonis" as answers to the same question.

So the verdicts below were read off the actual rows (`psql`, then read the
subject/topic/subTopic listing per student) and each CLOSED entry names the row
that closes it, which is the part a reviewer needs to check. Provenance is
required: an entry with no evidence row is a gap by definition.

Verdicts:
  COVERED  an existing row teaches this lesson; generating would duplicate it
  PARTIAL  an existing row teaches part of it; extend that row instead of adding
  GAP      no row teaches it; this is what generation is for

Read-only. Writes audit-reports/sibi-gap-decisions.json.
"""

import json
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
MANIFEST = BASE / "audit-reports" / "sibi-gap-manifest.json"
OUT = BASE / "audit-reports" / "sibi-gap-decisions.json"

# n: (verdict, evidence "subject / topic / subTopic", note)
# SHOFI001 (SMA_2) files its Matematika Tingkat Lanjut lessons under the plain
# "Matematika" subject, so most of those 14 "gaps" are already written.
VERDICTS: dict[int, tuple[str, str, str]] = {
    # --- SHOFI001, prosem subject "Matematika Tingkat Lanjut" (14) ---
    29: ("COVERED", "Matematika / Polinomial / Suku Banyak",
         "Polinomial dasar sudah ada 8640c; juga ada Operasi Polinomial 8542c"),
    30: ("COVERED", "Matematika / Polinomial / Operasi Polinomial",
         "operasi aljabar polinomial tertulis lengkap 8542c"),
    31: ("GAP", "", "pembagian sintetik belum ada; Faktorisasi tidak mencakupnya"),
    32: ("GAP", "", "teorema sisa/faktor tidak ada"),
    33: ("PARTIAL", "Matematika / Polinomial / Faktorisasi Polinomial",
         "faktorisasi menyentuh akar, tapi bukan pembahasan akar-akar persamaan"),
    34: ("COVERED", "Matematika / Trigonometri / Identitas Trigonometri",
         "judul sub-topik identik"),
    35: ("GAP", "", "aturan sinus tidak ada"),
    36: ("GAP", "", "aturan cosinus tidak ada"),
    37: ("COVERED", "Matematika / Trigonometri / Fungsi Trigonometri",
         "judul sub-topik identik"),
    38: ("GAP", "", "fungsi rasional tidak ada"),
    39: ("GAP", "", "fungsi irasional tidak ada"),
    40: ("GAP", "", "fungsi nilai mutlak tidak ada"),
    41: ("GAP", "", "fungsi tangga tidak ada"),
    42: ("GAP", "", "fungsi piecewise tidak ada"),
    # --- SHOFI001, prosem subject "Biologi" (3) ---
    26: ("COVERED", "Biologi / Sistem Gerak / Sendi",
         "artikulasi = sendi, persis isi sesi ini"),
    27: ("COVERED", "Biologi / Sistem Gerak / Gerak Antagonis dan Sinergis",
         "judul sub-topik identik"),
    28: ("GAP", "", "Sistem Gerak belum punya baris penyakit"),
    # --- SHOFI001, prosem subject "Bahasa Indonesia" (1) ---
    25: ("COVERED", "Bahasa Indonesia / Poster sebagai Teks Persuasi / "
                    "Pengertian Poster, Ciri-ciri, dan Jenis Poster",
         "poster sebagai persuasi sudah ada"),
    # --- RAIHAN001, prosem subject "IPA" (14) ---
    2:  ("PARTIAL", "IPA / Klasifikasi Makhluk Hidup / Ciri-Ciri Makhluk Hidup",
         "ciri makhluk hidup ada; karakteristik hewan vs tumbuhan tidak dipisah"),
    3:  ("COVERED", "IPA / Klasifikasi Makhluk Hidup / Klasifikasi Makhluk Hidup",
         "dasar klasifikasi sudah ada"),
    4:  ("GAP", "", "urutan takson tidak ada"),
    5:  ("GAP", "", "tata nama ganda tidak ada"),
    6:  ("GAP", "", "kunci determinasi tidak ada"),
    7:  ("GAP", "", "klasifikasi lima kerajaan tidak ada"),
    8:  ("GAP", "", "sel tidak ada di kurikulum ini; SIBI kelas VII juga tidak memuatnya"),
    9:  ("PARTIAL", "IPA / Ekologi / Komponen Ekosistem",
         "komponen ekosistem menyentuh tingkat organisasi, bukan membahasnya"),
    10: ("GAP", "", "jaringan tidak ada; SIBI kelas VII tidak memuat (materi kelas VIII)"),
    11: ("GAP", "", "organ tidak ada; SIBI kelas VII tidak memuat (materi kelas VIII)"),
    12: ("GAP", "", "sistem organ tidak ada; SIBI kelas VII tidak memuat (materi kelas VIII)"),
    13: ("PARTIAL", "IPA / Ekologi / Komponen Ekosistem",
         "praktikum biotik-abiotik bisa menumpang baris ini"),
    14: ("PARTIAL", "IPA / Ekologi / Interaksi Antar Makhluk Hidup",
         "interaksi antar makhluk hidup mencakup rantai makanan secara ringkas"),
    15: ("COVERED", "IPA / Pengukuran / Besaran dan Pengukuran",
         "besaran baku/tak baku sudah ada; Fisika/Besaran dan Pengukuran juga"),
    # --- RAIHAN001, prosem subject "Informatika" (7) ---
    16: ("COVERED", "Informatika / Hardware / Pengenalan Perangkat Keras Komputer",
         "spesifikasi perangkat keras sudah ada"),
    17: ("COVERED", "Informatika / Software / Perangkat Lunak Aplikasi",
         "perangkat lunak aplikasi sudah ada"),
    18: ("GAP", "", "antarmuka pengguna tidak ada"),
    19: ("GAP", "", "folder dan file tidak ada"),
    20: ("GAP", "", "pencarian informasi tidak ada"),
    21: ("GAP", "", "surel tidak ada"),
    22: ("GAP", "", "presentasi digital tidak ada"),
    # --- RAIHAN001, prosem subject "IPS" (2) ---
    23: ("COVERED", "IPS / Sejarah Keluarga / Kehidupan Masyarakat Praaksara",
         "periodisasi praaksara sudah ada"),
    24: ("COVERED", "IPS / Sejarah Keluarga / Kehidupan Masyarakat Praaksara",
         "asal usul leluhur dibahas di baris yang sama"),
    # --- RAIHAN001, prosem subject "Bahasa Indonesia" (1) ---
    1:  ("GAP", "", "menyimak teks lisan tidak ada; buku SIBI VII tidak punya teks lisan"),
}


def main() -> None:
    items = json.loads(MANIFEST.read_text())["items"]
    by_n = {i["n"]: i for i in items}
    missing = sorted(set(by_n) - set(VERDICTS))
    if missing:
        raise SystemExit(f"no verdict for items: {missing}")

    rows = []
    for n in sorted(by_n):
        verdict, evidence, note = VERDICTS[n]
        if verdict != "GAP" and not evidence:
            raise SystemExit(f"item {n} is {verdict} but names no evidence row")
        it = by_n[n]
        rows.append({
            "n": n,
            "student": it["student"],
            "prosem_subject": it["subject"],
            "topic": it["topic"],
            "subTopic": it["subTopic"],
            "semester": it["semester"],
            "weekOrder": it["weekOrder"],
            "source_kind": it["source_kind"],
            "verdict": verdict,
            "evidence_row": evidence or None,
            "note": note,
        })

    OUT.write_text(json.dumps({
        "generatedBy": "scripts/sibi-gap-decisions.py",
        "note": ("Curated verdicts for the 42 reported prosem gaps. Evidence rows "
                 "were read from the database, not scored."),
        "counts": dict(Counter(r["verdict"] for r in rows)),
        "items": rows,
    }, indent=1, ensure_ascii=False))

    print(f"decisions: {len(rows)} items -> {OUT.relative_to(BASE)}\n")
    for v in ("COVERED", "PARTIAL", "GAP"):
        sel = [r for r in rows if r["verdict"] == v]
        print(f"== {v} ({len(sel)}) ==")
        for r in sel:
            ev = f"  <- {r['evidence_row']}" if r["evidence_row"] else ""
            print(f"  #{r['n']:2} {r['student']:9} {r['prosem_subject'][:20]:20} "
                  f"w{r['weekOrder']:<3} {r['subTopic'][:40]:40}{ev}")
        print()


if __name__ == "__main__":
    main()
