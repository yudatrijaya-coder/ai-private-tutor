import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateCurriculumDraft } from "@/agents/curriculum";

/**
 * /daftar <studentId> — link Telegram account to an existing student record.
 *
 * 1. Look up student by their studentId (e.g. ANDI001)
 * 2. Ensure telegramId is not already taken by another student
 * 3. Link telegramId to this student
 * 4. Generate curriculum draft if not yet created
 * 5. Welcome message with available commands
 */
export async function handleRegister(
  ctx: Context,
  studentIdInput: string,
): Promise<void> {
  if (!ctx.from) return;

  const studentId = studentIdInput.trim().toUpperCase();

  // 1. Find student by studentId
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: {
      curriculums: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  if (!student) {
    await ctx.reply(
      `Hmm, ID siswa *${studentId}* tidak ditemukan. 😅\n\n` +
        `Pastikan ID yang kamu masukkan benar. Minta orang tua / admin ` +
        `untuk cek ID kamu.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  const telegramId = String(ctx.from.id);

  // 2. Check if telegramId already linked to another student
  const existing = await prisma.student.findUnique({ where: { telegramId } });
  if (existing && existing.id !== student.id) {
    await ctx.reply(
      `Akun Telegram ini sudah terdaftar untuk *${existing.name}*. 🙋\n\n` +
        `Ketik /start untuk mulai belajar. Kalau mau ganti akun, hubungi admin.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  if (student.telegramId && student.telegramId !== telegramId) {
    await ctx.reply(
      `ID siswa *${studentId}* sudah terdaftar di akun Telegram lain. ` +
        `Hubungi admin kalau mau dipindahkan.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // 3. Link telegramId if not yet linked
  if (!student.telegramId) {
    await prisma.student.update({
      where: { id: student.id },
      data: { telegramId },
    });
  }

  // 4. Generate curriculum if not yet created
  const hasCurriculum = student.curriculums.length > 0;
  if (!hasCurriculum) {
    await ctx.reply(`📚 Lagi menyiapkan kurikulum dan materi untukmu...`);
    await generateCurriculumDraft(student.id);
  }

  // 5. Welcome
  const gradeLabels: Record<string, string> = {
    SD_5: "SD Kelas 5",
    SMP_1: "SMP Kelas 1",
    SMA_2: "SMA Kelas 2",
  };

  await ctx.reply(
    `🎉 *Halo ${student.name}!* Selamat datang di AI Private Tutor!\n\n` +
      `📖 Kelas: ${gradeLabels[student.gradeLevel] ?? student.gradeLevel}\n` +
      `🆔 ID Siswa: ${student.studentId}\n\n` +
      `Yang bisa kamu lakukan:\n` +
      `📚 /materi — Lihat materi pelajaran\n` +
      `📝 /quiz — Kerjakan kuis\n` +
      `📅 /jadwal — Cek jadwal belajar\n` +
      `📊 /nilai — Lihat progres\n` +
      `❓ /help — Bantuan\n\n` +
      `Semangat belajarnya! 💪🔥`,
    { parse_mode: "Markdown" },
  );
}
