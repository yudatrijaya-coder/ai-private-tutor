import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";

/**
 * /materi — list available materials for this student.
 */
export async function handleMaterial(ctx: Context, student: Student): Promise<void> {
  const persona = getPersona(student.persona);

  const materials = await prisma.material.findMany({
    where: {
      curriculum: { studentId: student.id },
      status: { in: ["READY", "PROCESSED"] },
    },
    orderBy: { weekOrder: "asc" },
    take: 20,
    include: {
      _count: { select: { quizzes: true } },
    },
  });

  if (materials.length === 0) {
    await ctx.reply(
      `${persona.emoji} Materi belum tersedia nih, ${student.name}. ` +
        `Sabar ya, lagi disiapkan! 🚀`,
    );
    return;
  }

  const lines = materials.map(
    (m, i) =>
      `${i + 1}. *${m.topic}*${m.subTopic ? ` — ${m.subTopic}` : ""}\n` +
      `   📖 ${m.subject} | ${m._count.quizzes > 0 ? `📝 ${m._count.quizzes} kuis` : "Belum ada kuis"}`,
  );

  await ctx.reply(
    `${persona.emoji} *Materi Pelajaran*\n\n${lines.join("\n")}\n\n` +
      `Ketik /quiz buat kerjakan kuis, atau /help buat lihat perintah lainnya! 💪`,
    { parse_mode: "Markdown" },
  );
}
