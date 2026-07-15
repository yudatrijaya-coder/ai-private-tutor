#!/usr/bin/env python3
"""
Generate slides content for empty materials via SumoPod LLM.
Targets: Raihan (SMP1), SHOFI (SMA2), Syifa (SD5)
Uses SIBI curriculum data from curriculum-topics-*.ts as reference.

Run: python3 scripts/gen-content-bulk.py
"""

import json, os, sys, time, re, psycopg2
from urllib.request import Request, urlopen
from urllib.error import URLError

# ─── Config ───────────────────────────────────────────────────
SUMOPOD_KEY = os.environ.get("SUMOPOD_API_KEY", "")
API_URL = "https://ai.sumopod.com/v1/chat/completions"
MODEL = "deepseek-v4-flash"

DB_CONFIG = {
    "host": os.environ.get("PGHOST", "localhost"),
    "port": int(os.environ.get("PGPORT", "5432")),
    "dbname": os.environ.get("PGDATABASE", "ai_private_tutor"),
    "user": os.environ.get("PGUSER", "tutor"),
    "password": os.environ.get("PGPASSWORD", "tutor123"),
}

# ─── Student mapping ──────────────────────────────────────────
STUDENTS = {
    "Raihan": {"studentId": "STU_MRHLH4LX", "grade": "SMP_1", "persona": "Kak Dewi"},
    "SHOFI":  {"studentId": "STU_MRHQL6KX", "grade": "SMA_2", "persona": "Kak Raka"},
    "Syifa":  {"studentId": "STU_MRHL5FYL", "grade": "SD_5",  "persona": "Kak Budi"},
}

# ─── DB helpers ────────────────────────────────────────────────
def get_db():
    return psycopg2.connect(**DB_CONFIG)

def get_empty_materials(conn, student_id):
    """Get materials with empty rawContent, grouped by subject."""
    cur = conn.cursor()
    cur.execute("""
        SELECT m.id, m.subject, m.topic, m."subTopic", m."weekOrder", m."sourceUrls"
        FROM "Material" m
        JOIN "Curriculum" c ON m."curriculumId" = c.id
        WHERE c."studentId" = %s
          AND (m."rawContent" IS NULL OR length(m."rawContent") <= 50)
        ORDER BY m.subject, m."weekOrder"
    """, (student_id,))
    rows = cur.fetchall()
    cur.close()
    
    # Group by subject
    by_subject = {}
    for r in rows:
        subj = r[1]
        if subj not in by_subject:
            by_subject[subj] = []
        by_subject[subj].append({
            "id": r[0], "subject": r[1], "topic": r[2],
            "subTopic": r[3], "weekOrder": r[4], "sourceUrls": r[5]
        })
    return by_subject

def update_material(conn, mat_id, raw_content, metadata_json):
    """Update a material with generated content."""
    cur = conn.cursor()
    # Build mindmap from the content structure
    slides_text = raw_content[:5000]  # take first 5000 chars for mindmap
    
    # Generate mindmap nodes from slides
    mindmap_nodes = parse_mindmap_from_slides(raw_content)
    
    metadata = {
        "slides": raw_content,
        "source": "llm-generated-sibi",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "mindmap": mindmap_nodes
    }
    if metadata_json:
        # Merge with existing metadata (preserve SIBI links etc.)
        existing = json.loads(metadata_json) if isinstance(metadata_json, str) else metadata_json
        if isinstance(existing, dict):
            existing.update(metadata)
            # Preserve sibiLink if it exists
            metadata = existing
    
    cur.execute("""
        UPDATE "Material" 
        SET "rawContent" = %s,
            "metadata" = %s::jsonb,
            "updatedAt" = NOW()
        WHERE id = %s
    """, (raw_content, json.dumps(metadata), mat_id))
    conn.commit()
    cur.close()

def parse_mindmap_from_slides(md_text):
    """Parse markdown slides into mindmap structure."""
    nodes = []
    lines = md_text.split("\n")
    current_branch = None
    children = []
    
    for line in lines:
        line = line.strip()
        if line.startswith("## "):
            if current_branch:
                nodes.append({
                    "id": f"branch-{len(nodes)}",
                    "label": current_branch,
                    "children": children[:4]  # limit children
                })
                children = []
            current_branch = line[3:].strip()
        elif line.startswith("- ") and current_branch:
            children.append({"label": line[2:].strip()[:100]})
    
    # Last branch
    if current_branch and children:
        nodes.append({
            "id": f"branch-{len(nodes)}",
            "label": current_branch,
            "children": children[:4]
        })
    
    return nodes

# ─── LLM call ──────────────────────────────────────────────────
def call_llm(system_prompt, user_prompt):
    """Call SumoPod API and return text response."""
    if not SUMOPOD_KEY:
        print("❌ SUMOPOD_API_KEY not set!")
        return None
    
    payload = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
    }).encode("utf-8")
    
    req = Request(API_URL, data=payload, headers={
        "Authorization": f"Bearer {SUMOPOD_KEY}",
        "Content-Type": "application/json",
    })
    
    for attempt in range(3):
        try:
            resp = urlopen(req, timeout=120)
            result = json.loads(resp.read())
            content = result["choices"][0]["message"]["content"]
            return content
        except URLError as e:
            print(f"  ⚠️ LLM error (attempt {attempt+1}): {e}")
            time.sleep(5)
        except (KeyError, json.JSONDecodeError) as e:
            print(f"  ⚠️ Parse error: {e}")
            return None
    return None

# ─── Content generation ────────────────────────────────────────
SYSTEM_PROMPT_TEMPLATE = """Kamu adalah asisten pembuat materi pembelajaran untuk {persona}, seorang tutor privat {grade}.

Tugasmu: Buat konten slide pembelajaran dalam format MARKDOWN untuk 1 topik pelajaran.

FORMAT WAJIB:
## [Konsep Kunci]
- [3-5 poin penting tentang topik ini, bahasa sesuai usia {grade}]

## [Sub-topik 1]
- [Penjelasan singkat]
- [Contoh jika relevan]

## [Sub-topik 2]  
- [Penjelasan singkat]
- [Contoh jika relevan]

## [Latihan / Refleksi]
- [2-3 pertanyaan atau aktivitas untuk siswa]

Gunakan bahasa Indonesia yang sesuai usia:
- SD: ceria, sederhana, banyak contoh konkret
- SMP: lebih formal, hubungan dengan kehidupan sehari-hari
- SMA: mendalam, istilah teknis, analitis

Jangan gunakan format selain yang ditentukan. Jangan tanya. Langsung buat kontennya."""

def generate_batch(batch):
    """Generate content for a batch of materials from the same subject."""
    subject = batch[0]["subject"]
    topics_str = "\n".join([
        f"{i+1}. TOPIK: {m['topic']}" + (f" — {m['subTopic']}" if m['subTopic'] else "")
        for i, m in enumerate(batch)
    ])
    
    grade = "SD Kelas 5" if "SD" in str(batch) else "SMP Kelas 1" if "SMP" in str(batch) else "SMA Kelas 2"
    persona = "Kak Budi (SD)" if "SD" in str(batch) else "Kak Dewi (SMP)" if "SMP" in str(batch) else "Kak Raka (SMA)"
    
    user_prompt = f"""Buat konten slide untuk topik-topik {subject} ({grade}) berikut.
Untuk SETIAP topik, buat slide markdown dengan format yang ditentukan.
Pisahkan setiap topik dengan baris: ---

{topics_str}"""
    
    print(f"  LLM call: {len(batch)} topik — {subject}")
    result = call_llm(SYSTEM_PROMPT_TEMPLATE.format(persona=persona, grade=grade), user_prompt)
    return result

def split_llm_output(text, num_topics):
    """Split combined LLM output back into per-topic content."""
    if not text:
        return [""] * num_topics
    
    # Split by --- separator
    parts = re.split(r'\n---\n|\n---\r?\n?', text)
    
    # If we got fewer parts than expected, pad
    while len(parts) < num_topics:
        parts.append("")
    
    # If more, merge extras into last
    if len(parts) > num_topics:
        parts = parts[:num_topics]
    
    return parts

# ─── Main ──────────────────────────────────────────────────────
def main():
    if not SUMOPOD_KEY:
        # Try reading from .env
        env_path = os.path.expanduser("~/ai-private-tutor/.env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("SUMOPOD_API_KEY="):
                        os.environ["SUMOPOD_API_KEY"] = line.strip().split("=", 1)[1]
                        break
        global SUMOPOD_KEY
        SUMOPOD_KEY = os.environ.get("SUMOPOD_API_KEY", "")
    
    if not SUMOPOD_KEY:
        print("❌ SUMOPOD_API_KEY not found! Set env or add to .env")
        sys.exit(1)
    
    print(f"🔑 LLM key loaded: {SUMOPOD_KEY[:10]}...")
    
    conn = get_db()
    
    for student_name, student_info in STUDENTS.items():
        print(f"\n{'='*60}")
        print(f"📚 {student_name} ({student_info['grade']})")
        print(f"{'='*60}")
        
        by_subject = get_empty_materials(conn, student_info["studentId"])
        total_empty = sum(len(v) for v in by_subject.values())
        
        if total_empty == 0:
            print("  ✅ Semua materi sudah punya konten!")
            continue
        
        print(f"  📊 {total_empty} materi kosong di {len(by_subject)} mapel:")
        for subj, mats in sorted(by_subject.items()):
            print(f"    - {subj}: {len(mats)} materi")
        
        # Process each subject in batches
        for subject, materials in sorted(by_subject.items()):
            print(f"\n  📖 {subject} ({len(materials)} materi)")
            
            # Batch into groups of 5
            batch_size = 5
            for i in range(0, len(materials), batch_size):
                batch = materials[i:i+batch_size]
                print(f"\n  Batch {i//batch_size + 1}/{(len(materials)-1)//batch_size + 1}:")
                
                result = generate_batch(batch)
                if not result:
                    print(f"  ❌ LLM failed for batch, skipping")
                    continue
                
                # Split result into per-material content
                parts = split_llm_output(result, len(batch))
                
                for j, mat in enumerate(batch):
                    content = parts[j] if j < len(parts) else ""
                    if len(content) < 50:
                        print(f"    ⚠️ {mat['topic']}: content too short ({len(content)} chars), retrying...")
                        # Retry individually
                        single_result = generate_batch([mat])
                        if single_result:
                            single_parts = split_llm_output(single_result, 1)
                            content = single_parts[0] if single_parts else content
                    
                    if len(content) > 50:
                        update_material(conn, mat["id"], content, None)
                        print(f"    ✅ {mat['topic']}: {len(content)} chars")
                    else:
                        print(f"    ❌ {mat['topic']}: failed to generate")
                    
                    time.sleep(0.5)  # Rate limit
                
                # Brief delay between batches
                time.sleep(1)
    
    conn.close()
    print(f"\n{'='*60}")
    print("✅ Selesai! Semua konten di-generate.")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
