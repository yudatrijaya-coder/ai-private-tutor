
import asyncio
import json
import re
from hermes_tools import read_file, web_extract

async def parse_youtube_file(path):
    content = (await read_file(path=path))["content"]
    
    # This is a simplified parser. It might not handle all edge cases,
    # but it should be good enough for the current file structure.
    # It looks for objects with 'title', 'url', 'channel', and 'topic' fields.
    
    # A more robust solution would use a TypeScript parser, but that's too complex for this context.
    
    # Regex to find the arrays
    recommendations_match = re.search(r"export const YOUTUBE_RECOMMENDATIONS: YouTubeResource\[\] = (\[.*?\]);", content, re.DOTALL)
    smp7_match = re.search(r"export const YOUTUBE_SMP7: YouTubeResource\[\] = (\[.*?\]);", content, re.DOTALL)
    sma11_match = re.search(r"export const YOUTUBE_SMA11: YouTubeResource\[\] = (\[.*?\]);", content, re.DOTALL)

    all_videos = []
    
    def extract_videos(array_content, grade):
        if not array_content:
            return []
            
        videos = []
        # Regex to find individual video objects
        object_matches = re.finditer(r"\{\s*title:.*?url:.*?,.*?topic:.*?\s*\}", array_content, re.DOTALL)
        
        for match in object_matches:
            obj_text = match.group(0)
            try:
                title_match = re.search(r"title:\s*\"(.*?)\"", obj_text)
                url_match = re.search(r"url:\s*\"(.*?)\"", obj_text)
                topic_match = re.search(r"topic:\s*\"(.*?)\"", obj_text)
                
                if url_match and topic_match:
                    videos.append({
                        "url": url_match.group(1),
                        "topic": topic_match.group(1),
                        "grade": grade,
                        "title_in_file": title_match.group(1) if title_match else "N/A"
                    })
            except Exception as e:
                print(f"Error parsing object: {obj_text[:100]}... -> {e}")
        return videos

    if recommendations_match:
        all_videos.extend(extract_videos(recommendations_match.group(1), "SD_5"))
    if smp7_match:
        all_videos.extend(extract_videos(smp7_match.group(1), "SMP_7"))
    if sma11_match:
        all_videos.extend(extract_videos(sma11_match.group(1), "SMA_11"))
        
    return all_videos

async def audit_youtube_links():
    files_to_check = [
        "~/ai-private-tutor/src/data/youtube.ts",
        "~/ai-private-tutor/src/data/youtube-smp7.ts",
        "~/ai-private-tutor/src/data/youtube-sma11.ts",
    ]

    all_videos = []
    for file_path in files_to_check:
        try:
            videos = await parse_youtube_file(file_path)
            all_videos.extend(videos)
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")

    # Deduplicate videos based on URL
    unique_videos = {video['url']: video for video in all_videos}.values()
    
    total_links = len(unique_videos)
    mismatches = []
    dead_links = []
    checked_count = 0

    print(f"Found {total_links} unique video links to audit.")

    urls_to_extract = [video["url"] for video in unique_videos]
    
    # Batch extract URLs
    try:
        extraction_results = await web_extract(urls=urls_to_extract)
    except Exception as e:
        print(f"Failed to extract from all URLs: {e}")
        # Create a fallback empty result for each URL if the whole batch fails
        extraction_results = {"results": [{"url": url, "title": "Extraction Failed", "content": "", "error": str(e)} for url in urls_to_extract]}


    results_map = {result.get("url"): result for result in extraction_results.get("results", [])}

    for video in unique_videos:
        checked_count += 1
        url = video["url"]
        expected_topic = video["topic"].lower()
        
        result = results_map.get(url)

        if not result or result.get("error"):
            dead_links.append({"url": url, "topic": video['topic'], "reason": result.get("error", "No response from web_extract")})
            continue

        video_title = result.get("title", "").lower()
        video_content = result.get("content", "").lower()

        # Simple validation: check if the expected topic is mentioned in the title or content.
        # This is a basic heuristic. A more advanced check might involve NLP/embeddings.
        # Also check for common subject names.
        
        # Split topic into words for more flexible matching
        topic_words = set(expected_topic.split())
        
        # Check if at least one significant word from the topic is in the title.
        found_in_title = any(word in video_title for word in topic_words if len(word) > 3)
        
        # A broader check in the content if not found in title.
        found_in_content = any(word in video_content for word in topic_words if len(word) > 3)

        if not (found_in_title or found_in_content):
            # To reduce false positives, let's do another check.
            # If the video title in the source file is very different from the fetched title,
            # it might be a stale link that now points to a different video.
            
            # This is a bit lenient. A stricter check would be needed for higher accuracy.
            # For now, if the topic isn't in the metadata, we flag it.
            mismatches.append({
                "url": url,
                "grade": video["grade"],
                "expected_topic": video["topic"],
                "file_title": video["title_in_file"],
                "actual_title": result.get("title", "N/A"),
                "reason": "Topic keywords not found in video title or description."
            })

    report = {
        "summary": {
            "total_links_checked": checked_count,
            "potential_mismatches_found": len(mismatches),
            "dead_or_failed_links": len(dead_links),
        },
        "mismatches": mismatches,
        "dead_links": dead_links,
    }

    print("--- YouTube Link Audit Report ---")
    print(json.dumps(report, indent=2))
    
    # Save the report
    from hermes_tools import write_file
    await write_file("youtube-audit-report.json", json.dumps(report, indent=2))


if __name__ == "__main__":
    asyncio.run(audit_youtube_links())
