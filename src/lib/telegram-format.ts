/**
 * Telegram message-format escaping.
 *
 * WHY THIS EXISTS
 * Telegram parses `parse_mode` server-side and rejects the ENTIRE message with
 * HTTP 400 when the markup is malformed:
 *
 *   400: Bad Request: can't parse entities: Can't find end of the entity
 *        starting at byte offset 242
 *
 * The failure is total — the student receives nothing, not a degraded message —
 * and it is invisible when the send is fire-and-forget. The trigger is ordinary
 * educational content: physics writes the normal force as `F_N` and maths writes
 * `lim_{x→2}`, both of which open an italic entity in legacy Markdown that is
 * never closed. 156 quiz questions in this database contain `_` or `*`.
 *
 * THE RULE
 * Escape each DYNAMIC value as it is interpolated — a question, an option, an
 * explanation, an LLM reply, a student name. Never escape the assembled message,
 * or the deliberate `*bold*` markers around it get escaped too and render as
 * literal asterisks.
 *
 *   WRONG  await send(escapeMd(`📝 *Soal 1*\n\n${q.question}`));
 *   RIGHT  await send(`📝 *Soal 1*\n\n${escapeMd(q.question)}`);
 *
 * Prefer `escapeHtml` + `parse_mode: "HTML"` for new code. HTML has only three
 * special characters and no nesting ambiguity, whereas legacy Markdown has to
 * guess whether `_` opens emphasis or is literal. Legacy Markdown is supported
 * here because most of this codebase already sends with it.
 */

/**
 * Escape a dynamic value for `parse_mode: "Markdown"` (legacy).
 *
 * Covers the four characters Telegram's legacy parser treats as syntax
 * anywhere in the text: `_ * ` [`. Backtick and bracket are included because an
 * unbalanced `[` also fails the whole message.
 *
 * Not for `parse_mode: "MarkdownV2"` — that grammar requires escaping
 * `_ * [ ] ( ) ~ ` > # + - = | { } . !` and is not used in this project.
 */
export function escapeMd(text: string | null | undefined): string {
  return (text ?? "").replace(/([_*`\[\]\\])/g, "\\$1");
}

/**
 * Escape a dynamic value for `parse_mode: "HTML"`.
 *
 * Re-exported from `lib/slide-html` rather than implemented here: the slide
 * viewer renders untrusted LLM/scraped text with `dangerouslySetInnerHTML` and
 * needs the identical function, and two copies of an escaper is how one of them
 * ends up subtly weaker than the other.
 */
export { escapeHtml } from "./slide-html";

/**
 * Collapse whitespace and cap length, for text that will be shown inline.
 *
 * Quiz questions are LLM-generated and occasionally arrive with hard-wrapped
 * lines or a wall of text; either breaks the layout of a chat message.
 */
export function clipText(text: string | null | undefined, max = 180): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
