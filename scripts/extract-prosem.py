#!/usr/bin/env python3
"""
Extract Program Semester (prosem) from Moodle XLSX/PDF files into normalized JSON.

Output: src/data/prosem/<key>.json with shape:
{
  "source": "<filename>",
  "subject": "Kimia",
  "grade": "XI" | "VII",
  "semester": "ganjil" | "genap",
  "entries": [ { "topic": "...", "subtopic": "...", "weeks": [ {"week": 3, "hours": 2} ] } ]
}
Week = global sequential week across the semester grid (Jul..Dec / Jan..Jun),
ranked left-to-right over week columns that contain at least one scheduled
session anywhere in the file (so OUTING/ASAS-only columns don't inflate numbering).

Run: /home/ubuntu/.venv-prosem/bin/python scripts/extract-prosem.py
"""
import json
import os
import re

BASE = os.path.expanduser("~/ai-private-tutor/public/moodle-files")
OUT = os.path.expanduser("~/ai-private-tutor/src/data/prosem")

# (filename, subject, grade, semester)
FILES = [
    # Shofi - SMA_2 (kelas XI)
    ("3659_Program_Semester_2627_XI_Bahasa_Indonesia_Ganjil.pdf", "Bahasa Indonesia", "XI", "ganjil"),
    ("3659_Program_Semester_2627_XI_Bahasa_Indonesia_Genap.pdf", "Bahasa Indonesia", "XI", "genap"),
    ("3664_Program_Semester_Biologi_2627_kelas_XI.pdf", "Biologi", "XI", "ganjil"),
    ("3666_Revisi_Formulir_Program_Semester_2627_kelas_XI_ganjil.pdf", "Fisika", "XI", "ganjil"),
    ("3668_Formulir_Program_Semester_2627_kimia_kelas_XI__1_.xlsx", "Kimia", "XI", "ganjil"),
    ("3670_Program_Semester_2627_XI_Literasi.xlsx", "Literasi Bahasa Indonesia", "XI", "ganjil"),
    ("3673_Program_Semester_Matematika_Penalaran.xlsx", "Matematika Penalaran", "XI", "ganjil"),
    ("3674_Program_Semester_2627_MTL_XI.xlsx", "Matematika Tingkat Lanjut", "XI", "ganjil"),
    ("3675_Program_Semester_Matematika_Umum_2627_kelas_XI.xlsx", "Matematika", "XI", "ganjil"),
    ("3677_PROSEM_KELAS_XI_2627.xlsx", "Sejarah", "XI", "ganjil"),
    # Raihan - SMP_1 (kelas VII)
    ("4164_Formulir_Program_Semester_2627_kelas_VII.xlsx", "Bahasa Indonesia", "VII", "ganjil"),
    ("4166_Program_Semester_Kelas_7_TP_20262027.xlsx", "Bahasa Mandarin", "VII", "ganjil"),
    ("4169_PROGRAM_SEMESTER_BIOLOGI_7_2627_GANJIL.pdf", "Biologi", "VII", "ganjil"),
    ("4169_PROGRAM_SEMESTER_BIOLOGI_7_2627_GENAP.pdf", "Biologi", "VII", "genap"),
    ("4171_Formulir_Program_Semester_2627_kelas_VII_Fisika.pdf", "Fisika", "VII", "ganjil"),
    ("4173_Program_Semester_2627_kelas_VII_Ganjil.pdf", "Informatika", "VII", "ganjil"),
    ("4178_Program_Semester_2627_kelas_VII.xlsx", "Pendidikan Pancasila", "VII", "ganjil"),
    ("4179_Revisi_Formulir_Program_Semester_2627_kelas_VII.pdf", "Sejarah", "VII", "ganjil"),
    # NOTE: 3975 Mandarin XI = scan (no text layer) - skipped
]

MONTHS = ["Juli", "Agustus", "September", "Oktober", "November", "Desember",
          "Januari", "Februari", "Maret", "April", "Mei", "Juni"]


def cell(v):
    return ("" if v is None else str(v)).strip()


def is_session(v):
    s = cell(v)
    if not s:
        return False
    return bool(re.fullmatch(r"[0-9]+([.,][0-9]+)?", s)) and s != "0"


def rows_xlsx(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.worksheets[0]
    return [[cell(c) for c in row] for row in ws.iter_rows(values_only=True)]


def rows_pdf(path):
    import pymupdf
    doc = pymupdf.open(path)
    best = None
    for page in doc:
        for t in page.find_tables().tables:
            if best is None or t.col_count > best.col_count:
                best = t
    if best is None:
        return []
    ext = best.extract()
    return [[cell(c).replace("\n", " ") for c in row] for row in ext]


def find_header(rows):
    for i, r in enumerate(rows):
        c0 = cell(r[0]) if r else ""
        c1 = cell(r[1]) if len(r) > 1 else ""
        if c0.lower().startswith("no") and c1.lower().startswith("elemen"):
            return i
    return -1


def find_grid(rows, header_idx):
    """Find month row + week-number row after header.
    Returns (week_columns, col->(month, weekInMonth))."""
    months = {}
    weekrow = -1
    for i in range(header_idx, min(header_idx + 4, len(rows))):
        r = rows[i]
        for j, c in enumerate(r):
            for m in MONTHS:
                if c.lower().startswith(m.lower()[:4]):
                    months[j] = m
                    break
        if months and i > header_idx and any(re.fullmatch(r"[1-5]", cell(x)) for x in r if cell(x)):
            weekrow = i
            break
    if not months or weekrow == -1:
        return [], {}
    # Grid spans ALL columns between first and last month label (merged cells
    # leave gaps in `months`); week numbers come from the weekrow digits.
    lo, hi = min(months), max(months)
    weekinmonth = {}
    for j in range(lo, hi + 1):
        c = cell(rows[weekrow][j]) if j < len(rows[weekrow]) else ""
        if re.fullmatch(r"[1-5]", c):
            weekinmonth[j] = int(c)
    return sorted(weekinmonth), {j: months.get(j, "?") for j in weekinmonth}


def week_columns_used(rows, start, gridcols):
    used = set()
    for r in rows[start:]:
        for j in gridcols:
            if j < len(r) and is_session(r[j]):
                used.add(j)
    return sorted(used)


def parse_rows(rows, header_idx, gridcols):
    """Parse data rows into entries with global week numbers."""
    used = week_columns_used(rows, header_idx + 3, gridcols)
    col2week = {j: n + 1 for n, j in enumerate(used)}

    entries = []
    topic = ""
    last_elemen = ""
    for r in rows[header_idx + 3:]:
        if not r or all(not cell(c) for c in r):
            continue
        c0 = cell(r[0]) if len(r) > 0 else ""
        elemen = cell(r[1]) if len(r) > 1 else ""
        konsep = cell(r[3]) if len(r) > 3 else ""
        if elemen:
            last_elemen = elemen

        weeks = []
        for j in used:
            if j < len(r) and is_session(r[j]):
                w = col2week[j]
                h = float(cell(r[j]).replace(",", "."))
                weeks.append({"week": w, "hours": int(h) if h == int(h) else h})

        if re.match(r"(?i)^BAB\s+\d+", konsep or elemen):
            topic = re.sub(r"(?i)^BAB\s+\d+\s*", "", konsep or elemen).strip()
            if not entries or entries[-1]["topic"] != topic:
                entries.append({"topic": topic, "subtopic": "(BAB)", "weeks": []})
            continue

        if elemen and not konsep and not weeks:
            last_elemen = elemen
            continue

        if not konsep:
            continue

        subtopic = re.sub(r"^\d+\.\d+\s*", "", konsep).strip()
        t = elemen or last_elemen or topic
        entries.append({"topic": t, "subtopic": subtopic, "weeks": weeks})
    return entries


def main():
    os.makedirs(OUT, exist_ok=True)
    summary = []
    for fname, subject, grade, semester in FILES:
        path = os.path.join(BASE, fname)
        if not os.path.exists(path):
            summary.append((fname, "MISSING", 0))
            continue
        try:
            rows = rows_xlsx(path) if fname.endswith(".xlsx") else rows_pdf(path)
            h = find_header(rows)
            if h == -1:
                summary.append((fname, "NO_HEADER", 0))
                continue
            gridcols, colmonth = find_grid(rows, h)
            if not gridcols:
                summary.append((fname, "NO_GRID", 0))
                continue
            entries = parse_rows(rows, h, gridcols)
            with_sessions = [e for e in entries if e["weeks"]]
            key = re.sub(r"[^a-z0-9]+", "_", f"{grade}_{subject}_{semester}".lower()).strip("_")
            out = {
                "source": fname,
                "subject": subject,
                "grade": grade,
                "semester": semester,
                "entries": entries,
            }
            with open(os.path.join(OUT, key + ".json"), "w") as f:
                json.dump(out, f, ensure_ascii=False, indent=1)
            summary.append((fname, f"OK {len(entries)} entries ({len(with_sessions)} w/ weeks)", len(entries)))
        except Exception as e:
            summary.append((fname, f"ERR {type(e).__name__}: {e}", 0))

    for f, s, n in summary:
        print(f"{n:>3}  {s:<42} {f[:52]}")
    ok = sum(1 for _, s, _ in summary if s.startswith("OK"))
    print(f"\n{ok}/{len(FILES)} files parsed")


if __name__ == "__main__":
    main()
