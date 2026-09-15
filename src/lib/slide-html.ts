/**
 * Slide markdown → HTML, for the two places that render slide content with
 * `dangerouslySetInnerHTML`.
 *
 * WHY THIS IS A MODULE AND NOT TWO INLINE CHAINS
 * Both renderers used to live inside their pages as a chain of `.replace()`
 * calls that injected HTML, and neither escaped its input. Slide text reaches
 * them from two untrusted directions:
 *
 *   - LLM output (`processedContent`, `slide`, `slide_sibi`)
 *   - scraped SIBI/Moodle content, selected with `?source=sibi|moodle`
 *
 * So any `<img src=x onerror=...>` that ends up in that text became live DOM.
 * Duplicating the chain is what let the omission go unnoticed in both copies,
 * so there is one implementation here and the pages call it.
 *
 * THE RULE
 * Escape first, then apply the markdown transforms. The transforms emit HTML
 * (headings, `<strong>`, list rows), so they must run after escaping — if the
 * order is reversed the tags this file generates are escaped too and the slide
 * renders as source text.
 *
 * Deliberate asymmetry: `<br>` is turned into a real newline before escaping,
 * so content that already contains line-break tags keeps its line breaks
 * instead of showing the student a literal `<br>`. Every other tag is escaped
 * and therefore displayed as text rather than interpreted.
 */

/**
 * Escape a value for interpolation into HTML text.
 *
 * Only `&`, `<`, `>` are special in a text position, and `&` must be replaced
 * first or the entities produced for `<` and `>` would be double-escaped.
 *
 * This is the same function the Telegram sender uses for `parse_mode: "HTML"`
 * (re-exported from `lib/telegram-format`), kept in one place so the two paths
 * cannot drift apart.
 */
export function escapeHtml(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type SlideRenderMode =
  /** Student viewer: keeps `##`/`#` as a decorated heading with an emoji. */
  | "decorated"
  /** Admin preview: headings are dropped because the title is shown in the chrome. */
  | "plain";

export interface SlideRenderOptions {
  /** Accent colour, interpolated into the generated markup. */
  accent: string;
  mode: SlideRenderMode;
}

/** `## Title` → a heading row, with a leading emoji lifted out of the text. */
function decorateHeading(text: string, accent: string): string {
  const emojiMatch = text.match(/^([\u{1F000}-\u{1FFFF}])\s*/u);
  const emoji = emojiMatch ? emojiMatch[1] : "";
  const body = emojiMatch ? text.slice(emojiMatch[0].length) : text;
  const finalText = body || text;
  return `<div class="flex items-center gap-3 mb-6"><span class="text-4xl">${emoji || "📖"}</span><h2 class="text-2xl font-extrabold tracking-tight" style="color:${accent}">${finalText}</h2></div>`;
}

/**
 * Render one slide's markdown to HTML.
 *
 * `accent` is a theme colour from a fixed palette in the page, never content,
 * so it is interpolated directly. Everything that comes from the slide text is
 * escaped first.
 */
export function renderSlideMarkdown(slide: string, opts: SlideRenderOptions): string {
  const { accent, mode } = opts;

  // Line-break tags express intent (a newline) rather than markup, so honour
  // the intent and drop the tag before anything is escaped.
  const source = (slide ?? "").replace(/<br\s*\/?>/gi, "\n");
  const safe = escapeHtml(source);

  if (mode === "decorated") {
    return safe
      .replace(/^##\s+(.+)/gm, (_, t: string) => decorateHeading(t, accent))
      .replace(/^#\s+(.+)/gm, '<h1 class="text-3xl font-extrabold mb-4 text-white">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold" style="color:#fff">$1</strong>')
      .replace(/^-\s+(.+)/gm, '<div class="flex items-start gap-2 mb-2"><span class="text-lg shrink-0 mt-0.5">•</span><span class="text-base">$1</span></div>')
      .replace(/^\d\.\s+(.+)/gm, '<div class="flex items-start gap-2 mb-2"><span class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span><span class="text-base">$1</span></div>')
      .replace(/\n---\n?/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n\n/g, '</div><div class="space-y-3 mt-4">')
      .replace(/\n/g, "<br/>");
  }

  return safe
    .replace(/^##\s+(.+)/gm, "")
    .replace(/^#\s+(.+)/gm, "")
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:white">$1</strong>')
    .replace(/\n- (.+)/g, `<div class="flex items-start gap-3 mb-2"><span class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style="background:${accent}"></span><span>$1</span></div>`)
    .replace(/\n---\n?/g, "")
    .replace(/\n\n/g, '<div class="h-4"></div>')
    .replace(/\n/g, "<br/>");
}
