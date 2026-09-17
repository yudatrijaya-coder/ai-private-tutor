#!/usr/bin/env python3
"""Render audit-reports/prosem-coverage.json into a human-readable markdown report.

WHY A GENERATOR INSTEAD OF HAND-WRITING: the gap list is 42 rows that change
every time a matcher rule is tuned. Copy-pasting them into prose guarantees the
document and the data drift apart. Regenerate after every `prosem-coverage.ts`
run.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "audit-reports", "prosem-coverage.json")
OUT = os.path.join(ROOT, "docs", "audits", "2026-09-17-prosem-coverage.md")

with open(SRC, encoding="utf-8") as fh:
    data = json.load(fh)

summary = data["summary"]
rows = data["rows"]
contained = data.get("contained", [])
chapters = data.get("chapters", [])
th = data["thresholds"]

totals = {"covered": 0, "chapter": 0, "near": 0, "missing": 0, "absent": 0, "assessment": 0}
for v in summary.values():
    for k in totals:
        totals[k] += v.get(k, 0)

L = []
w = L.append
w("# Audit cakupan prosem — sesi mana yang belum punya material")
w("")
w(f"Dibuat: {data['generatedAt']}  ")
w("Sumber: 17 berkas `src/data/prosem/*.json` (prosem terbaru) vs tabel `Material`")
w("di kurikulum **aktif** tiap siswa (versi tertinggi).")
w("")
w("Cara reproduksi:")
w("")
w("```bash")
w("npx tsx scripts/prosem-coverage.ts          # cetak laporan + tulis JSON")
w("python3 scripts/prosem-coverage-report.py   # tulis dokumen ini dari JSON")
w("```")
w("")
w("## Verdict")
w("")
w("| Verdict | Arti | Tindakan |")
w("|---|---|---|")
w("| `COVERED` | fuzzy >= "
  f"{th['covered']} — label prosem dan material jelas sama | tidak perlu apa-apa |")
w(f"| `CONTAINED` | semua kata bermakna label pelajaran ada di teks sesi | **wajib diaudit** — mesin tidak boleh memutuskan sendiri |")
w("| `CHAPTER` | bab ada di kurikulum, pelajaran spesifiknya tidak ketemu namanya | **wajib diaudit** — paling mungkin menyembunyikan celah |")
w(f"| `NEAR` | fuzzy {th['near']}–{th['covered']} — label beda, isi kemungkinan ada | tinjau manual |")
w(f"| `MISSING` | fuzzy < {th['near']} dan tidak ada bab yang cocok | **kemungkinan besar belum digenerate** |")
w("| `ABSENT` | mapel sama sekali tidak ada di kurikulum aktif | belum ada kurikulumnya |")
w("")
w("Sesi asesmen (sumatif, remedial, total, PTS/PAS) dikecualikan — memang tanpa material.")
w("")
w("## Ringkasan")
w("")
w(f"Total sesi konten: **{sum(totals[k] for k in ('covered','chapter','near','missing','absent'))}** — "
  f"covered **{totals['covered']}**, bab ada **{totals['chapter']}**, near **{totals['near']}**, "
  f"missing **{totals['missing']}**, absent **{totals['absent']}**; "
  f"asesmen dikecualikan **{totals['assessment']}**.")
w("")
w("| Siswa | Grade | Mapel | Sem | Sesi | Covered | Bab ada | Near | Missing | Absent | Asesmen |")
w("|---|---|---|---|---|---|---|---|---|---|---|")
for key in sorted(summary):
    sid, g, subject, sem = key.split("|")
    v = summary[key]
    total = sum(v.get(k, 0) for k in ("covered", "chapter", "near", "missing", "absent"))
    flag = " **!**" if v.get("missing", 0) else ""
    w(f"| {sid} | {g} | {subject}{flag} | {sem} | {total} | {v.get('covered',0)} | "
      f"{v.get('chapter',0)} | {v.get('near',0)} | {v.get('missing',0)} | "
      f"{v.get('absent',0)} | {v.get('assessment',0)} |")
w("")

# ---- gaps grouped by subject ----
gaps = [r for r in rows if r["verdict"] in ("MISSING", "ABSENT")]
by_subject = {}
for r in gaps:
    by_subject.setdefault((r["student"], r["gradeLevel"], r["subject"], r["semester"]), []).append(r)

w(f"## Celah: {len(gaps)} sesi")
w("")
w("Diurutkan dari yang paling banyak. `best=` adalah kandidat terdekat yang ditemukan — "
  "kalau skornya kecil dan labelnya tidak berhubungan, artinya materi itu memang belum ada.")
w("")
for (sid, grade, subject, sem), rs in sorted(by_subject.items(), key=lambda kv: -len(kv[1])):
    w(f"### {sid} · {subject} · {sem} ({len(rs)} sesi)")
    w("")
    w("| Minggu | Topik / Subtopik prosem | Kandidat terdekat | Skor |")
    w("|---|---|---|---|")
    for r in sorted(rs, key=lambda x: x["weeks"]):
        sesi = f"{r['topic']} / {r['subtopic']}".replace("|", "/")
        cand = r["bestLabel"].replace("|", "/")
        w(f"| w{r['weeks']} | {sesi} | {cand} | {r['bestScore']} |")
    w("")

# ---- chapters ----
w(f"## Bab ada, pelajaran spesifik tidak ketemu: {len(chapters)} sesi")
w("")
w("Verdict `CHAPTER`: nama babnya ada di kurikulum, tapi tidak ada satu pun pelajaran "
  "di dalamnya yang namanya cocok dengan sesi prosem. Sebagian besar kemungkinan sudah "
  "tercakup pelajaran yang ada dengan nama berbeda — tapi karena satu bab bisa memuat "
  "beberapa sesi, ini yang paling mungkin menyembunyikan celah asli.")
w("")
for c in chapters:
    w(f"- **{c['student']} · {c['subject']} ({c['semester']}) · w{c['weeks']}**")
    w(f"  - sesi: {c['prosemSession']}")
    w(f"  - bab: `{c['chapter']}`")
    w(f"  - isi bab: {c['lessonsInChapter']}")
w("")

# ---- contained ----
w(f"## Ter-cover lewat pencocokan kata: {len(contained)} sesi")
w("")
w("Verdict `CONTAINED` diambil mesin, bukan skor fuzzy. Semua kata bermakna dari label "
  "pelajaran muncul di teks sesi. Daftar ini ada supaya bisa diperiksa mata — satu "
  "verdict yang salah di sini akan menyembunyikan celah nyata.")
w("")
for c in contained:
    w(f"- **{c['student']} · {c['subject']} ({c['semester']}) · w{c['weeks']}** — {c['prosemSession']}")
    w(f"  - cocok: {c['matchedLabel']} (contain={c['containScore']}, fuzzy={c['fuzzyScore']})")
w("")

w("## Batasan yang diketahui")
w("")
w("- **Bukti bisa salah tunjuk.** Kalau beberapa material sama-sama memenuhi syarat "
  "\"semua kata ada\", yang dipilih adalah skor fuzzy tertinggi — dan skor rasio kadang "
  "memenangkan label generik. Contoh: sesi *\"Struktur dan fungsi berbagai macam sel darah\"* "
  "dibuktikan dengan `Sel / Struktur dan Fungsi Sel`, padahal material "
  "`Sel Darah dan Golongan Darah` juga ada. Verdict-nya tetap benar (materinya ada), "
  "tapi jangan pakai kolom bukti sebagai rujukan pasti.")
w("- **Mapel terpisah vs terintegrasi.** Prosem VII menulis \"Biologi\"/\"Fisika\"/\"Sejarah\"; "
  "kurikulum menyimpannya sebagai `IPA`/`IPS`. Script menggabungkan keduanya "
  "(`Fisika + IPA`), jadi satu material IPA bisa terhitung di beberapa mapel prosem.")
w("- **Bentuk kolom prosem berbeda antar angkatan.** XI: `topic` = bab, `subtopic` = pelajaran. "
  "VII: `topic` = strand kompetensi, `subtopic` = bab.")
w("- **Siswa tanpa prosem dilewati.** Syifa (SD_5) tidak punya berkas prosem, jadi tidak "
  "muncul di laporan ini — bukan berarti cakupannya lengkap.")
w("- **Verdict menilai kecocokan nama, bukan kualitas isi.** Materi yang ada tapi isinya "
  "stub/rusak tetap terhitung `COVERED`. Untuk itu pakai audit konten terpisah.")
w("")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n".join(L))
print(f"tulis {os.path.relpath(OUT, ROOT)}: {len(L)} baris, {len(gaps)} celah, "
      f"{len(chapters)} bab-ada, {len(contained)} contained")
