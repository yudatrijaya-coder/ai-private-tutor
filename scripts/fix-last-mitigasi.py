#!/usr/bin/env python3.12
"""Fix last missing processedContent: Geografi Mitigasi Bencana"""
import json, re, subprocess, time, requests

CUR = "a61bcc63-7c88-41bb-9425-658b5fbf3fa3"

def sql(q):
    return subprocess.run(["sudo","-u","postgres","psql","-d","ai_private_tutor","-t","-A","-c",q],
                          capture_output=True, text=True, timeout=15).stdout.strip()
def sqle(q):
    subprocess.run(["sudo","-u","postgres","psql","-d","ai_private_tutor","-c",q],
                   capture_output=True, text=True, timeout=15)

def llm(sp, up, retries=10):
    for a in range(retries):
        try:
            r = requests.post("http://localhost:20128/v1/chat/completions", json={
                "model":"hermes","temperature":0.01,"max_tokens":4096,"stream":False,
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

def extract_json(text):
    """Extract JSON object from text."""
    for delim in ["{", "["]:
        idx = text.find(delim)
        if idx < 0: continue
        t = text[idx:]
        depth = 0; end = -1
        close = "}" if delim == "{" else "]"
        for i,ch in enumerate(t):
            if ch == delim: depth += 1
            elif ch == close:
                depth -= 1
                if depth == 0: end = i+1; break
        if end > 0:
            raw = t[:end]
            try: return json.loads(raw)
            except: pass
    return None

mat_id = sql(f"""SELECT id FROM "Material"
                 WHERE "curriculumId"='{CUR}' AND subject='Geografi'
                 AND topic='Mitigasi Bencana'
                 AND "subTopic"='Jenis Bencana Alam dan Upaya Mitigasi' LIMIT 1""")

sp = "You are an educational content processor. Output ONLY valid JSON."
up = """Generate processed lesson content for Geografi: Mitigasi Bencana - Jenis Bencana Alam dan Upaya Mitigasi (SMP_1).

Return ONLY a JSON object with:
- "objectives": 3 learning objectives
- "keyConcepts": array of {concept, explanation} objects
- "summary": 3-5 sentence summary
- "keyTerms": object mapping term to definition
- "examples": 3 relevant examples

No markdown. No other text."""

text = llm(sp, up)
if text:
    data = extract_json(text)
    if data:
        escaped = json.dumps(data).replace("'","''")
        sqle(f"""UPDATE "Material" SET "processedContent"='{escaped}' WHERE id='{mat_id}'""")
        print(f"✅ Mitigasi Bencana processed ({len(json.dumps(data))} chars)")
    else:
        print(f"❌ Parse fail")
        print(text[:200])
else:
    print("❌ Empty response")

# Final check
print()
r = sql(f"""SELECT subject, COUNT(*) as t,
            COUNT(*)FILTER(WHERE "processedContent" IS NOT NULL AND "processedContent"!='') as proc,
            COUNT(*)FILTER(WHERE "rawContent" IS NOT NULL AND "rawContent"!='') as raw,
            COUNT(*)FILTER(WHERE metadata->>'slide_sibi' IS NOT NULL) as slide,
            COUNT(*)FILTER(WHERE metadata->>'mindmap_sibi' IS NOT NULL) as mm,
            COUNT(*)FILTER(WHERE EXISTS(SELECT 1 FROM "Quiz" q WHERE q."materialId"=m.id AND q."studentId"='0d3fbf85-a1ee-4c5c-bdd9-f752ed75b69d')) as quiz
            FROM "Material" m WHERE "curriculumId"='{CUR}'
            AND subject IN('Biologi','Geografi','Sejarah') GROUP BY subject;""")
for line in r.split("\n"):
    if line.strip(): print(f"  {line}")
print("\n✅ DONE" if "29" in r or "30" in r else "\n⚠️ Not complete yet")
