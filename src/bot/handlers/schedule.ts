import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { id } from "date-fns/locale";

const DAYS_MAP: Record<string, string> = {
  sunday: "Minggu",
  monday: "Senin",
  tuesday: "Selasa",
  wednesday: "Rabu",
  thursday: "Kamis",
  friday: "Jumat",
  saturday: "Sabtu",
};

function formatScheduleConfig(config: Record<string, any>): string {
  const parts: string[] = [];
  if (config.sessionsPerDay) parts.push(`⏱ ${config.sessionsPerDay}x sehari`);
  if (config.preferredTime) parts.push(`⏰ ${config.preferredTime}`);
  if (config.excludeDays?.length) {
    const days = config.excludeDays.map((d: string) => DAYS_MAP[d] || d).join(", ");
    parts.push(`🚫 Libur: ${days}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Belum diatur";
}

/**
 * Handle [SCHEDULE] intents from the LLM.
 *
 * Supported formats:
 *   [SCHEDULE] — Show today's schedule
 *   [SCHEDULE:SET:{"sessionsPerDay":N,"preferredTime":"HH:MM","excludeDays":["sunday"]}]
 *   [SCHEDULE:WEEK] — Show this week's schedule
 *   [SCHEDULE:ASSIGN] — Trigger weekly topic assignment
 */
export async function handleSchedule(ctx: Context, student: Student, commandText?: string): Promise<void> {
  const persona = getPersona(student.persona);

  // Parse command from the response text
  const cmdMatch = commandText?.match(/\[SCHEDULE(?::([^\]]+))?\]/i);
  const fullCmd = cmdMatch?.[1] ?? "";

  // Check for SET action
  const setMatch = fullCmd.match(/^SET:(.+)$/);
  if (setMatch) {
    try {
      const config = JSON.parse(setMatch[1]);
      const currentConfig = (student.scheduleConfig ?? {}) as Record<string, any>;
      const newConfig = { ...currentConfig, ...config };

      await prisma.student.update({
        where: { id: student.id },
        data: { scheduleConfig: newConfig },
      });

      await ctx.reply(
        `${persona.emoji} *Oke, jadwal belajar udah diatur!*\n\n` +
        `${formatScheduleConfig(newConfig)}\n\n` +
        `Mulai besok aku kasih sesi belajar sesuai preferensi kamu ya! 🔥`,
        { parse_mode: "Markdown" },
      );
      return;
    } catch {
      await ctx.reply(
        `${persona.emoji} Maaf, format pengaturan jadwal kurang tepat. Coba bilang:\n"Atur jadwal" atau "Aku mau belajar jam 4 sore"`,
      );
      return;
    }
  }

  // Check for WEEK action
  if (fullCmd.toUpperCase() === "WEEK") {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const sessions = await prisma.scheduleSession.findMany({
      where: {
        studentId: student.id,
        scheduledAt: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { scheduledAt: "asc" },
    });

    if (sessions.length === 0) {
      await ctx.reply(
        `${persona.emoji} Belum ada jadwal buat minggu ini, ${student.name}.\n` +
        `Coba bilang "Atur jadwal belajar aku" biar aku buatin! 📋`,
      );
      return;
    }

    const byDay = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const dayKey = format(s.scheduledAt, "EEEE", { locale: id });
      const arr = byDay.get(dayKey) ?? [];
      arr.push(s);
      byDay.set(dayKey, arr);
    }

    const lines: string[] = [];
    for (const [day, daySessions] of byDay) {
      lines.push(`*${day}:*`);
      for (const s of daySessions) {
        const time = format(s.scheduledAt, "HH:mm");
        const statusEmoji =
          s.status === "COMPLETED" ? "✅" :
          s.status === "MISSED" ? "❌" :
          s.status === "RESCHEDULED" ? "🔄" : "⏳";
        lines.push(` ${statusEmoji} ${time} — ${s.topic ?? s.type} (${s.durationMin} mnt)`);
      }
      lines.push("");
    }

    await ctx.reply(
      `${persona.emoji} *Jadwal Minggu Ini*\n\n${lines.join("\n")}` +
      `Semangat, ${student.name}! 🔥`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Check for ASSIGN action
  if (fullCmd.toUpperCase() === "ASSIGN") {
    try {
      const { assignWeeklyTopics } = await import("@/agents/scheduler/assigner");
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const result = await assignWeeklyTopics(student.id, now.toISOString());

      if (result.sessionsCreated > 0) {
        await ctx.reply(
          `${persona.emoji} *Sesi belajar udah siap!*\n\n` +
          `Aku buatin ${result.sessionsCreated} sesi baru buat kamu.\n` +
          `Cek /jadwal buat lihat detailnya!\n\n` +
          `Topik baru: ${result.summary.new.length} · Review: ${result.summary.weak.length} · Bonus: ${result.summary.random.length}`,
          { parse_mode: "Markdown" },
        );
      } else {
        await ctx.reply(
          `${persona.emoji} Waduh, belum ada materi yang siap. ` +
          `Coba tanya /materi dulu ya!`,
        );
      }
    } catch (err) {
      console.error("[schedule] ASSIGN error:", err);
      await ctx.reply("❌ Gagal menyusun jadwal. Coba lagi nanti ya!");
    }
    return;
  }

  // Default: Show today's schedule (plain [SCHEDULE])
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
    // Show schedule config status
    const config = (student.scheduleConfig ?? {}) as Record<string, any>;
    const hasConfig = config.sessionsPerDay || config.preferredTime;

    await ctx.reply(
      `${persona.emoji} Hmm, nggak ada jadwal buat hari ini, ${student.name}.\n\n` +
      (hasConfig
        ? `📋 *Preferensi kamu:* ${formatScheduleConfig(config)}\n\n`
        : `💡 *Tips:* Bilang "Atur jadwal belajar aku jam 4 sore" biar aku ingetin tiap hari!\n\n`) +
      `Santai dulu atau cek /materi buat belajar mandiri! 📚`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  const lines = sessions.map((s) => {
    const time = format(s.scheduledAt, "HH:mm", { locale: id });
    const statusEmoji =
      s.status === "COMPLETED" ? "✅" :
      s.status === "MISSED" ? "❌" :
      s.status === "RESCHEDULED" ? "🔄" : "⏳";
    return `${statusEmoji} *${time}* — ${s.topic ?? s.type} (${s.durationMin} mnt)`;
  });

  await ctx.reply(
    `${persona.emoji} *Jadwal Hari Ini*\n\n${lines.join("\n")}\n\n` +
    `Semangat, ${student.name}! 🔥`,
    { parse_mode: "Markdown" },
  );

  // If student has no scheduleConfig, offer to set one up
  const config = student.scheduleConfig as Record<string, any> | null;
  if (!config || (!config.sessionsPerDay && !config.preferredTime)) {
    await ctx.reply(
      `${persona.emoji} Mau aku atur jadwal rutin? Bilang aja:\n` +
      `• "Atur jadwal jam 4 sore" 🕓\n` +
      `• "Aku mau belajar 2x sehari" 📅\n` +
      `• "Libur hari Minggu" 🚫`,
    );
  }
}

/**
 * Handle inline schedule config from natural language.
 * Called when LLM outputs [SCHEDULE:SET:{...}]
 */
export async function extractAndApplyScheduleConfig(
  ctx: Context,
  student: Student,
  text: string,
): Promise<boolean> {
  const match = text.match(/\[SCHEDULE:SET:(\{.+?\})\]/i);
  if (!match) return false;

  try {
    const config = JSON.parse(match[1]);
    const currentConfig = (student.scheduleConfig ?? {}) as Record<string, any>;
    const newConfig = { ...currentConfig };

    if (typeof config.sessionsPerDay === "number") newConfig.sessionsPerDay = config.sessionsPerDay;
    if (typeof config.preferredTime === "string") newConfig.preferredTime = config.preferredTime;
    if (Array.isArray(config.excludeDays)) newConfig.excludeDays = config.excludeDays;

    await prisma.student.update({
      where: { id: student.id },
      data: { scheduleConfig: newConfig },
    });

    return true;
  } catch {
    return false;
  }
}
