#!/usr/bin/env python3.12
"""
Fill missing mindmap_sibi for Raihan SMP_1 (14 materials).
Runs sequentially with 30s cooldown.
"""

import json, re, subprocess, time, uuid
from openai import OpenAI

BASE_DIR = "/home/ubuntu/ai-private-tutor"
LLM_CLIENT = OpenAI(base_url="http://localhost:20128/v1", api_key="sk-9router")
LLM_MODEL = "hermes"

def get_missing():
    sql = """
    SELECT m.id, m.subject, m.topic, m."subTopic", m.metadata->>'slide_sibi' as slide
    FROM "Material" m
    JOIN "Curriculum" c ON c.id = m."curriculumId"
    JOIN "Student" s ON s.id = c."studentId"
    WHERE s."studentId" = 'RAIHAN001'
      AND (m.metadata->>'mindmap_sibi' IS NULL OR m.metadata->>'mindmap_sibi' = '' OR m.metadata->>'mindmap_sibi' = '[]')
    ORDER BY m.subject, m.topic, m."subTopic";
    """
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql], capture_output=True, text=True)
    mats = []
    for line in r.stdout.strip().split("\n"):
        if not line.strip(): continue
        parts = line.split("|")
        if len(parts) >= 4:
            mats.append({"id": parts[0], "subject": parts[1], "topic": parts[2], "subTopic": parts[3], "slide": parts[4] if len(parts) > 4 else ""})
    return mats

def call_llm(prompt):
    for attempt in range(3):
        try:
            r = LLM_CLIENT.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "system", "content": "You are a mindmap generator. Return ONLY indented outline, no extra text."},
                          {"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000
            )
            return r.choices[0].message.content.strip()
        except Exception as e:
            print(f"  ⚠️ Attempt {attempt+1} failed: {e}")
            time.sleep(5)
    return None

def parse_mindmap(text, label):
    lines = text.strip().split("\n")
    root = {"id": "0", "label": label, "children": []}
    parents = {0: root}
    counter = 1
    for line in lines:
        if not line.strip(): continue
        indent = len(line) - len(line.lstrip())
        level = min(indent // 2, 3)
        clean = line.lstrip("-* \t").strip()
        if not clean: continue
        parent = parents.get(level, root)
        node = {"id": str(counter), "label": clean, "children": []}
        counter += 1
        parent.setdefault("children", []).append(node)
        parents[level + 1] = node
    if not root.get("children"):
        for line in lines:
            clean = line.strip().lstrip("-* \t").strip()
            if clean and len(clean) > 3:
                root.setdefault("children", []).append({"id": str(counter), "label": clean, "children": []})
                counter += 1
    return [root]

def update_mindmap(material_id, data):
    j = json.dumps(data).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(COALESCE(metadata,'{{}}'::jsonb), '{{mindmap_sibi}}', '{j}'::jsonb, true), "updatedAt" = NOW() WHERE id = '{material_id}';"""
    subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-c", sql], capture_output=True)

def main():
    missing = get_missing()
    print(f"Found {len(missing)} missing mindmaps for Raihan")
    if not missing:
        return
    for i, m in enumerate(missing):
        print(f"\n[{i+1}/{len(missing)}] {m['subject']} → {m['topic']} → {m['subTopic']}")
        context = m.get('slide', '')
        if not context or len(context) < 50:
            # fallback: use topic+subtopic as context
            context = f"{m['topic']} - {m['subTopic']}"
        prompt = f"Create a hierarchical mindmap outline for '{m['topic']} - {m['subTopic']}'.\nUse indented dashes, 2 spaces per level.\nReturn ONLY the outline.\n\nContext: {context[:3000]}"
        txt = call_llm(prompt)
        if txt:
            if "```" in txt:
                txt = re.sub(r'```[a-z]*\n?|```', '', txt).strip()
            data = parse_mindmap(txt, m['subTopic'])
            update_mindmap(m['id'], data)
            print("  ✅ Mindmap saved")
        else:
            print("  ❌ Failed after retries")
        time.sleep(30)
    print("\n✅ Done")

if __name__ == "__main__":
    main()