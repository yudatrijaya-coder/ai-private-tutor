#!/usr/bin/env python3.12
"""Final cleanup — fix remaining 3 quizzes + 1 mindmap for Raihan SMP_1."""
import json, re, subprocess, sys, time, uuid, requests

CUR = "a61bcc63-7c88-41bb-9425-658b5fbf3fa3"
STU = "0d3fbf85-a1ee-4c5c-bdd9-f752ed75b69d"

def sql(q):
    r = subprocess.run(["sudo","-u","postgres","psql","-d","ai_private_tutor","-t","-A","-c",q],
                       capture_output=True, text=True, timeout=15)
    return r.stdout.strip()

def sqle(q):
    subprocess.run(["sudo","-u","postgres","psql","-d","ai_private_tutor","-c",q],
                   capture_output=True, text=True, timeout=15)

def llm(sp, up, retries=10):
    for a in range(retries):
        try:
            r = requests.post("http://localhost:20128/v1/chat/completions", json={
                "model":"hermes","temperature":0.01,"max_tokens":2048,"stream":False,
                "messages":[{"role":"system","content":sp},{"role":"user","content":up}],
            }, timeout=300)
            if r.status_code == 429:
                time.sleep(60); continue
            parts = []
            for line in r.text.split("\n"):
                line = line.strip()
                if not line or line == "data: [DONE]": continue
                try:
                    if line.startswith("data: "): chunk = json.loads(line[6:])
                    else: chunk = json.loads(line)
                    c = chunk.get("choices",[{}])[0].get("delta",{}).get("content","") or \
                        chunk.get("choices",[{}])[0].get("message",{}).get("content","") or \
                        chunk.get("choices",[{}])[0].get("delta",{}).get("reasoning_content","") or \
                        chunk.get("choices",[{}])[0].get("message",{}).get("reasoning_content","")
                    if c: parts.append(c)
                except: pass
            content = "".join(parts).strip()
            if content: return content
            time.sleep(15 + a*15)
        except Exception as e:
            time.sleep(15 + a*15)
    return ""

def extract_json(text):
    idx = text.find("[")
    if idx < 0: return None
    text = text[idx:]
    depth = 0; end = -1
    for i,ch in enumerate(text):
        if ch == "[": depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0: end = i+1; break
    if end < 0: return None
    return json.loads(text[:end])

def retry_quiz(subj, topic, subtopic):
    mat_id = sql(f"""SELECT id FROM "Material" 
                     WHERE "curriculumId"='{CUR}' AND subject='{subj.replace("'","''")}' 
                     AND topic='{topic.replace("'","''")}' 
                     AND "subTopic"='{subtopic.replace("'","''")}'""")
    if not mat_id: return
    mat_id = mat_id.split("|")[0]
    
    sp = "Output ONLY a valid JSON array of quiz objects, no explanation."
    up = f"""Generate 5 quiz questions for {subj} {subtopic} (SMP_1).
Format: [{{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"medium","explanation":"..."}}]
ONLY output the JSON array."""
    
    text = llm(sp, up)
    if not text:
        print(f"  EMPTY for {subj}/{subtopic}")
        return
    try:
        data = extract_json(text)
        if data and isinstance(data, list) and len(data) >= 1:
            qs = json.dumps(data).replace("'","''")
            new_id = str(uuid.uuid4())
            sqle(f"""INSERT INTO "Quiz" (id,"materialId","studentId",type,questions,"maxScore","updatedAt")
                     VALUES ('{new_id}','{mat_id}','{STU}','QUIZ','{qs}'::jsonb,{len(data)*10},NOW())""")
            print(f"  ✅ Quiz saved ({len(data)} questions)")
        else:
            print(f"  ❌ Invalid: {str(data)[:80]}")
    except Exception as e:
        print(f"  ❌ Parse: {e}")
        print(f"  First 80: {text[:80]}")

def retry_mindmap(subj, topic, subtopic):
    mat_id = sql(f"""SELECT id FROM "Material" 
                     WHERE "curriculumId"='{CUR}' AND subject='{subj.replace("'","''")}' 
                     AND topic='{topic.replace("'","''")}' 
                     AND "subTopic"='{subtopic.replace("'","''")}'""")
    if not mat_id: return
    mat_id = mat_id.split("|")[0]
    
    sp = "Create a hierarchical mindmap. Use indented dashes. Return ONLY the outline."
    up = f"""Mindmap for {subj}: {topic} - {subtopic} (SMP_1)
Format:
- Main topic
  - Subtopic
    - Detail"""
    
    text = llm(sp, up)
    if not text:
        print(f"  EMPTY for {subj}/{subtopic}")
        return
    
    text = re.sub(r"```[a-z]*\n?|```", "", text).strip()
    lines = text.split("\n")
    nodes = [{"id":"0","label":subtopic,"children":[]}]
    parents = {0: nodes[0]}; counter = 1
    
    for line in lines:
        if not line.strip(): continue
        stripped = line.lstrip(" ")
        indent = len(line) - len(stripped)
        level = 0 if indent < 2 else (1 if indent < 4 else 2)
        label = stripped.lstrip("-*\t ").strip()
        if not label: continue
        if level > 0 and level not in parents: level = 0
        if level not in parents: parents[level] = nodes[0]
        node = {"id":str(counter),"label":label,"children":[]}; counter += 1
        parents[level]["children"].append(node)
        parents[level+1] = node
    
    if nodes[0]["children"]:
        j = json.dumps(nodes).replace("'","''")
        sqle(f"""UPDATE "Material" SET metadata=jsonb_set(COALESCE(metadata,'{{}}'::jsonb),'{{mindmap_sibi}}','{j}'::jsonb,true) WHERE id='{mat_id}'""")
        print(f"  ✅ Mindmap saved")
    else:
        print(f"  ❌ No valid children")

def main():
    print("=== Final Cleanup ===\n")
    
    # Remaining quizzes
    retry_quiz("Geografi","Pemanfaatan Ruang","Pemanfaatan Ruang dan Lingkungan")
    time.sleep(8)
    retry_quiz("Geografi","Peta dan Atlas","Membaca Peta, Atlas, dan Globe")
    time.sleep(8)
    retry_quiz("Sejarah","Kerajaan Islam","Peninggalan Kerajaan Islam (Demak, Mataram Islam, Banten)")
    time.sleep(8)
    
    # Remaining mindmap
    retry_mindmap("Biologi","Klasifikasi Makhluk Hidup","Ciri-Ciri Makhluk Hidup")
    time.sleep(5)
    
    print("\n=== Final Status ===")
    r = sql(f"""SELECT m.subject, COUNT(*),
                COUNT(*)FILTER(WHERE m.metadata->>'mindmap_sibi' IS NOT NULL) as mm,
                COUNT(*)FILTER(WHERE EXISTS(SELECT 1 FROM "Quiz" q WHERE q."materialId"=m.id AND q."studentId"='{STU}')) as quiz
                FROM "Material" m WHERE m."curriculumId"='{CUR}'
                AND m.subject IN ('Biologi','Geografi','Sejarah') GROUP BY m.subject""")
    for line in r.split("\n"):
        if line.strip(): print(f"  {line}")
    
    print("\n=== ALL SLIDE ===")
    r2 = sql(f"SELECT subject,COUNT(*)FROM \"Material\" WHERE \"curriculumId\"='{CUR}' AND subject IN('Biologi','Geografi','Sejarah') AND metadata->>'slide_sibi' IS NOT NULL GROUP BY subject;")
    for line in r2.split("\n"):
        if line.strip(): print(f"  {line}")
    
    print("\n=== DONE ===")

if __name__ == "__main__":
    main()
