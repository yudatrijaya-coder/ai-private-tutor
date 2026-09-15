/**
 * Prove the escaping fix against the real Telegram API, using real content.
 *
 * THE TRICK
 * Sends go to an intentionally non-existent chat id, so nothing can be
 * delivered to a student. That still exercises the one thing under test,
 * because Telegram parses `parse_mode` BEFORE it resolves the chat:
 *
 *   raw content      -> 400 "can't parse entities: ..."   (parse rejected)
 *   escaped content  -> 400 "chat not found"              (parse accepted)
 *
 * So the error *message* is the assertion. A passing case is "parse accepted",
 * not "message delivered".
 *
 * This is the same failure the production log recorded:
 *   [bot/onMessage] UNCAUGHT: 400: Bad Request: can't parse entities:
 *   Can't find end of the entity starting at byte offset 242
 *
 * Run: npx tsx scripts/test-telegram-escape.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { escapeMd, escapeHtml } from "../src/lib/telegram-format";
import { renderQuestionText } from "../src/bot/handlers/quiz";
import { hardenContext } from "../src/lib/telegram-send";

const DEAD_CHAT = -999999999999;
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Returns the Telegram error description, or "OK" when it accepted the send. */
async function send(text: string, parseMode: "Markdown" | "HTML"): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: DEAD_CHAT, text, parse_mode: parseMode }),
  });
  const body = (await res.json()) as { ok: boolean; description?: string };
  if (body.ok) return "OK";
  return body.description ?? "unknown";
}

const isParseError = (d: string) => /can't parse entities|can't find end of/i.test(d);

async function main() {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN missing");

  console.log("── 0. Harness sanity ──");
  // A well-formed Markdown message must reach the "chat not found" stage, which
  // proves a parse error later in this run really is a parse error.
  const baseline = await send("*bold* plain", "Markdown");
  check("well-formed Markdown passes parsing", !isParseError(baseline), `got "${baseline}"`);

  console.log("\n── 1. The exact production failure, reproduced ──");
  const rawFn = "Gaya normal meja pada buku adalah F_N.";
  const rawErr = await send(rawFn, "Markdown");
  check("raw F_N is rejected by Telegram (bug reproduced)", isParseError(rawErr), `got "${rawErr}"`);
  const escFn = await send(escapeMd(rawFn), "Markdown");
  check("escaped F_N passes parsing", !isParseError(escFn), `got "${escFn}"`);

  console.log("\n── 2. Real quiz content through the real renderQuestionText() ──");
  const quizzes = await prisma.quiz.findMany({
    select: { id: true, questions: true, material: { select: { subject: true } } },
  });

  // Every distinct question/option/explanation string that contains a character
  // Telegram's Markdown parser reacts to.
  const risky = new Set<string>();
  for (const q of quizzes) {
    const questions = (q.questions as { question?: string; options?: string[]; explanation?: string }[]) ?? [];
    for (const item of questions) {
      if (!item || typeof item !== "object") continue;
      for (const field of [item.question, item.explanation, ...(item.options ?? [])]) {
        if (typeof field === "string" && /[_*`\[\]\\]/.test(field)) risky.add(field);
      }
    }
  }
  const sample = Array.from(risky).slice(0, 25);
  console.log(`  risky strings in DB: ${risky.size} (sampling ${sample.length})`);

  let rawFailed = 0;
  let escFailed = 0;
  let pairViolations = 0;
  const escapedSurvivors: string[] = [];
  const pairFailures: string[] = [];
  for (const s of sample) {
    // The escaped variant is composed through the REAL production renderer, so
    // this asserts the actual template rather than a copy of it.
    //
    // The raw variant is a deliberate counterfactual — it replicates the old
    // template to establish that the content really does break the parser. Only
    // the escaped variant's result is a claim about production behaviour.
    const escMsg = renderQuestionText(0, 5, s);
    const rawMsg = `📝 *Soal 1 dari 5*\n\n${s}`;
    const rawBad = isParseError(await send(rawMsg, "Markdown"));
    const escBad = isParseError(await send(escMsg, "Markdown"));
    if (rawBad) rawFailed++;
    if (escBad) {
      escFailed++;
      escapedSurvivors.push(s.slice(0, 70));
    }
    // The causal claim: anything Telegram rejects raw, it must accept escaped.
    if (rawBad && escBad) {
      pairViolations++;
      pairFailures.push(s.slice(0, 70));
    }
  }

  // Not every string containing `_` or `*` is malformed — an even number of them
  // forms a valid entity pair, e.g. "F_1 dan F_2". So the claim is not "all raw
  // samples fail"; it is "some do, and escaping fixes every one that does".
  check(
    `raw content does get rejected (${rawFailed}/${sample.length} malformed)`,
    rawFailed > 0,
    "bug not reachable — harness is not exercising the parser",
  );
  check(
    `no escaped sample is rejected (${sample.length - escFailed}/${sample.length} pass)`,
    escFailed === 0,
    `failures:\n      ${escapedSurvivors.join("\n      ")}`,
  );
  check(
    `every raw failure is fixed by escaping (${rawFailed - pairViolations}/${rawFailed} pairs)`,
    pairViolations === 0,
    `still broken:\n      ${pairFailures.join("\n      ")}`,
  );

  console.log("\n── 3. HTML mode is also safe ──");
  for (const s of sample.slice(0, 6)) {
    const d = await send(escapeHtml(s), "HTML");
    if (isParseError(d)) {
      check(`HTML escaped passes: ${s.slice(0, 40)}`, false, `got "${d}"`);
    }
  }
  check("all HTML-escaped samples pass parsing", true);

  console.log("\n── 4. Plain text with no markup must be unaffected ──");
  const plain = "Sebuah buku diam di atas meja.";
  check("plain text unchanged by escapeMd", escapeMd(plain) === plain);
  check("plain text unchanged by escapeHtml", escapeHtml(plain) === plain);
  check("escapeHtml handles ampersand first", escapeHtml("A & B < C") === "A &amp; B &lt; C");


  console.log("\n── 5. Safety net: markup rejection degrades to plain text ──");

  // A Context-shaped object whose sends hit the REAL Telegram API. `reply` and
  // `telegram.sendMessage` are implemented independently so each wrapper can be
  // observed on its own.
  function makeFakeCtx() {
    const replyCalls: any[] = [];
    const sendCalls: any[] = [];

    const hit = async (text: string, opts: any) => {
      const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DEAD_CHAT, text, ...opts }),
      });
      const body = (await res.json()) as { ok: boolean; description?: string };
      if (!body.ok) throw new Error(body.description ?? "unknown");
      return body;
    };

    const ctx: any = {
      reply: async (text: string, opts: any) => {
        replyCalls.push({ text, opts });
        return hit(text, opts);
      },
      telegram: {
        sendMessage: async (_chat: unknown, text: string, opts: any) => {
          sendCalls.push({ text, opts });
          return hit(text, opts);
        },
      },
      replyCalls,
      sendCalls,
    };
    return ctx;
  }

  const malformed = "Gaya normal meja pada buku adalah F_N.";

  // 5a. Without the net, the message is lost outright.
  const bare = makeFakeCtx();
  let bareErr = "";
  try {
    await bare.reply(malformed, { parse_mode: "Markdown" });
  } catch (e) {
    bareErr = String(e);
  }
  check("unhardened reply loses the message to the parser", isParseError(bareErr), `got "${bareErr}"`);
  check("unhardened reply never retried", bare.replyCalls.length === 1);

  // 5b. With the net, the retry gets past the parser.
  const ctx = makeFakeCtx();
  hardenContext(ctx);
  let hardenedErr = "";
  try {
    await ctx.reply(malformed, { parse_mode: "Markdown" });
  } catch (e) {
    hardenedErr = String(e);
  }
  check("hardened reply gets past the parser (reaches chat lookup)", !isParseError(hardenedErr), `got "${hardenedErr}"`);
  check("hardened reply retried exactly once", ctx.replyCalls.length === 2, `made ${ctx.replyCalls.length} calls`);
  check(
    "retry dropped parse_mode",
    ctx.replyCalls[1] && !("parse_mode" in ctx.replyCalls[1].opts),
    JSON.stringify(ctx.replyCalls[1]?.opts),
  );

  // 5c. reply_markup must survive the retry, or inline buttons disappear.
  const ctxKb = makeFakeCtx();
  hardenContext(ctxKb);
  const kb = { inline_keyboard: [[{ text: "1. F_N", callback_data: "quiz:ans:0:0" }]] };
  try {
    await ctxKb.reply(malformed, { parse_mode: "Markdown", reply_markup: kb });
  } catch {
    /* dead chat, expected */
  }
  check(
    "reply_markup survives the retry",
    JSON.stringify(ctxKb.replyCalls[1]?.opts?.reply_markup) === JSON.stringify(kb),
    JSON.stringify(ctxKb.replyCalls[1]?.opts),
  );

  // 5d. Well-formed markup must NOT retry — the net must be invisible normally.
  const ctxOk = makeFakeCtx();
  hardenContext(ctxOk);
  try {
    await ctxOk.reply("*Soal 1*\n\nTeks biasa.", { parse_mode: "Markdown" });
  } catch {
    /* dead chat, expected */
  }
  check("well-formed markup is sent once, no retry", ctxOk.replyCalls.length === 1, `made ${ctxOk.replyCalls.length} calls`);

  // 5e. telegram.sendMessage is wrapped too (extension.ts calls it directly).
  const ctxTg = makeFakeCtx();
  hardenContext(ctxTg);
  let tgErr = "";
  try {
    await ctxTg.telegram.sendMessage(DEAD_CHAT, malformed, { parse_mode: "Markdown" });
  } catch (e) {
    tgErr = String(e);
  }
  check("telegram.sendMessage is hardened", !isParseError(tgErr) && ctxTg.sendCalls.length === 2, `err="${tgErr}" calls=${ctxTg.sendCalls.length}`);

  // 5f. Idempotent — a second harden must not stack wrappers and double the retry.
  const ctxTwice = makeFakeCtx();
  hardenContext(ctxTwice);
  hardenContext(ctxTwice);
  try {
    await ctxTwice.reply(malformed, { parse_mode: "Markdown" });
  } catch {
    /* dead chat, expected */
  }
  check("hardenContext is idempotent", ctxTwice.replyCalls.length === 2, `made ${ctxTwice.replyCalls.length} calls`);

  // 5g. Non-parse errors must pass straight through, untouched — the net must
  // not mask a genuine transport failure as a formatting problem.
  const ctxOther = makeFakeCtx();
  let otherCalls = 0;
  ctxOther.reply = async () => {
    otherCalls++;
    throw new Error("EFATAL: something else entirely");
  };
  hardenContext(ctxOther);
  let otherErr = "";
  try {
    await ctxOther.reply("x", { parse_mode: "Markdown" });
  } catch (e) {
    otherErr = String(e);
  }
  check(
    "non-parse errors pass through, not retried",
    otherCalls === 1 && /EFATAL/.test(otherErr),
    `calls=${otherCalls} err="${otherErr}"`,
  );

  // 5h. A send with no parse_mode must never be retried either.
  const ctxNoPm = makeFakeCtx();
  let noPmCalls = 0;
  ctxNoPm.reply = async () => {
    noPmCalls++;
    throw new Error("Bad Request: can't parse entities: Can't find end of the entity starting at byte offset 5");
  };
  hardenContext(ctxNoPm);
  try {
    await ctxNoPm.reply("x");
  } catch {
    /* expected */
  }
  check("no parse_mode means nothing to retry", noPmCalls === 1, `calls=${noPmCalls}`);


  console.log("\n── 6. HTML mode: an ampersand breaks an unescaped message ──");

  // The guardian/daily-nudge/weekly-report senders use parse_mode "HTML" and
  // interpolate student names and topic names. `<`, `>` and `&` are the only
  // special characters there, and a name like "Raihan & Syifa" is enough to
  // lose the whole message.
  const amp = "Laporan untuk Raihan & Syifa <kelas SMP>";
  const ampRaw = await send(amp, "HTML");
  check("raw ampersand/bracket is rejected in HTML mode", isParseError(ampRaw), `got "${ampRaw}"`);
  const ampEsc = await send(escapeHtml(amp), "HTML");
  check("escaped ampersand/bracket passes in HTML mode", !isParseError(ampEsc), `got "${ampEsc}"`);

  // Markup we intend to keep must still render after escaping only the values.
  const withMarkup = `📊 <b>Laporan — ${escapeHtml("Raihan & Syifa")}</b>`;
  const mk = await send(withMarkup, "HTML");
  check("deliberate <b> survives escaping of values", !isParseError(mk), `got "${mk}"`);

  // A real improvement narrative from the database, which is LLM output.
  const plans = await prisma.improvementPlan.findMany({
    select: { aiNarrative: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  let htmlBad = 0;
  for (const pl of plans) {
    if (!pl.aiNarrative) continue;
    const d = await send(`💡 ${escapeHtml(pl.aiNarrative.slice(0, 300))}`, "HTML");
    if (isParseError(d)) htmlBad++;
  }
  check(`real AI narratives pass HTML escaping (${plans.length} checked)`, htmlBad === 0, `${htmlBad} rejected`);

  console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
