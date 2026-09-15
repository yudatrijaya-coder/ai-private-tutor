/**
 * Delivery safety net for Telegram markup.
 *
 * WHY THIS EXISTS
 * Escaping (`src/lib/telegram-format.ts`) is the correct fix for content we know
 * is data — quiz questions, options, explanations. But this codebase sends with
 * `parse_mode: "Markdown"` from ~104 call sites, and an unescaped dynamic value
 * at any one of them costs the student the ENTIRE message: Telegram parses the
 * markup server-side and rejects the whole request with HTTP 400.
 *
 * That failure is silent whenever the send is fire-and-forget, which most are.
 * The production log shows it happening:
 *
 *   [bot/onMessage] UNCAUGHT: 400: Bad Request: can't parse entities:
 *   Can't find end of the entity starting at byte offset 242
 *
 * Escaping every site would be a large, permanently-incomplete change. Instead
 * this wraps the send methods once, at the single point where the Context is
 * constructed for each incoming update, so an unrecognised bad value degrades to
 * plain text instead of vanishing.
 *
 * WHY RETRY-AS-PLAIN AND NOT ESCAPE
 * The two failure classes want opposite treatment:
 *
 *   data (quiz content)  -> escape. We know it is never meant to be markup.
 *   prose (LLM replies)  -> retry plain. The model may legitimately emit
 *                           `*penting*`; escaping would print literal asterisks.
 *
 * The retry keeps intentional markup when it is well-formed, and only gives up
 * formatting when Telegram has already refused the message — a strictly better
 * outcome than the student seeing nothing.
 */

/** True when Telegram rejected a message because its markup was malformed. */
export function isParseError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /can't parse entities|can't find end of the entity/i.test(msg);
}

/**
 * Wrap a Telegraf send method so a markup rejection retries without parse_mode.
 *
 * Telegram's method signatures put the options object last, so the retry simply
 * re-sends with `parse_mode` removed and everything else (notably `reply_markup`)
 * intact.
 */
function wrapParseMode<T extends (...args: any[]) => Promise<any>>(fn: T, label: string): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (!isParseError(err)) throw err;

      const opts = args[args.length - 1];
      if (!opts || typeof opts !== "object" || !("parse_mode" in opts)) throw err;

      const { parse_mode: _dropped, ...rest } = opts as Record<string, unknown>;
      console.warn(
        `[telegram] ${label}: markup rejected, retrying as plain text — ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
      return await fn(...args.slice(0, -1), rest);
    }
  }) as T;
}

/**
 * Apply the safety net to a Context, in place.
 *
 * Called from the webhook route right after the Context is constructed, which is
 * the one place every incoming update passes through. Both `ctx.reply` and
 * `ctx.telegram.sendMessage` are wrapped because handlers use both.
 *
 * Idempotent: a Context is only hardened once, so a double call cannot stack
 * wrappers and double the retry.
 */
export function hardenContext(ctx: any): void {
  if (!ctx || ctx.__hardened) return;
  ctx.__hardened = true;

  if (typeof ctx.reply === "function") {
    ctx.reply = wrapParseMode(ctx.reply.bind(ctx), "reply");
  }

  const tg = ctx.telegram;
  if (tg && typeof tg.sendMessage === "function") {
    tg.sendMessage = wrapParseMode(tg.sendMessage.bind(tg), "sendMessage");
  }
  if (tg && typeof tg.editMessageText === "function") {
    tg.editMessageText = wrapParseMode(tg.editMessageText.bind(tg), "editMessageText");
  }
}
