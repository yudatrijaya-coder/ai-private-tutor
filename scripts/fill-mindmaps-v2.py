#!/usr/bin/env python3.12
"""
Fill missing mindmap_sibi for Raihan SMP_1 + SHOFI SMA_2.
Robust with retries + raw HTTP fallback.
"""

import json, re, subprocess, time, sys, urllib.request, urllib.error

def q(sql):
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql], capture_output=True, text=True, timeout=10)
    return r.stdout.strip()

def get_missing():
    sql = """
    SELECT m.id, s.name, m.subject, m.topic, m."subTopic",
           COALESCE(m.metadata->>'slide_sibi', '') as slide
    FROM "Material" m
    JOIN "Curriculum" c ON c.id = m."curriculumId"
    JOIN "Student" s ON s.id = c."studentId"
    WHERE s.status = 'ACTIVE' AND s.name IN ('Raihan','SHOFI')
      AND (m.metadata->>'mindmap_sibi' IS NULL 
           OR m.metadata->>'mindmap_sibi' = '' 
           OR m.metadata->>'mindmap_sibi' = '[]')
    ORDER BY s.name, m.subject, m.topic, m."subTopic";
    """
    mats = []
    for line in q(sql).split("\n"):
        if not line.strip(): continue
        parts = line.split("|", 5)
        if len(parts) >= 5:
            mats.append({"id": parts[0], "student": parts[1], "subject": parts[2], "topic": parts[3], "subTopic": parts[4], "slide": parts[5] if len(parts) > 5 else ""})
    return mats

def call_llm_raw(prompt):
    """Call LLM via raw HTTP to avoid OpenAI SDK quirks. Returns text or None."""
    payload = json.dumps({
        "model": "hermes",
        "messages": [
            {"role": "system", "content": "You generate hierarchical mindmaps. Return ONLY indented lines with dashes. No markdown, no extra text."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.15,
        "max_tokens": 800
    }).encode()
    
    req = urllib.request.Request(
        "http://localhost:20128/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode()
                # SumoPod/9Router wraps response in {"data": {choices...}} with streaming suffix
                body = json.loads(raw.split("data:")[0].strip())
                # Handle 9Router wrapping: {"data": {"choices": [...]}}
                if "data" in body and "choices" not in body:
                    body = body["data"]
            
            choices = body.get("choices", [])
            if not choices:
                print(f"  ⚠️ No choices (attempt {attempt+1})", flush=True)
                time.sleep(5)
                continue
            
            msg = choices[0].get("message", {})
            content = msg.get("content") or ""
            # Some providers put content in an alternate field
            if not content.strip():
                content = msg.get("reasoning_content", "") or ""
            if not content.strip():
                print(f"  ⚠️ Empty content (attempt {attempt+1})", flush=True)
                time.sleep(5)
                continue
            
            return content.strip()
        except Exception as e:
            print(f"  ⚠️ Attempt {attempt+1}: {e}", flush=True)
            time.sleep(10)
    return None

def parse_mindmap(text, label):
    lines = [l for l in text.strip().split("\n") if l.strip()]
    root = {"id": "0", "label": label, "children": []}
    parents = {0: root}
    counter = 1
    for line in lines:
        stripped = line.lstrip()
        indent = min((len(line) - len(stripped)) // 2, 3)
        clean = stripped.lstrip("-* \t").strip()
        if not clean or len(clean) < 2:
            continue
        parent = parents.get(indent, root)
        node = {"id": str(counter), "label": clean, "children": []}
        counter += 1
        parent.setdefault("children", []).append(node)
        parents[indent + 1] = node
    if not root.get("children"):
        for line in lines:
            clean = line.strip().lstrip("-* \t").strip()
            if clean and len(clean) > 2:
                root.setdefault("children", []).append({"id": str(counter), "label": clean, "children": []})
                counter += 1
    return [root]

def verify(mid):
    r = q(f"""SELECT metadata->>'mindmap_sibi' FROM "Material" WHERE id = '{mid}';""")
    return bool(r and r not in ('', 'null', '[]'))

def write_psql_json(mid, data):
    j = json.dumps(data, ensure_ascii=False).replace("'", "''")
    sql = f"""UPDATE "Material" SET metadata = jsonb_set(COALESCE(metadata,'{{}}'::jsonb), '{{mindmap_sibi}}', '{j}'::jsonb, true), "updatedAt" = NOW() WHERE id = '{mid}';"""
    proc = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A"], input=sql, capture_output=True, text=True, timeout=15)
    return proc.returncode == 0

def main():
    missing = get_missing()
    total = len(missing)
    print(f"Found {total} missing mindmaps", flush=True)
    if not total:
        print("Nothing to do.")
        return

    done = 0
    for i, m in enumerate(missing):
        print(f"\n[{i+1}/{total}] {m['student']} | {m['subject']} → {m['topic']} → {m['subTopic']}", flush=True)

        ctx = m['slide'][:2000] if m['slide'] and len(m['slide']) > 50 else f"{m['topic']} - {m['subTopic']}"
        prompt = f"""Create a mindmap outline for:
Topic: {m['topic']}
Subtopic: {m['subTopic']}

Use indented dashes (2 spaces per level). Return ONLY the outline.

Context: {ctx}"""

        txt = call_llm_raw(prompt)
        if not txt:
            print("  ❌ Failed after 5 retries", flush=True)
            continue

        txt = re.sub(r'```[a-z]*\n?|```', '', txt).strip()
        data = parse_mindmap(txt, m['subTopic'])

        if write_psql_json(m['id'], data) and verify(m['id']):
            print("  ✅ Saved", flush=True)
            done += 1
        else:
            print("  ❌ DB write/verify failed", flush=True)

        time.sleep(30)

    remaining = get_missing()
    print(f"\n✅ Done. Saved {done}/{total}. Remaining: {len(remaining)}", flush=True)

if __name__ == "__main__":
    main()
