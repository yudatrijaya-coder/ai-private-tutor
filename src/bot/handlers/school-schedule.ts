import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "../personas";
import { getSchoolSchedule, getDaySchedule, getAvailableDays } from "@/data/school-schedule";
import { format, addDays } from "date-fns";
import { id } from "date-fns/locale";

const DAY_NAMES: Record<string, string> = {
  monday: "Senin",
  tuesday: "Selasa",
  wednesday: "Rabu",
  thursday: "Kamis",
  friday: "Jumat",
  saturday: "Sabtu",
  sunday: "Minggu",
};

const INDONESIAN_DAYS: Record<string, string> = {
  senin: "Senin",
  senayan: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  "jum'at": "Jumat",
  sabtu: "Sabtu",
  minggu: "Minggu",
};

function getTodayDayName(): string {
  const today = new Date();
  const engDay = format(today, "EEEE", { locale: id });
  return engDay;
}

function getTomorrowDayName(): string {
  const tomorrow = addDays(new Date(), 1);
  return format(tomorrow, "EEEE", { locale: id });
}

function resolveDay(query: string): string | null {
  const lower = query.toLowerCase().trim();
  if (lower === "hari ini" || lower === "today") return getTodayDayName();
  if (lower === "besok" || lower === "tomorrow") return getTomorrowDayName();

  for (const [alias, day] of Object.entries(INDONESIAN_DAYS)) {
    if (lower === alias || lower.includes(alias)) return day;
  }
  return null;
}

function formatScheduleEntry(entry: { time: string; subject: string; room: string; teacher: string; linkZoom?: string }): string {
  let line = `⏰ ${entry.time}  **${entry.subject}**`;
  line += `  (${entry.room})`;
  if (entry.linkZoom) {
    line += `  [🔗 Zoom](${entry.linkZoom})`;
  }
  return line;
}

function formatDaySchedule(
  dayName: string,
  entries: Array<{ time: string; subject: string; room: string; teacher: string; linkZoom?: string }>,
): string {
  const lines: string[] = [`📅 *${dayName}*`];

  // Group by subject to deduplicate parallel entries (same time, same subject)
  const seen = new Set<string>();
  const unique = entries.filter((e) => {
    const key = `${e.time}|${e.subject}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const entry of unique) {
    if (entry.subject === "Istirahat") {
      lines.push(`☕ ${entry.time} — Istirahat`);
    } else {
      lines.push(formatScheduleEntry(entry));
    }
  }

  return lines.join("\n");
}

function formatWeekSchedule(
  week: Record<string, Array<{ time: string; subject: string; room: string; teacher: string; linkZoom?: string }>>,
): string {
  const lines: string[] = [];
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  for (const day of days) {
    if (week[day] && week[day].length > 0) {
      lines.push(formatDaySchedule(day, week[day]));
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Get the subjects for a specific day from school schedule.
 */
function getSubjectsForDay(
  student: Student,
  day: string,
): string[] {
  const schedule = getDaySchedule(student.studentId, day);
  if (!schedule) return [];

  const subjects = new Set<string>();
  for (const entry of schedule) {
    if (entry.subject !== "Istirahat") {
      subjects.add(entry.subject);
    }
  }
  return Array.from(subjects);
}

/**
 * Handle [SCHOOL_SCHEDULE] intents from the LLM.
 *
 * Supported formats:
 *   [SCHOOL_SCHEDULE] — Show today's school schedule
 *   [SCHOOL_SCHEDULE:WEEK] — Show full week schedule
 *   [SCHOOL_SCHEDULE:Senin] — Show specific day
 *   [SCHOOL_SCHEDULE:NEXT:Matematika] — When is the next Matematika class?
 */
export async function handleSchoolSchedule(
  ctx: Context,
  student: Student,
  commandText?: string,
): Promise<void> {
  const persona = getPersona(student.persona);
  const schedule = getSchoolSchedule(student.studentId);

  if (!schedule) {
    await ctx.reply(
      `${persona.emoji} Maaf ${student.name}, data jadwal sekolah kamu belum tersedia. ` +
        `Coba tanya /help buat fitur lainnya ya! 😊`,
    );
    return;
  }

  // Parse command
  const cmdMatch = commandText?.match(/\[SCHOOL_SCHEDULE(?::([^\]]+))?\]/i);
  const subCmd = cmdMatch?.[1] ?? "";

  // ── Specific day ──
  if (subCmd && subCmd.toUpperCase() !== "WEEK" && subCmd.toUpperCase() !== "NEXT") {
    const day = resolveDay(subCmd) || subCmd;
    const entries = getDaySchedule(student.studentId, day);
    if (!entries || entries.length === 0) {
      await ctx.reply(
        `${persona.emoji} ${student.name}, nggak ada jadwal sekolah buat *${day}*. ` +
          `Santai dulu aja! 🎉`,
        { parse_mode: "Markdown" },
      );
      return;
    }
    const msg = formatDaySchedule(day, entries);
    await ctx.reply(msg, { parse_mode: "Markdown" });
    return;
  }

  // ── Full week ──
  if (subCmd.toUpperCase() === "WEEK") {
    const msg = formatWeekSchedule(schedule);
    await ctx.reply(
      `${persona.emoji} *Jadwal Sekolah ${student.name} — 1 Minggu* 🏫\n\n${msg}\n` +
        `Semangat belajarnya! 🔥`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // ── Default: Today ──
  const today = getTodayDayName();
  const todayEntries = getDaySchedule(student.studentId, today);

  // Check if today is weekend
  if (today === "Sabtu" || today === "Minggu") {
    // Show Friday's summary and weekend note
    const friday = getDaySchedule(student.studentId, "Jumat");
    if (friday && friday.length > 0) {
      const subjects = getSubjectsForDay(student, "Jumat");
      await ctx.reply(
        `${persona.emoji} *Hari ${today} — Libur!* 🎉\n\n` +
          `Jadwal sekolah terakhir hari Jumat kemarin:\n` +
          `${subjects.map((s) => `• ${s}`).join("\n")}\n\n` +
          `Istirahat dulu, senin semangat lagi! 🔥`,
        { parse_mode: "Markdown" },
      );
    } else {
      await ctx.reply(
        `${persona.emoji} *Hari ${today} — Libur!* 🎉\n` +
          `Nikmati liburan kamu ya, ${student.name}! 😊`,
        { parse_mode: "Markdown" },
      );
    }
    return;
  }

  if (!todayEntries || todayEntries.length === 0) {
    const daysWithSchedule = getAvailableDays(student.studentId);
    if (daysWithSchedule.length === 0) {
      await ctx.reply(
        `${persona.emoji} Hmm, sepertinya belum ada data jadwal sekolah untuk ${student.name}. ` +
          `Coba tanya /help!`,
      );
      return;
    }
    await ctx.reply(
      `${persona.emoji} ${student.name}, hari ini nggak ada jadwal sekolah ya.\n\n` +
        `Jadwal tersedia: ${daysWithSchedule.map((d) => `*${d}*`).join(", ")}.\n` +
        `Coba tanya "Jadwal sekolah ${daysWithSchedule[0]}" atau "Jadwal sekolah minggu ini"! 📅`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  const todaySubjects = getSubjectsForDay(student, today);
  const mataPelajaran = todaySubjects.length > 0
    ? `\n📚 *Mapel hari ini:* ${todaySubjects.join(", ")}`
    : "";

  const msg = formatDaySchedule(today, todayEntries);
  await ctx.reply(
    `${persona.emoji} *Jadwal Sekolah Hari ${today}* 🏫${mataPelajaran}\n\n${msg}\n` +
      `Semangat ${student.name}! 🔥`,
    { parse_mode: "Markdown" },
  );
}

/**
 * Handle natural language "next subject" queries.
 * Called when LLM outputs [SCHOOL_SCHEDULE:NEXT:subject]
 */
export async function handleNextSubject(
  ctx: Context,
  student: Student,
  subject: string,
): Promise<void> {
  const persona = getPersona(student.persona);
  const userSchedule = getSchoolSchedule(student.studentId);

  if (!userSchedule) {
    await ctx.reply(
      `${persona.emoji} Hmm, data jadwal sekolah belum tersedia, ${student.name}.`,
    );
    return;
  }

  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  const todayIndex = days.indexOf(getTodayDayName());

  // Search from today onwards
  for (let i = 0; i < days.length; i++) {
    const dayIndex = (todayIndex + i) % days.length;
    const day = days[dayIndex];
    const entries = getDaySchedule(student.studentId, day);
    if (!entries) continue;

    for (const entry of entries) {
      if (
        entry.subject.toLowerCase().includes(subject.toLowerCase()) ||
        subject.toLowerCase().includes(entry.subject.toLowerCase())
      ) {
        const dayLabel = i === 0 ? "Hari ini" : i === 1 ? "Besok" : `Hari ${day}`;
        await ctx.reply(
          `${persona.emoji} ${dayLabel}, *${entry.subject}* jam *${entry.time}* di ${entry.room}.` +
            (entry.linkZoom ? `\n🔗 Link Zoom: ${entry.linkZoom}` : ""),
          { parse_mode: "Markdown" },
        );
        return;
      }
    }
  }

  await ctx.reply(
    `${persona.emoji} Hmm, kayaknya nggak ada jadwal *${subject}* dalam waktu dekat, ${student.name}. ` +
      `Coba tanya jadwal lengkap dengan bilang "Jadwal sekolah minggu ini"! 📅`,
    { parse_mode: "Markdown" },
  );
}
