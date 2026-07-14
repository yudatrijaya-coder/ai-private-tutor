#!/usr/bin/env python3
"""Download all file resources from Raihan's Moodle courses."""

import json
import os
import shutil
import sys
import time
import urllib.parse
import urllib.request

TOKEN = "963d206373c6a4ca4c9d8df93a142add"
BASEURL = "https://moodle.kumbang.sch.id"
OUTDIR = os.path.expanduser("~/ai-private-tutor/moodle-files")

# Course info: id -> shortname
COURSES = {
    4164: "2627_Bahasa_Indonesia_VII_A",
    4171: "2627_Fisika_VII_A",
    4174: "2627_Kimia_VII_A",
    4178: "2627_PPKn_VII_A",
}


def download_file(url, dest_path):
    """Download a file from Moodle."""
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    # Add token if not present
    if "token=" not in url:
        sep = "&" if "?" in url else "?"
        url = url + sep + f"token={TOKEN}"
    
    print(f"  Downloading -> {os.path.basename(dest_path)}")
    sys.stdout.flush()
    
    # Retry loop
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
                },
            )
            with urllib.request.urlopen(req, timeout=60) as response:
                data = response.read()
                if len(data) > 0:
                    with open(dest_path, "wb") as f:
                        f.write(data)
                    size_mb = len(data) / (1024 * 1024)
                    print(f"    Saved: {size_mb:.1f} MB")
                    return True
        except Exception as e:
            print(f"    Attempt {attempt + 1} failed: {e}")
            time.sleep(2)
    
    print(f"    FAILED after 3 attempts")
    return False


def get_course_contents(course_id):
    """Fetch course contents via Moodle API."""
    params = {
        "wstoken": TOKEN,
        "wsfunction": "core_course_get_contents",
        "courseid": course_id,
        "moodlewsrestformat": "json",
    }
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        f"{BASEURL}/webservice/rest/server.php",
        data=data,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def sanitize_filename(name):
    """Sanitize a filename to be safe for the filesystem."""
    name = name.replace("/", "_").replace("\\", "_")
    name = name.replace(":", "_").replace("*", "_").replace("?", "_")
    name = name.replace('"', "_").replace("<", "_").replace(">", "_").replace("|", "_")
    # Remove leading/trailing spaces and dots
    name = name.strip(". ")
    if not name:
        name = "unnamed"
    return name


def process_course(course_id, course_name):
    """Process a single course and download all file resources."""
    print(f"\n{'='*60}")
    print(f"Course: {course_name}")
    print(f"{'='*60}")
    
    course_dir = os.path.join(OUTDIR, course_name)
    
    try:
        sections = get_course_contents(course_id)
    except Exception as e:
        print(f"  ERROR fetching contents: {e}")
        return 0
    
    downloaded = 0
    
    for section in sections:
        section_name = section.get("name", "Unknown")
        # Clean section name for directory
        section_dir_name = sanitize_filename(section_name)
        section_dir = os.path.join(course_dir, section_dir_name)
        
        for module in section.get("modules", []):
            modname = module.get("modname", "")
            modname_plural = module.get("modplural", "")
            module_name = module.get("name", "")
            module_dir_name = sanitize_filename(f"{modname_plural}_{module_name}"[:100])
            
            files_in_module = []
            
            # Get contents from the module
            contents = module.get("contents", [])
            
            for content in contents:
                fileurl = content.get("fileurl", "")
                filename = content.get("filename", "")
                filesize = content.get("filesize", 0)
                
                # Skip non-file entries (URLs, empty names, index.html)
                if not filename or not fileurl:
                    continue
                if filename == "index.html":
                    continue
                
                # Skip Google Forms URLs disguised as files
                if "forms.gle" in fileurl or "forms.google" in fileurl:
                    continue
                
                # Skip kemendikbud links
                if "buku.kemendikdasmen.go.id" in fileurl or "buku.kemdikbud.go.id" in fileurl:
                    continue
                
                files_in_module.append({
                    "filename": filename,
                    "url": fileurl,
                    "filesize": filesize,
                    "mimetype": content.get("mimetype", ""),
                })
            
            if not files_in_module:
                continue
            
            # Create directory for this module
            mod_dir = os.path.join(section_dir, module_dir_name) if module_dir_name else section_dir
            os.makedirs(mod_dir, exist_ok=True)
            
            print(f"\n  [{section_name}] > {modname_plural}: {module_name}")
            
            for file_info in files_in_module:
                # Sanitize the filename
                safe_name = sanitize_filename(file_info["filename"])
                dest_path = os.path.join(mod_dir, safe_name)
                
                # Handle duplicates
                counter = 1
                while os.path.exists(dest_path):
                    name_parts = os.path.splitext(safe_name)
                    dest_path = os.path.join(mod_dir, f"{name_parts[0]}_{counter}{name_parts[1]}")
                    counter += 1
                
                success = download_file(file_info["url"], dest_path)
                if success:
                    downloaded += 1
    
    return downloaded


def main():
    # Clean start
    if os.path.exists(OUTDIR):
        print(f"Removing existing output directory: {OUTDIR}")
        shutil.rmtree(OUTDIR)
    
    total = 0
    for cid, cname in COURSES.items():
        total += process_course(cid, cname)
    
    print(f"\n{'='*60}")
    print(f"DOWNLOAD COMPLETE")
    print(f"Total files downloaded: {total}")
    print(f"Output directory: {OUTDIR}")
    print(f"{'='*60}")
    
    # List the directory structure
    print("\nDirectory structure:")
    for root, dirs, files in os.walk(OUTDIR):
        level = root.replace(OUTDIR, "").count(os.sep)
        indent = "  " * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = "  " * (level + 1)
        for file in files:
            filepath = os.path.join(root, file)
            size = os.path.getsize(filepath)
            size_str = f"{size / (1024*1024):.1f} MB" if size > 1024 * 1024 else f"{size / 1024:.0f} KB"
            print(f"{subindent}{file} ({size_str})")


if __name__ == "__main__":
    main()
