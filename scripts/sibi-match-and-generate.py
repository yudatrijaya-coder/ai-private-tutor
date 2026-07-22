#!/usr/bin/env python3.12
"""
SIBI All-in-One: Match PDF chapters → Generate slide_sibi, mindmap_sibi, quiz
For ANY grade level (SMP_1, SD_5, SMA_2).

SAFETY: Only writes to metadata->'slide_sibi' and metadata->'mindmap_sibi'.
        NEVER overwrites metadata->'slide' or metadata->'mindmap'.

Usage:
  python3.12 scripts/sibi-match-and-generate.py <GRADE> <CURRICULUM_ID> <STUDENT_UUID> [subject]
  
  Example:
  python3.12 scripts/sibi-match-and-generate.py SMP_1 a61bcc63-... 0d3fbf85-... "Bahasa Indonesia"
  python3.12 scripts/sibi-match-and-generate.py SMP_1 a61bcc63-... 0d3fbf85-... all
"""

import json, os, re, requests, sys, subprocess, uuid, time
from openai import OpenAI
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LLM_CLIENT = OpenAI(base_url="http://localhost:20128/v1", api_key="sk-9router")
LLM_MODEL = "hermes"

# ---- DB helpers ----
def db_query(sql):
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql], capture_output=True, text=True)
    return r.stdout.strip()

def db_exec(sql):
    subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True, text=True)

# ---- LLM call (9Router always returns hybrid JSON+SSE; handle both) ----
def call_llm(system_prompt, user_prompt):
    for attempt in range(3):
        try:
            r = requests.post("http://localhost:20128/v1/chat/completions", json={
                "model": "hermes",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 2000,
                "stream": False,
            }, timeout=180)
            
            if r.status_code == 429:
                retry_after = int(r.headers.get("retry-after", 60))
                print(f"      ⚠️ Rate limited (429). Waiting {retry_after}s...")
                time.sleep(retry_after + 5)
                continue
            
            if r.status_code != 200:
                raise ValueError(f"HTTP {r.status_code}")
            
            content_parts = []
            
            for line in r.text.split("\n"):
                line = line.strip()
                if not line:
                    continue
                if line.startswith("data: "):
                    if line == "data: [DONE]":
                        continue
                    try:
                        chunk = json.loads(line[6:])
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            c = delta.get("content")
                            if c:
                                content_parts.append(c)
                    except:
                        pass
                else:
                    try:
                        chunk = json.loads(line)
                        choices = chunk.get("choices", [])
                        if choices:
                            msg = choices[0].get("message", {})
                            c = msg.get("content") or ""
                            if c:
                                content_parts.append(c)
                            # 9Router routes to deepseek-v4-flash which puts content in reasoning_content
                            rc = msg.get("reasoning_content") or ""
                            if rc and not c:
                                content_parts.append(rc)
                    except:
                        pass
            
            content = "".join(content_parts)
            if not content:
                if attempt == 2:
                    print(f"      ⚠️ 9Router overload — waiting 30s...")
                    time.sleep(30)
                    continue
                raise ValueError("Empty content")
            return content.strip()
        except Exception as e:
            print(f"      ⚠️ LLM Attempt {attempt+1} failed: {e}")
            if attempt == 2:
                raise
            time.sleep(15)
def parse_outline_to_mindmap(text, main_label):
    lines = text.strip().split("\n")
    mindmap_nodes = [{'id': '0', 'label': main_label, 'children': []}]
    current_parents = {0: mindmap_nodes[0]}
    node_counter = 1
    for line in lines:
        if not line.strip(): continue
        leading_chars = line.lstrip(' ')
        indent_level = len(line) - len(leading_chars)
        if indent_level >= 6: level = 3
        elif indent_level >= 4: level = 2
        elif indent_level >= 2: level = 1
        else: level = 0
        label = leading_chars.lstrip('-*\t ').strip()
        if not label: continue
        if level > 0 and level not in current_parents: level = 0
        if level not in current_parents: current_parents[level] = mindmap_nodes[0]
        parent = current_parents[level]
        new_node = {'id': str(node_counter), 'label': label, 'children': []}
        node_counter += 1
        if 'children' not in parent: parent['children'] = []
        parent['children'].append(new_node)
        current_parents[level + 1] = new_node
    if len(mindmap_nodes[0]['children']) == 0:
        for line in lines:
            label = line.strip().lstrip('-*\t ').strip()
            if label and len(label) > 3:
                new_node = {'id': str(node_counter), 'label': label, 'children': []}
                node_counter += 1
                mindmap_nodes[0]['children'].append(new_node)
    return mindmap_nodes

# ---- DB Update functions (SIBI fields ONLY) ----
def update_slide_sibi(curriculum_id, subject, topic, sub_topic, md):
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    mds = json.dumps(md).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(COALESCE(metadata, '{{}}'::jsonb), '{{slide_sibi}}', '{mds}'::jsonb, true), "updatedAt" = NOW() WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    db_exec(sql)

def update_mindmap_sibi(curriculum_id, subject, topic, sub_topic, data):
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    mms = json.dumps(data).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(COALESCE(metadata, '{{}}'::jsonb), '{{mindmap_sibi}}', '{mms}'::jsonb, true), "updatedAt" = NOW() WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    db_exec(sql)

def create_quiz_sibi(material_id, student_id, questions_json):
    q_str = json.dumps(questions_json).replace("'", "''")
    max_score = len(questions_json) * 10
    # Check existing
    existing = db_query(f"""SELECT id FROM "Quiz" WHERE "materialId" = '{material_id}' AND "studentId" = '{student_id}' AND type = 'QUIZ';""")
    if existing:
        # Don't overwrite existing quiz
        print(f"    ✅ Quiz already exists")
        return
    new_id = str(uuid.uuid4())
    sql = f"""INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "updatedAt") VALUES ('{new_id}', '{material_id}', '{student_id}', 'QUIZ', '{q_str}'::jsonb, {max_score}, NOW());"""
    db_exec(sql)
    print(f"    ✅ Quiz saved")

# ---- Load matched data helpers ----
def load_matched_data(grade, subject):
    """Load matched topic→chapter mapping from sibi-match-topics-v2 output."""
    matched_file = BASE_DIR / "data" / "sibi" / "matched" / grade / f"{subject}.json"
    if not matched_file.exists():
        return {}
    data = json.load(open(matched_file))
    # Build lookup: subTopic -> chapter_indices
    lookup = {}
    for m in data.get("matches", []):
        st = m.get("subTopic", "")
        idxs = m.get("chapter_indices", [])
        if st and idxs:
            lookup[st.lower()] = idxs
    return lookup

def get_sibi_text(grade, subject, sub_topic, raw_data):
    """Get SIBI text using matched data first, fallback to fuzzy match."""
    matched_lookup = load_matched_data(grade, subject)
    
    # 1. Try exact match from matched data
    sub_lower = sub_topic.lower()
    if sub_lower in matched_lookup:
        idxs = matched_lookup[sub_lower]
        if raw_data and "chapters" in raw_data:
            chunks = []
            for idx in idxs:
                if 0 <= idx < len(raw_data["chapters"]):
                    chunks.append(raw_data["chapters"][idx].get("text", ""))
            txt = "\n\n".join(chunks)
            if txt.strip():
                if len(txt) > 6000:
                    txt = txt[:6000] + "\n...[truncated]"
                return txt, False  # False = not LLM knowledge
    
    # 2. Fallback fuzzy match
    if raw_data and "chapters" in raw_data:
        chapter_indices = find_matching_chapters(sub_topic, raw_data["chapters"])
        if chapter_indices:
            chunks = [raw_data["chapters"][idx]["text"] for idx in chapter_indices[:3] if idx < len(raw_data["chapters"])]
            txt = "\n\n".join(chunks)
            if txt.strip():
                if len(txt) > 6000:
                    txt = txt[:6000] + "\n...[truncated]"
                return txt, False
    
    return "", True  # True = use LLM knowledge

# ---- Fuzzy match fallback ----
def find_matching_chapters(sub_topic, chapters):
    """Find chapters whose title contains or is contained by sub_topic."""
    sub_lower = sub_topic.lower()
    matches = []
    for i, ch in enumerate(chapters):
        ch_title = ch.get("title", "").lower()
        if sub_lower in ch_title or ch_title in sub_lower:
            matches.append(i)
        else:
            sub_words = set(re.findall(r'[a-zA-Z]{3,}', sub_lower))
            ch_words = set(re.findall(r'[a-zA-Z]{3,}', ch_title))
            overlap = sub_words & ch_words
            if len(overlap) >= 2:
                matches.append(i)
    return matches

# ---- Main ----
def main():
    if len(sys.argv) < 4:
        print("Usage: python3.12 scripts/sibi-match-and-generate.py <GRADE> <CURRICULUM_ID> <STUDENT_UUID> [subject|all]")
        sys.exit(1)
    
    grade = sys.argv[1]
    curriculum_id = sys.argv[2]
    student_uuid = sys.argv[3]
    target_subject = sys.argv[4] if len(sys.argv) > 4 else "all"
    
    raw_dir = BASE_DIR / "data" / "sibi" / "raw_content" / grade
    
    print(f"=== SIBI Pipeline for {grade} ===")
    print(f"Curriculum: {curriculum_id}")
    print(f"Student: {student_uuid}")
    print(f"Target: {target_subject}")
    
    # Get all materials for this curriculum
    if target_subject.lower() == "all":
        subject_filter = ""
    else:
        subj_escaped = target_subject.replace("'", "''")
        subject_filter = f"AND subject = '{subj_escaped}'"
    
    sql = f"""SELECT id, subject, topic, "subTopic" FROM "Material" WHERE "curriculumId" = '{curriculum_id}' {subject_filter} ORDER BY subject, topic, "subTopic";"""
    rows = db_query(sql)
    
    materials = []
    for line in rows.split("\n"):
        if not line.strip(): continue
        parts = line.split("|")
        if len(parts) == 4:
            materials.append({"id": parts[0], "subject": parts[1], "topic": parts[2], "subTopic": parts[3]})
    
    print(f"Found {len(materials)} materials to process.\n")
    
    # Cache raw content per subject
    raw_cache = {}
    
    success = 0
    skip = 0
    fail = 0
    
    for i, m in enumerate(materials):
        print(f"[{i+1}/{len(materials)}] {m['subject']} -> {m['topic']} -> {m['subTopic']}")
        
        # Check if slide_sibi already exists
        existing_slide = db_query(f"""SELECT metadata->>'slide_sibi' FROM "Material" WHERE id = '{m["id"]}';""")
        existing_mm = db_query(f"""SELECT metadata->>'mindmap_sibi' FROM "Material" WHERE id = '{m["id"]}';""")
        
        has_slide = existing_slide and existing_slide != 'null' and existing_slide.strip()
        has_mm = existing_mm and existing_mm != 'null' and existing_mm.strip()
        has_quiz = bool(db_query(f"""SELECT id FROM "Quiz" WHERE "materialId" = '{m["id"]}' AND "studentId" = '{student_uuid}' AND type = 'QUIZ';"""))
        
        if has_slide and has_mm and has_quiz:
            print(f"  ✅ Already complete. Skipping.")
            skip += 1
            continue
        
        # Load raw content for this subject
        subj = m['subject']
        if subj not in raw_cache:
            raw_file = raw_dir / f"{subj}.json"
            if raw_file.exists():
                with open(raw_file) as f:
                    raw_cache[subj] = json.load(f)
            else:
                raw_cache[subj] = None
        
        raw_data = raw_cache[subj]
        
        # Find matching chapters using matched data (from sibi-match-topics-v2)
        txt, use_llm_knowledge = get_sibi_text(grade, m['subject'], m['subTopic'], raw_data)
        source_label = "LLM knowledge" if use_llm_knowledge else "SIBI content"
        
        # A. Generate slide_sibi
        if not has_slide:
            print(f"  Generating Slide ({source_label})...")
            try:
                sp = "You generate educational slides in Markdown format."
                if use_llm_knowledge:
                    up = f'Generate 3-5 markdown slides for "{m["topic"]} - {m["subTopic"]}" in {m["subject"]} for {grade} level. Return slide markdown only.'
                else:
                    up = f'Generate 3-5 markdown slides for "{m["topic"]} - {m["subTopic"]}" using ONLY this content:\n\n```\n{txt}\n```\n\nReturn slide markdown only, no other text.'
                slide_md = call_llm(sp, up)
                if slide_md:
                    if "```" in slide_md:
                        slide_md = re.sub(r'```[a-z]*\n?|```', '', slide_md).strip()
                    update_slide_sibi(curriculum_id, m['subject'], m['topic'], m['subTopic'], slide_md)
                    print(f"    ✅ Slide saved")
            except Exception as e:
                print(f"    ❌ Slide failed: {e}")
            time.sleep(5)
        else:
            print(f"  ✅ Slide already exists")
        
        # B. Generate mindmap_sibi
        if not has_mm:
            print(f"  Generating Mindmap ({source_label})...")
            try:
                sp = "Create a hierarchical mindmap outline using indented dashes. Use 2 spaces per level. ONLY return the outline."
                if use_llm_knowledge:
                    up = f'Create a mindmap outline for "{m["topic"]} - {m["subTopic"]}" in {m["subject"]} for {grade} level.'
                else:
                    up = f'Create a mindmap outline for "{m["topic"]} - {m["subTopic"]}" based on:\n\n```\n{txt}\n```'
                mm_txt = call_llm(sp, up)
                if mm_txt:
                    if "```" in mm_txt:
                        mm_txt = re.sub(r'```[a-z]*\n?|```', '', mm_txt).strip()
                    mm_data = parse_outline_to_mindmap(mm_txt, m['subTopic'])
                    update_mindmap_sibi(curriculum_id, m['subject'], m['topic'], m['subTopic'], mm_data)
                    print(f"    ✅ Mindmap saved")
            except Exception as e:
                print(f"    ❌ Mindmap failed: {e}")
            time.sleep(5)
        else:
            print(f"  ✅ Mindmap already exists")
        
        # C. Generate quiz (only if NO quiz exists at all for this material+student)
        if not has_quiz:
            print(f"  Generating Quiz ({source_label})...")
            try:
                sp = "Generate multiple choice quizzes in JSON array format. Each question has 4 options. Respond ONLY with a valid JSON array."
                if use_llm_knowledge:
                    up = f'Generate 5 multiple choice quiz questions for "{m["topic"]} - {m["subTopic"]}" in {m["subject"]} for {grade} level.\n\nFormat: [{{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"medium","explanation":"..."}}]'
                else:
                    up = f'Generate 5 multiple choice quiz questions for "{m["subTopic"]}" based on:\n\n```\n{txt}\n```\n\nFormat: [{{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"medium","explanation":"..."}}]'
                quiz_txt = call_llm(sp, up)
                if quiz_txt:
                    match = re.search(r'\[\s*\{.*\}\s*\]', quiz_txt, re.DOTALL)
                    if match:
                        quiz_txt = match.group(0)
                    elif "```" in quiz_txt:
                        quiz_txt = re.sub(r'```[a-z]*\n?|```', '', quiz_txt).strip()
                    quiz_data = json.loads(quiz_txt)
                    if isinstance(quiz_data, list):
                        create_quiz_sibi(m['id'], student_uuid, quiz_data)
            except Exception as e:
                print(f"    ❌ Quiz failed: {e}")
            time.sleep(5)
        else:
            print(f"  ✅ Quiz already exists")
        
        success += 1
        print(f"  Cooldown 10s...")
        time.sleep(10)
    
    print(f"\n=== DONE ===")
    print(f"Processed: {success}, Skipped (complete): {skip}, Total: {len(materials)}")

if __name__ == "__main__":
    main()
