/**
 * End-to-end exercise of the REAL quiz handlers against the live database.
 *
 * Drives the exact production path a student takes:
 *   handleQuizStart → handleSubjectCallback → handleQuizPick → sendQuestion
 *
 * `ctx` is a mock that records every outbound call instead of hitting Telegram,
 * so nothing is sent to any real chat. Read-only: it starts a quiz session in
 * memory via the same code the bot uses, but does not answer or grade anything.
 *
 * Run: npx tsx scripts/test-quiz-live.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  handleQuizStart,
  handleSubjectCallback,
  handleQuizPick,
  handleQuizCallback,
  DEFAULT_QUESTION_SECONDS,
} from "../src/bot/handlers/quiz";

const STUDENT_TELEGRAM_ID = "640765830";

interface Call {
  kind: string;
  text: string;
  keyboard?: { text: string; callback_data: string }[][];
}

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

/** Record outbound calls; never touches Telegram. */
function makeMockCtx(calls: Call[]) {
  const ctx: any = {
    reply: async (text: string, extra?: any) => {
      calls.push({ kind: "reply", text, keyboard: extra?.reply_markup?.inline_keyboard });
      return { message_id: calls.length };
    },
    answerCbQuery: async () => {
      calls.push({ kind: "answerCbQuery", text: "" });
      return true;
    },
    editMessageText: async (text: string, extra?: any) => {
      calls.push({ kind: "editMessageText", text, keyboard: extra?.reply_markup?.inline_keyboard });
      return true;
    },
    telegram: { sendMessage: async () => ({ message_id: 1 }) },
  };
  return ctx;
}

async function main() {
  const student = await prisma.student.findFirst({
    where: { telegramId: STUDENT_TELEGRAM_ID },
  });
  if (!student) {
    console.error(`❌ Murid telegramId=${STUDENT_TELEGRAM_ID} tidak ditemukan`);
    process.exit(1);
  }
  console.log(`\nMurid: ${student.name} (${student.id})\n`);

  // Snapshot the real session so we can restore it exactly afterwards. The
  // handlers persist quiz state to SessionState, and leaving AYU in
  // `quiz_active` would make her next real message be graded as a quiz answer.
  const original = await prisma.sessionState.findUnique({
    where: { studentId: student.id },
  });
  const restore = async () => {
    if (original) {
      await prisma.sessionState.update({
        where: { studentId: student.id },
        data: { currentMode: original.currentMode, context: original.context as any },
      });
    } else {
      await prisma.sessionState.deleteMany({ where: { studentId: student.id } });
    }
  };

  // ── 1. Minta kuis lewat chat → harus dapat tombol mapel ──
  console.log("── handleQuizStart: minta kuis lewat chat ──");
  {
    const calls: Call[] = [];
    const ctx = makeMockCtx(calls);
    await handleQuizStart(ctx, student);

    const msg = calls.find((c) => c.kind === "reply" && c.keyboard);
    check("mengirim pesan dengan inline keyboard", !!msg, JSON.stringify(calls.map((c) => c.kind)));
    const rows = msg?.keyboard ?? [];
    check("ada tombol mapel (>= 7)", rows.length >= 7, `rows=${rows.length}`);
    const subjectButtons = rows.filter((r) => r[0]?.callback_data?.startsWith("quiz:subject:"));
    check("tombol mapel pakai prefix quiz:subject:", subjectButtons.length >= 7, `n=${subjectButtons.length}`);
    check(
      "ada tombol keluar",
      rows.some((r) => r[0]?.callback_data === "quiz:exit"),
      JSON.stringify(rows.map((r) => r[0]?.callback_data)),
    );
    console.log(`     contoh tombol: ${rows.slice(0, 3).map((r) => r[0]?.text).join(" | ")}`);
  }

  // ── 2. Pilih mapel → daftar kuis ──
  console.log("\n── handleSubjectCallback: pilih mapel ──");
  let pickedQuizId = "";
  {
    const calls: Call[] = [];
    const ctx = makeMockCtx(calls);
    const ok = await handleSubjectCallback(ctx, student, "Matematika");
    check("handler mengembalikan true", ok === true);

    const msg = calls.find((c) => c.kind === "editMessageText" && c.keyboard);
    check("edit pesan jadi daftar kuis", !!msg, JSON.stringify(calls.map((c) => c.kind)));
    const rows = msg?.keyboard ?? [];
    const quizButtons = rows.filter((r) => r[0]?.callback_data?.startsWith("quiz:pick:"));
    check("ada tombol kuis (>= 1)", quizButtons.length >= 1, `n=${quizButtons.length}`);
    pickedQuizId = (quizButtons[0]?.[0]?.callback_data ?? "").slice("quiz:pick:".length);
    check("quizId terambil", pickedQuizId.length > 0, pickedQuizId);
    console.log(`     kuis dipilih: ${quizButtons[0]?.[0]?.text}`);
  }

  // ── 3. Mulai kuis → soal pertama + tombol A/B/C/D + timer ──
  console.log("\n── handleQuizPick: mulai kuis (default timer) ──");
  {
    const calls: Call[] = [];
    const ctx = makeMockCtx(calls);
    await handleQuizPick(ctx, student, pickedQuizId);

    const q = calls.find((c) => c.kind === "reply" && /Soal 1 dari/.test(c.text));
    check("soal pertama terkirim", !!q, JSON.stringify(calls.map((c) => c.text?.slice(0, 40))));
    check("hanya SATU soal ditampilkan (satu per satu)", (calls.filter((c) => /Soal \d+ dari/.test(c.text)).length) === 1);
    check(
      `teks memuat timer ${DEFAULT_QUESTION_SECONDS} detik`,
      !!q && q.text.includes(`${DEFAULT_QUESTION_SECONDS} detik`),
      q?.text?.slice(0, 120),
    );

    const rows = q?.keyboard ?? [];
    const ansButtons = rows.filter((r) => r[0]?.callback_data?.startsWith("quiz:ans:"));
    check("ada tombol jawaban", ansButtons.length >= 2, `n=${ansButtons.length}`);
    check(
      "tombol berlabel huruf (A. …)",
      ansButtons.every((r, i) => r[0].text.startsWith(`${String.fromCharCode(65 + i)}. `)),
      JSON.stringify(ansButtons.map((r) => r[0].text)),
    );
    check(
      "callback quiz:ans:<display>:<opt> (display 0)",
      ansButtons.every((r) => r[0].callback_data.startsWith("quiz:ans:0:")),
      JSON.stringify(ansButtons.map((r) => r[0].callback_data)),
    );
    console.log(`     soal: ${q?.text?.split("\n").filter(Boolean)[1]?.slice(0, 70)}`);
    console.log(`     tombol: ${ansButtons.map((r) => r[0].text.slice(0, 18)).join(" | ")}`);
  }

  // ── 4. Timer kustom dari permintaan murid (kontrak asli) ──
  // Permintaan timer diingat oleh handleQuizStart lalu dibaca handleQuizPick —
  // persis jalur "kasih saya quiz 25 detik" lewat chat.
  console.log("\n── timer kustom: handleQuizStart(25) → handleQuizPick ──");
  {
    const calls: Call[] = [];
    const ctx = makeMockCtx(calls);
    await handleQuizStart(ctx, student, { questionSeconds: 25 });
    await handleQuizPick(ctx, student, pickedQuizId);
    const q = calls.find((c) => c.kind === "reply" && /Soal 1 dari/.test(c.text));
    check("timer kustom 25 detik dihormati", !!q && q.text.includes("25 detik"), q?.text?.slice(0, 120));
  }

  // ── 5. Mode "lebih sulit" → soal hard didahulukan, tombol tetap benar ──
  console.log("\n── handleQuizPick: mode lebih sulit ──");
  {
    const calls: Call[] = [];
    const ctx = makeMockCtx(calls);
    await handleQuizPick(ctx, student, pickedQuizId, { hard: true });
    const q = calls.find((c) => c.kind === "reply" && /Soal 1 dari/.test(c.text));
    check("kuis mode sulit tetap menyajikan soal", !!q);
    const rows = q?.keyboard ?? [];
    const ansButtons = rows.filter((r) => r[0]?.callback_data?.startsWith("quiz:ans:"));
    check("tombol jawaban tetap ada di mode sulit", ansButtons.length >= 2, `n=${ansButtons.length}`);
    check(
      "callback tetap menunjuk display 0",
      ansButtons.every((r) => r[0].callback_data.startsWith("quiz:ans:0:")),
      JSON.stringify(ansButtons.map((r) => r[0].callback_data)),
    );
  }

  // ── 6. Murid minta subject/topic spesifik (inti keluhan "kaku") ──
  console.log("\n── Permintaan subject/topic spesifik ──");
  {
    // 6a. Subject + topic yang ADA di bank → langsung mulai, tanpa picker
    const calls: Call[] = [];
    const ctx = makeMockCtx(calls);
    await handleQuizStart(ctx, student, { subject: "IPAS", topic: "bunyi" });
    const hasPicker = calls.some((c) => c.keyboard?.some((r) => r.some((b) => b.callback_data.startsWith("quiz:subject:"))));
    check("TIDAK memunculkan picker mapel", !hasPicker, JSON.stringify(calls.map((c) => c.text?.slice(0, 40))));
    const q = calls.find((c) => /Soal 1 dari/.test(c.text));
    check("langsung menyajikan soal", !!q);
    check(
      "mengonfirmasi topik yang diminta",
      calls.some((c) => /bunyi/i.test(c.text)),
      JSON.stringify(calls.map((c) => c.text?.slice(0, 50))),
    );

    // 6b. Subject saja → langsung mulai kuis mapel itu, tanpa picker
    const calls2: Call[] = [];
    const ctx2 = makeMockCtx(calls2);
    await handleQuizStart(ctx2, student, { subject: "Matematika" });
    const hasPicker2 = calls2.some((c) => c.keyboard?.some((r) => r.some((b) => b.callback_data.startsWith("quiz:subject:"))));
    check("subject saja: tanpa picker", !hasPicker2, JSON.stringify(calls2.map((c) => c.text?.slice(0, 40))));
    check("subject saja: langsung soal", calls2.some((c) => /Soal 1 dari/.test(c.text)));

    // 6c. TANPA subject → HARUS munculkan picker (perilaku yang diminta)
    const calls3: Call[] = [];
    const ctx3 = makeMockCtx(calls3);
    await handleQuizStart(ctx3, student);
    const picker = calls3.find((c) => c.keyboard?.some((r) => r.some((b) => b.callback_data.startsWith("quiz:subject:"))));
    check("tanpa subject: picker mapel muncul", !!picker);
    const subjBtns = (picker?.keyboard ?? []).filter((r) => r[0]?.callback_data?.startsWith("quiz:subject:"));
    check("picker memuat >= 7 mapel", subjBtns.length >= 7, `n=${subjBtns.length}`);

    // 6d. Topic tak dikenal → jatuh ke picker, tidak error
    const calls4: Call[] = [];
    const ctx4 = makeMockCtx(calls4);
    await handleQuizStart(ctx4, student, { subject: "IPAS", topic: "fotosintesis" });
    const picker4 = calls4.find((c) => c.keyboard?.some((r) => r.some((b) => b.callback_data.startsWith("quiz:subject:"))));
    const started4 = calls4.some((c) => /Soal 1 dari/.test(c.text));
    check(
      "topic tak dikenal: tetap terlayani (picker ATAU mulai)",
      !!picker4 || started4,
      JSON.stringify(calls4.map((c) => c.text?.slice(0, 50))),
    );
  }

  // ── 7. Tombol tindak lanjut pasca-kuis ──
  console.log("\n── handleQuizCallback: ulang & jelaskan ──");
  {
    // quiz:redo:<id> → mulai ulang kuis yang sama
    const calls: Call[] = [];
    const ctx = makeMockCtx(calls);
    (ctx as any).callbackQuery = { data: `quiz:redo:${pickedQuizId}` };
    const ok = await handleQuizCallback(ctx, student);
    check("quiz:redo ditangani", ok === true);
    const q = calls.find((c) => c.kind === "reply" && /Soal 1 dari/.test(c.text));
    check("redo menyajikan soal pertama lagi", !!q, JSON.stringify(calls.map((c) => c.text?.slice(0, 30))));

    // quiz:redo:<id>:hard → versi lebih sulit
    const calls2: Call[] = [];
    const ctx2 = makeMockCtx(calls2);
    (ctx2 as any).callbackQuery = { data: `quiz:redo:${pickedQuizId}:hard` };
    const ok2 = await handleQuizCallback(ctx2, student);
    check("quiz:redo:hard ditangani", ok2 === true);
    const q2 = calls2.find((c) => c.kind === "reply" && /Soal 1 dari/.test(c.text));
    check("mode sulit menyajikan soal", !!q2);
    check(
      "ada pesan penyemangat versi sulit",
      calls2.some((c) => c.kind === "reply" && /lebih menantang/i.test(c.text)),
      JSON.stringify(calls2.map((c) => c.text?.slice(0, 40))),
    );

    // quiz:explain:<id> → penjelasan LLM (satu panggilan nyata, ±1500 token)
    // REGRESI: dulu maxTokens=500 habis untuk hidden reasoning → content kosong
    // → murid melihat "kakak nggak bisa jelasin". Sekarang harus benar-benar
    // menghasilkan penjelasan.
    const calls3: Call[] = [];
    const ctx3 = makeMockCtx(calls3);
    (ctx3 as any).callbackQuery = { data: `quiz:explain:${pickedQuizId}` };
    const ok3 = await handleQuizCallback(ctx3, student);
    check("quiz:explain ditangani", ok3 === true);
    check(
      "mengirim pesan pembuka penjelasan",
      calls3.some((c) => c.kind === "reply" && /kakak jelasin/i.test(c.text)),
      JSON.stringify(calls3.map((c) => c.text?.slice(0, 40))),
    );
    // Pesan penjelasan asli (dari LLM) datang sebagai reply berikutnya.
    const explainReply = calls3.filter((c) => c.kind === "reply")[1];
    check(
      "penjelasan LLM terkirim (bukan kosong)",
      !!explainReply && explainReply.text.trim().length > 40,
      explainReply ? `${explainReply.text.slice(0, 80)}…` : "tidak ada balasan kedua",
    );
    check(
      'BUKAN pesan "nggak bisa jelasin" (regresi maxTokens)',
      !!explainReply && !/nggak bisa jelasin|tidak bisa jelasin|lagi nggak bisa/i.test(explainReply.text),
      explainReply?.text.slice(0, 80),
    );
    if (explainReply) {
      console.log(`     penjelasan: ${explainReply.text.replace(/\n/g, " ").slice(0, 110)}…`);
    }
  }

  await restore();
  console.log("\n♻️  Session murid dikembalikan ke kondisi semula");

  console.log(`\n${fail === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  // Best-effort: never leave the real student stuck in a quiz session.
  try {
    const s = await prisma.student.findFirst({ where: { telegramId: STUDENT_TELEGRAM_ID } });
    if (s) {
      await prisma.sessionState.updateMany({
        where: { studentId: s.id },
        data: { currentMode: "chat", context: {} as any },
      });
      console.error("♻️  Session dipulihkan ke 'chat' setelah error");
    }
  } catch {}
  await prisma.$disconnect();
  process.exit(1);
});
