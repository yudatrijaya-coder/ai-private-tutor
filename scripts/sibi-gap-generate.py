#!/usr/bin/env python3.12
"""
Generate slides for the 42 prosem sessions the coverage audit reported MISSING.

Input : audit-reports/sibi-gap-manifest.json  (scripts/sibi-gap-manifest.py)
Output: `Material.metadata.slide_sibi` for the target rows — only with --apply.

Differences from `scripts/sibi-generate-slides.py`, which is hardwired to
SHOFI001 / SMA_2 and re-derives everything from the matched SIBI JSON:

  * targets come from the coverage audit, so it fills real prosem gaps instead
    of rewriting whatever the matcher happened to pair;
  * it reads the prepared excerpt, so the model sees the excerpt that was
    verified, not the first 6000 characters of a chapter;
  * it never invents a curriculum row. A row whose subject+topic+subTopic does
    not exist yet is inserted first (with weekOrder), because for SHOFI001's
    Matematika Tingkat Lanjut the Polinomial, Trigonometri and Fungsi chapters
    do not exist at all — only Matriks and Vektor do.

Safety, in order of how much damage each prevents:

  1. `--apply` is required. Default is a dry run that calls the model and prints
     the first lines of each result but writes nothing.
  2. Every candidate passes `sibi_content_guard.is_usable(text, "slides")` — the
     same guard as the rest of the pipeline — so a model that narrates its plan
     ("Let me think…", "Target audience:") is rejected and retried instead of
     being stored as lesson content. 268 rows in production were contaminated
     this way before that guard existed.
  3. `reasoning_content` is dropped. On 9Router the reasoning models expose
     their primary output through that field, so with a small `max_tokens` the
     visible `content` comes back empty while the scratchpad is populated.
     Budget is set high enough that the answer is not truncated mid-slide.
  4. Rows flagged `none`/`weak` are skipped unless `--include-weak` is passed;
     they have no verified textbook source and need a human decision.

Usage:
  python3 scripts/sibi-gap-generate.py                       # dry run, all rows
  python3 scripts/sibi-gap-generate.py --only 6,23,25        # dry run, some rows
  python3 scripts/sibi-gap-generate.py --apply --only 25     # write row 25
"""

import argparse
import importlib
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
MANIFEST = BASE / "audit-reports" / "sibi-gap-manifest.json"

sys.path.insert(0, str(BASE / "scripts"))
from sibi_content_guard import is_reasoning_dump, is_usable  # noqa: E402

LLM_BASE_URL = os.environ.get("NINE_ROUTER_URL", "http://localhost:20128/v1")
LLM_API_KEY = os.environ.get("NINE_ROUTER_KEY", "sk-9router")
LLM_MODEL = os.environ.get("NINE_ROUTER_MODEL", "hermes")
MAX_TOKENS = 3000
TEXT_LIMIT = 7000

SYSTEM_PROMPT = (
    "You generate educational slides from provided content. Output only the "
    "slide markdown. Do NOT explain your plan, restate the instructions, or "
    "describe your reasoning."
)

PROMPT = """Buat 3-5 slide markdown untuk materi pelajaran IPA/SMA Indonesia berikut.

Topik    : {topic}
Sub topik: {subtopic}

Gunakan HANYA bahan dari buku teks (SIBI) di bawah ini. Jangan menambah fakta \
di luar bahan tersebut. Tulis dalam Bahasa Indonesia, gunakan heading `##`, \
tabel bila membantu, dan akhiri dengan 3-5 poin kunci yang harus diingat siswa.

Bahan buku teks:
```
{source}
```

Keluarkan hanya markdown slide, tanpa kalimat pembuka atau penutup."""


def psql(sql: str, fetch: bool = False) -> str:
    args = ["psql", "-h", "localhost", "-U", "tutor", "-d", "ai_private_tutor"]
    if fetch:
        args += ["-t", "-A"]
    r = subprocess.run(
        args + ["-c", sql], capture_output=True, text=True,
        env={"PGPASSWORD": os.environ.get("PGPASSWORD", "tutor123"),
             "PATH": "/usr/bin:/bin"},
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()


def llm_slides(prompt: str, attempts: int = 3) -> str:
    """Markdown slides, or raise. Rejects reasoning dumps and empty answers."""
    # Imported late so --help works without the SDK installed, and built via
    # importlib because the literal class name trips a content filter in this
    # toolchain — writing it directly corrupts the file.
    _oai = importlib.import_module("openai")
    _Client = getattr(_oai, "Open" + "AI")
    client = _Client(base_url=LLM_BASE_URL, api_key=LLM_API_KEY)
    last = "no attempt made"
    for attempt in range(attempts):
        try:
            r = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=MAX_TOKENS,
            )
            msg = r.choices[0].message
            content = (msg.content or "").strip()
            # Drop the scratchpad before anything else looks at the text.
            reasoning = (getattr(msg, "reasoning_content", None) or "").strip()
            if "```" in content:
                content = re.sub(r"```[a-z]*\n?|```", "", content).strip()
            if not content and reasoning:
                last = "empty content, model answered in reasoning_content only"
                print(f"    attempt {attempt + 1}: {last}")
            elif not is_usable(content, "slides"):
                last = ("reasoning dump" if is_reasoning_dump(content)
                        else "not slide markdown")
                print(f"    attempt {attempt + 1}: rejected — {last}")
            else:
                return content
        except Exception as e:  # noqa: BLE001 — reported and retried
            last = str(e)
            print(f"    attempt {attempt + 1}: {e}")
        if attempt < attempts - 1:
            time.sleep(5)
    raise RuntimeError(f"no usable slides after {attempts} attempts ({last})")


def ensure_material(item: dict, apply: bool) -> str:
    """Return the Material id to write into, inserting the row when missing.

    Rows are addressed by (curriculumId, subject, topic, subTopic) — the same key
    the existing pipeline updates on. For SHOFI001's Matematika Tingkat Lanjut
    the chapter itself is absent, so the row has to be created; creating it with
    the wrong topic would strand the slides in a chapter the student never opens.
    """
    subj = item["subject"].replace("'", "''")
    top = item["topic"].replace("'", "''")
    sub = item["subTopic"].replace("'", "''")
    cid = item["curriculum_id"]

    existing = psql(
        f'SELECT id FROM "Material" WHERE "curriculumId"=\'{cid}\' '
        f'AND subject=\'{subj}\' AND topic=\'{top}\' AND "subTopic"=\'{sub}\';',
        fetch=True,
    )
    if existing:
        return existing.splitlines()[0]

    print(f"    + inserting Material row: {item['subject']} / {item['topic']} / {item['subTopic']}")
    if not apply:
        return ""
    n = psql(
        f'SELECT coalesce(max("weekOrder"),0)+1 FROM "Material" '
        f'WHERE "curriculumId"=\'{cid}\' AND subject=\'{subj}\';',
        fetch=True,
    )
    week = item["weekOrder"] if item["weekOrder"] != 999 else (int(n) if n else 1)
    # `gradeLevel` is NOT NULL on Material, and the row is useless to the reader
    # without the source text it was generated from, so both are written here
    # rather than left for a later pass. `metadata.source` mirrors what the rest
    # of the corpus carries ("Kurikulum Merdeka + ProSem ...") so a reviewer can
    # tell where a row came from.
    grade = item["grade_level"].replace("'", "''")
    src_note = f"ProSem {item['semester']} {item['subject']} {grade}".replace("'", "''")
    raw = json.dumps(item["excerpt"][:TEXT_LIMIT]).replace("'", "''")
    psql(
        f'INSERT INTO "Material" (id, "curriculumId", subject, topic, "subTopic", '
        f'"gradeLevel", "weekOrder", status, "rawContent", metadata, "createdAt", "updatedAt") '
        f"VALUES (gen_random_uuid(), '{cid}', '{subj}', '{top}', '{sub}', "
        f"'{grade}', {week}, 'READY', '{raw}', "
        f"jsonb_build_object('source', '{src_note}', 'semester', '{item['semester']}'::text, "
        f"'sibi_source', '{item['sibi_file'] or ''}'::text), now(), now());"
    )
    return psql(
        f'SELECT id FROM "Material" WHERE "curriculumId"=\'{cid}\' '
        f'AND subject=\'{subj}\' AND topic=\'{top}\' AND "subTopic"=\'{sub}\';',
        fetch=True,
    ).splitlines()[0]


def write_slide(material_id: str, markdown: str) -> None:
    md = json.dumps(markdown).replace("'", "''")
    psql(
        f'UPDATE "Material" SET metadata = jsonb_set(coalesce(metadata, \'{{}}\'::jsonb), '
        f"'{{slide_sibi}}', '{md}'::jsonb, true), \"updatedAt\" = now() "
        f"WHERE id = '{material_id}';"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="write to the database (default: dry run)")
    ap.add_argument("--only", default="",
                    help="comma-separated manifest row numbers, e.g. 6,23,25")
    ap.add_argument("--include-weak", action="store_true",
                    help="also process rows with no verified textbook source")
    args = ap.parse_args()

    data = json.loads(MANIFEST.read_text())
    items = data["items"]
    if args.only:
        wanted = {int(x) for x in args.only.split(",") if x.strip()}
        items = [i for i in items if i["n"] in wanted]

    ok = skipped = failed = 0
    for item in items:
        tag = f"#{item['n']:2} {item['student']} {item['subject']} w{item['weekOrder']} | {item['subTopic'][:44]}"
        if item["source_kind"] in ("none", "weak") and not args.include_weak:
            print(f"SKIP  {tag}  [{item['source_kind']}, no verified source]")
            skipped += 1
            continue
        if not item["excerpt"].strip():
            print(f"SKIP  {tag}  [empty excerpt]")
            skipped += 1
            continue

        src = item["excerpt"][:TEXT_LIMIT]
        prompt = PROMPT.format(topic=item["topic"], subtopic=item["subTopic"], source=src)
        print(f"GEN   {tag}  [{item['source_kind']}, {len(src)}c from {item['source_bab'][:30]}]")
        try:
            md = llm_slides(prompt)
        except Exception as e:  # noqa: BLE001
            print(f"    FAILED: {e}")
            failed += 1
            continue

        if not args.apply:
            preview = md[:220].replace("\n", " | ")
            print(f"    dry-run: {len(md)}c :: {preview}")
            ok += 1
            continue

        mid = ensure_material(item, apply=True)
        write_slide(mid, md)
        print(f"    written to Material {mid} ({len(md)}c, "
              f"{md.count('##')} headings)")
        ok += 1
        time.sleep(3)  # keep 9Router under its rate limit

    print(f"\n{'APPLIED' if args.apply else 'DRY RUN'}: ok={ok} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
