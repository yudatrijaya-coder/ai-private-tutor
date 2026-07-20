#!/usr/bin/env python3.12
"""
Fill materials that have NO SIBI match using LLM knowledge directly.
Targets: 12 materials across Bahasa Indonesia, Kimia, MTK Penalaran, MTK TL
"""

import json, os, re, sys, subprocess, uuid, time
from openai import OpenAI
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
LLM_CLIENT = OpenAI(base_url="http://localhost:20128/v1", api_key="sk-9router")
LLM_MODEL = "hermes"

def get_no_match_materials(curriculum_id):
    sql = f"""
    SELECT id, subject, topic, "subTopic"
    FROM "Material"
    WHERE "curriculumId" = '{curriculum_id}'
      AND (metadata->>'slide_sibi' IS NULL OR metadata->>'slide_sibi' = 'null')
      AND (metadata->>'mindmap_sibi' IS NULL OR metadata->>'mindmap_sibi' = 'null')
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
            materials.append({"id": parts[0], "subject": parts[1], "topic": parts[2], "subTopic": parts[3]})
    return materials

def update_slide(curriculum_id, subject, topic, sub_topic, md):
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    mds = json.dumps(md).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(metadata, '{{slide_sibi}}', '{mds}'::jsonb, true), "updatedAt" = NOW() WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True)
    print(f"    ✅ Slide saved")

def update_mindmap(curriculum_id, subject, topic, sub_topic, data):
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    mms = json.dumps(data).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(metadata, '{{mindmap_sibi}}', '{mms}'::jsonb, true), "updatedAt" = NOW() WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True)
    print(f"    ✅ Mindmap saved")

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
        sql_insert = f"""INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "updatedAt") VALUES ('{new_id}', '{material_id}', '{student_id}', 'QUIZ', '{q_str}'::jsonb, {max_score}, NOW());"""
        subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql_insert], capture_output=True)
    print(f"    ✅ Quiz saved")

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

def main():
    r_student = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", "SELECT id FROM \"Student\" WHERE \"studentId\" = 'SHOFI001'"], capture_output=True, text=True)
    student_uuid = r_student.stdout.strip()
    if not student_uuid: return print("❌ Student SHOFI001 not found")
    r_curric = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", f"SELECT id FROM \"Curriculum\" WHERE \"studentId\" = '{student_uuid}' AND \"gradeLevel\" = 'SMA_2'"], capture_output=True, text=True)
    curriculum_id = r_curric.stdout.strip()
    if not curriculum_id: return print("❌ Curriculum not found")
    print(f"Curriculum: {curriculum_id}")

    materials = get_no_match_materials(curriculum_id)
    print(f"Found {len(materials)} materials without SIBI match to fill.")

    for i, m in enumerate(materials):
        print(f"\n[{i+1}/{len(materials)}] {m['subject']} -> {m['topic']} -> {m['subTopic']}")
        
        # Generate slide using LLM knowledge
        print("  Generating Slide (LLM knowledge)...")
        try:
            sp = "You generate educational slides in Markdown from subject matter knowledge."
            up = f"Generate 3-5 markdown slides for \"{m['topic']} - {m['subTopic']}\" in {m['subject']} for SMA grade 11. Use clear explanations, definitions, and examples. Return slide markdown only."
            slide_md = call_llm(sp, up)
            if slide_md:
                if "```" in slide_md:
                    slide_md = re.sub(r'```[a-z]*\n?|```', '', slide_md).strip()
                update_slide(curriculum_id, m['subject'], m['topic'], m['subTopic'], slide_md)
        except Exception as e:
            print(f"    ❌ Slide failed: {e}")
        
        time.sleep(5)

        # Generate mindmap
        print("  Generating Mindmap (LLM knowledge)...")
        try:
            sp = "You are a specialized educational content generator. Create a hierarchical mindmap outline using indented dashes. Use 2 spaces per level. Start with single dash. ONLY return the outline."
            up = f"Create a mindmap outline for \"{m['topic']} - {m['subTopic']}\" in {m['subject']} for SMA grade 11."
            mm_txt = call_llm(sp, up)
            if mm_txt:
                if "```" in mm_txt:
                    mm_txt = re.sub(r'```[a-z]*\n?|```', '', mm_txt).strip()
                mm_data = parse_outline_to_mindmap(mm_txt, m['subTopic'])
                update_mindmap(curriculum_id, m['subject'], m['topic'], m['subTopic'], mm_data)
        except Exception as e:
            print(f"    ❌ Mindmap failed: {e}")

        time.sleep(5)

        # Generate quiz
        print("  Generating Quiz (LLM knowledge)...")
        try:
            sp = "You generate multiple choice quizzes in JSON array format. Each question has 4 options. Respond ONLY with a valid JSON array."
            up = f"""Generate 5 multiple choice quiz questions for \"{m['topic']} - {m['subTopic']}\" in {m['subject']} SMA grade 11.

Format:
[
  {{
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "difficulty": "medium",
    "explanation": "..."
  }}
]"""
            quiz_txt = call_llm(sp, up)
            if quiz_txt:
                match = re.search(r'\[\s*\{.*\}\s*\]', quiz_txt, re.DOTALL)
                if match:
                    quiz_txt = match.group(0)
                elif quiz_txt.startswith("```json"):
                    quiz_txt = re.sub(r'```json\n?|```', '', quiz_txt).strip()
                quiz_data = json.loads(quiz_txt)
                if isinstance(quiz_data, list):
                    create_or_update_quiz(m['id'], student_uuid, quiz_data)
        except Exception as e:
            print(f"    ❌ Quiz failed: {e}")

        print("  Cooldown 15s...")
        time.sleep(15)

if __name__ == "__main__":
    main()
