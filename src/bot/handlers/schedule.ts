import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";
import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * /jadwal — fetch today's schedule sessions and display them.
 */
export async function handleSchedule(ctx: Context, student: Student): Promise<void> {
  const persona = getPersona(student.persona);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const sessions = await prisma.scheduleSession.findMany({
    where: {
      studentId: student.id,
      scheduledAt: { gte: todayStart, lte: todayEnd },
    },
    orderBy: { scheduledAt: "asc" },
  });

  if (sessions.length === 0) {
    await ctx.reply(
      `${persona.emoji} Hmm, nggak ada jadwal belajar buat hari ini, ${student.name}.\n` +
        `Santai dulu atau cek /materi buat belajar mandiri! 📚`,
    );
    return;
  }

  const lines = sessions.map((s) => {
    const time = format(new Date(s.scheduledAt), "HH:mm", { locale: id });
    const statusEmoji =
      s.status === "COMPLETED"
        ? "✅"
        : s.status === "MISSED"
          ? "❌"
          : s.status === "RESCHEDULED"
            ? "🔄"
            : "⏳";
    return `${statusEmoji} *${time}* — ${s.topic ?? s.type} (${s.durationMin} menit)`;
  });

  await ctx.reply(
    `${persona.emoji} *Jadwal Belajar Hari Ini*\n\n${lines.join("\n")}\n\n` +
      `Semangat belajarnya, ${student.name}! 🔥`,
    { parse_mode: "Markdown" },
  );
}
