/**
 * Slide-content validation and resolution (ledger B-02).
 *
 * Why this module exists
 * ----------------------
 * `metadata.slide_sibi` is written by the SIBI generation scripts
 * (`scripts/sibi-generate-slides.py`, `scripts/sibi-match-and-generate.py`).
 * Those scripts strip ``` fences but never check that the model actually
 * returned slides. When the model emitted a chain-of-thought dump instead, the
 * reasoning text was persisted verbatim:
 *
 *   "Thinking. 1.  **Analyze the Request:**
 *        *   Goal: Generate 3-5 markdown slides in Bahasa Indonesia.
 *        *   Constraint: Return slide markdown only.
 *    ...
 *    *Slide 3: ...*"
 *
 * 257 of 1426 rows (18%) were contaminated this way. Because the display path
 * used `metadata?.slide_sibi ?? metadata?.slide`, a non-null garbage value
 * short-circuited the fallback and the reasoning dump was rendered to students.
 *
 * This module is the single place that decides whether a candidate is usable
 * slide content. It is intentionally dependency-free so it can run in the
 * Next.js server, in Edge middleware, and in plain `tsx` scripts.
 */

/** Below this length a candidate cannot carry a meaningful slide deck. */
export const MIN_USABLE_SLIDE_LENGTH = 120;

/**
 * Markers that are conclusive on their own. These phrases do not occur in real
 * Indonesian teaching slides — they only appear when the model's deliberation
 * was captured verbatim.
 */
const CONCLUSIVE_MARKERS: RegExp[] = [
  /analy[sz]e the request/i,
  /deconstruct the (?:topic|request)/i,
  /identify the goal/i,
  /\bthe user wants\b/i,
  /\bI (?:need|will|should|must) to (?:generate|extract|create|write|analy[sz]e|identify|produce)\b/i,
  /^\s*<think>/i,
  /^\s*thinking\.?\s*$/im,
  /\blet me (?:think|analy[sz]e|break|identify|extract|determine|outline|draft|plan)\b/i,
  /\bI(?:'ll| will) (?:now )?(?:draft|write|create|generate) the slides?\b/i,
  /\b(?:draft|internal) reasoning\b/i,

  // ── Second marker family, found 2026-09-11 (Matematika Penalaran) ────────
  // The first family keyed on the model *narrating* its plan ("Analyze the
  // Request"). These rows instead leaked the model *restating the brief* as a
  // bulleted spec, then the real outline after it. None of the phrases below
  // occur in Indonesian teaching material, so each is conclusive on its own.
  /\btarget audience\b/i, // was weak+colon; "Target Audience & Context:*" slipped past
  /\bcreate a mindmap outline\b/i,
  /\blet'?s brainstorm\b/i,
  /\blet'?s structure\b/i,
  /\bmax levels?\s*:/i,
  /\bdepth\s*:\s*\d+\s*levels?\s*maximum\b/i,
  /\blevel 1\s*\(root\)/i,
  /\bformat\s*:\s*dash-?indent\b/i,
  /\bdash-?indent\b/i,
  /\bgoal\s*:\s*create\b/i,
  /\btask\s*:\s*create\b/i,
  /\bstructure for the (?:mindmap|outline)\b/i,
  /\blevel \d\s*:\s*(?:main topic|sub-?topics?|details)\b/i,

  // ── Third marker family, found 2026-09-15 (Bahasa Indonesia / Biologi) ──
  // The model restating the task in first person plural before writing:
  // "We need to generate 3-5 markdown slides for ..." — zero overlap with
  // families 1-2. Phrases are English meta-language, impossible in real
  // Indonesian teaching slides.
  /\bwe need to (?:generate|create|produce|write|extract)\b/i,
  /\bwe must (?:generate|create|produce|write|extract)\b/i,
  /\busing (?:only )?the provided content\b/i,
  /\bthe slides should (?:be|cover|focus)\b/i,
];

/**
 * Weaker markers that are individually plausible in a legitimate prompt echo,
 * so two of them must co-occur before the text is judged contaminated.
 */
const WEAK_MARKERS: RegExp[] = [/constraint(?:s)?\s*:/i, /\bsub-?topics?\s*:/i];

/** A leading "Thinking." / "Analyzing..." preamble. */
const REASONING_PREFIX = /^\s*(?:thinking|analy[sz]ing|let me|okay|sure,? here|first,? I|<think>)/i;

/**
 * True when `text` looks like leaked model deliberation rather than slides.
 * Conservative on purpose: it keys off phrasing that does not occur in real
 * Indonesian teaching slides.
 */
export function isLlmReasoningDump(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const t = text.trim();
  if (!t) return false;

  for (const re of CONCLUSIVE_MARKERS) {
    if (re.test(t)) return true;
  }

  let weak = 0;
  for (const re of WEAK_MARKERS) {
    if (re.test(t)) {
      weak++;
      if (weak >= 2) return true;
    }
  }

  // "Thinking." preamble followed by a numbered, bolded planning heading.
  if (REASONING_PREFIX.test(t) && /^\s*\d+\.\s+\*\*/m.test(t)) return true;

  return false;
}

/** True when `text` is long enough and not a reasoning dump. */
export function isUsableSlideText(text: unknown): text is string {
  if (typeof text !== "string") return false;
  const t = text.trim();
  if (t.length < MIN_USABLE_SLIDE_LENGTH) return false;
  if (isLlmReasoningDump(t)) return false;
  return true;
}

export type SlideSource = "sibi" | "moodle" | string | null | undefined;

/**
 * Flatten any candidate (string / array / object) into searchable text.
 *
 * Mindmaps are stored as JSON arrays of `{ id, label, children }`, so the
 * detector must see the labels — not `String(array)`, which yields
 * `"[object Object]"`.
 */
export function candidateText(candidate: unknown): string {
  if (typeof candidate === "string") return candidate;
  if (candidate == null) return "";
  try {
    return JSON.stringify(candidate) ?? "";
  } catch {
    return "";
  }
}

/** Every non-empty `label` in a mindmap tree, depth-first. */
function collectLabels(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const child of node) collectLabels(child, out);
  } else if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.label === "string" && obj.label.trim()) out.push(obj.label.trim());
    if (obj.children !== undefined) collectLabels(obj.children, out);
  }
  return out;
}

/**
 * A mindmap node that reads as a *spec line* rather than subject matter.
 *
 * Anchored at the start on purpose. The second contamination family
 * (2026-09-11) leaks per node — `"Goal: Create a mind map outline."`,
 * `"Level 1: Konsep Dasar, ..."`, `"root: Pinyin dan Nada"` — but the same
 * words also occur mid-sentence in legitimate material, e.g. the topic name
 * `"Kosakata HSK 3.0 Level 1: Hanzi Dasar"`. Matching those as substrings
 * blanked real slides, so the shape has to be "label *begins* with a spec key".
 *
 * The separator is a colon only. Allowing `(` as well matched
 * `"Constraints (PRIMARY KEY, NOT NULL, UNIQUE, FOREIGN KEY)"` — a real SQL
 * syllabus topic, not a leaked spec — so parenthesised forms are handled by the
 * narrower `MINDMAP_ROOT_LABEL` below instead.
 */
const MINDMAP_META_LABEL =
  /^\s*(?:goal|task|topic|subject|format|style|levels?|level\s*\d+(?:\s*&\s*\d+)?|depth|max\s*levels?|root|target\s*audience|output\s*format)\s*:/i;

/** `"Level 0 (Root): ..."` — the same spec leak in parenthesised form. */
const MINDMAP_ROOT_LABEL = /^\s*level\s*\d+\s*\(\s*root\s*\)/i;

/** True when a single mindmap label is a leaked spec line. */
function isMetaLabel(label: string): boolean {
  return MINDMAP_META_LABEL.test(label) || MINDMAP_ROOT_LABEL.test(label);
}

/**
 * True when `candidate` is a mindmap we are willing to render.
 *
 * Validates the *serialized* tree, not just string candidates: `mindmap_sibi`
 * is a JSON array, and an earlier revision returned any non-empty array
 * unvalidated, which is how node labels reading
 * `"Thinking. 1.  **Analyze the Request:**"` reached students.
 */
export function isUsableMindmap(candidate: unknown): boolean {
  if (candidate == null) return false;
  const text = candidateText(candidate).trim();
  if (!text) return false;
  if (isMindmapContaminated(candidate)) return false;

  const labels = collectLabels(candidate);
  if (labels.length > 0) {
    // A real mindmap has at least a root plus one branch.
    if (labels.length < 2) return false;
    return true;
  }

  // No labels at all: fall back to the markdown length rule.
  return text.length >= MIN_USABLE_SLIDE_LENGTH;
}

/**
 * True when a mindmap candidate carries leaked model deliberation — either as
 * prose (family 1) or as per-node spec lines (family 2).
 *
 * Exported so remediation scripts can classify rows with the *same* predicate
 * the render path uses. Keeping a second copy in the scripts is how the first
 * B-02 pass ended up missing 67 rows.
 */
export function isMindmapContaminated(candidate: unknown): boolean {
  if (candidate == null) return false;
  const text = candidateText(candidate).trim();
  if (!text) return false;
  if (isLlmReasoningDump(text)) return true;

  const labels = collectLabels(candidate);
  if (labels.length === 0) return false;
  if (isLlmReasoningDump(labels.join("\n"))) return true;
  return labels.some((l) => isMetaLabel(l));
}

/**
 * Ordered candidate list for a given content source, mirroring the fallback
 * chain the student material API has always used — but skipping unusable
 * candidates instead of short-circuiting on a non-null garbage value.
 */
export function slideCandidates(
  metadata: Record<string, unknown> | null | undefined,
  source: SlideSource,
): unknown[] {
  const meta = metadata ?? {};
  const primary = source === "sibi" ? "slide_sibi" : source === "moodle" ? "slide_moodle" : null;
  return [
    primary ? meta[primary] : undefined,
    meta.slide,
    meta.slides,
    meta.slide_moodle,
    meta.slide_sibi,
  ];
}

/** First usable candidate, or null. */
export function resolveSlideMarkdown(
  metadata: Record<string, unknown> | null | undefined,
  source: SlideSource,
): string | null {
  for (const candidate of slideCandidates(metadata, source)) {
    // `slides` may be a structured array rather than a markdown string. It must
    // clear the same bar as a string — an unvalidated array is how garbage got
    // through before.
    if (Array.isArray(candidate)) {
      if (candidate.length > 0 && !isLlmReasoningDump(candidateText(candidate))) {
        return JSON.stringify(candidate);
      }
      continue;
    }
    if (isUsableSlideText(candidate)) return candidate.trim();
  }
  return null;
}

/** Same chain for mindmaps. */
export function resolveMindmap(
  metadata: Record<string, unknown> | null | undefined,
  source: SlideSource,
): string | null {
  const meta = metadata ?? {};
  const primary = source === "sibi" ? "mindmap_sibi" : source === "moodle" ? "mindmap_moodle" : null;
  const candidates = [primary ? meta[primary] : undefined, meta.mindmap, meta.mindmap_sibi];
  for (const candidate of candidates) {
    if (!isUsableMindmap(candidate)) continue;
    return candidateText(candidate).trim();
  }
  return null;
}
