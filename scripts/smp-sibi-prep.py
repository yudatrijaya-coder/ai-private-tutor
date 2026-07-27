#!/usr/bin/env python3.12
"""
Parse SIBI PDFs for SMP_1 (Biologi, Sejarah, Geografi).
Extract chapters, match to DB materials, inject rawContent.
"""
import os, json, subprocess

BASE_DIR = "/home/ubuntu/ai-private-tutor/public/moodle-files/smp_sibi"
OUTPUT_DIR = BASE_DIR + "/matched"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_sql(sql):
    result = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql],
        capture_output=True, text=True, timeout=30
    )
    return result.stdout.strip()

def get_materials(subj):
    sql = f"""
        SELECT id::text, topic, \"subTopic\", \"weekOrder\"
        FROM \"Material\"
        WHERE \"curriculumId\" = 'a61bcc63-7c88-41bb-9425-658b5fbf3fa3'
          AND subject = '{subj}'
        ORDER BY \"weekOrder\";
    """
    rows = run_sql(sql)
    if not rows:
        return []
    return [tuple(r.split('|')) for r in rows.split('\n')]

def update_raw_content(mat_id, raw_text):
    escaped = raw_text.replace("'", "''").replace("\x00","")
    sql = f"""
        UPDATE \"Material\"
        SET \"rawContent\" = '{escaped}'
        WHERE id = '{mat_id}';
    """
    run_sql(sql)

def parse_pdf(path):
    try:
        import fitz
    except ImportError:
        print("  ERROR: fitz (pymupdf) not available")
        return {}
    
    doc = fitz.open(path)
    topics = {}
    current_title = None
    current_lines = []
    
    for i in range(len(doc)):
        text = doc[i].get_text().strip()
        if not text:
            continue
        if i == 0:
            continue
        
        lines = text.split('\n')
        # Find section headers
        for line in lines[:4]:
            line_s = line.strip()
            if line_s and 5 < len(line_s) < 90:
                upper = line_s.upper()
                # Skip page numbers and short lines
                if line_s.replace('.','').replace(' ','').isdigit():
                    continue
                if any(k in upper for k in ['APA ITU', 'MAKHLUK HIDUP', 'Klasifikasi', 'CIRI-CIRI',
                                             'FOTOSINTESIS', 'GOLONGAN', 'PEMBELAHAN', 'REPRODUKSI',
                                             'PENGERTIAN', 'BUKTI', 'PEWARISAN', 'PEMBAGIAN',
                                             'KEHIDUPAN', 'MANUSIA PURBA', 'PERUNDAGIAN', 'KREDEN',
                                             'PETA', 'LAPISAN', 'HIDROSFER', 'ANTROPOSFER',
                                             'LITOSFER', 'DATARAN', 'PERAIRAN', 'INTERAKSI',
                                             'WILAYAH', 'RUANG', 'PERSPEKTIF', 'LIKUID',
                                             'PENGETAHUAN', 'JENIS', 'SUMBER', 'AWAL',
                                             'SUBKONSEP', 'SEL', 'DUNIA', 'HETEROTROF', 'AUTOTROF']):
                    if line_s != current_title:
                        if current_lines and current_title:
                            key = current_title.lower().replace(' ', '_')[:50]
                            topics[key] = {
                                'title': current_title,
                                'text': '\n'.join(current_lines)[:6000]
                            }
                        current_title = line_s
                        current_lines = []
                        break
        
        current_lines.append(text)
        if len(current_lines) > 120:
            current_lines = current_lines[-60:]
    
    if current_lines and current_title:
        key = current_title.lower().replace(' ', '_')[:50]
        topics[key] = {'title': current_title, 'text': '\n'.join(current_lines)[:6000]}
    
    doc.close()
    return topics

def match_and_inject(subj, pdf_path):
    print(f"\n  Parsing PDF...")
    topics = parse_pdf(pdf_path)
    print(f"  Extracted {len(topics)} chapters")
    
    for k, v in list(topics.items())[:5]:
        print(f"    - {v['title'][:60]} ({len(v['text'])} chars)")
    
    materials = get_materials(subj)
    print(f"  DB materials: {len(materials)}")
    
    injected = 0
    for mat_id, topic, subtopic, week in materials:
        # Find best matching chapter
        best = None
        best_score = 0
        subtopic_lower = (subtopic or '').lower()
        topic_lower = (topic or '').lower()
        
        for key, ch in topics.items():
            ch_title = ch['title'].lower()
            ch_text = (ch['text'] or '')[:500].lower()
            score = 0
            if subtopic_lower and subtopic_lower in ch_title: score += 10
            if topic_lower and topic_lower in ch_title: score += 5
            if subtopic_lower and subtopic_lower in ch_text: score += 3
            if topic_lower and topic_lower in ch_text: score += 2
            if score > best_score:
                best_score = score
                best = ch
        
        if best and best_score >= 3:
            raw = best['text'][:6000]
            update_raw_content(mat_id, raw)
            injected += 1
            print(f"    [W{week}] {topic} -> {best['title'][:50]}")
        else:
            print(f"    [W{week}] {topic} -> NO MATCH (will use LLM)")
    
    # Save matched JSON
    out = f"{OUTPUT_DIR}/{subj}_matched.json"
    with open(out, 'w') as f:
        json.dump(topics, f, ensure_ascii=False, indent=2)
    print(f"  Saved: {out}")
    
    return injected

def main():
    print("=== SMP SIBI Prep ===")
    CURRICULUM = 'a61bcc63-7c88-41bb-9425-658b5fbf3fa3'
    
    # Biologi
    print("\n[1/3] Biologi...")
    n = match_and_inject('Biologi', f"{BASE_DIR}/biologi_bab1.pdf")
    
    # Sejarah
    print("\n[2/3] Sejarah...")
    n += match_and_inject('Sejarah', f"{BASE_DIR}/sejarah_praaksara.pdf")
    
    # Geografi
    print("\n[3/3] Geografi...")
    n += match_and_inject('Geografi', f"{BASE_DIR}/geografi_bukusiswa.pdf")
    
    print(f"\n=== DONE: {n} materials injected ===")

if __name__ == '__main__':
    main()
