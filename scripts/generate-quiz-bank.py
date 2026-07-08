#!/usr/bin/env python3
"""
Generate quiz bank TypeScript files via 9Router LLM.
Batch by topic group (subject + topic), 5 questions per sub-topic per call.
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

# ── Config ──────────────────────────────────────────────────────────────────
API_URL = "http://localhost:20128/v1/chat/completions"
MODEL = "ai_tutor_agent"
MAX_TOKENS = 32000  # generous for large topic groups
DELAY = 0.2         # small delay between calls to avoid hammering

# ── Helpers ─────────────────────────────────────────────────────────────────

def call_llm(prompt: str, retries: int = 2) -> str:
    """Call 9Router LLM and return raw content string."""
    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": MAX_TOKENS,
    }).encode("utf-8")

    last_error = None
    raw = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                API_URL,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=600) as resp:
                raw = resp.read().decode("utf-8")
            break
        except (urllib.error.HTTPError, urllib.error.URLError, OSError) as e:
            last_error = e
            if attempt < retries:
                print(f"\n  Retry {attempt+1}/{retries} after error: {e}", flush=True)
                time.sleep(3)
            else:
                raise RuntimeError(f"LLM call failed after {retries+1} attempts: {last_error}")

    if raw is None:
        raise RuntimeError(f"LLM call failed: no response (last error: {last_error})")

    # Strip streaming suffix
    if "data: [DONE]" in raw:
        raw = raw[: raw.index("data: [DONE]")]

    data = json.loads(raw)
    choice = data["choices"][0]
    content = choice["message"].get("content", "").strip()

    if not content:
        raise RuntimeError(
            f"Empty content from LLM (reason: {choice.get('finish_reason')})"
        )

    return content


def extract_json(text: str) -> list:
    """Extract JSON array from LLM response, handling ```json fences."""
    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())

    # Find the first `[` and last `]`
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON array found in response:\n{text[:500]}")

    text = text[start : end + 1]

    # Parse
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        # Try fixing common issues: trailing commas
        text = re.sub(r",\s*\]", "]", text)
        text = re.sub(r",\s*\}", "}", text)
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            raise ValueError(
                f"JSON parse error: {e}\nRaw:\n{text[:1000]}"
            )

    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array, got {type(data).__name__}")

    return data


def normalize_question(q: dict) -> dict:
    """Normalize a question dict to canonical QuestionData format."""
    question = q.get("question", q.get("Question", "")).strip()
    if not question:
        raise ValueError(f"Missing question text: {q}")

    # Options: could be array or dict
    options_raw = q.get("options", q.get("Options", []))
    if isinstance(options_raw, dict):
        # e.g. {"A": "...", "B": "...", ...}
        options = []
        for key in sorted(options_raw.keys()):
            options.append(options_raw[key])
    elif isinstance(options_raw, list):
        options = options_raw[:4]
        while len(options) < 4:
            options.append("")
    else:
        raise ValueError(f"Unexpected options format: {type(options_raw).__name__}")

    # Normalize correctIndex
    correct_index = q.get("correctIndex", q.get("correct_index", q.get("CorrectIndex")))
    if correct_index is None:
        # Try "answer" field: "A", "B", "C", "D" or "0", "1", "2", "3"
        answer = q.get("answer", q.get("Answer", ""))
        if isinstance(answer, str) and answer in ("A", "B", "C", "D"):
            correct_index = ord(answer) - ord("A")
        elif isinstance(answer, str) and answer in ("0", "1", "2", "3"):
            correct_index = int(answer)
        elif isinstance(answer, int) and 0 <= answer <= 3:
            correct_index = answer
        else:
            # Default to 0 if we can't determine
            correct_index = 0

    correct_index = int(correct_index)
    if correct_index < 0 or correct_index > 3:
        correct_index = 0

    difficulty = q.get(
        "difficulty", q.get("Difficulty", "medium")
    )
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    explanation = q.get(
        "explanation",
        q.get("Explanation", q.get("penjelasan", "")),
    ).strip()

    return {
        "question": question,
        "options": options,
        "correctIndex": correct_index,
        "difficulty": difficulty,
        "explanation": explanation,
    }


def build_batch_prompt(subject: str, topic: str, sub_topics: list[str]) -> str:
    """Build a prompt for generating questions for a topic group."""
    sub_count = len(sub_topics)
    total_questions = sub_count * 5

    sub_list = "\n".join(f"  {i+1}. \"{st}\"" for i, st in enumerate(sub_topics))

    return f"""Buat tepat {total_questions} soal pilihan ganda untuk kurikulum Merdeka SMP Kelas 7.

Mata Pelajaran: {subject}
Bab (Topic): {topic}
Sub-topik yang harus dicakup ({sub_count} sub-topik, @5 soal = {total_questions} soal):
{sub_list}

ATURAN:
- Setiap sub-topik dapat 5 soal.
- Urutkan soal per sub-topik: 5 soal pertama untuk sub-topik pertama, 5 berikutnya untuk sub-topik kedua, dst.
- Soal dalam Bahasa Indonesia.
- 4 pilihan jawaban (A, B, C, D).
- Satu jawaban benar per soal.
- Variasi kesulitan: easy, medium, hard (sekitar 2 easy, 2 medium, 1 hard per sub-topik).
- Sertakan explanation (penjelasan) singkat dalam Bahasa Indonesia.

Output HANYA JSON array, tanpa teks lain, tanpa markdown fence.
Setiap objek: {{"question":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"easy|medium|hard","explanation":"..."}}

Contoh:
[
  {{"question":"Apa yang dimaksud dengan ilmu sains?","options":["Ilmu tentang alam","Ilmu tentang sosial","Ilmu tentang bahasa","Ilmu tentang seni"],"correctIndex":0,"difficulty":"easy","explanation":"Ilmu sains adalah ilmu yang mempelajari tentang alam dan fenomenanya."}}
]
"""


def parse_curriculum_file(filepath: str) -> list[dict]:
    """Parse curriculum-topics-*.ts file with regex."""
    with open(filepath, "r") as f:
        content = f.read()

    # Find all entries: { subject: "...", topic: "...", subTopic: "...", ... }
    pattern = r"""\{\s*(?:subject|Subject)\s*:\s*["']([^"']+)["']\s*,\s*(?:topic|Topic)\s*:\s*["']([^"']+)["']\s*,\s*(?:subTopic|sub_topic|SubTopic)\s*:\s*["']([^"']+)["']"""
    matches = re.findall(pattern, content)

    if not matches:
        print(f"ERROR: Could not parse any entries from {filepath}", file=sys.stderr)
        print(f"Trying alternate pattern...", file=sys.stderr)
        # Try more flexible pattern
        lines = content.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("//") or line.startswith("/*") or line.startswith("*") or line.startswith("import") or line.startswith("export"):
                continue
            print(f"  LINE: {line[:100]}", file=sys.stderr)

    entries = []
    for s, t, st in matches:
        entries.append({"subject": s, "topic": t, "subTopic": st})

    return entries


def group_by_topic(entries: list[dict]) -> list[dict]:
    """Group entries by subject+topic."""
    groups = {}
    for e in entries:
        key = f"{e['subject']}||{e['topic']}"
        if key not in groups:
            groups[key] = {
                "subject": e["subject"],
                "topic": e["topic"],
                "sub_topics": [],
            }
        groups[key]["sub_topics"].append(e["subTopic"])

    # Convert to list, preserving curriculum order
    ordered = []
    seen = set()
    for e in entries:
        key = f"{e['subject']}||{e['topic']}"
        if key not in seen:
            seen.add(key)
            ordered.append(groups[key])

    return ordered


def generate_questions_for_group(
    subject: str, topic: str, sub_topics: list[str]
) -> dict[str, list[dict]]:
    """Generate questions for a topic group. Returns {subTopic: [questions]}."""
    prompt = build_batch_prompt(subject, topic, sub_topics)
    print(f"  Calling LLM for {subject} > {topic} ({len(sub_topics)} sub-topics)...", end=" ", flush=True)

    raw = call_llm(prompt)
    questions = extract_json(raw)

    # Normalize
    normalized = [normalize_question(q) for q in questions]

    expected = len(sub_topics) * 5
    if len(normalized) != expected:
        print(f"\n  WARNING: Expected {expected} questions, got {len(normalized)}", file=sys.stderr)

    # Split by sub-topic (5 questions each)
    result = {}
    for i, st in enumerate(sub_topics):
        start = i * 5
        result[st] = normalized[start : start + 5]

    print(f"✓ ({len(normalized)} questions)")
    return result


def escape_ts(s: str) -> str:
    """Escape a string for TypeScript single-line string."""
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    s = s.replace("\n", "\\n")
    return s


def questions_to_ts(questions: list[dict]) -> str:
    """Convert a list of question dicts to TypeScript array literal."""
    parts = []
    for q in questions:
        question = escape_ts(q["question"])
        options = ", ".join(f'"{escape_ts(o)}"' for o in q["options"])
        idx = q["correctIndex"]
        diff = q["difficulty"]
        expl = escape_ts(q["explanation"])
        parts.append(
            f'    {{ question: "{question}", options: [{options}], correctIndex: {idx}, difficulty: "{diff}", explanation: "{expl}" }}'
        )
    return "[\n" + ",\n".join(parts) + "\n  ]"


def generate_file(
    curriculum_path: str, output_path: str, grade_label: str,
    total_sub_topics: int, total_questions: int,
    checkpoint_path: str | None = None,
    resume: bool = False
):
    """Main generator for one grade level."""
    print(f"\n{'='*60}")
    print(f"Generating {output_path}")
    print(f"Grade: {grade_label}, {total_sub_topics} sub-topics, {total_questions} questions")
    print(f"{'='*60}")

    if checkpoint_path is None:
        checkpoint_path = output_path + ".checkpoint.json"

    # Parse curriculum
    entries = parse_curriculum_file(curriculum_path)
    print(f"Parsed {len(entries)} sub-topics from curriculum file")

    if len(entries) != total_sub_topics:
        print(f"WARNING: Expected {total_sub_topics} sub-topics, found {len(entries)}", file=sys.stderr)

    # Group by topic
    groups = group_by_topic(entries)
    print(f"Grouped into {len(groups)} topic groups")

    # Load checkpoint if resuming
    quiz_map = {}
    start_group = 0
    if resume and os.path.exists(checkpoint_path):
        with open(checkpoint_path, "r") as f:
            checkpoint = json.load(f)
        quiz_map = checkpoint.get("quiz_map", {})
        start_group = checkpoint.get("completed_groups", 0)
        print(f"Resuming from checkpoint: {start_group}/{len(groups)} groups completed")

    # Generate all questions
    total_generated = sum(len(q) for q in quiz_map.values())

    for i, group in enumerate(groups):
        if i < start_group:
            continue

        subject = group["subject"]
        topic = group["topic"]
        sub_topics = group["sub_topics"]

        print(f"\nGroup {i+1}/{len(groups)}: {subject} > {topic} ({len(sub_topics)} sub-topics)")

        try:
            result = generate_questions_for_group(subject, topic, sub_topics)
            for st, questions in result.items():
                key = f"{subject}||{topic}||{st}"
                quiz_map[key] = questions
                total_generated += len(questions)

            # Save checkpoint after each successful group
            checkpoint = {
                "completed_groups": i + 1,
                "total_groups": len(groups),
                "quiz_map": quiz_map,
                "total_generated": total_generated,
            }
            with open(checkpoint_path, "w") as f:
                json.dump(checkpoint, f, indent=2)

            # Small delay
            if i < len(groups) - 1:
                time.sleep(DELAY)

        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr, flush=True)
            print(f"  Marking sub-topics as empty and continuing...", file=sys.stderr, flush=True)
            for st in sub_topics:
                key = f"{subject}||{topic}||{st}"
                quiz_map[key] = []
                total_generated += 0

    print(f"\nGenerated {total_generated} questions total")

    # Build TypeScript output
    ts_lines = []
    ts_lines.append("// ═══════════════════════════════════════════════════════════════════")
    ts_lines.append(f"//  Auto-generated Quiz Bank — {grade_label}")
    ts_lines.append(f"//  {total_sub_topics} entries × 5 avg questions each")
    ts_lines.append(f"//  Total questions: {total_questions}")
    ts_lines.append(f'//  Generated: {time.strftime("%Y-%m-%dT%H:%M:%S")}Z')
    ts_lines.append("//  Source: curriculum-topics-smp7.ts + 9Router LLM (ai_tutor_agent)")
    ts_lines.append("// ═══════════════════════════════════════════════════════════════════")
    ts_lines.append("import type { QuestionData } from '@/agents/assessment/types';")
    ts_lines.append("")
    ts_lines.append("export function quizKey(subject: string, topic: string, subTopic: string): string {")
    ts_lines.append("  return `${subject}||${topic}||${subTopic}`;")
    ts_lines.append("}")
    ts_lines.append("")
    ts_lines.append("const QUIZ_MAP: Record<string, QuestionData[]> = {")

    for group in groups:
        subject = group["subject"]
        topic = group["topic"]
        sub_topics = group["sub_topics"]

        ts_lines.append("")
        ts_lines.append(f"  // ── {subject} › {topic} — {len(sub_topics)} sub-topics ──")
        ts_lines.append("")

        for st in sub_topics:
            key = f"{subject}||{topic}||{st}"
            questions = quiz_map.get(key, [])
            ts_lines.append(f"  [quizKey('{subject}', '{topic}', '{st}')]: {questions_to_ts(questions)},")
            ts_lines.append("")

    ts_lines.append("};")
    ts_lines.append("")
    ts_lines.append("export function getQuiz(subject: string, topic: string, subTopic: string): QuestionData[] {")
    ts_lines.append("  return QUIZ_MAP[quizKey(subject, topic, subTopic)] || [];")
    ts_lines.append("}")
    ts_lines.append("")
    ts_lines.append("export function getAllQuizzes(): Record<string, QuestionData[]> {")
    ts_lines.append("  return QUIZ_MAP;")
    ts_lines.append("}")
    ts_lines.append("")

    # Write file
    content = "\n".join(ts_lines)
    with open(output_path, "w") as f:
        f.write(content)

    print(f"\nWritten: {output_path} ({len(content)} bytes)")


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    resume = "--resume" in sys.argv

    base = os.path.expanduser("~/ai-private-tutor")

    # Generate SMP7
    generate_file(
        curriculum_path=f"{base}/src/data/curriculum-topics-smp7.ts",
        output_path=f"{base}/src/data/quiz-bank-smp7.ts",
        grade_label="SMP Kelas 7",
        total_sub_topics=99,  # from the curriculum file
        total_questions=495,
        resume=resume,
    )
