#!/usr/bin/env python3.12
"""Weekly Moodle discrepancy check — Raihan & SHOFI
Runs every Monday. Compares Moodle files vs local. Reports new items."""
import subprocess, json, time, urllib.request, urllib.parse, os, sys
from pathlib import Path

TOKEN_R = "963d206373c6a4ca4c9d8df93a142add"
TOKEN_S = "55a66757b31e78a85f6daad3402bcc2b"
BASE = "https://moodle.kumbang.sch.id/webservice/rest/server.php"
MOODLE_DIR = Path("/home/ubuntu/ai-private-tutor/public/moodle-files/")

RAIHAN_COURSES = [4164, 4166, 4169, 4171, 4173, 4174, 4178, 4179, 4460]
SHOFI_COURSES  = [3659, 3664, 3666, 3667, 3673, 3674, 3675, 4506]

def api(token, fn, **kwargs):
    params = [("wstoken", token), ("moodlewsrestformat", "json"), ("wsfunction", fn)]
    for k, v in kwargs.items(): params.append((k, v))
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(BASE, data=data, headers={"User-Agent": "Mozilla/5.0"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=30).read())
    except Exception as e:
        return {"error": str(e)}

def get_course_name(cid, token):
    r = api(token, "core_course_get_courses_by_field", field="id", value=cid)
    if "courses" in r and r["courses"]:
        return r["courses"][0].get("shortname", r["courses"][0].get("fullname", str(cid)))
    return str(cid)

def check_all(token, student_label, course_ids):
    local_files = {f.name: f.stat().st_size for f in MOODLE_DIR.iterdir() if f.is_file()}
    new_items = []
    diff_items = []
    
    for cid in course_ids:
        contents = api(token, "core_course_get_contents", courseid=cid)
        if "exception" in contents: continue
        cname = get_course_name(cid, token)
        for section in contents:
            for mod in section.get("modules", []):
                if mod.get("modname") in ("forum", "assign", "quiz", "glossary"): continue
                for c in mod.get("contents", []):
                    fname = c.get("filename", "")
                    fsize = c.get("filesize", 0)
                    furl = c.get("fileurl", "")
                    if not fname or fname.startswith(".") or not fname.endswith((".pdf",".pptx")): continue
                    
                    exists = any(fname.lower() in lf.lower() for lf in local_files)
                    local_sz = next((local_files[lf] for lf in local_files if fname.lower() in lf.lower()), 0)
                    
                    if exists and fsize > 0 and local_sz > 0 and abs(fsize - local_sz) > 10000:
                        diff_items.append({"name": fname, "moodle_kb": fsize//1024, "local_kb": local_sz//1024, "course": cname, "url": furl})
                    elif not exists and fsize > 0:
                        new_items.append({"name": fname, "size_kb": fsize//1024, "course": cname, "url": furl, "course_id": cid})
        time.sleep(0.3)
    
    return new_items, diff_items

ts = time.strftime("%d %b %Y %H:%M")
print(f"=== MOODLE CHECK: {ts} ===\n")

for t, tokens, courses, label in [
    (TOKEN_R, list(zip([TOKEN_R]*len(RAIHAN_COURSES), RAIHAN_COURSES)), RAIHAN_COURSES, "Raihan (SMP_1)"),
    (TOKEN_S, [], SHOFI_COURSES, "SHOFI (SMA_2)")
]:
    new, diff = check_all(TOKEN_R if "RAIHAN" not in label else TOKEN_R, label, courses)
    if "SHOFI" in label:
        new, diff = check_all(TOKEN_S, label, SHOFI_COURSES)

report = []
for label, t, courses in [("Raihan (SMP_1)", TOKEN_R, RAIHAN_COURSES), ("SHOFI (SMA_2)", TOKEN_S, SHOFI_COURSES)]:
    new, diff = check_all(t, label, courses)
    print(f"\n## {label}")
    print(f"Courses OK: {len(courses)}")
    if new:
        print(f"\n🆕 FILE BARU ({len(new)}):")
        for f in new:
            print(f"  • [{f['course']}] {f['name']} ({f['size_kb']} KB)")
            report.append(f"**{label}** 🆕 `{f['name'][:60]}` ({f['size_kb']} KB) di `{f['course']}`")
    else:
        print("\n✅ Tidak ada file baru")
        report.append(f"**{label}** ✅ Tidak ada file baru")
    
    if diff:
        print(f"\n⚠️ UKURAN BERBEDA ({len(diff)}):")
        for f in diff:
            print(f"  • {f['name'][:60]} Moodle: {f['moodle_kb']} KB → Local: {f['local_kb']} KB")
            report.append(f"**{label}** ⚠️ `{f['name'][:60]}` ukuran beda: Moodle {f['moodle_kb']} KB vs Local {f['local_kb']} KB")
    else:
        print("✅ Semua file size cocok")

print("\n\n📋 RINGKASAN:")
for r in report: print(r)
