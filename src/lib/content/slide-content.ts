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
];

/**
 * Weaker markers that are individually plausible in a legitimate prompt echo,
 * so two of them must co-occur before the text is judged contaminated.
 */
const WEAK_MARKERS: RegExp[] = [/target audience\s*:/i, /constraint(?:s)?\s*:/i];

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
  if (isLlmReasoningDump(text)) return false;

  const labels = collectLabels(candidate);
  if (labels.length > 0) {
    // A real mindmap has at least a root plus one branch. Judge the labels as a
    // corpus too — a single contaminated node is enough to reject the tree.
    if (labels.length < 2) return false;
    if (isLlmReasoningDump(labels.join("\n"))) return false;
    return true;
  }

  // No labels at all: fall back to the markdown length rule.
  return text.length >= MIN_USABLE_SLIDE_LENGTH;
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
