#!/usr/bin/env python3.12
"""
SIBI Content Agent V2 - Extract chapters from PDF
Flexible: Supports any grade and subject via arguments.
Pipeline: PDF -> raw_content JSON

Usage:
  python3.12 scripts/sibi-content-agent-v2.py <GRADE> <SUBJECT>
  Example:
  python3.12 scripts/sibi-content-agent-v2.py SMP_1 "Bahasa Indonesia"
"""

import pymupdf, json, os, re, sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# PDF Mappings per grade
PDF_MAP = {
    "SMA_2": {
        "Biologi": "moodle-files/sibi-books/Biologi_SMA11_BS.pdf",
        "Ekonomi": "moodle-files/sibi-books/Ekonomi_SMA11_BS.pdf",
        "Fisika": "moodle-files/sibi-books/Fisika_SMA11_BS.pdf",
        "Geografi": "moodle-files/sibi-books/Geografi_SMA11_BS.pdf",
        "Bahasa Indonesia": "moodle-files/sibi-books/Indonesia_SMA11_BS.pdf",
        "Informatika": "moodle-files/sibi-books/Informatika_SMA11_BS.pdf",
        "Bahasa Inggris": "moodle-files/sibi-books/Inggris_SMA11_BS.pdf",
        "Kimia": "moodle-files/sibi-books/Kimia_SMA11_BS.pdf",
        "Matematika Tingkat Lanjut": "moodle-files/sibi-books/Matematika_TL_SMA11_BS.pdf",
        "Pendidikan Pancasila": "moodle-files/sibi-books/Pancasila_SMA11_BS.pdf",
        "PJOK": "moodle-files/sibi-books/PJOK_SMA11_BS.pdf",
        "Sejarah": "moodle-files/sibi-books/Sejarah_SMA11_BS.pdf",
        "Sosiologi": "moodle-files/sibi-books/Sosiologi_SMA11_BS.pdf",
    },
    "SMP_1": {
        "Bahasa Indonesia": "moodle-files/2627_Bahasa_Indonesia_VII_A/General/Files_Modul Bahasa Indonesia Kelas VII/Bahasa_Indonesia_BS_KLS_VII_Rev.pdf",
        "Informatika": "moodle-files/sibi-books/BS_INFORMATIKA_VII.pdf",
        "IPA": "moodle-files/sibi-books/IPA_BS_KLS_VII_Rev.pdf",
        "IPS": "moodle-files/sibi-books/IPS_BS_KLS_VII_Rev.pdf",
        "Pendidikan Pancasila": "moodle-files/sibi-books/Pendidikan-Pancasila-BS-KLS-VII.pdf",
        "PJOK": "moodle-files/sibi-books/PJOK_BS_KLS_VII.pdf",
    },
    "SD_5": {
        "Bahasa Indonesia": "moodle-files/sibi-books/Indonesia_BS_KLS_V_Rev.pdf",
        "Bahasa Inggris": "moodle-files/sibi-books/Inggris_FN_BS_KLS_V.pdf",
        "IPAS": "moodle-files/sibi-books/IPAS_BS_KLS_V_Rev.pdf",
        "Seni Budaya": "moodle-files/sibi-books/KKA_BS_KLS_5.pdf", # Using KKA for Seni
        "Matematika": "moodle-files/sibi-books/Matematika-BS-KLS-V.pdf",
        "Pendidikan Pancasila": "moodle-files/sibi-books/Pendidikan-Pancasila-BS-KLS-V.pdf",
        "PJOK": "moodle-files/sibi-books/PJOK_BS_KLS_V.pdf",
    }
}

def extract_chapters(pdf_path):
    print(f"Opening {pdf_path}...")
    doc = pymupdf.open(pdf_path)
    pages = []
    for i in range(len(doc)):
        text = doc[i].get_text().strip()
        if text:
            pages.append({"page": i + 1, "text": text})
    doc.close()
    
    bab_pattern = re.compile(r'^(?:bab|bAB|BAB|unit|UNIT)\s+(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|I|II|III|IV|V|VI|VII|VIII|IX|X)\b', re.IGNORECASE)
    
    chapters = []
    current_title = None
    current_start = 1
    current_pages = []
    
    for p in pages:
        first_lines = [l.strip() for l in p["text"].split("\n")[:10] if l.strip()]
        
        is_new = False
        bab_line = ""
        for line in first_lines:
            if bab_pattern.match(line):
                is_new = True
                bab_line = line
                break
                
        if is_new:
            if current_pages:
                txt = "\n\n".join([cp["text"] for cp in current_pages])
                if len(txt) > 500:
                    chapters.append({
                        "title": current_title or "Pendahuluan",
                        "start_page": current_start,
                        "end_page": p["page"] - 1,
                        "text": txt
                    })
            current_title = bab_line
            current_start = p["page"]
            current_pages = [p]
        else:
            current_pages.append(p)
            
    if current_pages:
        txt = "\n\n".join([cp["text"] for cp in current_pages])
        if len(txt) > 500:
            chapters.append({
                "title": current_title or "Lainnya",
                "start_page": current_start,
                "end_page": current_pages[-1]["page"],
                "text": txt
            })
            
    return chapters

def process_subject(grade, subject):
    if grade not in PDF_MAP:
        print(f"❌ Error: Grade '{grade}' not supported.")
        return
        
    if subject not in PDF_MAP[grade]:
        print(f"❌ Error: Subject '{subject}' not found in {grade} mapping.")
        return
        
    pdf_rel = PDF_MAP[grade][subject]
    pdf_path = BASE_DIR / pdf_rel
    
    if not pdf_path.exists():
        print(f"❌ Error: PDF not found at {pdf_path}")
        return
        
    out_dir = BASE_DIR / "data" / "sibi" / "raw_content" / grade
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{subject}.json"
    
    chapters = extract_chapters(str(pdf_path))
    
    if chapters:
        with open(out_path, "w") as f:
            json.dump({
                "subject": subject,
                "grade": grade,
                "pdf_file": pdf_path.name,
                "chapters": chapters
            }, f, indent=2)
        print(f"✅ Saved {len(chapters)} chapters to {out_path.relative_to(BASE_DIR)}")
    else:
        print(f"⚠️ No chapters detected in {subject}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python3.12 scripts/sibi-content-agent-v2.py <GRADE> <SUBJECT|all>")
        print("Example: python3.12 scripts/sibi-content-agent-v2.py SMP_1 \"Bahasa Indonesia\"")
        sys.exit(1)
        
    grade = sys.argv[1]
    subject = sys.argv[2]
    
    if subject.lower() == "all":
        if grade not in PDF_MAP:
            print(f"❌ Grade {grade} not found.")
            sys.exit(1)
        for subj in PDF_MAP[grade]:
            print(f"\n--- Extracting {subj} ---")
            process_subject(grade, subj)
    else:
        process_subject(grade, subject)

if __name__ == "__main__":
    main()