/**
 * Verify ChatLog mirroring still works on a PRODUCTION-shaped context.
 *
 * In the real webhook (src/app/api/bot/webhook/route.ts) the Context is passed
 * through `hardenContext()` BEFORE any handler runs. hardenContext replaces
 * ctx.reply / ctx.telegram.sendMessage / ctx.telegram.editMessageText with
 * parse-mode-retry wrappers. The quiz mirroring then wraps ctx.reply AGAIN.
 *
 * Wrapping order matters: the mirror must sit on top of the hardened reply and
 * must forward to it, so both behaviours survive — the reply is logged AND a
 * malformed-markup rejection still retries as plain text.
 *
 * This test composes the two wrappers exactly as production does and checks:
 *   1. the reply reaches Telegram (original send called),
 *   2. the reply is mirrored into ChatLog,
 *   3. a parse-mode rejection is still retried by the hardened layer.
 *
 * Run: npx tsx scripts/test-chat-log-harden.ts
 */
import { prisma } from "../src/lib/prisma";
import { logChat, mirrorRepliesToChatLog } from "../src/bot/chat-log";
import { hardenContext, isParseError } from "../src/lib/telegram-send";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const TMP_KEY = `E2EHARDEN${Date.now()}`;
const settle = () => new Promise((r) => setTimeout(r, 400));

async function main() {
  const student = await prisma.student.create({
    data: { studentId: TMP_KEY, name: "Murid Uji Harden", gradeLevel: "SD_5", status: "ACTIVE" },
  });

  try {
    console.log(`\nMurid uji: ${student.studentId} (${student.id})\n`);

    // ── 1. Sama seperti produksi: harden dulu, mirror setelahnya ──
    console.log("── 1. Balasan lolos ke Telegram DAN tercatat ──");
    const sentToTelegram: unknown[] = [];
    const ctx: any = {
      reply: async (...args: unknown[]) => {
        sentToTelegram.push(args);
        return { message_id: 7 };
      },
      telegram: { sendMessage: async () => ({ message_id: 8 }) },
    };

    hardenContext(ctx); // production order
    mirrorRepliesToChatLog(ctx, student.id);

    const ret = await ctx.reply("Siap! Kuis *Bunyi* dimulai! 🎯", { parse_mode: "Markdown" });
    await settle();

    check("balasan sampai ke Telegram", sentToTelegram.length === 1);
    check("return value diteruskan", (ret as any)?.message_id === 7);

    const row = await prisma.chatLog.findFirst({
      where: { studentId: student.id, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });
    check("balasan tercatat di ChatLog", !!row);
    check("isi sesuai", row?.content === "Siap! Kuis *Bunyi* dimulai! 🎯", row?.content);

    // ── 2. Penolakan parse_mode tetap di-retry oleh lapisan harden ──
    console.log("\n── 2. Markup ditolak → retry plain tetap jalan ──");
    let attempts = 0;
    const ctx2: any = {
      reply: async (_text: string, extra?: any) => {
        attempts++;
        if (extra && "parse_mode" in extra) {
          throw new Error("400: Bad Request: can't parse entities: Can't find end of the entity");
        }
        return { message_id: 9 };
      },
      telegram: {},
    };
    hardenContext(ctx2);
    mirrorRepliesToChatLog(ctx2, student.id);

    const ret2 = await ctx2.reply("teks *rusak", { parse_mode: "Markdown" });
    await settle();

    check("dipanggil dua kali (gagal lalu retry)", attempts === 2, `attempts=${attempts}`);
    check("retry berhasil", (ret2 as any)?.message_id === 9);
    check("isParseError mengenali error ini", isParseError(new Error("can't parse entities")));

    // The mirror sits ABOVE the hardened layer, so it sees one logical reply:
    // the internal retry is not logged a second time. Total = 1 (test 1) + 1.
    const rows = await prisma.chatLog.findMany({
      where: { studentId: student.id, role: "assistant" },
      orderBy: { createdAt: "asc" },
    });
    check(
      "satu reply logis = satu baris (retry internal tidak dobel)",
      rows.length === 2,
      `rows=${rows.length}`,
    );

    // ── 3. Mirror idempoten-tidak: satu panggilan reply = satu baris ──
    console.log("\n── 3. Satu reply = satu baris ──");
    const before = await prisma.chatLog.count({ where: { studentId: student.id } });
    await ctx.reply("Pesan tunggal");
    await settle();
    const after = await prisma.chatLog.count({ where: { studentId: student.id } });
    check("bertambah tepat satu", after === before + 1, `${before} → ${after}`);
  } finally {
    await prisma.chatLog.deleteMany({ where: { studentId: student.id } });
    await prisma.student.delete({ where: { id: student.id } });
    console.log("\n🧹 Murid uji + ChatLog terhapus bersih");
  }

  console.log(
    `\n${fail === 0 ? "✅ ALL PASS" : "❌ ADA YANG GAGAL"} — ${pass} passed, ${fail} failed\n`,
  );
  process.exit(fail === 0 ? 0 : 1);
}

void main();
