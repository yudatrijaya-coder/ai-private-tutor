#!/usr/bin/env python3.12
"""Fix Biologi 3 failed processedContent + generate Geografi processedContent."""
import json, re, subprocess, time, requests

CUR = "a61bcc63-7c88-41bb-9425-658b5fbf3fa3"

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
                "model":"hermes","temperature":0.1,"max_tokens":4096,"stream":False,
                "messages":[{"role":"system","content":sp},{"role":"user","content":up}],
            }, timeout=300)
            if r.status_code == 429:
                time.sleep(60); continue
            parts = []
            for line in r.text.split("\n"):
                if not line.strip() or line.strip() == "data: [DONE]": continue
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
        except: time.sleep(15 + a*15)
    return ""

def safe_json_parse(text):
    """Extract JSON object from text aggressively."""
    idx = text.find("{")
    if idx < 0: return None
    text = text[idx:]
    depth = 0; end = -1
    for i,ch in enumerate(text):
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: end = i+1; break
    if end < 0: return None
    raw = text[:end]
    # Fix common issues
    raw = re.sub(r',\s*([}\]])', r'\1', raw)  # trailing commas
    try: return json.loads(raw)
    except:
        try: return json.loads(raw, strict=False)
        except: pass
    # Try replacing unquoted keys
    raw2 = re.sub(r'(?<!")(\b[a-zA-Z_][a-zA-Z0-9_]*\b)(?=\s*:)', r'"\1"', raw)
    try: return json.loads(raw2)
    except: return None

def gen_one(subj, topic, subtopic, mat_id):
    sp = f"Process educational content into structured JSON for Indonesian {subj} students."
    up = f"""Generate structured lesson summary for {subj}: {topic} - {subtopic} (SMP_1).

Return ONLY valid JSON:
{{"objectives":["...","..."],
"keyConcepts":[{{"concept":"...","explanation":"..."}}],
"summary":"...",
"keyTerms":{{"term1":"definition1","term2":"definition2"}},
"examples":["example1","example2"]}}
No markdown. No other text."""
    
    text = llm(sp, up)
    if not text: return False
    
    data = safe_json_parse(text)
    if data and isinstance(data, dict) and "objectives" in data:
        escaped = json.dumps(data).replace("'","''")
        sqle(f"UPDATE \"Material\" SET \"processedContent\"='{escaped}' WHERE id='{mat_id}'")
        print(f"  ✅ {subj}/{topic} saved")
        return True
    else:
        print(f"  ❌ Parse fail: {text[:80]}")
        return False

def main():
    # Fix Biologi 3 failed
    print("=== Fix Biologi processedContent ===\n")
    
    # Get specific failed ones (have rawContent but no processedContent)
    rows = sql(f"""SELECT id, topic, "subTopic" FROM "Material"
                   WHERE "curriculumId"='{CUR}' AND subject='Biologi'
                   AND "rawContent" IS NOT NULL AND "rawContent"!=''
                   AND ("processedContent" IS NULL OR "processedContent"='')
                   ORDER BY "weekOrder";""")
    
    pending = [tuple(r.split("|")) for r in rows.split("\n") if r.strip()]
    print(f"Pending: {len(pending)} Biologi materials\n")
    for mat_id, topic, subtopic in pending:
        print(f"{topic} -> {subtopic}")
        gen_one("Biologi", topic, subtopic, mat_id)
        time.sleep(8)
    
    # Generate Geografi processedContent
    print(f"\n=== Generate Geografi processedContent ===\n")
    rows2 = sql(f"""SELECT id, topic, "subTopic" FROM "Material"
                    WHERE "curriculumId"='{CUR}' AND subject='Geografi'
                    AND ("processedContent" IS NULL OR "processedContent"='')
                    ORDER BY "weekOrder";""")
    
    pending2 = [tuple(r.split("|")) for r in rows2.split("\n") if r.strip()]
    print(f"Pending: {len(pending2)} Geografi materials\n")
    for mat_id, topic, subtopic in pending2:
        print(f"{topic} -> {subtopic}")
        gen_one("Geografi", topic, subtopic, mat_id)
        time.sleep(8)
    
    # Final report
    print("\n=== FINAL ===")
    r3 = sql(f"""SELECT subject, COUNT(*),
                 COUNT(*)FILTER(WHERE "processedContent" IS NOT NULL AND "processedContent"!='') as proc,
                 COUNT(*)FILTER(WHERE "rawContent" IS NOT NULL AND "rawContent"!='') as raw
                 FROM "Material" WHERE "curriculumId"='{CUR}'
                 AND subject IN('Biologi','Geografi','Sejarah') GROUP BY subject;""")
    for line in r3.split("\n"):
        if line.strip(): print(f"  {line}")
    
    print("\n=== DONE ===")

if __name__ == "__main__":
    main()
