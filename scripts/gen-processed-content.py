#!/usr/bin/env python3.12
"""Generate rawContent + processedContent for Biologi SMP_1 via LLM.
Also generate processedContent for Sejarah materials that lack it."""
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

def gen_raw_and_processed(subj, topic, subtopic, mat_id):
    """Generate both rawContent and processedContent for one material."""
    
    # rawContent prompt
    sp1 = f"You are an educational content expert for Indonesian {subj} curriculum."
    up1 = f"""Generate comprehensive educational content for:
Subject: {subj}
Topic: {topic}
Sub-topic: {subtopic}
Grade: SMP_1 (Kelas 7)

Include:
- Main concepts and definitions
- Key terminology with explanations
- Important facts and examples
- 3-5 key points students must know

Be accurate, educational, and appropriate for Indonesian middle school students."""

    raw = llm(sp1, up1)
    if raw:
        escaped = raw.replace("'","''")[:8000]
        sqle(f"UPDATE \"Material\" SET \"rawContent\"='{escaped}' WHERE id='{mat_id}'")
        print(f"  rawContent saved ({len(raw)} chars)")
    else:
        print(f"  rawContent EMPTY")
    
    time.sleep(5)
    
    # processedContent prompt
    sp2 = "You process raw educational content into a structured format for Indonesian students."
    up2 = f"""Process the following educational content into a structured lesson summary for {subj} ({topic} - {subtopic}), Grade SMP_1.

Format as a JSON object with keys:
- "objectives": array of 2-3 learning objectives
- "keyConcepts": array of main concepts with brief explanations
- "summary": 3-5 sentence summary paragraph
- "keyTerms": object mapping terms to definitions
- "examples": array of 2-3 relevant examples or real-world applications

Return ONLY a valid JSON object, no markdown formatting."""

    proc = llm(sp2, up2)
    if proc:
        idx = proc.find("{")
        if idx >= 0:
            # Find matching closing brace
            proc = proc[idx:]
            depth = 0
            end = -1
            for i,ch in enumerate(proc):
                if ch == "{": depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0: end = i+1; break
            if end > 0:
                proc = proc[:end]
        try:
            data = json.loads(proc)
            escaped = json.dumps(data).replace("'","''")
            sqle(f"UPDATE \"Material\" SET \"processedContent\"='{escaped}' WHERE id='{mat_id}'")
            print(f"  processedContent saved")
        except:
            print(f"  processedContent JSON parse failed: {proc[:100]}")
    else:
        print(f"  processedContent EMPTY")
    
    time.sleep(8)

def main():
    print("=== Biologi rawContent + processedContent ===\n")
    
    # Get Biologi materials without rawContent
    rows = sql(f"""SELECT id, topic, "subTopic" FROM "Material"
                   WHERE "curriculumId"='{CUR}' AND subject='Biologi'
                   AND ("rawContent" IS NULL OR "rawContent"='')
                   ORDER BY "weekOrder";""")
    
    pending = []
    for line in rows.split("\n"):
        if not line.strip(): continue
        parts = line.split("|")
        if len(parts) >= 3:
            pending.append((parts[0], parts[1], parts[2]))
    
    print(f"Biologi materials needing rawContent: {len(pending)}\n")
    
    for i, (mat_id, topic, subtopic) in enumerate(pending):
        print(f"[{i+1}/{len(pending)}] {topic} -> {subtopic}")
        gen_raw_and_processed("Biologi", topic, subtopic, mat_id)
        print()
    
    # Also process Sejarah processedContent
    print("\n=== Sejarah processedContent ===\n")
    rows2 = sql(f"""SELECT id, topic, "subTopic" FROM "Material"
                    WHERE "curriculumId"='{CUR}' AND subject='Sejarah'
                    AND ("processedContent" IS NULL OR "processedContent"='')""")
    
    pending2 = []
    for line in rows2.split("\n"):
        if not line.strip(): continue
        parts = line.split("|")
        if len(parts) >= 3:
            pending2.append((parts[0], parts[1], parts[2]))
    
    print(f"Sejarah materials needing processedContent: {len(pending2)}\n")
    
    for i, (mat_id, topic, subtopic) in enumerate(pending2):
        print(f"[{i+1}/{len(pending2)}] {topic} -> {subtopic}")
        gen_raw_and_processed("Sejarah", topic, subtopic, mat_id)
        print()
    
    print("=== DONE ===")
    r = sql(f"""SELECT subject, COUNT(*),
                COUNT(*)FILTER(WHERE "rawContent" IS NOT NULL AND "rawContent"!='') as raw,
                COUNT(*)FILTER(WHERE "processedContent" IS NOT NULL AND "processedContent"!='') as proc
                FROM "Material" WHERE "curriculumId"='{CUR}'
                AND subject IN('Biologi','Geografi','Sejarah') GROUP BY subject""")
    for line in r.split("\n"):
        if line.strip(): print(f"  {line}")

if __name__ == "__main__":
    main()
