#!/usr/bin/env python3
"""
SenangBelajar — Automated Video Pipeline
=========================================
Generates educational videos from slide_sibi content.

Flow per (subject, topic):
  1. Fetch subtopics' slide_sibi → parse into structured slides
  2. Write JSON scene data
  3. Render via generic_scene.py (Manim 720p30)
  4. TTS narration per slide (edge-tts id-ID-ArdiNeural)
  5. Random BGM from music library
  6. ffmpeg merge
  7. Update DB videoUrl column + metadata field

Usage:
  python3 scripts/video_pipeline.py                                # list groups
  python3 scripts/video_pipeline.py --all                          # process all
  python3 scripts/video_pipeline.py --topic "Fisika|Gerak Lurus"  # one group
  python3 scripts/video_pipeline.py --resume                       # resume from checkpoint
"""

import os, sys, json, subprocess, argparse, time, re, random

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_DIR, "assets")
MUSIC_DIR = os.path.join(ASSETS_DIR, "music")
MUSIC_MANIFEST = os.path.join(MUSIC_DIR, "manifest.json")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "public", "videos")
CHECKPOINT_FILE = os.path.join(PROJECT_DIR, "data", ".video-pipeline-checkpoint.json")

MANIM_ENV = "/home/ubuntu/manim-env/bin/python"
MANIM_SCRIPT = os.path.join(PROJECT_DIR, "scripts", "generic_scene.py")
MANIM_QUALITY = "m"  # m=720p30, l=480p15, h=1080p60

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(CHECKPOINT_FILE), exist_ok=True)


# ═══════════════════════════════════════════════════════════════════
# 1. Database
# ═══════════════════════════════════════════════════════════════════

def db(sql):
    r = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "ai_private_tutor",
                        "-t", "-A", "-c", sql],
                       capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise RuntimeError(f"DB query failed: {r.stderr[:500] or r.stdout[:500]}")
    return [l for l in r.stdout.strip().split("\n") if l.strip()]


def get_topic_groups():
    lines = db("""
        SELECT json_build_object(
          'subject', subject,
          'topic', topic,
          'count', COUNT(*),
          'has_slides', COUNT(*) FILTER (WHERE metadata->>'slide_sibi' IS NOT NULL
                           AND LENGTH(metadata->>'slide_sibi') > 50)
        )::text
        FROM "Material"
        WHERE metadata->>'slide_sibi' IS NOT NULL
          AND LENGTH(metadata->>'slide_sibi') > 50
        GROUP BY subject, topic
        ORDER BY COUNT(*) DESC;
    """)
    groups = []
    for line in lines:
        try:
            obj = json.loads(line)
            groups.append({"subject": obj["subject"], "topic": obj["topic"],
                           "count": obj["count"], "has_slides": obj["has_slides"]})
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  ⚠️ Failed to parse JSON: {e}")
    return groups


def get_slides_for_topic(subject, topic):
    safe_s = subject.replace("'", "''")
    safe_t = topic.replace("'", "''")
    lines = db(f"""
        SELECT json_build_object(
          'id', id,
          'subTopic', "subTopic",
          'content', metadata->>'slide_sibi',
          'curriculumId', "curriculumId"
        )::text
        FROM "Material"
        WHERE subject = '{safe_s}' AND topic = '{safe_t}'
          AND metadata->>'slide_sibi' IS NOT NULL
          AND LENGTH(metadata->>'slide_sibi') > 50
        ORDER BY "weekOrder", "subTopic";
    """)
    mats = []
    for line in lines:
        try:
            obj = json.loads(line)
            mats.append({"id": obj["id"], "subTopic": obj.get("subTopic", ""),
                         "content": obj.get("content", ""), "curriculumId": obj.get("curriculumId", "")})
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  ⚠️ Failed to parse JSON: {e}")
    return mats


def has_existing_video(material_ids):
    # Check for our own generated videos (stored in metadata->>generatedVideoUrl)
    ids = ", ".join(f"'{i}'" for i in material_ids)
    lines = db(f"""
        SELECT COUNT(*) FROM "Material"
        WHERE id IN ({ids}) AND metadata->>'generatedVideoUrl' LIKE '/videos/%';
    """)
    return lines and int(lines[0]) > 0


def update_video_url(material_ids, rel_path):
    safe = rel_path.replace("'", "''")
    ids = ", ".join(f"'{i}'" for i in material_ids)
    db(f"""
        UPDATE "Material" SET
          metadata = jsonb_set(COALESCE(metadata, '{{}}'::jsonb),
                               '{{generatedVideoUrl}}', '"{safe}"'::jsonb, true),
          "updatedAt" = NOW()
        WHERE id IN ({ids})
          AND (metadata IS NULL
               OR metadata->>'generatedVideoUrl' IS NULL
               OR metadata->>'generatedVideoUrl' != '{safe}');
    """)
    print(f"      ✅ DB updated for {len(material_ids)} materials")


# ═══════════════════════════════════════════════════════════════════
# 2. Slide parsing
# ═══════════════════════════════════════════════════════════════════

def parse_slides_to_json(content):
    """Parse slide_sibi markdown (--- separated) into structured slides.
    Returns {"slides": [{"heading":..., "bullets":[...], "body":...}, ...]}
    """
    raw_slides = [s.strip() for s in content.split("\n---\n") if s.strip()]
    slides = []
    for raw in raw_slides:
        lines = [l.rstrip() for l in raw.split("\n") if l.strip()]
        heading = ""
        bullets = []
        body_lines = []
        for line in lines:
            if re.match(r'^#{1,3}\s', line):
                heading = re.sub(r'^#+\s*', '', line).strip()
            elif line.startswith("- ") or line.startswith("* "):
                bullets.append(line[2:].strip())
            elif "|" in line and ("---" in line or line.startswith("|")):
                continue  # table formatting
            else:
                body_lines.append(line)
        body = " ".join(body_lines).strip() if not bullets else ""
        slides.append({"heading": heading, "bullets": bullets, "body": body})
    return {"slides": slides}


def safe_name(s):
    return re.sub(r'[^a-zA-Z0-9_]', '', s)[:60] or "video"


def extract_narration(slide):
    """Plain text for TTS from structured slide."""
    parts = []
    if slide.get("heading"):
        parts.append(slide["heading"])
    if slide.get("bullets"):
        parts.append(". ".join(slide["bullets"]))
    if slide.get("body"):
        parts.append(slide["body"])
    text = " ".join(parts)
    text = re.sub(r'\*\*', '', text)
    # Remove table formatting artifacts
    text = re.sub(r'\|.*?\|', '', text)
    text = re.sub(r'[-:]{3,}', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    # Skip pure-punctuation/separator text
    if not text or re.match(r'^[\s\-:|,;.]+$', text):
        return ""
    if len(text) > 350:
        text = text[:347] + "..."
    return text


# ═══════════════════════════════════════════════════════════════════
# 3. Core pipeline
# ═══════════════════════════════════════════════════════════════════

def generate_tts(segments, work_dir):
    """Generate edge-tts for each slide. Returns [(path, duration, label)]."""
    os.makedirs(work_dir, exist_ok=True)
    results = []
    for i, (label, text) in enumerate(segments):
        if not text.strip():
            continue
        ap = os.path.join(work_dir, f"seg_{i:03d}.mp3")
        try:
            subprocess.run(["edge-tts", "--voice", "id-ID-ArdiNeural",
                            "--text", text.strip(), "--write-media", ap],
                           check=True, capture_output=True, timeout=60)
            r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                "format=duration", "-of", "csv=p=0", ap],
                               capture_output=True, text=True, timeout=10)
            dur = float(r.stdout.strip())
            results.append((ap, dur, label))
        except Exception as e:
            print(f"      ⚠️ TTS {label}: {e}")
    return results


def pick_bgm(work_dir, duration_sec):
    tracks = []
    if os.path.exists(MUSIC_MANIFEST):
        with open(MUSIC_MANIFEST) as f:
            manifest = json.load(f)
            tracks = [t for t in manifest if os.path.exists(t.get("path", ""))]
    else:
        for fname in sorted(os.listdir(MUSIC_DIR)):
            if fname.endswith(".mp3"):
                tracks.append({"path": os.path.join(MUSIC_DIR, fname), "title": fname})
    if not tracks:
        return None
    chosen = random.choice(tracks)
    print(f"      🎵 BGM: {chosen.get('title', os.path.basename(chosen['path']))}")
    target = os.path.join(work_dir, "_bgm.mp3")
    subprocess.run([
        "ffmpeg", "-y", "-i", chosen["path"],
        "-af", f"volume=0.8,aloop=loop=-1:size=441000,atrim=end={duration_sec:.1f}",
        "-t", str(duration_sec),
        "-c:a", "libmp3lame", "-q:a", "2", target
    ], check=True, capture_output=True, timeout=120)
    return target


def merge_final(video_path, audio_segs, bgm_path, output_path):
    if not audio_segs:
        subprocess.run(["cp", video_path, output_path], check=True)
        return output_path

    concat = os.path.join(os.path.dirname(output_path), "_narasi.mp3")
    if len(audio_segs) == 1:
        concat = audio_segs[0][0]
    else:
        lst = os.path.join(os.path.dirname(output_path), "_audio_list.txt")
        with open(lst, "w") as f:
            for ap, _, _ in audio_segs:
                f.write(f"file '{os.path.abspath(ap)}'\n")
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                        "-i", lst, "-c", "copy", concat],
                       check=True, capture_output=True, timeout=60)

    nar_dur = sum(d for _, d, _ in audio_segs)
    r2 = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                         "format=duration", "-of", "csv=p=0", video_path],
                        capture_output=True, text=True, timeout=10)
    vid_dur = float(r2.stdout.strip())

    # Trim narration to video duration to avoid tpad re-encode
    if nar_dur > vid_dur:
        trimmed = concat.replace(".mp3", "_trimmed.mp3")
        subprocess.run(["ffmpeg", "-y", "-i", concat, "-t", f"{vid_dur:.1f}",
                        "-c", "copy", trimmed],
                       check=True, capture_output=True, timeout=60)
        concat = trimmed

    if bgm_path and os.path.exists(bgm_path):
        fc = (f"[2:a]volume=0.8,aloop=loop=-1:size=441000,atrim=end={vid_dur:.1f}[bgm];"
              f"[1:a][bgm]amix=inputs=2:duration=first:weights=1 0.3[a]")
        subprocess.run(["ffmpeg", "-y", "-i", video_path, "-i", concat, "-i", bgm_path,
                        "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
                        "-shortest", output_path],
                       check=True, capture_output=True, timeout=600)
    else:
        subprocess.run(["ffmpeg", "-y", "-i", video_path, "-i", concat,
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
                        "-map", "0:v:0", "-map", "1:a:0", "-shortest", output_path],
                       check=True, capture_output=True, timeout=180)
    return output_path


def process_topic(subject, topic):
    key = f"{subject}|{topic}"
    print(f"\n{'='*60}")
    print(f"  {key}")
    print(f"{'='*60}")

    mats = get_slides_for_topic(subject, topic)
    if not mats:
        print(f"  ❌ No content found, skipping")
        return True

    mids = [m["id"] for m in mats]
    if has_existing_video(mids):
        print(f"  ⏭️ Already has video")
        return True

    # Parse all slide_sibi into one structured content
    all_content = "\n---\n".join([m["content"] for m in mats])
    scene_data = parse_slides_to_json(all_content)
    scene_data["subject"] = subject
    scene_data["topic"] = topic

    if not scene_data["slides"]:
        print(f"  ❌ No parsed slides")

    print(f"  📊 {len(mats)} subtopics, {len(scene_data['slides'])} slides")

    # Write scene JSON
    work_dir = os.path.join(PROJECT_DIR, "tmp", "vid", safe_name(f"{subject}_{topic}"))
    os.makedirs(work_dir, exist_ok=True)
    data_path = os.path.join(work_dir, "scene_data.json")
    with open(data_path, "w") as f:
        json.dump(scene_data, f)

    # Render
    print(f"  🎞️ Rendering Manim ({len(scene_data['slides'])} slides)...")
    env = os.environ.copy()
    env["SCENE_DATA"] = data_path
    result = subprocess.run(
        [MANIM_ENV, "-m", "manim", MANIM_SCRIPT, "GenericLesson",
         "-q", "m", "--media_dir", work_dir, "--format=mp4", "--progress_bar=none"],
        capture_output=True, text=True, timeout=1800, env=env
    )
    if result.returncode != 0:
        err = result.stderr[-500:] if result.stderr else result.stdout[-500:]
        print(f"  ❌ Render failed: {err[:500]}")
        return False

    # Manim 0.20.1: output dir is based on script filename (generic_scene), not class name
    # Path: {work_dir}/videos/generic_scene/720p30/GenericLesson.mp4
    render_dir = os.path.join(work_dir, "videos", "generic_scene", "720p30")
    vid_src = None
    if os.path.exists(render_dir):
        files = sorted([f for f in os.listdir(render_dir) if f.endswith(".mp4")])
        if files:
            vid_src = os.path.join(render_dir, files[-1])
    if not vid_src or not os.path.exists(vid_src):
        # Fallback: check PROJECT_DIR media
        fallback = os.path.join(PROJECT_DIR, "media", "videos", "generic_scene", "720p30", "GenericLesson.mp4")
        if os.path.exists(fallback):
            vid_src = fallback
        else:
            print(f"  ❌ Render output not found (searched {render_dir} and {fallback})")
            if result.stdout:
                print(f"     stdout: {result.stdout[:300]}")
            return False

    print(f"      ✅ Rendered: {os.path.basename(vid_src)} ({os.path.getsize(vid_src)//1024}KB)")

    # TTS
    nar_segs = []
    for si, slide in enumerate(scene_data["slides"]):
        text = extract_narration(slide)
        if text.strip():
            nar_segs.append((f"s{si}", text))
    print(f"  🎙️ TTS: {len(nar_segs)} segments...")
    tts_res = generate_tts(nar_segs, work_dir)
    if not tts_res:
        print(f"      ⚠️ No TTS generated, using video-only")

    # BGM
    total_dur = sum(d for _, d, _ in tts_res) if tts_res else 30.0
    bgm = pick_bgm(work_dir, total_dur)

    # Merge
    out_name = safe_name(f"{subject}_{topic}") + ".mp4"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    print(f"  🎬 Merging final...")
    merge_final(vid_src, tts_res, bgm, out_path)

    if not os.path.exists(out_path):
        print(f"  ❌ Merge failed")
        return False

    print(f"      ✅ Final: {out_name} ({os.path.getsize(out_path)//1024}KB)")

    # DB update
    update_video_url(mids, f"/videos/{out_name}")

    # Clean up work dir
    if os.path.exists(work_dir):
        import shutil
        shutil.rmtree(work_dir, ignore_errors=True)

    return True


# ═══════════════════════════════════════════════════════════════════
# 4. Main
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", help="Subject|Topic")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    if args.topic:
        parts = args.topic.split("|", 1)
        if len(parts) != 2:
            print("❌ Use --topic 'Subject|Topic'")
            sys.exit(1)
        groups = [{"subject": parts[0], "topic": parts[1]}]
    else:
        groups = get_topic_groups()
        print(f"📊 {len(groups)} topic groups available")

        if args.resume:
            cp = json.load(open(CHECKPOINT_FILE)) if os.path.exists(CHECKPOINT_FILE) else {"completed": []}
            done = set(cp.get("completed", []))
            groups = [g for g in groups if f"{g['subject']}|{g['topic']}" not in done]
            print(f"   Resume: {len(groups)} remaining")
        elif not args.all:
            print("   Use --all, --topic, or --resume")
            sys.exit(0)

    done = set()
    if os.path.exists(CHECKPOINT_FILE):
        done = set(json.load(open(CHECKPOINT_FILE)).get("completed", []))

    ok_cnt = 0
    fail_cnt = 0

    for g in groups:
        key = f"{g['subject']}|{g['topic']}"
        if key in done:
            continue
        ok = process_topic(g["subject"], g["topic"])
        if ok:
            done.add(key)
            json.dump({"completed": list(done),
                       "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S")},
                      open(CHECKPOINT_FILE, "w"))
            ok_cnt += 1
        else:
            fail_cnt += 1

        if ok:
            time.sleep(5)  # cooldown

    print(f"\n{'='*60}")
    print(f"  ✅ {ok_cnt} succeeded, ❌ {fail_cnt} failed")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
