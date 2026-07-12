import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "../personas";
import { callLLM } from "@/llm/client";
import { SYSTEM_PROMPTS } from "@/llm/prompts";
import { setSession } from "../session";
import { scanResponse } from "../safety";

/**
 * Photo / vision handler.
 *
 * Strategy: call 9Router combo (ai_tutor_agent) which auto-detects image input
 * and internally falls back to a vision-capable model. No manual model list
 * needed — 9Router handles the routing.
 *
 * Timeout is generous (120s) because the combo may take time switching models.
 */
export async function handlePhoto(ctx: Context, student: Student): Promise<void> {
  const msg = ctx.message;
  if (!msg || !("photo" in msg)) return;

  const persona = getPersona(student.persona);
  const personaPrompt = persona.prompt ?? SYSTEM_PROMPTS.tutor;

  try {
    const photo = msg.photo[msg.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);

    await ctx.reply(`${persona.emoji} Kakak lagi liat fotonya ya... Sebentar ya 👀`);

    const toneRules = Array.isArray(persona.toneRules)
      ? persona.toneRules.join(", ")
      : typeof persona.toneRules === "object" && persona.toneRules !== null
        ? Object.values(persona.toneRules).join(", ")
        : String(persona.toneRules ?? "");

    const systemContent = `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}\nTone: ${toneRules}\n\n${personaPrompt}\n\nStudent name: ${student.name}\nGrade: ${student.gradeLevel}`;

    const response = await callLLM("tutor", [
      { role: "system", content: systemContent },
      {
        role: "user",
        content: [
          { type: "text" as const, text: "Ada foto dari murid. Coba lihat dan bantu dia:" },
          { type: "image_url" as const, image_url: { url: fileLink.href } },
        ],
      },
    ], {
      temperature: 0.7,
      maxTokens: 1024,
      timeoutMs: 120_000,
      studentId: student.id,
      // Don't pass models override — let 9Router combo auto-detect vision
    });

    const safeResponse = await scanResponse(student.id, response ?? "");
    const finalResponse = safeResponse ?? response ?? "Wah Kakak lagi liat fotonya ya! Keren! 😊";

    await ctx.reply(finalResponse);

    const session = await import("../session").then((m) => m.getSession(student.id));
    const chatHistory = (session.context?.chatHistory as Array<{ role: string; content: string }>) ?? [];
    await setSession(student.id, {
      currentMode: "chat",
      context: {
        ...session.context,
        chatHistory: [
          ...chatHistory,
          { role: "user", content: "[Mengirim foto]" },
          { role: "assistant", content: finalResponse },
        ].slice(-50),
      },
    });
  } catch (err) {
    console.error("[vision] Failed:", err);
    await ctx.reply(
      `${persona.emoji} Maaf ${student.name}, aku lagi liat fotonya tapi ada gangguan. Coba kirim ulang fotonya ya! 😊`,
    );
  }
}
