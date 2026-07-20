#!/usr/bin/env python3.12
import json, os, re, subprocess, uuid, sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def run_psql(sql):
    return subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor", "-t", "-A", "-c", sql], capture_output=True, text=True)

def sync_sma11():
    print("Syncing SMA_2 (SHOFI001)...")
    
    r = run_psql("SELECT id FROM \"Student\" WHERE \"studentId\" = 'SHOFI001'")
    sid = r.stdout.strip()
    if not sid: return print("❌ Student SHOFI001 not found")
        
    r = run_psql(f"SELECT id FROM \"Curriculum\" WHERE \"studentId\" = '{sid}' AND \"gradeLevel\" = 'SMA_2'")
    cid = r.stdout.strip()
    if not cid: return print("❌ Curriculum for SHOFI SMA_2 not found")
    print(f"Curriculum ID: {cid}")

    # Parse TS file with Regex
    ts_path = BASE_DIR / "src" / "data" / "curriculum-topics-sma11.ts"
    with open(ts_path) as f:
        content = f.read()
    
    # Extract entries: { subject: "...", topic: "...", subTopic: "...", weekOrder: ..., priority: ... }
    pattern = r'\{\s*subject:\s*"([^"]+)",\s*topic:\s*"([^"]+)",\s*subTopic:\s*"([^"]+)",\s*weekOrder:\s*(\d+),\s*priority:\s*(\d+)\s*\}'
    matches = re.findall(pattern, content)
    
    topics = []
    for m in matches:
        topics.append({
            'subject': m[0],
            'topic': m[1],
            'subTopic': m[2],
            'weekOrder': int(m[3]),
            'priority': int(m[4])
        })
    
    print(f"Found {len(topics)} topics in curriculum file.")

    synced = 0
    for t in topics:
        subj, topic, sub, week, prio = t['subject'].replace("'", "''"), t['topic'].replace("'", "''"), t['subTopic'].replace("'", "''"), t['weekOrder'], t['priority']
        
        check_sql = f"SELECT id FROM \"Material\" WHERE \"curriculumId\" = '{cid}' AND subject = '{subj}' AND topic = '{topic}' AND \"subTopic\" = '{sub}';"
        r = run_psql(check_sql)
        
        if r.stdout.strip():
            mid = r.stdout.strip()
            sql = f"UPDATE \"Material\" SET \"weekOrder\" = {week}, priority = {prio}, \"updatedAt\" = NOW() WHERE id = '{mid}';"
        else:
            mid = str(uuid.uuid4())
            sql = f"INSERT INTO \"Material\" (id, \"curriculumId\", subject, topic, \"subTopic\", \"gradeLevel\", \"weekOrder\", priority, \"status\", \"metadata\", \"createdAt\", \"updatedAt\") VALUES ('{mid}', '{cid}', '{subj}', '{topic}', '{sub}', 'SMA_2', {week}, {prio}, 'DRAFT', '{{}}'::jsonb, NOW(), NOW());"
        
        r = run_psql(sql)
        if r.returncode == 0: synced += 1
        else: print(f"❌ Error {subj}->{topic}: {r.stderr}")

    print(f"Synced {synced}/{len(topics)} materials for SMA_2.")

if __name__ == "__main__":
    sync_sma11()
