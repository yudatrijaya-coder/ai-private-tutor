#!/usr/bin/env python3
"""
Parse youtube-smp7.ts, extract all YouTube URLs grouped by subject,
fetch transcripts using youtube_transcript_api, and save per subject.
"""

import re
import json
import os
import sys
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

TS_PATH = os.path.expanduser("~/ai-private-tutor/src/data/youtube-smp7.ts")
OUT_DIR = os.path.expanduser("~/ai-private-tutor/data-pdf-smp")

def parse_ts_file(path):
    """Parse the TypeScript file and return list of (subject, title, video_id)."""
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Map section headers to subject names
    subject_map = {
        'IPA': 'IPA',
        'BAHASA INDONESIA': 'Bahasa-Indonesia',
        'MATEMATIKA': 'Matematika',
        'IPS': 'IPS',
        'INFORMATIKA': 'Informatika',
        'PENDIDIKAN PANCASILA': 'Pendidikan-Pancasila',
        'PJOK': 'PJOK',
        'BAHASA INGGRIS': 'Bahasa-Inggris',
    }

    lines = content.split('\n')
    current_subject = None
    results = []

    for line in lines:
        # Check for subject header comments
        header_match = re.search(r'// ══════\s*(.+?)\s*══════', line)
        if header_match:
            header_name = header_match.group(1).strip()
            if header_name in subject_map:
                current_subject = subject_map[header_name]
            continue

        # Extract YouTube URL
        url_match = re.search(r'url:\s*"https://www\.youtube\.com/watch\?v=([a-zA-Z0-9_-]+)"', line)
        if url_match and current_subject:
            video_id = url_match.group(1)
            results.append((current_subject, video_id))

        # Also find title for the video
        # We'll just use the video_id as identifier since we fetch title later

    return results


def extract_titles_and_ids(path):
    """Extract full objects with titles and video IDs."""
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    subject_map = {
        'IPA': 'IPA',
        'BAHASA INDONESIA': 'Bahasa-Indonesia',
        'MATEMATIKA': 'Matematika',
        'IPS': 'IPS',
        'INFORMATIKA': 'Informatika',
        'PENDIDIKAN PANCASILA': 'Pendidikan-Pancasila',
        'PJOK': 'PJOK',
        'BAHASA INGGRIS': 'Bahasa-Inggris',
    }

    lines = content.split('\n')
    current_subject = None
    entries = []  # list of (subject, title, video_id)

    current_title = None

    for line in lines:
        # Check for subject header
        header_match = re.search(r'// ══════\s*(.+?)\s*══════', line)
        if header_match:
            header_name = header_match.group(1).strip()
            if header_name in subject_map:
                current_subject = subject_map[header_name]
            continue

        # Extract title
        title_match = re.search(r'title:\s*"(.+)"', line)
        if title_match:
            current_title = title_match.group(1)

        # Extract URL
        url_match = re.search(r'url:\s*"https://www\.youtube\.com/watch\?v=([a-zA-Z0-9_-]+)"', line)
        if url_match and current_subject and current_title:
            video_id = url_match.group(1)
            entries.append((current_subject, current_title, video_id))
            current_title = None  # reset after use

    return entries


def fetch_transcript(video_id):
    """Fetch transcript text for a video ID. Returns text or error message."""
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['id', 'en'])
        # Combine all text segments
        text = ' '.join(segment['text'] for segment in transcript_list)
        return text
    except TranscriptsDisabled:
        return None
    except NoTranscriptFound:
        return None
    except VideoUnavailable:
        return None
    except Exception as e:
        return None


def main():
    entries = extract_titles_and_ids(TS_PATH)
    
    if not entries:
        print("ERROR: No entries found. Check parsing.")
        sys.exit(1)

    # Group by subject
    by_subject = {}
    for subject, title, video_id in entries:
        by_subject.setdefault(subject, []).append((title, video_id))

    print(f"Found {len(entries)} videos across {len(by_subject)} subjects:")
    for subject, videos in sorted(by_subject.items()):
        print(f"  {subject}: {len(videos)} videos")

    # Fetch transcripts for each subject
    for subject, videos in sorted(by_subject.items()):
        output_lines = []
        success_count = 0
        fail_count = 0
        
        print(f"\n--- Processing {subject} ({len(videos)} videos) ---")
        
        for i, (title, video_id) in enumerate(videos, 1):
            print(f"  [{i}/{len(videos)}] {video_id} - {title[:60]}...", end=" ")
            sys.stdout.flush()
            
            transcript = fetch_transcript(video_id)
            if transcript:
                # Clean transcript: replace newlines, collapse whitespace
                transcript = ' '.join(transcript.split())
                output_lines.append(f"{title}: {transcript}")
                print("✓")
                success_count += 1
            else:
                print("✗ (no transcript)")
                fail_count += 1

        # Write subject file
        if output_lines:
            safe_subject = subject.replace(' ', '-').replace('/', '-')
            out_path = os.path.join(OUT_DIR, f"transcript-{safe_subject}.txt")
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write('\n\n'.join(output_lines))
            print(f"\n  → Saved {len(output_lines)} transcripts to {out_path}")
        else:
            print(f"\n  → No transcripts obtained for {subject}")

        print(f"  Result: {success_count} success, {fail_count} failed")

    print("\n=== DONE ===")


if __name__ == '__main__':
    main()
