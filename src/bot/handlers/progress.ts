import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";

/**
 * /nilai — fetch latest progress snapshot and latest attempt scores.
 */
export async function handleProgress(ctx: Context, student: Student): Promise<void> {
  const persona = getPersona(student.persona);

  const [progressSnaps, recentAttempts] = await Promise.all([
    prisma.progressSnap.findMany({
      where: { studentId: student.id },
      orderBy: { snapDate: "desc" },
      take: 5,
    }),
    prisma.attempt.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { quiz: { select: { material: { select: { topic: true } } } } },
    }),
  ]);

  let text = `${persona.emoji} *Perkembangan Belajar ${student.name}*\n\n`;

  if (progressSnaps.length > 0) {
    text += "📊 *Ringkasan Progres:*\n";
    for (const snap of progressSnaps) {
      const pct = snap.totalMax > 0 ? Math.round((snap.totalScore / snap.totalMax) * 100) : 0;
      text += `• ${snap.subject}${snap.topic ? ` — ${snap.topic}` : ""}: `;
      text += `${pct}% (${snap.totalScore}/${snap.totalMax})`;
      text += snap.mastery ? ` | Mastery: ${Math.round(snap.mastery)}%` : "";
      text += "\n";
    }
  }

  if (recentAttempts.length > 0) {
    text += "\n📝 *Hasil Kuis Terbaru:*\n";
    for (const a of recentAttempts) {
      const topic = a.quiz?.material?.topic ?? "Kuis";
      text += `• ${topic}: ${a.score}/${a.maxScore}`;
      if (a.masteryAfter != null) text += ` (${Math.round(a.masteryAfter)}%)`;
      text += "\n";
    }
  }

  if (progressSnaps.length === 0 && recentAttempts.length === 0) {
    text += "Belum ada data nilai. Yuk mulai belajar! 📚\n";
  }

  text += `\n${persona.emoji} Tetap semangat ya! 🔥`;

  await ctx.reply(text, { parse_mode: "Markdown" });
}
