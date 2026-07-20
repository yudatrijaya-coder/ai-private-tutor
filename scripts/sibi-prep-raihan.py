#!/usr/bin/env python3
"""
SIBI Prep - Raihan001 (SMP_1)
Scan available SIBI textbooks for SMP level and map to Raihan's materials.

Tasks:
1. Scan for SMP-level SIBI PDFs
2. Check if SIBI content has been extracted (raw_content)
3. List Raihan's subjects/materials
4. Report what's needed to start SIBI content generation

Usage: python3 scripts/sibi-prep-raihan.py
"""

import os
import re
import json
import subprocess
from pathlib import Path

BASE_DIR = Path("/home/ubuntu/ai-private-tutor")
SIBI_BOOKS_DIR = Path(os.path.expanduser("~/ai-private-tutor/moodle-files/sibi-books"))
RAW_CONTENT_DIR = BASE_DIR / "data" / "sibi" / "raw_content"
MATCHED_DIR = BASE_DIR / "data" / "sibi" / "matched"
PUBLIC_DIR = BASE_DIR / "public"
STUDENT_UUID = "0d3fbf85-a1ee-4c5c-bdd9-f752ed75b69d"
CURRICULUM_IDS = [
    "a61bcc63-7c88-41bb-9425-658b5fbf3fa3",
    "e94cf3dd-3fae-4fae-b28f-e7aa899d11e7",
]

# SIBI textbooks found for SMP (Kelas VII)
SMP_SIBI_BOOKS = {
    "Bahasa Indonesia": "Bahasa_Indonesia_BS_KLS_VII_Rev.pdf",
    "Informatika": "BS_INFORMATIKA_VII.pdf",
    "IPA": "IPA_BS_KLS_VII_Rev.pdf",
    "IPS": "IPS_BS_KLS_VII_Rev.pdf",
    "Pendidikan Pancasila": "Pendidikan-Pancasila-BS-KLS-VII.pdf",
    "PJOK": "PJOK_BS_KLS_VII.pdf",
}

# Raihan SMP_1 subjects from curriculum-topics-smp7.ts
RAIHAN_SMP7_SUBJECTS = {
    "Bahasa Indonesia": {"topics": 15},
    "Bahasa Inggris": {"topics": 10},
    "Informatika": {"topics": 5},
    "IPA": {"topics": 24},
    "IPS": {"topics": 6},
    "Matematika": {"topics": 8},
    "Pendidikan Pancasila": {"topics": 13},
    "PJOK": {"topics": 18},
}

def print_sep(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")

def step1_scan_sibi_pdfs():
    print_sep("STEP 1: Scan for SMP SIBI PDFs")
    
    # Check in sibi-books directory
    print("\n--- SIBI Books Directory ---")
    if SIBI_BOOKS_DIR.exists():
        all_books = list(SIBI_BOOKS_DIR.glob("*.pdf"))
        smp_books = [b for b in all_books if "VII" in b.stem]
        print(f"Total SIBI books: {len(all_books)}")
        print(f"SMP (Kelas VII) books: {len(smp_books)}")
        for b in sorted(smp_books):
            sz_mb = b.stat().st_size / (1024*1024)
            print(f"  ✅ {b.name} ({sz_mb:.1f} MB)")
    else:
        print(f"❌ Directory not found: {SIBI_BOOKS_DIR}")

    # Check in public/moodle-files
    print("\n--- Public Moodle Files ---")
    moodle_dir = PUBLIC_DIR / "moodle-files"
    smp_pdfs = []
    if moodle_dir.exists():
        for f in moodle_dir.glob("*.pdf"):
            fn = f.name.lower()
            if "bs_kls_vii" in fn or "smp" in fn or "kelas_vii" in fn:
                smp_pdfs.append(f)
    for b in sorted(smp_pdfs):
        sz_mb = b.stat().st_size / (1024*1024)
        print(f"  📄 {b.name} ({sz_mb:.1f} MB)")

    return smp_books

def step2_check_extracted_content():
    print_sep("STEP 2: Check Extracted SIBI Content")
    
    smp_raw_dir = RAW_CONTENT_DIR / "SMP_1"
    smp_matched_dir = MATCHED_DIR / "SMP_1"
    
    if smp_raw_dir.exists():
        files = list(smp_raw_dir.glob("*.json"))
        print(f"Raw content (SMP_1): {len(files)} subjects")
        for f in sorted(files):
            data = json.load(open(f)) if f.stat().st_size > 0 else {}
            chapters = len(data.get("chapters", []))
            print(f"  📖 {f.stem}: {chapters} chapters")
    else:
        print("❌ No extracted raw content for SMP_1 yet.")
    
    if smp_matched_dir.exists():
        files = list(smp_matched_dir.glob("*.json"))
        print(f"Matched content (SMP_1): {len(files)} subjects")
        for f in sorted(files):
            data = json.load(open(f)) if f.stat().st_size > 0 else {}
            matched = data.get("matched", 0)
            total = data.get("total_topics", 0)
            print(f"  🔗 {f.stem}: {matched}/{total} topics matched")
    else:
        print("❌ No matched content for SMP_1 yet.")

def step3_list_raihan_materials():
    print_sep("STEP 3: Raihan's Subjects & Materials")
    
    for cid in CURRICULUM_IDS:
        sql = f"""
        SELECT m.subject, COUNT(m.id) as total,
          COUNT(NULLIF(m.metadata->>'slide', '')) as slide_llm,
          COUNT(NULLIF(m.metadata->>'slide_sibi', '')) as slide_sibi,
          COUNT(NULLIF(m.metadata->>'mindmap', '')) as mindmap_llm,
          COUNT(NULLIF(m.metadata->>'mindmap_sibi', '')) as mindmap_sibi
        FROM "Material" m
        WHERE m."curriculumId" = '{cid}'
        GROUP BY m.subject
        ORDER BY m.subject;
        """
        r = subprocess.run(
            ["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql],
            capture_output=True, text=True
        )
        total_mat = 0
        print(f"\nCurriculum: {cid}")
        for line in r.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("|")
            if len(parts) >= 6:
                subject, total, sllm, ssibi, mllm, msibi = parts[:6]
                total_mat += int(total)
                sibi_slides = "✅" if int(ssibi) > 0 else "❌"
                sibi_mm = "✅" if int(msibi) > 0 else "❌"
                print(f"  {subject:25s} | {total:3s} materials | slide_sibi: {sibi_slides} | mindmap_sibi: {sibi_mm}")
        print(f"  {'─'*50}\n  Total materials: {total_mat}")

    print("\nSubjects needing SIBI books:")
    available = set(SMP_SIBI_BOOKS.keys())
    needed = set()
    for cid in CURRICULUM_IDS:
        sql = f'SELECT DISTINCT m.subject FROM "Material" m WHERE m."curriculumId" = \'{cid}\''
        r = subprocess.run(
            ["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql],
            capture_output=True, text=True
        )
        for line in r.stdout.strip().split("\n"):
            if line.strip():
                needed.add(line.strip())
    
    print(f"  Subjects covering all: {sorted(needed)}")
    print(f"  SIBI books available: {sorted(available)}")
    missing = needed - available
    if missing:
        print(f"\n  ⚠️ NO SIBI textbook for: {', '.join(sorted(missing))}")
    else:
        print(f"\n  ✅ All subjects have SIBI textbooks")

def step4_action_plan():
    print_sep("STEP 4: Action Plan")
    
    print("""
PHASE 0: PREREQUISITES
├── Ensure scripts are adapted for SMP_1 (not hardcoded to SMA_2)
│   ├── sibi-content-agent.py: parameterize grade, add SMP PDF → filename map
│   ├── sibi-match-topics.py: parameterize grade, use curriculum-topics-smp7.ts
│   ├── sibi-generate-*.py: use SMP_1 curriculum ID (not SHOFI SMA_2)
│   └── data paths: data/sibi/raw_content/SMP_1/, data/sibi/matched/SMP_1/
├── Protect existing LLM data (backup before any UPDATE)
└── Database query for student's curriculum IDs:
    0d3fbf85 (SMP_1) → a61bcc63..., e94cf3dd...

PHASE 1: PDF → RAW CONTENT
├── python3.12 scripts/sibi-content-agent.py [subject]
│   Uses pymupdf to extract pages, detect BAB headers
│   Output: data/sibi/raw_content/SMP_1/{subject}.json
└── Available SMP SIBI books:
""")
    for subj, fname in SMP_SIBI_BOOKS.items():
        # Find actual file location
        possible = [
            SIBI_BOOKS_DIR / fname,
            PUBLIC_DIR / "moodle-files" / f"4164_{fname}",
            PUBLIC_DIR / "moodle-files" / fname,
            Path(f"/home/ubuntu/ai-private-tutor/moodle-files/2627_{subj.upper().replace(' ', '_')}_VII_A/General/Files_Modul Bahasa Indonesia Kelas VII") / fname,
        ]
        found = None
        for p in possible:
            if p.exists():
                found = p
                break
        if found:
            sz_mb = found.stat().st_size / (1024*1024)
            print(f"  ✅ {subj:25s} → {found.relative_to(Path.home())} ({sz_mb:.1f} MB)")
        else:
            print(f"  ❌ {subj:25s} → NOT FOUND (file: {fname})")

    print("""
PHASE 2: TOPIC MATCHING
├── python3.12 scripts/sibi-match-topics.py [subject]
│   Uses LLM to map PDF chapters to curriculum topics
│   Input: data/sibi/raw_content/SMP_1/{subject}.json
│   Reference: src/data/curriculum-topics-smp7.ts
│   Output: data/sibi/matched/SMP_1/{subject}.json
└── Subjects needing download first:
    - Bahasa Inggris (no SIBI PDF for VII)
    - Matematika (no SIBI PDF for VII)

PHASE 3: CONTENT GENERATION
├── python3.12 scripts/sibi-generate-slides.py [subject]
├── python3.12 scripts/sibi-generate-mindmap.py [subject]
├── python3.12 scripts/sibi-generate-quiz.py [subject]
│
│ CRITICAL: Run ONE generator at a time per subject (serial!)
│ CRITICAL: Add 3-5s delay between materials
│ CRITICAL: Add 10-15s delay between subjects
│ CRITICAL: NEVER overwrite metadata->slide / metadata->mindmap
│           Always write to metadata->slide_sibi, metadata->mindmap_sibi
│
└── Subjects without SIBI books → use LLM fallback (sibi-fill-no-match.py)

PHASE 4: VERIFICATION
├── Run audit query to verify slide_sibi/mindmap_sibi/quiz are filled
└── UI: ensure ?source=sibi works for SMP materials
""")

def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║     SIBI Pipeline Prep — Raihan001 (SMP_1)          ║")
    print("╚══════════════════════════════════════════════════════╝")
    
    step1_scan_sibi_pdfs()
    step2_check_extracted_content()
    step3_list_raihan_materials()
    step4_action_plan()

if __name__ == "__main__":
    main()
