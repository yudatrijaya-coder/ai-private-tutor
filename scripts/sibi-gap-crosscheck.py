#!/usr/bin/env python3.12
"""Cross-subject re-check of the 42 reported prosem gaps.

The coverage audit compares a prosem session against materials filed under the
same `subject` string. ProSem and the curriculum disagree on those strings, so a
session can look missing while the content sits one subject over:

  ProSem "Matematika Tingkat Lanjut" (5 rows) vs Material "Matematika" (51 rows,
  already covering Polinomial/Trigonometri/Turunan)

This scores each reported gap against *every* Material row in the student's
curriculum, regardless of subject, and reports which subject the match landed in.
A gap that matches elsewhere means the fix is a subject rename, not generation.

Read-only. Writes audit-reports/sibi-gap-crosscheck.json.
"""

import json
import re
import subprocess
import unicodedata
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
MANIFEST = BASE / "audit-reports" / "sibi-gap-manifest.json"
OUT = BASE / "audit-reports" / "sibi-gap-crosscheck.json"

EXISTS_AT = 0.75
PARTIAL_AT = 0.5

# ProSem names the subject as it appears on the Indonesian curriculum document;
# the corpus sometimes files the same course under its school name. Only these
# groups may satisfy a gap, so a hit inside them is a real cross-subject cover.
# Without this gate the scorer matched "Tata Nama Ganda" (biology binomial
# nomenclature) against "Tata Nama Senyawa" (chemistry) — two lessons that share
# two generic words and nothing else.
SUBJECT_ALIASES = [
    {"Matematika", "Matematika Tingkat Lanjut", "Matematika Penalaran"},
    {"Biologi", "IPA"},
    {"Fisika", "IPA"},
    {"IPS", "Sejarah", "Ekonomi", "Geografi", "Sosiologi"},
    {"Bahasa Indonesia"},
    {"Bahasa Inggris"},
    {"Informatika"},
    {"Kimia"},
    {"Pendidikan Pancasila", "Pendidikan Agama Islam"},
    {"PJOK"},
    {"Bahasa Mandarin"},
]


def alias_group(subject: str) -> int:
    for i, group in enumerate(SUBJECT_ALIASES):
        if subject in group:
            return i
    return -1


def psql(sql: str) -> str:
    r = subprocess.run(
        ["psql", "-h", "localhost", "-U", "tutor", "-d", "ai_private_tutor",
         "-t", "-A", "-F", "|", "-c", sql],
        capture_output=True, text=True,
        env={"PGPASSWORD": "tutor123", "PATH": "/usr/bin:/bin"},
    )
    if r.returncode:
        raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()


SUFFIXES = ("annya", "nya", "kan", "an", "i")


def toks(text: str) -> set[str]:
    """Significant stems, tolerant of Indonesian affixes and the lost `fi`."""
    text = unicodedata.normalize("NFKD", text.lower())
    out = set()
    for w in re.findall(r"[a-z]{4,}", text):
        for suf in SUFFIXES:
            if len(w) > len(suf) + 3 and w.endswith(suf):
                w = w[: -len(suf)]
                break
        w = w.replace("f", "")
        if len(w) >= 4:
            out.add(w)
    return out


def load_materials() -> dict[str, list[tuple[str, str, str]]]:
    by_cur: dict[str, list[tuple[str, str, str]]] = {}
    rows = psql('SELECT "curriculumId", subject, topic, coalesce("subTopic", \'\') '
                'FROM "Material";')
    for line in rows.splitlines():
        if not line.strip():
            continue
        parts = line.split("|")
        if len(parts) < 4:
            continue
        cid, subj, top, sub = parts[:4]
        by_cur.setdefault(cid, []).append((subj, top, sub))
    return by_cur


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())["items"]
    by_cur = load_materials()
    total_rows = sum(len(v) for v in by_cur.values())
    print(f"items={len(manifest)}  material rows={total_rows}\n")

    results = []
    for it in manifest:
        # Tokens of the lesson itself. The prosem topic is dropped on purpose:
        # it is the chapter label ("Pemahaman IPA dan Ketrampilan Proses"), which
        # matches half the book and would inflate every score.
        sig = toks(it["subTopic"]) or toks(it["topic"])

        best = (0.0, None)
        pid = alias_group(it["subject"])
        for subj, top, sub in by_cur.get(it["curriculum_id"], []):
            if alias_group(subj) != pid:
                continue
            # Score the subTopic first: a matching lesson is what closes a gap.
            # Falling back to the topic name let any row under "Turunan Fungsi"
            # inherit a score from the word "fungsi" alone.
            st = toks(it["subTopic"])
            sub_score = len(st & toks(sub)) / max(1, len(st))
            top_score = len(st & toks(top)) / max(1, len(st))
            score = sub_score if sub_score >= top_score else top_score
            if score > best[0]:
                best = (score, (subj, top, sub))

        # A gap is also closed when its own subTopic is already listed verbatim
        # somewhere in the curriculum, even if the best score landed elsewhere.
        exact = None
        for subj, top, sub in by_cur.get(it["curriculum_id"], []):
            if alias_group(subj) != pid:
                continue
            if sub.strip().lower() == it["subTopic"].strip().lower():
                exact = (subj, top, sub)
                break

        score, match = best
        if score >= EXISTS_AT:
            verdict = "EXISTS"
        elif score >= PARTIAL_AT:
            verdict = "PARTIAL"
        else:
            verdict = "GAP"

        results.append({
            "n": it["n"],
            "student": it["student"],
            "prosem_subject": it["subject"],
            "subTopic": it["subTopic"],
            "verdict": verdict,
            "score": round(score, 3),
            "matched_subject": match[0] if match else None,
            "matched_topic": match[1] if match else None,
            "matched_subTopic": match[2] if match else None,
            "cross_subject": bool(match and match[0] != it["subject"]),
            "exact_subTopic_hit": exact[0] if exact else None,
            "exact_topic_context": exact[1] if exact else None,
        })

    OUT.write_text(json.dumps({
        "generatedBy": "scripts/sibi-gap-crosscheck.py",
        "note": "Cross-subject re-check of the 42 reported prosem gaps.",
        "thresholds": {"exists": EXISTS_AT, "partial": PARTIAL_AT},
        "items": results,
    }, indent=1, ensure_ascii=False))

    for r in results:
        tag = f"{r['verdict']:7}"
        cross = "XSUB" if r["cross_subject"] else "    "
        matched = f"{r['matched_subject'][:20]:20} {str(r['matched_topic'])[:24]:24}" if r["matched_subject"] else " " * 45
        print(f"{tag} {cross} #{r['n']:2} {r['prosem_subject'][:18]:18} {r['score']:.2f} | "
              f"{r['subTopic'][:38]:38} | {matched}")

    print("\nverdicts:", dict(Counter(r["verdict"] for r in results)))
    print("cross-subject matches:", sum(1 for r in results if r["cross_subject"]))

    print("\nrow already carrying this exact subTopic:")
    for r in results:
        if r["exact_subTopic_hit"]:
            print(f"  #{r['n']:2} {r['subTopic'][:44]:44} <- {r['exact_subTopic_hit']} / "
                  f"{r['exact_topic_context']}")

    print("\nby (student, prosem_subject):")
    for key, n in Counter((r["student"], r["prosem_subject"]) for r in results).items():
        got = Counter(r["verdict"] for r in results
                      if (r["student"], r["prosem_subject"]) == key)
        print(f"  {key[0]:9} {key[1][:26]:26} n={n:<3} {dict(got)}")


if __name__ == "__main__":
    main()
