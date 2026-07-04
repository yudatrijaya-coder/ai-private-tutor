import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "../personas";
import { callLLM } from "@/llm/client";
import { SYSTEM_PROMPTS } from "@/llm/prompts";
import { setSession } from "../session";
import { scanResponse } from "../safety";

/**
 * Photo / vision handler — sends the photo to the LLM with vision
 * and returns the AI's analysis.
 */
export async function handlePhoto(ctx: Context, student: Student): Promise<void> {
  const msg = ctx.message;
  if (!msg || !("photo" in msg)) return;

  const persona = getPersona(student.persona);
  const personaPrompt = persona.prompt ?? SYSTEM_PROMPTS.tutor;

  try {
    // Get the largest photo
    const photo = msg.photo[msg.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);

    // We need to let the user know we're processing
    await ctx.reply(`${persona.emoji} Kakak lagi liat fotonya ya... Sebentar ya 👀`);

    // Send to LLM with vision
    const response = await callLLM("tutor", [
      {
        role: "system",
        content: `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}\nTone: ${persona.toneRules.join(", ")}\n\n${personaPrompt}\n\nStudent name: ${student.name}\nGrade: ${student.gradeLevel}`,
      },
      {
        role: "user",
        content: [
          { type: "text" as const, text: "Ada foto dari murid. Coba lihat dan bantu dia:" },
          { type: "image_url" as const, image_url: { url: fileLink.href } },
        ],
      },
    ]);

    // Safety scan
    const safeResponse = await scanResponse(student.id, response ?? "");
    const finalResponse = safeResponse ?? response ?? "Wah Kakak lagi liat fotonya ya! Keren! 😊";

    await ctx.reply(finalResponse);

    // Save to session context for chat history
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
    console.error("[vision] LLM call failed:", err);
    await ctx.reply(
      `${persona.emoji} Wah, Kakak lagi proses fotonya... Tapi ada gangguan teknis nih. ` +
        `Coba kirim ulang fotonya ya! 😊`,
    );
  }
}
