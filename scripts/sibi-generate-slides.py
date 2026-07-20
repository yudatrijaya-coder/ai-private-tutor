#!/usr/bin/env python3.12
"""Step 3: Generate slides from SIBI raw_content using LLM"""

import json, os, re, sys, subprocess, time
from openai import OpenAI
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MATCHED_DIR = BASE_DIR / "data" / "sibi" / "matched" / "SMA_2"

# ---- LLM config (9Router via OpenAI SDK for SSE handling) ----
LLM_CLIENT = OpenAI(base_url="http://localhost:20128/v1", api_key="sk-9router")
LLM_MODEL = "hermes"

# ---- DB functions ----
def update_slide(curriculum_id, subject, topic, sub_topic, md):
    """Update slide via psql"""
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    mds = json.dumps(md).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(metadata, '{{slide_sibi}}', '{mds}'::jsonb, true), "updatedAt" = NOW() WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True, text=True)
    if r.returncode == 0:
        print(f"  ✅ {subject} -> {topic} -> {sub_topic}")
    else:
        print(f"  ❌ DB error: {r.stderr}")

# ---- LLM call ----
def llm_slides(prompt):
    for attempt in range(3):
        try:
            r = LLM_CLIENT.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": "You generate educational slides from provided content."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000,
            )
            content = r.choices[0].message.content.strip()
            # Clean markdown block if LLM included it
            if "```" in content:
                content = re.sub(r'```[a-z]*\n?|```', '', content).strip()
            
            return content
        except Exception as e:
            print(f"    ⚠️  LLM attempt {attempt+1}: {e}")
            if attempt == 2:
                raise
            time.sleep(5) # Wait before retry

# ---- Main ----
def process_subject(subject_name, matched_data, curriculum_id):
    cs = matched_data.get("curriculum_subject", subject_name)
    print(f"Processing subject: {subject_name} (Curriculum Subject: {cs})")
    
    for m in matched_data.get("matches", []):
        topic = m["topic"]
        sub = m["subTopic"]
        idxs = m.get("chapter_indices", [])
        
        # Check if already processed (optional, for resume)
        # result = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-c", f"SELECT metadata->>'slide_sibi' FROM \"Material\" WHERE \"curriculumId\" = '{curriculum_id}' AND subject = '{cs}' AND topic = '{top}' AND \"subTopic\" = '{sub}'"], capture_output=True, text=True)
        # if result.stdout.strip() and result.stdout.strip() != 'null':
        #     print(f"  ✅ Already processed {topic} -> {sub}")
        #     continue

        if not idxs:
            print(f"  ⚠️  Skip {topic} -> {sub}: no chapters matched")
            continue
        
        chapters = matched_data.get("chapters", [])
        chunks = [chapters[i]["text"] for i in idxs if i < len(chapters)]
        txt = "\n\n".join(chunks)

        if not txt.strip():
            print(f"  ⚠️  Skip {topic} -> {sub}: empty content from SIBI chapters")
            continue
        
        # Limit text length to avoid token limits, but try to keep it meaningful
        if len(txt) > 6000:
            txt = txt[:6000] + "\n...[truncated for LLM]"

        prompt = f'Generate 3-5 markdown slides for "{topic} - {sub}" using ONLY this SIBI content:\n\n```\n{txt}\n```\n\nInclude only slide markdown, no conversational text.'
        print(f"  Generating slides for {topic} -> {sub}...")
        try:
            out = llm_slides(prompt)
            if out and out.strip():
                update_slide(curriculum_id, cs, topic, sub, out)
            else:
                print(f"    ❌ LLM returned empty content for {topic} -> {sub}")
        except Exception as e:
            print(f"    ❌ Failed to generate slides for {topic} -> {sub}: {e}")
        
        time.sleep(3) # Delay to prevent overwhelming 9Router

def main():
    target_subjects = sys.argv[1:] # Could be "all" or specific subjects

    # Get curriculum_id for SHOFI SMA_2
    r_curric = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-c", "SELECT c.id FROM \"Student\" s JOIN \"Curriculum\" c ON s.id = c.\"studentId\" WHERE s.\"studentId\" = 'SHOFI001' AND c.\"gradeLevel\" = 'SMA_2'"], capture_output=True, text=True)
    curriculum_id = r_curric.stdout.strip()
    if not curriculum_id:
        print("❌ No SHOFI SMA_2 curriculum found.")
        return
    print(f"Curriculum ID for SHOFI SMA_2: {curriculum_id}")

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

    for subject_name in subjects_to_process:
        fp = MATCHED_DIR / f"{subject_name}.json"
        if not fp.exists():
            print(f"⚠️  Matched data file not found for {subject_name}. Skipping.")
            continue
        
        print(f"\n--- Starting {subject_name} ---")
        try:
            matched_data = json.load(open(fp))
            process_subject(subject_name, matched_data, curriculum_id)
        except Exception as e:
            print(f"❌ Error processing subject {subject_name}: {e}")
        print(f"--- Finished {subject_name} ---\n")
        time.sleep(10) # Longer delay between subjects

if __name__ == "__main__":
    main()