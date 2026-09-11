#!/usr/bin/env python3.12
"""Shared output guard for the SIBI generation scripts (ledger B-02).

Why this module exists
----------------------
Every `sibi-generate-*.py` script asks a local model (9Router) for content and
writes whatever comes back straight into `metadata.*_sibi`. On 9Router the
routed reasoning models expose their **primary** output through
`reasoning_content`, so a run could return the model's plan instead of the
answer:

    1.  **Analyze the Request:**
        - Topic: Struktur Bumi
        Target audience: 7th-grade students

The scripts stored that deliberation verbatim. In production it reached 268
`slide_sibi` rows and 289 `mindmap_sibi` rows before it was found, and students
saw the model's scratchpad as lesson content.

The same marker list lives in TypeScript at
`src/lib/content/slide-content.ts` (`CONCLUSIVE_MARKERS`), which guards the
display path. This module guards the *write* path so new contamination cannot be
created in the first place. Keep the two lists in sync.

These phrases never occur in genuine Indonesian teaching material, so a single
hit is conclusive — no context needed.
"""

import re

REASONING_MARKERS = [
    r"\banalyze the request\b",
    r"\bdeconstruct the\b",
    r"\bidentify the goal\b",
    r"\btarget audience\b",
    r"\bconstraints?\s*:",
    r"\blet me (think|analyze|break)\b",
    r"\bthe user wants\b",
    r"\bi (need|will|should|must) to generate\b",
    r"\bthinking\.\s*1\.",
    r"\bstep 1:\s*(analyze|understand|identify)\b",
    # Second marker family, found 2026-09-11 (Matematika Penalaran): the model
    # restated the brief as a spec instead of narrating a plan. Mirrors
    # CONCLUSIVE_MARKERS in src/lib/content/slide-content.ts.
    r"\bcreate a mindmap outline\b",
    r"\blet'?s brainstorm\b",
    r"\blet'?s structure\b",
    r"\bmax levels?\s*:",
    r"\bdepth\s*:\s*\d+\s*levels?\s*maximum\b",
    r"\blevel 1\s*\(root\)",
    r"\bformat\s*:\s*dash-?indent\b",
    r"\bdash-?indent\b",
    r"\bgoal\s*:\s*create\b",
    r"\btask\s*:\s*create\b",
    r"\bstructure for the (?:mindmap|outline)\b",
    r"\blevel \d\s*:\s*(?:main topic|sub-?topics?|details)\b",
]

_REASONING_RE = re.compile("|".join(REASONING_MARKERS), re.IGNORECASE)


def is_reasoning_dump(text):
    """True when the model narrated its reasoning instead of producing content."""
    return bool(_REASONING_RE.search(text or ""))


def looks_like_outline(text, min_lines=2):
    """True when `text` plausibly is the indented-dash outline we asked for.

    Requires at least `min_lines` dash-led lines, so a prose paragraph or a
    single stray bullet is rejected rather than flattened into a mindmap.
    """
    if not text:
        return False
    dash_lines = [ln for ln in text.split("\n") if ln.strip().startswith(("-", "*"))]
    return len(dash_lines) >= min_lines


def looks_like_slides(text, min_chars=200):
    """True when `text` plausibly is a set of markdown slides.

    Slides are markdown, so require some structure (a heading or a list) and a
    minimum length. This rejects a bare acknowledgement such as "Sure!" or a
    one-line apology.
    """
    if not text or len(text.strip()) < min_chars:
        return False
    has_structure = re.search(r"^\s*(#{1,6}\s|[-*]\s|\d+\.\s)", text, re.MULTILINE)
    return bool(has_structure)


# Anchored spec-line shape, mirroring MINDMAP_META_LABEL in
# src/lib/content/slide-content.ts. The second contamination family leaks one
# spec line per node — "Goal: Create a mind map outline.", "Level 1: Konsep
# Dasar, ...", "root: Pinyin dan Nada" — so the rule anchors at the start of a
# line. Matching the same words as substrings produced false positives on
# legitimate material such as the topic name
# "Kosakata HSK 3.0 Level 1: Hanzi Dasar".
_META_LABEL_RE = re.compile(
    r"^\s*[-*]?\s*(?:goal|task|topic|subject|format|style|levels?"
    r"|level\s*\d+(?:\s*&\s*\d+)?|depth|max\s*levels?|root|target\s*audience"
    r"|output\s*format)\s*:",
    re.IGNORECASE | re.MULTILINE,
)

# "Level 0 (Root): ..." — same leak, parenthesised form. Kept separate because
# allowing "(" as a general separator also matched the legitimate SQL topic
# "Constraints (PRIMARY KEY, NOT NULL, UNIQUE, FOREIGN KEY)".
_ROOT_LABEL_RE = re.compile(r"^\s*[-*]?\s*level\s*\d+\s*\(\s*root\s*\)", re.IGNORECASE | re.MULTILINE)


def has_meta_label(text):
    """True when any line is a spec line rather than subject matter."""
    t = text or ""
    return bool(_META_LABEL_RE.search(t) or _ROOT_LABEL_RE.search(t))


def is_usable(text, kind):
    """Single entry point: True when `text` is safe to store as `kind`.

    `kind` is "slides" or "mindmap". Anything unrecognised is rejected, so a new
    content type cannot silently skip validation.
    """
    if is_reasoning_dump(text):
        return False
    if kind == "mindmap":
        # Spec-line labels are only conclusive for mindmaps, where a node label
        # is a short phrase. On slides the same keys are ordinary teaching
        # content — "Format: [Tahun]年[Bulan]月…" teaches date layout — so
        # applying the rule there would reject good material and force retries.
        if has_meta_label(text):
            return False
        return looks_like_outline(text)
    if kind == "slides":
        return looks_like_slides(text)
    return False
