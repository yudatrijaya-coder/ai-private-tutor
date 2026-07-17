import json, subprocess, time, os

TOKEN = "55a66757b31e78a85f6daad3402bcc2b"
BASE = "https://moodle.kumbang.sch.id"
DIR = "/home/ubuntu/ai-private-tutor/public/moodle-files"

courses = [3975, 3582, 3659, 3664, 3666, 3667, 3668, 3670, 3673, 3675, 3676, 3677]

for cid in courses:
    url = f"{BASE}/webservice/rest/server.php?wstoken={TOKEN}&wsfunction=core_course_get_contents&courseid={cid}&moodlewsrestformat=json"
    r = subprocess.run(["curl", "-sL", url], capture_output=True, text=True, timeout=15)
    
    # Fix the JSON parsing
    try:
        data = json.loads(r.stdout)
    except:
        print(f"=== {cid} === JSON parse error")
        continue
    
    for sec in data:
        sec_name = sec.get("name", "?")
        for mod in sec.get("modules", []):
            for cnt in mod.get("contents", []):
                fn = cnt.get("filename", "")
                furl = cnt.get("fileurl", "")
                fsize = cnt.get("filesize", 0)
                fext = fn.split(".")[-1].lower() if "." in fn else ""
                if fext in ("pdf","pptx","xlsx") and furl and fsize > 10000:
                    safe = fn.replace(" ", "_")
                    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in safe)
                    safe = f"{cid}_{safe}"
                    
                    # Download with token
                    dl_url = furl + "&token=" + TOKEN
                    out = f"{DIR}/{safe}"
                    subprocess.run(["curl", "-sL", "-o", out, dl_url], capture_output=True, text=True, timeout=60)
                    try:
                        size = os.path.getsize(out)
                    except:
                        size = 0
                    
                    if size > 1000:
                        print(f"  ✅ {cid} {fn} ({size//1024}KB)")
                    else:
                        # Check why failed
                        with open(out) as f: err = f.read(200)
                        print(f"  ❌ {cid} {fn} ({size}B): {err[:100]}")
                        os.remove(out)
                    
                    time.sleep(0.5)