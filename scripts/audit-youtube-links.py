import urllib.request
import json
import urllib.parse
import re
import time
import os

def get_yt_metadata(url):
    try:
        oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(url)}&format=json"
        req = urllib.request.Request(oembed_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            return {
                "title": data.get('title', ''),
                "author": data.get('author_name', ''),
                "error": None
            }
    except Exception as e:
        return {"title": "", "author": "", "error": str(e)}

def parse_mapping_file(filepath):
    """Parse TS files where format is: { title: '...', url: '...', channel: '...', topic: '...' }"""
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r') as f:
        content = f.read()
    
    # The TS format has url BEFORE topic in each object
    # Extract url→topic pairs within the same object block
    pattern = r"url:\s*['\"](.*?)['\"].*?topic:\s*['\"](.*?)['\"]"
    matches = re.findall(pattern, content, re.DOTALL)
    
    # Deduplicate by URL (each URL should appear exactly once)
    seen_urls = set()
    deduped = []
    for url, topic in matches:
        if url not in seen_urls:
            seen_urls.add(url)
            deduped.append({"topic": topic, "url": url})
    
    return deduped

def analyze_match(grade, topic, title):
    title_lower = title.lower()
    topic_lower = topic.lower()
    
    # Basic class levels
    level_mismatch = False
    
    # Level check: e.g. SMP_1 / Kelas 7 vs SMA_2 / Kelas 11
    if grade == "SD_5":
        if "kelas 7" in title_lower or "kelas 8" in title_lower or "kelas 9" in title_lower or "smp" in title_lower:
            level_mismatch = True
        if "kelas 10" in title_lower or "kelas 11" in title_lower or "kelas 12" in title_lower or "sma" in title_lower:
            level_mismatch = True
    elif grade == "SMP_1":
        if "kelas 5" in title_lower or "sd" in title_lower:
            # check if it specifically says 'smp' somewhere to override
            if "smp" not in title_lower:
                level_mismatch = True
        if "kelas 11" in title_lower or "kelas 12" in title_lower or "sma" in title_lower:
            level_mismatch = True
    elif grade == "SMA_2":
        if "kelas 7" in title_lower or "kelas 8" in title_lower or "smp" in title_lower:
            level_mismatch = True
            
    # Topic matching
    topic_words = re.findall(r'\w+', topic_lower)
    # Filter out common stop words
    stop_words = {'dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'dengan', 'kelas', 'bab'}
    words = [w for w in topic_words if w not in stop_words and len(w) > 2]
    
    matched_words = [w for w in words if w in title_lower]
    
    if level_mismatch:
        return "LEVEL_MISMATCH"
    if not matched_words:
        return "TOPIC_MISMATCH"
    
    return "OK"

def run_audit():
    files = {
        "SD_5": "/home/ubuntu/ai-private-tutor/src/data/youtube.ts",
        "SMP_1": "/home/ubuntu/ai-private-tutor/src/data/youtube-smp7.ts",
        "SMA_2": "/home/ubuntu/ai-private-tutor/src/data/youtube-sma11.ts"
    }
    
    report = {}
    
    for grade, path in files.items():
        print(f"Auditing {grade}...")
        mappings = parse_mapping_file(path)
        print(f"Found {len(mappings)} links.")
        
        grade_results = []
        for i, item in enumerate(mappings):
            url = item['url']
            topic = item['topic']
            
            meta = get_yt_metadata(url)
            if meta['error']:
                status = "ERROR"
                desc = meta['error']
            else:
                status = analyze_match(grade, topic, meta['title'])
                desc = meta['title']
                
            grade_results.append({
                "index": i + 1,
                "topic": topic,
                "url": url,
                "status": status,
                "details": desc
            })
            
            # Print feedback during run
            if status != "OK":
                print(f"  [{status}] Topic: {topic} | Video: {desc} ({url})")
            
            time.sleep(0.5) # simple spacing
            
        report[grade] = grade_results
        
    with open("/home/ubuntu/ai-private-tutor/audit-reports/youtube-audit-results.json", "w") as f:
        json.dump(report, f, indent=2)
        
    print("Audit finished. Results written to /home/ubuntu/ai-private-tutor/audit-reports/youtube-audit-results.json")

if __name__ == "__main__":
    run_audit()