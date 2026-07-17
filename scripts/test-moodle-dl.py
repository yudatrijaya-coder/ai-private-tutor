import json, subprocess, time

TOKEN = "55a66757b31e78a85f6daad3402bcc2b"
BASE = "https://moodle.kumbang.sch.id"
DIR = "/home/ubuntu/ai-private-tutor/public/moodle-files"

def get(url):
    return subprocess.run(["curl", "-sL", url], capture_output=True, text=True).stdout

# Get raw API response for one course to see the exact fileurl field
cid = 3975
data = json.loads(get(f"{BASE}/webservice/rest/server.php?wstoken={TOKEN}&wsfunction=core_course_get_contents&courseid={cid}&moodlewsrestformat=json"))

# Print first file's fileurl
for sec in data:
    for mod in sec.get("modules", []):
        for cnt in mod.get("contents", []):
            fn = cnt.get("filename", "")
            furl = cnt.get("fileurl", "")
            fext = fn.split(".")[-1].lower() if "." in fn else ""
            if fext in ("pdf","pptx","xlsx") and furl:
                print(f"File: {fn}")
                print(f"fileurl (first 200): {furl[:200]}")
                print()
                
                # Try downloading with the token appended
                r = subprocess.run(["curl", "-sL", "-o", f"{DIR}/test_{fn.replace(' ','_')}", furl], capture_output=True, text=True)
                size = int(subprocess.run(["stat", "-c", "%s", f"{DIR}/test_{fn.replace(' ','_')}"], capture_output=True, text=True).stdout.strip())
                print(f"  Without token: {size}B")
                
                r2 = subprocess.run(["curl", "-sL", "-o", f"{DIR}/test2_{fn.replace(' ','_')}", f"{furl}&token={TOKEN}"], capture_output=True, text=True)
                size2 = int(subprocess.run(["stat", "-c", "%s", f"{DIR}/test2_{fn.replace(' ','_')}"], capture_output=True, text=True).stdout.strip())
                print(f"  With explicit token: {size2}B")
                
                # Check if token already embedded
                if "token" in furl:
                    print("  Token already in URL!")
                
                # Check HTTP headers
                r3 = subprocess.run(["curl", "-sI", "-o", "/dev/null", "-w", "%{http_code} %{redirect_url}", furl], capture_output=True, text=True, timeout=10)
                print(f"  HTTP: {r3.stdout}")
                print()
                
                # Try with wstoken param
                r4 = subprocess.run(["curl", "-sL", "-o", f"{DIR}/test3_{fn.replace(' ','_')}", f"{furl}?token={TOKEN}"], capture_output=True, text=True)
                size4 = int(subprocess.run(["stat", "-c", "%s", f"{DIR}/test3_{fn.replace(' ','_')}"], capture_output=True, text=True).stdout.strip())
                print(f"  With ?token=: {size4}B")
                
                break
    break
