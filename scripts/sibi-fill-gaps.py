#!/usr/bin/env python3.12
"""
Targeted script to fill content gaps (Slide SIBI, Mindmap SIBI, Quiz SIBI)
for SHOFI (SMA_2) by running sequentially with safety delays.
"""

import json, os, re, requests, sys, subprocess, uuid, time
from openai import OpenAI
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MATCHED_DIR = BASE_DIR / "data" / "sibi" / "matched" / "SMA_2"

# ---- LLM config (using OpenAI SDK for robust SSE handling) ----
LLM_CLIENT = OpenAI(base_url="http://localhost:20128/v1", api_key="sk-9router")
LLM_MODEL = "hermes"

# ---- DB functions ----
def get_missing_materials(curriculum_id):
    sql = f"""
    SELECT id, subject, topic, "subTopic"
    FROM "Material"
    WHERE "curriculumId" = '{curriculum_id}'
      AND metadata->>'slide_sibi' IS NULL 
      AND metadata->'mindmap_sibi' IS NULL 
      AND NOT EXISTS (SELECT 1 FROM "Quiz" q WHERE q."materialId" = id AND q.type = 'QUIZ')
    ORDER BY subject, topic, "subTopic";
    """
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"❌ DB Error: {r.stderr}")
        return []
    
    materials = []
    for line in r.stdout.strip().split("\n"):
        if not line.strip(): continue
        parts = line.split("|")
        if len(parts) == 4:
            materials.append({
                "id": parts[0],
                "subject": parts[1],
                "topic": parts[2],
                "subTopic": parts[3]
            })
    return materials

def update_slide(curriculum_id, subject, topic, sub_topic, md):
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    mds = json.dumps(md).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(metadata, '{{slide_sibi}}', '{mds}'::jsonb, true), "updatedAt" = NOW() WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True)

def update_mindmap(curriculum_id, subject, topic, sub_topic, data):
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    mms = json.dumps(data).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(metadata, '{{mindmap_sibi}}', '{mms}'::jsonb, true), "updatedAt" = NOW() WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True)

def create_or_update_quiz(material_id, student_id, questions_json):
    sql_check = f"""SELECT id FROM "Quiz" WHERE "materialId" = '{material_id}' AND "studentId" = '{student_id}' AND type = 'QUIZ';"""
    r_check = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql_check], capture_output=True, text=True)
    quiz_id = r_check.stdout.strip()
    
    q_str = json.dumps(questions_json).replace("'", "''")
    max_score = len(questions_json) * 10
    
    if quiz_id:
        sql_update = f"""UPDATE "Quiz" SET questions = '{q_str}'::jsonb, "maxScore" = {max_score}, "updatedAt" = NOW() WHERE id = '{quiz_id}';"""
        subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql_update], capture_output=True)
    else:
        new_id = str(uuid.uuid4())
        sql_insert = f"""INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "updatedAt") VALUES ('{new_id}', '{material_id}', 'QUIZ', '{q_str}'::jsonb, {max_score}, NOW());"""
        # wait, student_id is required. The original quiz had studentId (UUID), which is table PK.
        # But wait! We need to make sure we use the correct studentId (UUID, not the short code SHOFI001).
        # We will fetch it in main and pass it correctly.
        sql_insert = f"""INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "updatedAt") VALUES ('{new_id}', '{material_id}', '{student_id}', 'QUIZ', '{q_str}'::jsonb, {max_score}, NOW());"""
        subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql_insert], capture_output=True)

# ---- LLM Helper ----
def call_llm(system_prompt, user_prompt):
    for attempt in range(3):
        try:
            r = LLM_CLIENT.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=2000,
            )
            return r.choices[0].message.content.strip()
        except Exception as e:
            print(f"      ⚠️ LLM Attempt {attempt+1} failed: {e}")
            if attempt == 2:
                raise
            time.sleep(10)

# ---- Parsers ----
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

# ---- Main Execution ----
def main():
    # 1. Get student UUID for SHOFI001
    r_student = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", "SELECT id FROM \"Student\" WHERE \"studentId\" = 'SHOFI001'"], capture_output=True, text=True)
    student_uuid = r_student.stdout.strip()
    if not student_uuid:
        print("❌ Student SHOFI001 not found")
        return
        
    # 2. Get curriculum ID
    r_curric = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", f"SELECT id FROM \"Curriculum\" WHERE \"studentId\" = '{student_uuid}' AND \"gradeLevel\" = 'SMA_2'"], capture_output=True, text=True)
    curriculum_id = r_curric.stdout.strip()
    if not curriculum_id:
        print("❌ Curriculum not found")
        return

    print(f"Target Curriculum: {curriculum_id}, Student UUID: {student_uuid}")

    # 3. Get missing materials
    missing = get_missing_materials(curriculum_id)
    print(f"Found {len(missing)} materials with missing content.")
    
    # Cache matched files to prevent reloading
    cache = {}
    
    for i, m in enumerate(missing):
        print(f"\n[{i+1}/{len(missing)}] Processing {m['subject']} -> {m['topic']} -> {m['subTopic']}")
        
        # Load SIBI matched data for this subject
        subj_key = m['subject']
        # Map DB subject names back to file names if necessary
        # Special mapping for MTK TL to Matematika
        file_subject = subj_key
        if "Matematika Tingkat Lanjut" in subj_key or "Matematika Penalaran" in subj_key:
            file_subject = "Matematika"
        
        fp = MATCHED_DIR / f"{file_subject}.json"
        if not fp.exists():
            print(f"  ⚠️ No matched SIBI file at {fp}. Skipping.")
            continue
            
        if file_subject not in cache:
            cache[file_subject] = json.load(open(fp))
            
        matched_data = cache[file_subject]
        
        # Find matches for this subTopic
        sub_matches = [match for match in matched_data.get("matches", []) if match["subTopic"].lower() == m["subTopic"].lower()]
        if not sub_matches:
            # Fallback fuzzy match
            sub_matches = [match for match in matched_data.get("matches", []) if m["subTopic"].lower() in match["subTopic"].lower() or match["subTopic"].lower() in m["subTopic"].lower()]
            
        if not sub_matches:
            print(f"  ⚠️ No matching SIBI chapters found for subtopic: {m['subTopic']}")
            continue
            
        match_info = sub_matches[0]
        idxs = match_info.get("chapter_indices", [])
        if not idxs:
            print(f"  ⚠️ No chapter indices for: {m['subTopic']}")
            continue
            
        chunks = [matched_data["chapters"][idx]["text"] for idx in idxs if idx < len(matched_data["chapters"])]
        txt = "\n\n".join(chunks)
        if not txt.strip():
            print(f"  ⚠️ Empty text chunk for: {m['subTopic']}")
            continue
            
        if len(txt) > 6000:
            txt = txt[:6000] + "\n...[truncated]"

        # A. Check Slide Status
        # We check from DB again just in case
        r_chk = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-c", f"SELECT metadata->>'slide_sibi' FROM \"Material\" WHERE id = '{m['id']}'"], capture_output=True, text=True)
        slide_val = r_chk.stdout.strip()
        if not slide_val or slide_val == 'null':
            print("  Generating Slide...")
            try:
                system_p = "You generate educational slides in Markdown format from provided textbook content."
                user_p = f"Generate 3-5 markdown slides for \"{m['topic']} - {m['subTopic']}\" using ONLY this content:\n\n```\n{txt}\n```\n\nReturn slide markdown only, no other text."
                slide_md = call_llm(system_p, user_p)
                if slide_md:
                    if "```" in slide_md:
                        slide_md = re.sub(r'```[a-z]*\n?|```', '', slide_md).strip()
                    update_slide(curriculum_id, m['subject'], m['topic'], m['subTopic'], slide_md)
                    print("  ✅ Slide saved")
                    time.sleep(5)
            except Exception as e:
                print(f"  ❌ Slide failed: {e}")
        else:
            print("  ✅ Slide already exists")

        # B. Check Mindmap Status
        r_chk = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-c", f"SELECT metadata->>'mindmap_sibi' FROM \"Material\" WHERE id = '{m['id']}'"], capture_output=True, text=True)
        mm_val = r_chk.stdout.strip()
        if not mm_val or mm_val == 'null':
            print("  Generating Mindmap...")
            try:
                system_p = "You are a specialized educational content generator. Create a hierarchical mindmap outline using indented dashes. \n\nRULES:\n1. Use 2 spaces per level indentation.\n2. Start with a single dash '-'.\n3. DO NOT include introductory or concluding text.\n4. DO NOT include markdown blocks.\n5. ONLY return the outline."
                user_p = f"Create a mindmap outline for \"{m['topic']} - {m['subTopic']}\" based on this content:\n\n```\n{txt}\n```"
                mm_txt = call_llm(system_p, user_p)
                if mm_txt:
                    if "```" in mm_txt:
                        mm_txt = re.sub(r'```[a-z]*\n?|```', '', mm_txt).strip()
                    mm_data = parse_outline_to_mindmap(mm_txt, m['subTopic'])
                    update_mindmap(curriculum_id, m['subject'], m['topic'], m['subTopic'], mm_data)
                    print("  ✅ Mindmap saved")
                    time.sleep(5)
            except Exception as e:
                print(f"  ❌ Mindmap failed: {e}")
        else:
            print("  ✅ Mindmap already exists")

        # C. Check Quiz Status
        r_chk = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-c", f"SELECT id FROM \"Quiz\" WHERE \"materialId\" = '{m['id']}' AND \"studentId\" = '{student_uuid}' AND type = 'QUIZ'"], capture_output=True, text=True)
        quiz_val = r_chk.stdout.strip()
        if not quiz_val:
            print("  Generating Quiz...")
            try:
                system_p = "You are a master educator. Generate high quality multiple choice quizzes in JSON format. \n\nRULES:\n1. Respond ONLY with a JSON array.\n2. DO NOT include introductory text or conclusions.\n3. DO NOT include markdown blocks.\n4. Every question must have exactly 4 options."
                user_p = f"""Based on the following SIBI content, generate a multiple choice quiz of 5 questions for "{m['subTopic']}".
Each question must have exactly 4 options. Specify the 0-indexed correct option.
Include a brief explanation of why the correct option is right.

SIBI Content:
```
{txt}
```

Format the output strictly as a JSON array:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "difficulty": "medium",
    "explanation": "Detailed explanation here."
  }}
]"""
                quiz_txt = call_llm(system_p, user_p)
                if quiz_txt:
                    match = re.search(r'\[\s*\{.*\}\s*\]', quiz_txt, re.DOTALL)
                    if match:
                        quiz_txt = match.group(0)
                    elif quiz_txt.startswith("```json"):
                        quiz_txt = re.sub(r'```json\n?|```', '', quiz_txt).strip()
                    
                    quiz_data = json.loads(quiz_txt)
                    if isinstance(quiz_data, list):
                        create_or_update_quiz(m['id'], student_uuid, quiz_data)
                        print("  ✅ Quiz saved")
                        time.sleep(5)
            except Exception as e:
                print(f"  ❌ Quiz failed: {e}")
        else:
            print("  ✅ Quiz already exists")
            
        print("  Taking a 30s cooldown delay...")
        time.sleep(30)

    # End of subject cooldown
    print("  End of subject: 60s cooldown...")
    time.sleep(60)

if __name__ == "__main__":
    main()