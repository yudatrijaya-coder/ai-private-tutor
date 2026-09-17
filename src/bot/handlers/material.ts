import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPersona } from "../personas";
import { escapeMd } from "@/lib/telegram-format";
import { getActiveCurriculumId } from "@/lib/curriculum-active";

/**
 * /materi — list available materials for this student.
 */
export async function handleMaterial(ctx: Context, student: Student): Promise<void> {
  const persona = getPersona(student.persona);

  // Active curriculum only — Raihan owns a stale v1 alongside v3, and reading
  // across both listed every lesson twice. See `src/lib/curriculum-active.ts`.
  const curriculumId = await getActiveCurriculumId(student.id);
  const materials = curriculumId
    ? await prisma.material.findMany({
        where: {
          curriculumId,
          status: { in: ["READY", "PROCESSED"] },
        },
        orderBy: { weekOrder: "asc" },
        take: 20,
        include: {
          _count: { select: { quizzes: true } },
        },
      })
    : [];

  if (materials.length === 0) {
    await ctx.reply(
      `${persona.emoji} Materi belum tersedia nih, ${student.name}. ` +
        `Sabar ya, lagi disiapkan! 🚀`,
    );
    return;
  }

  const lines = materials.map(
    (m, i) =>
      `${i + 1}. *${escapeMd(m.topic)}*${m.subTopic ? ` — ${escapeMd(m.subTopic)}` : ""}\n` +
      `   📖 ${escapeMd(m.subject)} | ${m._count.quizzes > 0 ? `📝 ${m._count.quizzes} kuis` : "Belum ada kuis"}`,
  );

  await ctx.reply(
    `${persona.emoji} *Materi Pelajaran*\n\n${lines.join("\n")}\n\n` +
      `Ketik /quiz buat kerjakan kuis, atau /help buat lihat perintah lainnya! 💪`,
    { parse_mode: "Markdown" },
  );
}
