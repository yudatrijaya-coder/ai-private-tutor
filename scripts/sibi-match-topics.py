#!/usr/bin/env python3.12
"""
Step 2: Match SIBI chapters → curriculum topics using LLM
Input: raw_content JSON (data/sibi/raw_content/)
Output: matched per topic → saved at data/sibi/matched/

Usage: python3.12 scripts/sibi-match-topics.py [subject]
   or: python3.12 scripts/sibi-match-topics.py (all subjects)
"""

import json
import os
import sys
import re
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "sibi" / "raw_content" / "SMA_2"
OUT_DIR = BASE_DIR / "data" / "sibi" / "matched" / "SMA_2"

# Map PDF filename → curriculum subject name
SUBJECT_MAP = {
    "Matematika Tingkat Lanjut": "Matematika",
}

def load_api_key():
    env_path = BASE_DIR / ".env"
    for line in open(env_path).readlines():
        line = line.strip()
        if line.startswith("SUMOPOD_API_KEY="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise ValueError("SUMOPOD_API_KEY not found")

API_KEY = load_api_key()
API_URL = "https://ai.sumopod.com/v1/chat/completions"

def load_curriculum_topics(subject):
    """Load topics for a subject from curriculum-topics-sma11.ts"""
    ts_path = BASE_DIR / "src" / "data" / "curriculum-topics-sma11.ts"
    content = open(ts_path).read()
    topics = []
    for line in content.split("\n"):
        if f'subject: "{subject}"' in line and "topic:" in line:
            topic_match = re.search(r'topic: "([^"]+)"', line)
            sub_topic_match = re.search(r'subTopic: "([^"]+)"', line)
            week_match = re.search(r'weekOrder: (\d+)', line)
            if topic_match and sub_topic_match:
                topics.append({
                    "topic": topic_match.group(1),
                    "subTopic": sub_topic_match.group(1),
                    "weekOrder": int(week_match.group(1)) if week_match else 0
                })
    return topics

def call_llm(prompt, system="You extract structured data from educational content."):
    for attempt in range(3):
        try:
            resp = requests.post(API_URL, json={
                "model": "deepseek-v4-flash",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 4000
            }, headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            }, timeout=120)
            content = resp.json()["choices"][0]["message"]["content"]
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
            if json_match:
                return json.loads(json_match.group(1))
            return json.loads(content)
        except Exception as e:
            print(f"  ⚠️  LLM attempt {attempt+1}: {e}")
            if attempt == 2:
                raise

def match_subject(subject, raw_data):
    print(f"\n{'─' * 60}")
    print(f"📖 {subject}")

    curriculum_subject = SUBJECT_MAP.get(subject, subject)
    topics = load_curriculum_topics(curriculum_subject)
    print(f"  Curriculum: {len(topics)} sub-topics (name='{curriculum_subject}')")

    if not topics:
        out_data = {"subject": subject, "total_topics": 0, "matched": 0, "unmatched": 0, "matches": [], "chapters": []}
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        json.dump(out_data, open(OUT_DIR / f"{subject}.json", "w"), indent=2, ensure_ascii=False)
        return out_data

    chapters = []
    for idx, c in enumerate(raw_data["chapters"]):
        chapters.append({
            "index": idx,
            "page_start": c["page_start"],
            "page_end": c["page_end"],
            "title": c["title"],
            "text": c.get("text", "")
        })

    print(f"  PDF sections: {len(chapters)}")

    if len(chapters) > 30:
        merged = []
        current = chapters[0].copy()
        for c in chapters[1:]:
            if c["page_end"] - current["page_start"] < 5 or len(merged) > 25:
                merged.append(current)
                current = c.copy()
            else:
                current["page_end"] = c["page_end"]
                current["title"] += "; " + c["title"][:40]
        merged.append(current)
        display = merged[:30]
    else:
        display = chapters

    topic_list = "\n".join(f"  - {t['topic']} → {t['subTopic']}" for t in topics)
    section_list = "\n".join(f"  Section {c['index']} (p.{c['page_start']}-{c['page_end']}): {c['title'][:80]}" for c in display)

    prompt = f'''Match SIBI Kurikulum Merdeka PDF sections to curriculum topics for SMA Kelas XI "{curriculum_subject}".

Curriculum topics:
{topic_list}

PDF sections:
{section_list}
{f'  ... and {len(chapters)-30} more sections' if len(chapters) > 30 else ''}

Output JSON:
{{"matches": [
  {{"topic": "...", "subTopic": "...", "chapter_indices": [0 or more indices], "confidence": 0.0-1.0}}
]}}'''

    try:
        result = call_llm(prompt)
        matches = result.get("matches", [])
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        matches = []

    out_data = {
        "subject": subject,
        "curriculum_subject": curriculum_subject,
        "total_topics": len(topics),
        "matched": len([m for m in matches if m.get("chapter_indices")]),
        "unmatched": len([m for m in matches if not m.get("chapter_indices")]),
        "matches": matches,
        "chapters": chapters
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    json.dump(out_data, open(OUT_DIR / f"{subject}.json", "w"), indent=2, ensure_ascii=False)
    print(f"  ✅ {out_data['matched']}/{len(topics)} matched")
    if out_data['unmatched']:
        print(f"  ⚠️  Unmatched: {[m['subTopic'] for m in matches if not m.get('chapter_indices')][:5]}")

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    subjects = [f.replace(".json", "") for f in os.listdir(RAW_DIR) if f.endswith(".json")]

    if target != "all":
        subjects = [s for s in subjects if target.lower() in s.lower()]

    print(f"Subjects: {len(subjects)}")
    for s in subjects:
        raw_path = RAW_DIR / f"{s}.json"
        if raw_path.exists():
            match_subject(s, json.load(open(raw_path)))

if __name__ == "__main__":
    main()
