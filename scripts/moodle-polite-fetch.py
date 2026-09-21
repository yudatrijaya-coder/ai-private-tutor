#!/usr/bin/env python3.12
"""POLITE Moodle fetcher for Raihan & SHOFI new materials.

Design goals — behave like a normal human browsing, NOT a scraper:
  * ONE request at a time (fully sequential, no parallelism)
  * Random human-like delay between every request (default 8-15s)
  * Browser-like headers (real UA, Accept, Accept-Language, Referer, Sec-Fetch-*)
  * Keep-alive session so TLS/connection is reused like a browser tab
  * Exponential backoff + long cooldown on HTTP 429 / connection reset
  * Respects a per-run budget so we never hammer the server
  * Resumable: skips files already downloaded, writes a manifest

Usage:
  python3.12 scripts/moodle-polite-fetch.py --check          # just test reachability
  python3.12 scripts/moodle-polite-fetch.py --list           # list new files (API only)
  python3.12 scripts/moodle-polite-fetch.py --download       # download new files, slowly
"""
import argparse, json, os, random, sys, time, urllib.parse, urllib.request, urllib.error
from pathlib import Path

TOKEN_R = "963d206373c6a4ca4c9d8df93a142add"   # Raihan
TOKEN_S = "55a66757b31e78a85f6daad3402bcc2b"   # SHOFI
BASE = "https://moodle.kumbang.sch.id"
API = f"{BASE}/webservice/rest/server.php"
DIR = Path("/home/ubuntu/ai-private-tutor/public/moodle-files")
MANIFEST = Path("/home/ubuntu/ai-private-tutor/scripts/_polite-manifest.json")

RAIHAN_COURSES = [4164, 4166, 4169, 4171, 4173, 4174, 4178, 4179, 4460]
SHOFI_COURSES  = [3659, 3664, 3666, 3667, 3673, 3674, 3675, 4506]

SKIP_MOD = ("forum", "assign", "quiz", "glossary")
KEEP_EXT = (".pdf", ".pptx")

# ── pacing knobs (tune these, not the burst size) ──────────────────────
DELAY_MIN, DELAY_MAX = 8.0, 15.0     # seconds between requests
COOLDOWN_429 = 120                    # seconds to wait after a 429
MAX_RETRIES = 3
PAGE_THINK = (1.5, 4.0)               # extra pause before each download (like "opening file")

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")

HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,"
              "image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    # Do NOT advertise any Accept-Encoding. urllib's automatic gzip/br
    # decompression only kicks in when IT injects the header — when we set
    # headers explicitly the body arrives still compressed and json.loads()
    # fails, making every API call look like "(tidak ada / diblokir)".
    # Asking for identity keeps the body plain text.
    "Accept-Encoding": "identity",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Referer": BASE + "/my/",
}

# one shared opener = one persistent connection pool (browser-like)
_opener = urllib.request.build_opener()
_opener.addheaders = list(HEADERS.items())


def human_sleep(lo=DELAY_MIN, hi=DELAY_MAX):
    d = random.uniform(lo, hi)
    print(f"    … tunggu {d:.1f}s (jeda manusiawi)")
    time.sleep(d)


def fetch(url, binary=False, retries=MAX_RETRIES):
    """Single polite GET with backoff. Returns bytes/str or None."""
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with _opener.open(req, timeout=60) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"    ⚠️  429 Too Many Requests — cooldown {COOLDOWN_429}s "
                      f"(attempt {attempt}/{retries})")
                time.sleep(COOLDOWN_429)
                continue
            if e.code in (500, 502, 503, 504):
                wait = 15 * attempt
                print(f"    ⚠️  HTTP {e.code} — tunggu {wait}s")
                time.sleep(wait)
                continue
            print(f"    ❌ HTTP {e.code}: {e.reason}")
            return None
        except Exception as e:
            wait = 10 * attempt
            print(f"    ⚠️  {type(e).__name__}: {e} — tunggu {wait}s")
            time.sleep(wait)
    return None


def api(token, fn, **kw):
    params = [("wstoken", token), ("moodlewsrestformat", "json"), ("wsfunction", fn)]
    for k, v in kw.items():
        params.append((k, v))
    url = API + "?" + urllib.parse.urlencode(params)
    txt = fetch(url)
    if txt is None:
        return None
    try:
        return json.loads(txt)
    except Exception:
        return None


def safe_name(name):
    name = name.replace(" ", "_")
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name)


def local_names():
    """Normalised set of already-downloaded filenames (stored as
    `{courseid}_{safe_name}`), so comparison is exact, not substring."""
    names = set()
    for f in DIR.iterdir():
        if not f.is_file():
            continue
        n = f.name
        # strip the "{courseid}_" prefix so it matches a raw Moodle filename
        if "_" in n and n.split("_", 1)[0].isdigit():
            n = n.split("_", 1)[1]
        names.add(n.lower())
    return names


def discover(label, token, courses):
    """Walk courses ONE AT A TIME, listing new files. No downloads."""
    local = local_names()
    found = []
    for i, cid in enumerate(courses, 1):
        print(f"  [{i}/{len(courses)}] course {cid}: minta daftar isi…")
        contents = api(token, "core_course_get_contents", courseid=cid)
        if not contents or (isinstance(contents, dict) and "exception" in contents):
            print(f"        (tidak ada / diblokir)")
            human_sleep()
            continue
        for sec in contents:
            for mod in sec.get("modules", []):
                if mod.get("modname") in SKIP_MOD:
                    continue
                for c in mod.get("contents", []):
                    fn = c.get("filename", "")
                    sz = c.get("filesize", 0)
                    furl = c.get("fileurl", "")
                    if not fn or not furl or fn.startswith("."):
                        continue
                    if not fn.lower().endswith(KEEP_EXT) or sz <= 10000:
                        continue
                    if safe_name(fn).lower() in local:
                        continue
                    found.append({"course_id": cid, "filename": fn, "size": sz,
                                  "url": furl, "section": sec.get("name", ""),
                                  "module": mod.get("name", "")})
        human_sleep()   # human pause between courses
    return found


def download_all(items, token):
    DIR.mkdir(parents=True, exist_ok=True)
    done = []
    for i, it in enumerate(items, 1):
        fn_safe = safe_name(it["filename"])
        dest = DIR / f"{it['course_id']}_{fn_safe}"
        if dest.exists():
            print(f"  [{i}/{len(items)}] skip (sudah ada): {dest.name}")
            continue
        print(f"  [{i}/{len(items)}] {it['filename']} ({it['size']//1024} KB)")
        time.sleep(random.uniform(*PAGE_THINK))     # "clicking the link"
        sep = "&" if "?" in it["url"] else "?"
        data = fetch(it["url"] + sep + "token=" + token, binary=True)
        if data and len(data) > 1000:
            dest.write_bytes(data)
            print(f"        ✅ {len(data)//1024} KB -> {dest.name}")
            it["local"] = dest.name
            done.append(it)
        else:
            print(f"        ❌ gagal / kosong")
        human_sleep()                              # pause before next file
    return done


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="test reachability only")
    ap.add_argument("--list", action="store_true", help="list new files (no download)")
    ap.add_argument("--download", action="store_true", help="download new files slowly")
    args = ap.parse_args()

    if args.check:
        print("Tes akses Moodle (1 request santai)…")
        txt = fetch(BASE + "/login/index.php")
        print("  ✅ BISA AKSES" if txt else "  ❌ MASIH DIBLOKIR / tidak merespons")
        return

    jobs = [("RAIHAN (SMP_1)", TOKEN_R, RAIHAN_COURSES),
            ("SHOFI (SMA_2)", TOKEN_S, SHOFI_COURSES)]

    if args.list or args.download:
        all_items = []
        for label, token, courses in jobs:
            print(f"\n=== {label} ===")
            items = discover(label, token, courses)
            print(f"  → {len(items)} file baru")
            for it in items:
                it["token"] = token
            all_items += items
        print(f"\nTOTAL file baru: {len(all_items)}")
        MANIFEST.write_text(json.dumps(all_items, indent=1, ensure_ascii=False))

        if args.download and all_items:
            print("\n=== MULAI DOWNLOAD (pelan & sopan) ===")
            total = []
            for label, token, courses in jobs:
                sub = [x for x in all_items if x["token"] == token]
                if sub:
                    print(f"\n--- {label} ({len(sub)} file) ---")
                    total += download_all(sub, token)
            print(f"\n✅ Selesai: {len(total)} file baru terunduh")
            print(f"   Manifest: {MANIFEST}")


if __name__ == "__main__":
    main()
