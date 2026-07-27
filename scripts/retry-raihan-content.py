#!/usr/bin/env python3.12
"""Retry failed quizzes & mindmaps for Raihan (SMP_1, curriculum v1).
Uses aggressive JSON sanitization for 9Router output.
"""
import json, os, re, requests, sys, subprocess, time, uuid

CURRICULUM_ID = "a61bcc63-7c88-41bb-9425-658b5fbf3fa3"
STUDENT_UUID = "0d3fbf85-a1ee-4c5c-bdd9-f752ed75b69d"
GRADE = "SMP_1"

def sql(query):
    r = subprocess.run(["sudo","-u","postgres","psql","-d","ai_private_tutor","-t","-A","-c",query], capture_output=True, text=True, timeout=15)
    return r.stdout.strip()

def sql_exec(query):
    subprocess.run(["sudo","-u","postgres","psql","-d","ai_private_tutor","-c",query], capture_output=True, text=True, timeout=15)

def call_llm(sp, up, max_retries=10):
    """Call 9Router with aggressive retry and text extraction."""
    for attempt in range(max_retries):
        try:
            r = requests.post("http://localhost:20128/v1/chat/completions", json={
                "model": "hermes", "temperature": 0.1, "max_tokens": 2000, "stream": False,
                "messages": [{"role": "system", "content": sp}, {"role": "user", "content": up}],
            }, timeout=300)
            
            if r.status_code == 429:
                wait = int(r.headers.get("retry-after", 60))
                print(f"  429, wait {wait}s...")
                time.sleep(wait + 5)
                continue
            if r.status_code != 200:
                raise ValueError(f"HTTP {r.status_code}")
            
            # Extract content from hybrid response
            parts = []
            for line in r.text.split("\n"):
                line = line.strip()
                if not line: continue
                if line == "data: [DONE]": continue
                if line.startswith("data: "):
                    try:
                        chunk = json.loads(line[6:])
                        c = chunk.get("choices",[{}])[0].get("delta",{}).get("content","") or chunk.get("choices",[{}])[0].get("message",{}).get("content","") or chunk.get("choices",[{}])[0].get("delta",{}).get("reasoning_content","") or chunk.get("choices",[{}])[0].get("message",{}).get("reasoning_content","")
                        if c: parts.append(c)
                    except: pass
                else:
                    try:
                        chunk = json.loads(line)
                        c = chunk.get("choices",[{}])[0].get("message",{}).get("content","") or chunk.get("choices",[{}])[0].get("message",{}).get("reasoning_content","")
                        if c: parts.append(c)
                    except: pass
            
            content = "".join(parts).strip()
            if content:
                return content
            
            delay = 15 + (attempt * 15)
            print(f"  empty, wait {delay}s (attempt {attempt+1}/{max_retries})...")
            time.sleep(delay)
        except Exception as e:
            delay = 15 + (attempt * 15)
            print(f"  error: {e}, wait {delay}s (attempt {attempt+1}/{max_retries})...")
            time.sleep(delay)
    return ""

def extract_json_array(text):
    """Aggressively extract valid JSON array from LLM output."""
    # Remove markdown code fences
    text = re.sub(r'```[a-z]*\n?|```', '', text).strip()
    if not text: return None
    
    # Find first '[' and last ']'
    start = text.find('[')
    end = text.rfind(']')
    if start >= 0 and end > start:
        json_str = text[start:end+1]
    else:
        return None
    
    # Fix common issues
    json_str = re.sub(r',\s*([}\]])', r'\1', json_str)  # trailing commas
    json_str = re.sub(r'(\w+):', r'"\1":', json_str)     # unquoted keys
    
    try:
        return json.loads(json_str)
    except:
        # Try with strict=False
        try:
            return json.loads(json_str, strict=False)
        except:
            pass
    
    # Sanitize line by line for strings with newlines
    lines = json_str.split('\n')
    sanitized = []
    in_string = False
    for line in lines:
        if in_string:
            # This line might be continuation of a string
            sanitized.append(line)
            if line.count('"') % 2 == 1:
                in_string = False
        else:
            sanitized.append(line)
            if line.count('"') % 2 == 1:
                in_string = True
    
    try:
        return json.loads('\n'.join(sanitized))
    except:
        pass
    
    # Last resort: find minimal valid JSON
    import ast
    try:
        return ast.literal_eval(json_str)
    except:
        return None

def retry_quiz(mat_id, subject, topic, sub_topic):
    """Retry quiz generation for one material."""
    sp = "You are a quiz generator for Indonesian middle school students. Generate multiple choice questions."
    up = f"""Generate exactly 5 multiple choice quiz questions for:
Subject: {subject}
Topic: {topic}
SubTopic: {sub_topic}
Grade: {GRADE}

Return ONLY a valid JSON array. Each object: {{"question":"","options":["A","B","C","D"],"correctIndex":0,"difficulty":"medium","explanation":""}}

IMPORTANT: Return ONLY the JSON array, no other text, no markdown."""
    
    print(f"  Quiz attempt...")
    text = call_llm(sp, up)
    if not text:
        print(f"  ❌ Empty response after retry")
        return False
    
    extracted = extract_json_array(text)
    if extracted and isinstance(extracted, list) and len(extracted) >= 1:
        # Check structure
        for q in extracted:
            if not all(k in q for k in ['question','options','correctIndex']):
                print(f"  ❌ Invalid quiz structure: missing fields")
                return False
        
        # Save quiz
        q_str = json.dumps(extracted).replace("'", "''")
        max_score = len(extracted) * 10
        new_id = str(uuid.uuid4())
        sql_exec(f"""INSERT INTO "Quiz" (id, "materialId", "studentId", type, questions, "maxScore", "updatedAt") 
                     VALUES ('{new_id}', '{mat_id}', '{STUDENT_UUID}', 'QUIZ', '{q_str}'::jsonb, {max_score}, NOW());""")
        print(f"  ✅ Quiz saved ({len(extracted)} questions)")
        return True
    else:
        print(f"  ❌ Could not parse JSON from response")
        print(f"  Response snippet: {text[:200]}...")
        return False

def retry_mindmap(mat_id, subject, topic, sub_topic):
    """Retry mindmap generation."""
    sp = "Create a hierarchical mindmap outline. Use indented dashes (-) for each level. Return ONLY the outline."
    up = f"""Create a mindmap outline for:
{subject}: {topic} - {sub_topic}
Grade: {GRADE}

Format:
- Main topic
  - Subtopic 1
    - Detail 1
    - Detail 2
  - Subtopic 2

Return ONLY the indented list."""
    
    print(f"  Mindmap attempt...")
    text = call_llm(sp, up)
    if not text:
        return False
    
    # Remove markdown fence
    text = re.sub(r'```[a-z]*\n?|```', '', text).strip()
    
    # Parse outline
    lines = text.strip().split('\n')
    nodes = [{'id': '0', 'label': sub_topic, 'children': []}]
    parents = {0: nodes[0]}
    counter = 1
    for line in lines:
        if not line.strip(): continue
        stripped = line.lstrip(' ')
        indent = len(line) - len(stripped)
        level = 0 if indent < 2 else (1 if indent < 4 else (2 if indent < 6 else 3))
        label = stripped.lstrip('-*\t ').strip()
        if not label: continue
        if level > 0 and level not in parents: level = 0
        if level not in parents: parents[level] = nodes[0]
        parent = parents[level]
        node = {'id': str(counter), 'label': label, 'children': []}
        counter += 1
        if 'children' not in parent: parent['children'] = []
        parent['children'].append(node)
        parents[level+1] = node
    
    if len(nodes[0]['children']) == 0:
        # Fallback: flat list
        for line in lines:
            label = line.strip().lstrip('-*\t ').strip()
            if label and len(label) > 3:
                nodes[0]['children'].append({'id': str(counter), 'label': label, 'children': []})
                counter += 1
    
    if len(nodes[0]['children']) >= 2:
        mms = json.dumps(nodes).replace("'", "''")
        sql_exec(f"""UPDATE "Material" SET metadata = jsonb_set(COALESCE(metadata, '{{}}'::jsonb), '{{mindmap_sibi}}', '{mms}'::jsonb, true), "updatedAt" = NOW() WHERE id = '{mat_id}';""")
        print(f"  ✅ Mindmap saved")
        return True
    return False

def main():
    print("=== Retry Failed Quizzes & Mindmaps ===\n")
    
    # Find materials missing quiz
    rows = sql(f"""
        SELECT m.id, m.subject, m.topic, m."subTopic",
               CASE WHEN m.metadata->>'mindmap_sibi' IS NOT NULL THEN 'Y' ELSE 'N' END as has_mm,
               CASE WHEN EXISTS (SELECT 1 FROM "Quiz" q WHERE q."materialId" = m.id AND q."studentId" = '{STUDENT_UUID}') THEN 'Y' ELSE 'N' END as has_quiz
        FROM "Material" m
        WHERE m."curriculumId" = '{CURRICULUM_ID}'
          AND m.subject IN ('Biologi','Geografi','Sejarah')
        ORDER BY m.subject, m."weekOrder";
    """)
    
    pending = []
    for line in rows.split('\n'):
        if not line.strip(): continue
        parts = line.split('|')
        if len(parts) >= 6:
            mid, subj, topic, subtopic, has_mm, has_quiz = parts
            if has_quiz != 'Y':
                pending.append((mid, subj, topic, subtopic, 'quiz'))
            if has_mm != 'Y':
                pending.append((mid, subj, topic, subtopic, 'mindmap'))
    
    print(f"Pending: {len(pending)} items\n")
    
    for mid, subj, topic, subtopic, ptype in pending:
        print(f"[{subj}] {topic} -> {subtopic} ({ptype})")
        if ptype == 'quiz':
            retry_quiz(mid, subj, topic, subtopic)
        elif ptype == 'mindmap':
            retry_mindmap(mid, subj, topic, subtopic)
        time.sleep(8)
        print()
    
    # Final check
    print("=== Final Status ===")
    result = sql(f"""
        SELECT m.subject,
               COUNT(*) as total,
               COUNT(*) FILTER (WHERE m.metadata->>'mindmap_sibi' IS NOT NULL) as mm,
               COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Quiz" q WHERE q."materialId" = m.id AND q."studentId" = '{STUDENT_UUID}')) as quiz
        FROM "Material" m
        WHERE m."curriculumId" = '{CURRICULUM_ID}'
          AND m.subject IN ('Biologi','Geografi','Sejarah')
        GROUP BY m.subject;
    """)
    for line in result.split('\n'):
        if line.strip():
            print(f"  {line}")
    
    print("\n=== DONE ===")

if __name__ == '__main__':
    main()
