#!/usr/bin/env python3.12
"""
SIBI Content Agent - Extract chapters from PDF
Pipeline: PDF -> raw_content JSON
Usage: python3.12 scripts/sibi-content-agent.py [subject]
"""

import pymupdf, json, os, re, sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
RAW_DIR = BASE_DIR / "data" / "sibi" / "raw_content"

PDFS = {
    "Biologi": "Biologi_SMA11_BS.pdf",
    "Ekonomi": "Ekonomi_SMA11_BS.pdf",
    "Fisika": "Fisika_SMA11_BS.pdf",
    "Geografi": "Geografi_SMA11_BS.pdf",
    "Bahasa Indonesia": "Indonesia_SMA11_BS.pdf",
    "Informatika": "Informatika_SMA11_BS.pdf",
    "Bahasa Inggris": "Inggris_SMA11_BS.pdf",
    "Kimia": "Kimia_SMA11_BS.pdf",
    "Matematika Tingkat Lanjut": "Matematika_TL_SMA11_BS.pdf",
    "Pendidikan Pancasila": "Pancasila_SMA11_BS.pdf",
    "PJOK": "PJOK_SMA11_BS.pdf",
    "Sejarah": "Sejarah_SMA11_BS.pdf",
    "Sosiologi": "Sosiologi_SMA11_BS.pdf",
}

def extract_chapters(pdf_path):
    """Extract pages, then group into chapters by detecting 'BAB X' patterns."""
    doc = pymupdf.open(pdf_path)
    pages = []
    for i in range(len(doc)):
        text = doc[i].get_text().strip()
        if text:
            pages.append({"page": i + 1, "text": text})
    doc.close()
    
    # Find chapter boundaries: look for lines starting with "Bab X" or "BAB X"
    bab_pattern = re.compile(r'^(?:bab|bAB|BAB)\s+(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|I|II|III|IV|V|VI|VII|VIII|IX|X)\b', re.IGNORECASE)
    
    chapters = []
    current_title = None
    current_start = 1
    current_pages = []
    
    for p in pages:
        first_lines = [l.strip() for l in p["text"].split("\n")[:10] if l.strip()]
        match = None
        for line in first_lines:
            m = bab_pattern.match(line)
            if m:
                # Also check if there's a meaningful title on this line or next
                full_title = line.strip()
                # Limit title length
                if len(full_title) > 100:
                    full_title = full_title[:100]
                match = full_title
                break
        
        if match:
            # Save previous chapter
            if current_title:
                chapters.append({
                    "title": current_title,
                    "page_start": current_start,
                    "page_end": p["page"] - 1,
                    "text": "\n\n".join(current_pages)
                })
            current_title = match
            current_start = p["page"]
            current_pages = [p["text"]]
        else:
            if not current_title:
                current_title = "Pendahuluan"
                current_start = 1
            current_pages.append(p["text"])
    
    # Last chapter
    if current_title and current_pages:
        chapters.append({
            "title": current_title,
            "page_start": current_start,
            "page_end": pages[-1]["page"] if pages else 0,
            "text": "\n\n".join(current_pages)
        })
    
    # Merge consecutive chapters with same title
    merged = []
    for c in chapters:
        if merged and c["title"].lower() == merged[-1]["title"].lower():
            merged[-1]["text"] += "\n\n" + c["text"]
            merged[-1]["page_end"] = c["page_end"]
        else:
            merged.append(c)
    chapters = merged
    
    return chapters

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None
    pdf_dir = PUBLIC_DIR / "pdf-sma11"
    
    for subj, fname in PDFS.items():
        if target and target.lower() not in subj.lower():
            continue
        pdf_path = pdf_dir / fname
        if not pdf_path.exists():
            print(f"  ⚠️  {subj}: PDF not found")
            continue
        
        print(f"📖 {subj}...", end=" ", flush=True)
        ch = extract_chapters(str(pdf_path))
        
        out = RAW_DIR / "SMA_2" / f"{subj}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        json.dump({"grade": "SMA_2", "subject": subj, "chapters": ch}, open(out, "w"), indent=2)
        print(f"{len(ch)} chapters")

if __name__ == "__main__":
    main()