#!/usr/bin/env python3.12
"""
SIBI Match Topics V2 - Match SIBI chapters → curriculum topics using LLM
Flexible: Supports any grade level (SD_5, SMP_1, SMA_2) and uses 9Router API.
"""

import json, os, sys, re, time
from openai import OpenAI
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ---- LLM config (9Router — per user preference) ----
LLM_CLIENT = OpenAI(base_url="http://localhost:20128/v1", api_key="sk-9router")
LLM_MODEL = "hermes"

# Map grade level to TS curriculum file
CURRICULUM_FILES = {
    "SMA_2": "curriculum-topics-sma11.ts",
    "SMP_1": "curriculum-topics-smp7.ts",
    "SD_5": "curriculum-topics-sd5.ts",
}

def load_curriculum_topics(grade, subject):
    """Load topics for a subject from curriculum-topics TS file"""
    if grade not in CURRICULUM_FILES:
        return []
    ts_file = CURRICULUM_FILES[grade]
    ts_path = BASE_DIR / "src" / "data" / ts_file
    if not ts_path.exists():
        print(f"❌ Curriculum TS file not found at {ts_path}")
        return []
        
    content = open(ts_path).read()
    topics = []
    
    # Normalize subject naming differences if any
    subj_norm = subject.lower()
    
    # Simple regex parsing
    for line in content.split("\n"):
        if "subject:" in line and "topic:" in line:
            # Check if this line is for the correct subject
            line_subj = re.search(r'subject: "([^"]+)"', line)
            if line_subj and line_subj.group(1).lower() == subj_norm:
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
            r = LLM_CLIENT.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=4000
            )
            content = r.choices[0].message.content
            if not content:
                print(f"  ⚠️  LLM returned empty content. Retrying in 15s... (attempt {attempt+1}/3)")
                time.sleep(15)
                continue
                
            content = content.strip()
            # Extract JSON block
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
            if json_match:
                content = json_match.group(1).strip()
            
            return json.loads(content)
        except Exception as e:
            print(f"  ⚠️  LLM attempt {attempt+1}: {e}")
            if attempt == 2:
                raise
            time.sleep(15)

def match_subject(grade, subject):
    print(f"\n{'─' * 60}")
    print(f"📖 Grade: {grade} | Subject: {subject}")

    topics = load_curriculum_topics(grade, subject)
    print(f"  Curriculum: {len(topics)} sub-topics found")

    raw_dir = BASE_DIR / "data" / "sibi" / "raw_content" / grade
    out_dir = BASE_DIR / "data" / "sibi" / "matched" / grade
    
    raw_path = raw_dir / f"{subject}.json"
    if not raw_path.exists():
        print(f"❌ Raw content file not found for {subject}")
        return

    raw_data = json.load(open(raw_path))

    if not topics:
        out_data = {"subject": subject, "total_topics": 0, "matched": 0, "unmatched": 0, "matches": [], "chapters": []}
        out_dir.mkdir(parents=True, exist_ok=True)
        json.dump(out_data, open(out_dir / f"{subject}.json", "w"), indent=2, ensure_ascii=False)
        return out_data

    # Compact: Only include short excerpt, not full text
    display_chapters = []
    for idx, c in enumerate(raw_data["chapters"]):
        display_chapters.append({
            "index": idx,
            "page": f"{c.get('start_page', c.get('page_start', 0))}-{c.get('end_page', c.get('page_end', 0))}",
            "title": c["title"][:120],
            "text_preview": c.get("text", "")[:100].replace("\n", " ")
        })
    
    # Limit to first 50 sections to keep prompt manageable
    display = display_chapters[:50]

    print(f"  PDF sections: {len(display_chapters)}")

    topic_list = "\n".join(f"  - {t['topic']} → {t['subTopic']}" for t in topics)
    section_list = "\n".join(f"  {c['index']}: {c['title']}" for c in display)

    prompt = f'''Match SIBI PDF sections to curriculum topics for {grade} "{subject}".

Curriculum topics:
{topic_list}

PDF sections (index: title):
{section_list}
{f'  ... and {len(display_chapters)-50} more sections' if len(display_chapters) > 50 else ''}

Output JSON:
{{"matches": [
  {{"topic": "...", "subTopic": "...", "chapter_indices": [indices], "confidence": 0.0-1.0}}
]}}'''

    try:
        result = call_llm(prompt)
        matches = result.get("matches", [])
    except Exception as e:
        print(f"  ❌ Matching failed: {e}")
        matches = []

    out_data = {
        "subject": subject,
        "total_topics": len(topics),
        "matched": len([m for m in matches if m.get("chapter_indices")]),
        "unmatched": len([m for m in matches if not m.get("chapter_indices")]),
        "matches": matches,
        "chapters": display_chapters
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    json.dump(out_data, open(out_dir / f"{subject}.json", "w"), indent=2, ensure_ascii=False)
    print(f"  ✅ {out_data['matched']}/{len(topics)} matched successfully!")

def main():
    if len(sys.argv) < 3:
        print("Usage: python3.12 scripts/sibi-match-topics-v2.py <GRADE> <SUBJECT|all>")
        sys.exit(1)
        
    grade = sys.argv[1]
    subject = sys.argv[2]
    
    raw_dir = BASE_DIR / "data" / "sibi" / "raw_content" / grade
    if not raw_dir.exists():
        print(f"❌ Raw content directory for {grade} does not exist.")
        sys.exit(1)
        
    subjects = [f.replace(".json", "") for f in os.listdir(raw_dir) if f.endswith(".json")]
    
    if subject.lower() == "all":
        for s in subjects:
            match_subject(grade, s)
            time.sleep(15) # Delay 15s to avoid 9Router rate limits
    else:
        match_subject(grade, subject)

if __name__ == "__main__":
    main()