#!/usr/bin/env python3.12
"""
Step 4: Generate quizzes from SIBI raw_content using LLM
Input: Matched SIBI data (data/sibi/matched/)
Output: Quiz records stored in PostgreSQL Quiz table linked to Material
"""

import json, os, re, sys, subprocess, uuid, time
from openai import OpenAI
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MATCHED_DIR = BASE_DIR / "data" / "sibi" / "matched" / "SMA_2"

# ---- LLM config (9Router via OpenAI SDK for SSE handling) ----
LLM_CLIENT = OpenAI(base_url="http://localhost:20128/v1", api_key="sk-9router")
LLM_MODEL = "hermes"

# ---- DB functions ----
def get_material_id(curriculum_id, subject, topic, sub_topic):
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    sql = f"""SELECT id FROM "Material" WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql], capture_output=True, text=True)
    return r.stdout.strip()

def create_or_update_quiz(material_id, student_id, questions_json):
    # Check if quiz already exists
    sql_check = f"""SELECT id FROM "Quiz" WHERE "materialId" = '{material_id}' AND "studentId" = '{student_id}' AND type = 'QUIZ';"""
    r_check = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql_check], capture_output=True, text=True)
    quiz_id = r_check.stdout.strip()
    
    q_str = json.dumps(questions_json).replace("'", "''")
    max_score = len(questions_json) * 10
    
    if quiz_id:
        # Update
        sql_update = f"""UPDATE "Quiz" SET questions = '{q_str}'::jsonb, "maxScore" = {max_score}, "updatedAt" = NOW() WHERE id = '{quiz_id}';"""
        r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql_update], capture_output=True, text=True)
    else:
        # Insert new
        new_id = str(uuid.uuid4())
        sql_insert = f"""INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "updatedAt") VALUES ('{new_id}', '{material_id}', '{student_id}', 'QUIZ', '{q_str}'::jsonb, {max_score}, NOW());"""
        r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql_insert], capture_output=True, text=True)
        
    if r.returncode == 0:
        print(f"    ✅ Saved quiz for Material ID: {material_id}")
    else:
        print(f"    ❌ DB Error: {r.stderr}")

# ---- LLM call ----
def llm_quiz(prompt):
    for attempt in range(3):
        try:
            r = LLM_CLIENT.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": "You are a master educator. Generate high quality multiple choice quizzes in JSON format. \n\nRULES:\n1. Respond ONLY with a JSON array.\n2. DO NOT include introductory text or conclusions.\n3. DO NOT include markdown blocks.\n4. Every question must have exactly 4 options."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000,
            )
            content = r.choices[0].message.content.strip()
            
            # Extract JSON array using regex to be safe from conversational filler
            match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
            if match:
                content = match.group(0)
            elif content.startswith("```json"):
                content = re.sub(r'```json\n?|```', '', content).strip()
            
            return json.loads(content)
        except Exception as e:
            print(f"      ⚠️  LLM attempt {attempt+1}: {e}")
            if attempt == 2:
                raise
            time.sleep(5)

# ---- Process Subject ----
def process_subject(subject, matched, curriculum_id, student_id):
    cs = matched.get("curriculum_subject", subject)
    print(f"Processing subject: {subject} (Curriculum Subject: {cs})")
    
    for m in matched.get("matches", []):
        topic = m["topic"]
        sub = m["subTopic"]
        idxs = m.get("chapter_indices", [])
        if not idxs:
            print(f"  ⚠️  Skip {topic} -> {sub}: no chapters matched")
            continue
            
        material_id = get_material_id(curriculum_id, cs, topic, sub)
        if not material_id:
            print(f"  ⚠️  Material not found in DB: {cs} -> {topic} -> {sub}")
            continue
            
        chunks = [matched["chapters"][i]["text"] for i in idxs if i < len(matched["chapters"])]
        txt = "\n\n".join(chunks)
        if not txt.strip():
            print(f"  ⚠️  Skip {topic} -> {sub}: empty content")
            continue
            
        if len(txt) > 6000:
            txt = txt[:6000] + "\n...[truncated]"
            
        prompt = f"""
Based on the following SIBI textbook content, generate a multiple choice quiz of 5 questions.
Each question must have exactly 4 options. Specify the 0-indexed correct option.
Include a brief explanation of why the correct option is right.

SIBI Content:
```
{txt}
```

Format the output strictly as a JSON array of objects like this:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "difficulty": "medium",
    "explanation": "Detailed explanation here."
  }}
]
"""
        print(f"  Generating quiz for {topic} -> {sub}...")
        try:
            quiz_data = llm_quiz(prompt)
            if quiz_data and isinstance(quiz_data, list):
                create_or_update_quiz(material_id, student_id, quiz_data)
            else:
                print(f"    ❌ LLM returned invalid data structure")
        except Exception as e:
            print(f"    ❌ Failed to generate quiz for {topic} -> {sub}: {e}")
        
        time.sleep(3) # Delay to prevent overwhelming 9Router

# ---- Main ----
def main():
    target_subjects = sys.argv[1:]
    
    r_student = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", "SELECT id FROM \"Student\" WHERE \"studentId\" = 'SHOFI001'"], capture_output=True, text=True)
    student_id = r_student.stdout.strip()
    if not student_id:
        print("❌ Student SHOFI001 not found")
        return
        
    r_curric = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", f"SELECT id FROM \"Curriculum\" WHERE \"studentId\" = '{student_id}' AND \"gradeLevel\" = 'SMA_2'"], capture_output=True, text=True)
    curriculum_id = r_curric.stdout.strip()
    if not curriculum_id:
        print("❌ SHOFI SMA_2 curriculum not found")
        return
        
    print(f"Curriculum: {curriculum_id}, Student ID: {student_id}")
    
    all_matched_subjects = [f.replace(".json", "") for f in os.listdir(MATCHED_DIR) if f.endswith(".json")]
    
    subjects_to_process = []
    if "all" in [ts.lower() for ts in target_subjects] or not target_subjects:
        subjects_to_process = all_matched_subjects
    else:
        for ts in target_subjects:
            found = False
            for ams in all_matched_subjects:
                if ts.lower() in ams.lower():
                    subjects_to_process.append(ams)
                    found = True
                    break
            if not found:
                print(f"⚠️  Subject '{ts}' not found in matched data. Skipping.")
                
    print(f"Subjects to process: {subjects_to_process}")
    
    for s in subjects_to_process:
        fp = MATCHED_DIR / f"{s}.json"
        if not fp.exists():
            print(f"⚠️  No matched data for {s}")
            continue
        data = json.load(open(fp))
        print(f"\n--- Starting {s} ---")
        try:
            process_subject(s, data, curriculum_id, student_id)
        except Exception as e:
            print(f"❌ Error processing subject {s}: {e}")
        print(f"--- Finished {s} ---\n")
        time.sleep(10)

if __name__ == "__main__":
    main()