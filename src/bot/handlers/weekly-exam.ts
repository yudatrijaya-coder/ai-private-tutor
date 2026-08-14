import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";
import {
  scheduleNextWeeklyExam,
  pickNextSubject,
  pickExamForSubject,
  defaultExamTime,
} from "@/services/exam-scheduler";
import { format, addDays } from "date-fns";
import { id } from "date-fns/locale";

/** Callback prefixes for weekly exam inline keyboards. */
export const EXAM_SCHEDULE_CONFIRM = "wexam:confirm";
export const EXAM_SCHEDULE_CHANGE_DAY = "wexam:day:";
export const EXAM_SCHEDULE_CHANGE_TIME = "wexam:time:";
export const EXAM_SCHEDULE_CANCEL = "wexam:cancel";

const DAY_OPTIONS = [
  { label: "Jumat", value: 5 },
  { label: "Sabtu", value: 6 },
  { label: "Minggu", value: 0 },
];

const TIME_OPTIONS = [
  { label: "16:00", value: 16 },
  { label: "19:00", value: 19 },
  { label: "20:00", value: 20 },
];

/**
 * /weeklyexam — show next scheduled weekly exam + confirmation keyboard.
 */
export async function handleWeeklyExamStart(
  ctx: Context,
  student: Student,
): Promise<void> {
  const persona = getPersona(student.persona);

  const subject = await pickNextSubject(student);
  if (!subject) {
    await ctx.reply(
      `${persona.emoji} Belum ada weekly exam yang tersedia untuk kelas kamu, ${student.name}. ` +
        `Coba lagi minggu depan ya! 📚`,
    );
    return;
  }

  const exam = await pickExamForSubject(subject, student.gradeLevel);
  if (!exam) {
    await ctx.reply(
      `${persona.emoji} Weekly exam untuk *${subject}* belum siap. Coba lagi nanti ya!`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Create or fetch the schedule
  const schedule = await scheduleNextWeeklyExam(student);
  if (!schedule) {
    await ctx.reply(
      `${persona.emoji} Gagal menyiapkan jadwal exam. Coba lagi ya!`,
    );
    return;
  }

  const timeLabel = format(schedule.scheduledAt, "EEEE, dd MMMM yyyy 'pukul' HH:mm", { locale: id });

  await ctx.reply(
    `${persona.emoji} *Weekly Exam Minggu Ini*\n\n` +
      `📋 *${exam.title}*\n` +
      `🗓️ ${timeLabel} WIB\n` +
      `❓ ${schedule.status === "PENDING" ? "Belum dikonfirmasi" : "Sudah dikonfirmasi ✅"}\n\n` +
      `Setuju jadwal ini?`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Setuju, ingetin aku!", callback_data: EXAM_SCHEDULE_CONFIRM }],
          [
            { text: "🗓️ Ganti hari", callback_data: EXAM_SCHEDULE_CHANGE_DAY + "list" },
            { text: "⏰ Ganti jam", callback_data: EXAM_SCHEDULE_CHANGE_TIME + "list" },
          ],
          [{ text: "❌ Batal", callback_data: EXAM_SCHEDULE_CANCEL }],
        ],
      },
    },
  );
}

/**
 * Handle weekly exam callback queries (confirmation flow).
 */
export async function handleWeeklyExamCallback(
  ctx: Context,
  student: Student,
): Promise<boolean> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return false;
  const data = ctx.callbackQuery.data;
  const persona = getPersona(student.persona);

  if (data === EXAM_SCHEDULE_CONFIRM) {
    // Confirm the pending schedule
    const schedule = await prisma.examSchedule.findFirst({
      where: {
        studentId: student.id,
        status: "PENDING",
        scheduledAt: { gte: startOfWeek(new Date()) },
      },
      include: { exam: true },
      orderBy: { scheduledAt: "desc" },
    });

    if (!schedule) {
      await ctx.answerCbQuery("Tidak ada jadwal pending");
      return true;
    }

    await prisma.examSchedule.update({
      where: { id: schedule.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    const timeLabel = format(schedule.scheduledAt, "EEEE, dd MMMM 'pukul' HH:mm", { locale: id });
    const link = "https://senangbelajar.web.id/student/exam";

    await ctx.answerCbQuery("Jadwal dikonfirmasi ✅");
    await ctx.editMessageText(
      `${persona.emoji} *Jadwal Weekly Exam Dikonfirmasi!* ✅\n\n` +
        `📋 *${schedule.exam.title}*\n` +
        `🗓️ ${timeLabel} WIB\n\n` +
        `Aku ingetin kamu H-1 dan saat waktunya tiba ya! 💪\n` +
        `[➡️ Buka Halaman Exam](${link})`,
      { parse_mode: "Markdown" },
    );
    return true;
  }

  if (data === EXAM_SCHEDULE_CANCEL) {
    // Cancel the pending schedule (set CANCELLED, will reschedule next sweep)
    const schedule = await prisma.examSchedule.findFirst({
      where: {
        studentId: student.id,
        status: "PENDING",
        scheduledAt: { gte: startOfWeek(new Date()) },
      },
      orderBy: { scheduledAt: "desc" },
    });

    if (schedule) {
      await prisma.examSchedule.update({
        where: { id: schedule.id },
        data: { status: "CANCELLED" },
      });
    }

    await ctx.answerCbQuery("Jadwal dibatalkan");
    await ctx.editMessageText(
      `${persona.emoji} Oke, jadwal weekly exam dibatalkan. ` +
        `Ketik /weeklyexam kalau mau atur ulang ya!`,
      { parse_mode: "Markdown" },
    );
    return true;
  }

  if (data.startsWith(EXAM_SCHEDULE_CHANGE_DAY)) {
    const arg = data.slice(EXAM_SCHEDULE_CHANGE_DAY.length);
    if (arg === "list") {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        `${persona.emoji} Pilih hari untuk weekly exam:`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              DAY_OPTIONS.map((d) => ({
                text: d.label,
                callback_data: `${EXAM_SCHEDULE_CHANGE_DAY}${d.value}`,
              })),
              [{ text: "⬅️ Kembali", callback_data: "wexam:back" }],
            ],
          },
        },
      );
      return true;
    }

    const dayNum = parseInt(arg, 10);
    if (!Number.isNaN(dayNum)) {
      await updateScheduleTime(ctx, student, { dayOfWeek: dayNum });
      return true;
    }
  }

  if (data.startsWith(EXAM_SCHEDULE_CHANGE_TIME)) {
    const arg = data.slice(EXAM_SCHEDULE_CHANGE_TIME.length);
    if (arg === "list") {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        `${persona.emoji} Pilih jam untuk weekly exam:`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              TIME_OPTIONS.map((t) => ({
                text: t.label,
                callback_data: `${EXAM_SCHEDULE_CHANGE_TIME}${t.value}`,
              })),
              [{ text: "⬅️ Kembali", callback_data: "wexam:back" }],
            ],
          },
        },
      );
      return true;
    }

    const hour = parseInt(arg, 10);
    if (!Number.isNaN(hour)) {
      await updateScheduleTime(ctx, student, { hour });
      return true;
    }
  }

  if (data === "wexam:back") {
    await handleWeeklyExamStart(ctx as any, student);
    return true;
  }

  return false;
}

/**
 * Update the pending schedule's day/time and confirm.
 */
async function updateScheduleTime(
  ctx: Context,
  student: Student,
  opts: { dayOfWeek?: number; hour?: number },
): Promise<boolean> {
  const schedule = await prisma.examSchedule.findFirst({
    where: {
      studentId: student.id,
      status: "PENDING",
      scheduledAt: { gte: startOfWeek(new Date()) },
    },
    include: { exam: true },
    orderBy: { scheduledAt: "desc" },
  });

  if (!schedule) {
    await ctx.answerCbQuery("Tidak ada jadwal pending");
    return true;
  }

  const base = new Date(schedule.scheduledAt);
  if (opts.dayOfWeek !== undefined) {
    const diff = (opts.dayOfWeek - base.getDay() + 7) % 7;
    base.setDate(base.getDate() + diff);
  }
  if (opts.hour !== undefined) {
    base.setHours(opts.hour, 0, 0, 0);
  }

  await prisma.examSchedule.update({
    where: { id: schedule.id },
    data: { scheduledAt: base },
  });

  const persona = getPersona(student.persona);
  const timeLabel = format(base, "EEEE, dd MMMM 'pukul' HH:mm", { locale: id });
  const link = "https://senangbelajar.web.id/student/exam";

  await ctx.answerCbQuery("Jadwal diubah ✅");
  await ctx.editMessageText(
    `${persona.emoji} *Jadwal Weekly Exam Diubah* ✅\n\n` +
      `📋 *${schedule.exam.title}*\n` +
      `🗓️ ${timeLabel} WIB\n\n` +
      `Aku ingetin kamu H-1 dan saat waktunya tiba ya! 💪\n` +
      `[➡️ Buka Halaman Exam](${link})`,
    { parse_mode: "Markdown" },
  );
  return true;
}

/** Monday 00:00 of the current week. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

/** Re-export helpers for cron/other handlers. */
export { defaultExamTime, addDays };
