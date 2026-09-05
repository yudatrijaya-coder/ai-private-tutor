#!/usr/bin/env python3.12
import json, subprocess, time, requests

RAIHAN_UUID = "0d3fbf85-a1ee-4c5c-bdd9-f752ed75b69d"

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

def main():
    print("Fetching PAI materials...")
    
    # Get active curriculum ID for Raihan
    cur_id = sql(f"""
        SELECT c.id FROM "Curriculum" c 
        JOIN "Student" s ON s.id = c."studentId" 
        WHERE s.id='{RAIHAN_UUID}' ORDER BY c.version DESC LIMIT 1
    """)
    
    if not cur_id:
        print("Curriculum not found")
        return

    rows = sql(f"""SELECT id, topic, "subTopic" FROM "Material"
                   WHERE "curriculumId"='{cur_id}' AND subject='Pendidikan Agama Islam'
                   AND ("processedContent" IS NULL OR "processedContent"='')
                   ORDER BY "weekOrder";""")
    
    pending = []
    for line in rows.split("\n"):
        if not line.strip(): continue
        parts = line.split("|")
        if len(parts) >= 3:
            pending.append((parts[0], parts[1], parts[2]))
    
    print(f"Materials needing processing: {len(pending)}\n")
    
    subj = "Pendidikan Agama Islam"
    
    for i, (mat_id, topic, subtopic) in enumerate(pending):
        print(f"[{i+1}/{len(pending)}] {topic} -> {subtopic}")
        
        # 1. rawContent
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
            escaped_raw = raw.replace("'","''")[:8000]
            sqle(f"UPDATE \"Material\" SET \"rawContent\"='{escaped_raw}' WHERE id='{mat_id}'")
            print(f"  rawContent saved ({len(raw)} chars)")
        else:
            print(f"  rawContent EMPTY")
            continue
            
        time.sleep(2)
        
        # 2. processedContent
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
                proc = proc[idx:]
                depth = 0
                end = -1
                for idx_ch, ch in enumerate(proc):
                    if ch == "{": depth += 1
                    elif ch == "}":
                        depth -= 1
                        if depth == 0: end = idx_ch+1; break
                if end > 0:
                    proc = proc[:end]
            try:
                data = json.loads(proc)
                escaped_proc = json.dumps(data).replace("'","''")
                sqle(f"UPDATE \"Material\" SET \"processedContent\"='{escaped_proc}' WHERE id='{mat_id}'")
                print(f"  processedContent saved")
            except:
                print(f"  processedContent JSON parse failed: {proc[:100]}")
        else:
            print(f"  processedContent EMPTY")
            
        time.sleep(2)

if __name__ == "__main__":
    main()
