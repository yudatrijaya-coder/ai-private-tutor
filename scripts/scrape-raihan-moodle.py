import json, subprocess, time, os

TOKEN = "963d206373c6a4ca4c9d8df93a142add"
BASE = "https://moodle.kumbang.sch.id"
DIR = "/home/ubuntu/ai-private-tutor/public/moodle-files"

courses = {4166: "Mandarin", 4460: "English_Diag", 4164: "Indonesia",
           4169: "Biologi", 4171: "Fisika", 4173: "Informatika",
           4174: "Kimia", 4178: "PPKn", 4179: "Sejarah"}

ok = 0
fail = 0

for cid, subj in courses.items():
    print(f"\n=== {cid} {subj} ===")
    url = f"{BASE}/webservice/rest/server.php?wstoken={TOKEN}&wsfunction=core_course_get_contents&courseid={cid}&moodlewsrestformat=json"
    r = subprocess.run(["curl", "-sL", url], capture_output=True, text=True, timeout=15)
    try:
        data = json.loads(r.stdout)
    except:
        print(f"  JSON parse error")
        continue
    
    for sec in data:
        for mod in sec.get("modules", []):
            for cnt in mod.get("contents", []):
                fn = cnt.get("filename", "")
                furl = cnt.get("fileurl", "")
                fsize = cnt.get("filesize", 0)
                fext = fn.split(".")[-1].lower() if "." in fn else ""
                if fext in ("pdf","pptx","xlsx") and furl and fsize > 5000:
                    safe = fn.replace(" ", "_")
                    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in safe)
                    safe = f"{cid}_{safe}"
                    
                    dl_url = furl + "&token=" + TOKEN
                    out = f"{DIR}/{safe}"
                    subprocess.run(["curl", "-sL", "-o", out, dl_url], capture_output=True, text=True, timeout=120)
                    try:
                        size = os.path.getsize(out)
                    except:
                        size = 0
                    
                    if size > 1000:
                        print(f"  ✅ {safe} ({size//1024}KB)")
                        ok += 1
                    else:
                        print(f"  ❌ {safe} ({size}B)")
                        try:
                            os.remove(out)
                        except:
                            pass
                        fail += 1
                    
                    time.sleep(0.5)

print(f"\n{'='*40}")
print(f"✅ {ok} files, ❌ {fail} failed")
