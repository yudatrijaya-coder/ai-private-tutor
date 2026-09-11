#!/usr/bin/env python3.12
"""
Step 5: Generate mindmaps from SIBI raw_content using LLM
Approach: Ask LLM to return a simple text outline, then parse it to JSON array format.
"""

import json, os, re, sys, subprocess, time
from openai import OpenAI
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MATCHED_DIR = BASE_DIR / "data" / "sibi" / "matched" / "SMA_2"

# ---- LLM config (9Router via OpenAI SDK for SSE handling) ----
LLM_CLIENT = OpenAI(base_url="http://localhost:20128/v1", api_key="sk-9router")
LLM_MODEL = "hermes"

def update_mindmap(curriculum_id, subject, topic, sub_topic, data):
    subj = subject.replace("'", "''")
    top = topic.replace("'", "''")
    sub = sub_topic.replace("'", "''")
    mms = json.dumps(data).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(metadata, '{{mindmap_sibi}}', '{mms}'::jsonb, true), "updatedAt" = NOW() WHERE "curriculumId" = '{curriculum_id}' AND subject = '{subj}' AND topic = '{top}' AND "subTopic" = '{sub}';"""
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True, text=True)
    if r.returncode == 0:
        print(f"  ✅ {subject} -> {topic} -> {sub_topic}")
    else:
        print(f"  ❌ DB error: {r.stderr}")

# ---- Reasoning-dump guard (ledger B-02) ----
# Shared with `sibi-generate-slides.py`; see `sibi_content_guard.py` for the full
# rationale. A dump is treated as a failed attempt and retried, so nothing
# contaminated ever reaches `metadata.mindmap_sibi`.
from sibi_content_guard import is_reasoning_dump, looks_like_outline


def parse_outline_to_mindmap(text, main_label):
    """Parse a text outline into [{id, label, children}].
    Falls back to flat children when indentation is malformed.
    """
    lines = text.strip().split("\n")
    mindmap_nodes = [{'id': '0', 'label': main_label, 'children': []}]
    current_parents = {0: mindmap_nodes[0]}
    node_counter = 1

    for line in lines:
        if not line.strip():
            continue

        leading_chars = line.lstrip(' ')
        indent_level = len(line) - len(leading_chars)

        if indent_level >= 6:
            level = 3
        elif indent_level >= 4:
            level = 2
        elif indent_level >= 2:
            level = 1
        else:
            level = 0

        label = leading_chars.lstrip('-*\t ').strip()
        if not label:
            continue

        if level > 0 and level not in current_parents:
            level = 0
        if level not in current_parents:
            current_parents[level] = mindmap_nodes[0]

        parent = current_parents[level]
        new_node = {'id': str(node_counter), 'label': label, 'children': []}
        node_counter += 1

        if 'children' not in parent:
            parent['children'] = []
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

def generate_outline_from_llm(prompt):
    """Ask the model for an indented-dash outline, rejecting reasoning dumps.

    Ledger B-02: the previous revision returned `content` verbatim, so a model
    that narrated its plan produced a contaminated mindmap. A dump now counts as
    a failed attempt and is retried, and the raised error stops the caller from
    writing anything to the database.
    """
    last_reason = "no attempt made"
    for attempt in range(3):
        try:
            r = LLM_CLIENT.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": "You are a specialized educational content generator. Create a hierarchical mindmap outline using indented dashes. \n\nRULES:\n1. Use 2 spaces per level indentation.\n2. Start with a single dash '-'.\n3. DO NOT include any introductory or concluding text.\n4. DO NOT include markdown blocks like ```.\n5. ONLY return the outline.\n6. Do NOT explain your plan, restate these rules, or describe your reasoning. Output the outline and nothing else."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1500,
            )
            msg = r.choices[0].message
            content = (msg.content or "").strip()
            if "```" in content:
                content = re.sub(r'```[a-z]*\n?|```', '', content).strip()

            # Reject deliberation and anything that is not an outline. Retrying is
            # correct here: a dump means the model never produced the answer.
            if is_reasoning_dump(content):
                last_reason = "response was a reasoning dump"
                print(f"    ⚠️  attempt {attempt+1}: rejected reasoning dump")
            elif not looks_like_outline(content):
                last_reason = "response was not an indented outline"
                print(f"    ⚠️  attempt {attempt+1}: rejected — not an outline")
            else:
                return content
        except Exception as e:
            last_reason = str(e)
            print(f"    ⚠️  LLM attempt {attempt+1}: {e}")
        if attempt < 2:
            time.sleep(5)

    raise RuntimeError(f"no usable outline after 3 attempts ({last_reason})")

def process_subject(subject, matched, curriculum_id):
    cs = matched.get("curriculum_subject", subject)
    print(f"Processing subject: {subject} (Curriculum Subject: {cs})")
    
    for m in matched.get("matches", []):
        topic = m["topic"]
        sub = m["subTopic"]
        idxs = m.get("chapter_indices", [])
        if not idxs:
            print(f"  ⚠️  Skip {topic} -> {sub}: no chapters matched")
            continue
        chunks = [matched["chapters"][i]["text"] for i in idxs if i < len(matched["chapters"])]
        txt = "\n\n".join(chunks)
        if len(txt) > 4000:
            txt = txt[:4000] + "\n...[truncated]"
        prompt = f'Create a mindmap outline for "{topic} - {sub}" based on this SIBI content:\n\n```\n{txt}\n```\n\nUse indented dashes like:\n- Main Topic\n  - Subtopic 1\n    - Detail\n  - Subtopic 2'
        print(f"  Generating mindmap for {topic} -> {sub}...")
        try:
            text_outline = generate_outline_from_llm(prompt)
            if text_outline:
                mm = parse_outline_to_mindmap(text_outline, sub)
                update_mindmap(curriculum_id, cs, topic, sub, mm)
        except Exception as e:
            print(f"    ❌ Failed to generate mindmap for {topic} -> {sub}: {e}")
        
        time.sleep(3) # Delay to prevent overwhelming 9Router

def main():
    target_subjects = sys.argv[1:]
    
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", "SELECT c.id FROM \"Student\" s JOIN \"Curriculum\" c ON s.id = c.\"studentId\" WHERE s.\"studentId\" = 'SHOFI001' AND c.\"gradeLevel\" = 'SMA_2'"], capture_output=True, text=True)
    cid = r.stdout.strip()
    if not cid: return print("❌ No curriculum found")
    print(f"Curriculum ID: {cid}")
    
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
        if fp.exists():
            print(f"\n--- Starting {s} ---")
            try:
                process_subject(s, json.load(open(fp)), cid)
            except Exception as e:
                print(f"❌ Error processing subject {s}: {e}")
            print(f"--- Finished {s} ---\n")
            time.sleep(10)

if __name__ == "__main__":
    main()