/**
 * Verify the deterministic quiz path now lands in ChatLog.
 *
 * Background: the tutor LLM (agent/tutor.ts) was the ONLY ChatLog writer. Quiz
 * requests/replies come straight from the handlers, so a student's quiz
 * conversation never appeared in the dashboard history (AYU's requests were
 * invisible even though the PM2 log proved she sent them).
 *
 * This test exercises the two building blocks that message.ts now uses —
 * `logChat` (student turn) and `mirrorRepliesToChatLog` (bot replies) — against
 * a THROWAWAY student that is deleted afterwards. It also asserts that
 * mirroring preserves the original reply's return value and arguments.
 *
 * Run: npx tsx scripts/test-chat-log.ts
 */
import { prisma } from "../src/lib/prisma";
import { logChat, mirrorRepliesToChatLog } from "../src/bot/chat-log";

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

const TMP_KEY = `E2ECHATLOG${Date.now()}`;

async function main() {
  const student = await prisma.student.create({
    data: {
      studentId: TMP_KEY,
      name: "Murid Uji ChatLog",
      gradeLevel: "SD_5",
      status: "ACTIVE",
    },
  });

  try {
    console.log(`\nMurid uji: ${student.studentId} (${student.id})\n`);

    // ── 1. logChat menyimpan giliran murid ──
    console.log("── 1. logChat menyimpan giliran murid ──");
    logChat(student.id, "user", "quiz IPAS tentang bunyi", "telegram", { intent: "quiz" });
    // logChat is fire-and-forget; give the insert a moment.
    await new Promise((r) => setTimeout(r, 400));

    const userRow = await prisma.chatLog.findFirst({
      where: { studentId: student.id, role: "user" },
      orderBy: { createdAt: "desc" },
    });
    check("giliran murid tersimpan", !!userRow);
    check("isi sesuai", userRow?.content === "quiz IPAS tentang bunyi", userRow?.content);
    check("metadata intent ikut tersimpan", (userRow?.metadata as any)?.intent === "quiz");

    // ── 2. mirrorRepliesToChatLog menangkap balasan bot ──
    console.log("\n── 2. Balasan bot tercermin ke ChatLog ──");
    const sent: unknown[] = [];
    const fakeCtx: any = {
      reply: async (...args: unknown[]) => {
        sent.push(args);
        return { message_id: 42 };
      },
    };
    mirrorRepliesToChatLog(fakeCtx, student.id);

    const ret = await fakeCtx.reply("Siap! Kuis *Bunyi* (IPAS). Yuk mulai! 🎯", {
      reply_markup: { inline_keyboard: [] },
    });
    await new Promise((r) => setTimeout(r, 400));

    check("reply asli tetap dipanggil", sent.length === 1);
    check("return value reply asli diteruskan", (ret as any)?.message_id === 42);
    check("argumen kedua (keyboard) tetap diteruskan", (sent[0] as unknown[]).length === 2);

    const botRow = await prisma.chatLog.findFirst({
      where: { studentId: student.id, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });
    check("balasan bot tersimpan", !!botRow);
    check(
      "isi balasan bot sesuai",
      botRow?.content === "Siap! Kuis *Bunyi* (IPAS). Yuk mulai! 🎯",
      botRow?.content,
    );

    // ── 3. Balasan non-string tidak dicatat (mis. foto) ──
    console.log("\n── 3. Balasan non-string diabaikan ──");
    const before = await prisma.chatLog.count({ where: { studentId: student.id } });
    await fakeCtx.reply({ some: "object" });
    await new Promise((r) => setTimeout(r, 300));
    const after = await prisma.chatLog.count({ where: { studentId: student.id } });
    check("balasan non-string tidak menambah baris", after === before, `${before} → ${after}`);

    // ── 4. Teks kosong tidak dicatat ──
    console.log("\n── 4. Teks kosong tidak dicatat ──");
    logChat(student.id, "user", "   ");
    await new Promise((r) => setTimeout(r, 300));
    const after2 = await prisma.chatLog.count({ where: { studentId: student.id } });
    check("teks kosong tidak menambah baris", after2 === after, `${after} → ${after2}`);
  } finally {
    // ChatLog rows cascade with the student (onDelete), but be explicit.
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
