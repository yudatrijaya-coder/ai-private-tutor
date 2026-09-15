import "dotenv/config";
import type { Context } from "telegraf";
import { prisma } from "../src/lib/prisma";
import { handleStart } from "../src/bot/handlers/start";
import { handleMaterial } from "../src/bot/handlers/material";
import { handleQuizStart, handleSubjectCallback } from "../src/bot/handlers/quiz";

/**
 * Drive the read-only first-run path for a real student and prove every message
 * the bot would send actually parses at Telegram.
 *
 * WHY
 * A student with 400 ready materials and zero activity is either (a) not
 * interested, or (b) hitting something broken on their very first tap. Reading
 * the code cannot tell those apart; replaying their real content through the
 * real templates can.
 *
 * The messages are sent to an invalid chat id. Telegram validates entities
 * BEFORE it resolves the chat, so a well-formed message fails with
 * "chat not found" while a malformed one fails with "can't parse entities".
 *
 * This script only reads. It creates no Attempt, no StudentActivity and no
 * mastery rows. It writes SessionState only if a quiz is picked, which it
 * does not do here.
 *
 * Run: npx tsx scripts/verify-student-first-run.ts TIUMU001
 */

const CODE = process.argv[2] ?? "TIUMU001";

const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures.push(label);
}

interface Sent {
  text: string;
  opts?: { parse_mode?: string; reply_markup?: unknown };
}

function makeCtx() {
  const sent: Sent[] = [];
  const edited: Sent[] = [];
  const ctx = {
    reply: async (text: string, opts?: Sent["opts"]) => {
      sent.push({ text, opts });
      return {} as never;
    },
    answerCbQuery: async () => true as never,
    editMessageText: async (text: string, opts?: Sent["opts"]) => {
      edited.push({ text, opts });
      return {} as never;
    },
    callbackQuery: { data: "" },
    message: { text: "/start" },
    from: { id: 0 },
    chat: { id: 0 },
  };
  return { ctx: ctx as unknown as Context, sent, edited };
}

async function main() {
  const student = await prisma.student.findUnique({ where: { studentId: CODE } });
  if (!student) throw new Error(`student ${CODE} not found`);

  console.log(`student : ${student.name} (${student.studentId})`);
  console.log(`status  : ${student.status}  telegramId set: ${!!student.telegramId}`);
  console.log(`sub until: ${student.subscriptionUntil?.toISOString() ?? "null"}\n`);

  const all: Sent[] = [];

  // ── /start ─────────────────────────────────────────────────────────────
  let { ctx, sent, edited } = makeCtx();
  await handleStart(ctx, student);
  check("/start replies", sent.length === 1, `sent=${sent.length}`);
  check(
    "/start is not the 'register first' branch (student has telegramId)",
    !!sent[0] && sent[0].text.includes("/materi"),
    sent[0]?.text.replace(/\n/g, "\\n").slice(0, 70),
  );
  all.push(...sent);

  // ── /materi ────────────────────────────────────────────────────────────
  ({ ctx, sent } = makeCtx());
  await handleMaterial(ctx, student);
  check("/materi replies", sent.length === 1, `sent=${sent.length}`);
  const matMsg = sent[0]?.text ?? "";
  const matCount = (matMsg.match(/^\d+\. /gm) ?? []).length;
  check("/materi lists materials", matCount > 0, `listed=${matCount}`);
  check(
    "/materi did not fall into the empty branch",
    !matMsg.includes("Materi belum tersedia"),
  );
  all.push(...sent);

  // ── /quiz — subject picker ─────────────────────────────────────────────
  ({ ctx, sent } = makeCtx());
  await handleQuizStart(ctx, student);
  check("/quiz replies", sent.length === 1, `sent=${sent.length}`);
  const subjMsg = sent[0];
  const kb = (subjMsg?.opts?.reply_markup as { inline_keyboard?: { text: string; callback_data: string }[][] })
    ?.inline_keyboard;
  const subjButtons = (kb ?? []).flat().filter((b) => b.callback_data.startsWith("quiz:subject:"));
  check("/quiz offers subjects", subjButtons.length > 0, `subjects=${subjButtons.length}`);
  check(
    "/quiz buttons carry no object text",
    subjButtons.every((b) => !b.text.includes("[object Object]")),
  );
  all.push(...sent);

  // ── /quiz — quiz list for the first subject ────────────────────────────
  const firstSubject = subjButtons[0]?.callback_data.replace("quiz:subject:", "");
  if (firstSubject) {
    ({ ctx, sent, edited } = makeCtx());
    await handleSubjectCallback(ctx, student, firstSubject);
    check(`quiz list for "${firstSubject}" renders`, edited.length === 1, `edited=${edited.length}`);
    const qkb = (edited[0]?.opts?.reply_markup as { inline_keyboard?: { text: string }[][] })?.inline_keyboard;
    const quizButtons = (qkb ?? []).flat().filter((b) => !b.text.startsWith("⬅") && !b.text.startsWith("🚪"));
    check(`quiz list for "${firstSubject}" is non-empty`, quizButtons.length > 0, `quizzes=${quizButtons.length}`);
    all.push(...edited);
  }

  // ── Replay every message against the real API ──────────────────────────
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("\nSKIP  Telegram replay — TELEGRAM_BOT_TOKEN not set");
  } else {
    let parseErrors = 0;
    let chatNotFound = 0;
    for (const m of all) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: -999999999999,
          text: m.text,
          ...(m.opts?.parse_mode ? { parse_mode: m.opts.parse_mode } : {}),
          ...(m.opts?.reply_markup ? { reply_markup: m.opts.reply_markup } : {}),
        }),
      });
      const body = (await res.json()) as { ok: boolean; description?: string };
      const desc = body.description ?? "";
      if (desc.includes("can't parse entities")) {
        parseErrors++;
        console.log(`      parse error: ${desc}`);
        console.log(`      ${m.text.replace(/\n/g, "\\n").slice(0, 150)}`);
      } else if (desc.includes("chat not found")) {
        chatNotFound++;
      }
    }
    check(
      `all ${all.length} first-run messages parse at Telegram`,
      parseErrors === 0,
      `parseErrors=${parseErrors}`,
    );
    check(
      "every message was rejected only for the chat id",
      chatNotFound === all.length,
      `chatNotFound=${chatNotFound}/${all.length}`,
    );
  }

  console.log(failures.length === 0 ? "\nALL PASS" : `\n${failures.length} FAILED`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
