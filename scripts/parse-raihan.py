#!/usr/bin/env python3.12
"""Parse Raihan curriculum files + merge with SHOFI data for DB insertion"""

import openpyxl, json, subprocess, os

def parse_raihan_excel(path, sheet_index=0):
    """Parse Raihan's program semester Excel format"""
    wb = openpyxl.load_workbook(path)
    ws = wb.worksheets[sheet_index]
    topics = []
    
    # Usually starts at row ~11 after header
    for row in ws.iter_rows(min_row=11, values_only=True):
        vals = [str(v).strip() if v else '' for v in row]
        if not any(vals):
            continue
        no = vals[0]
        konsep = vals[3] if len(vals) > 3 else ''
        jam_str = vals[4] if len(vals) > 4 else ''
        
        if not konsep or not jam_str:
            continue
        if any(k in konsep.lower() for k in ['total', 'penilaian', 'remedial', 'penguatan']):
            continue
        
        try:
            jam = int(float(jam_str.replace(',', '.')))
            if jam > 0 and len(konsep) > 5:
                topics.append({"topic": konsep[:80], "hours": jam})
        except:
            pass
    
    return topics

# Parse Raihan Bahasa Indonesia
print("=== Raihan B. Indonesia ===")
bi_path = "moodle-files/2627_Bahasa_Indonesia_VII_A/General/Files_Program Semester/Formulir_Program_Semester 2627 kelas VII.xlsx"
if os.path.exists(bi_path):
    bi_topics = parse_raihan_excel(bi_path)
    for t in bi_topics:
        print(f"  {t['topic']} ({t['hours']} jam)")

# Parse Raihan Kimia
print("\n=== Raihan Kimia ===")
kimia_path = "moodle-files/2627_Kimia_VII_A/General/Files_Program Semester/Progsem kimia kelas 7 tahun 20262027.xlsx"
if os.path.exists(kimia_path):
    kimia_topics = parse_raihan_excel(kimia_path)
    for t in kimia_topics:
        print(f"  {t['topic']} ({t['hours']} jam)")

# OCR Raihan Fisika PDF
print("\n=== Raihan Fisika ===")
fisika_pdf = "moodle-files/2627_Fisika_VII_A/General/Files_Program Semester/Formulir_Program_Semester 2627 kelas VII_Fisika.pdf"
if os.path.exists(fisika_pdf):
    txt_path = fisika_pdf + ".txt"
    subprocess.run(["pdftotext", "-nopgbrk", fisika_pdf, txt_path], capture_output=True)
    if os.path.exists(txt_path):
        with open(txt_path) as f:
            content = f.read()
        print(f"  Length: {len(content)} chars")
        print(f"  Preview:")
        for line in content.split('\n')[:40]:
            if line.strip():
                print(f"    {line.strip()[:100]}")
