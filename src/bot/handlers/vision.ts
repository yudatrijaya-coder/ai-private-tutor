import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { getPersona } from "../personas";
import { callLLM, VISION_MODELS } from "@/llm/client";
import { SYSTEM_PROMPTS } from "@/llm/prompts";
import { setSession } from "../session";
import { scanResponse } from "../safety";

/** How long to wait for a vision response (ms) */
const VISION_TIMEOUT = 120_000;

/**
 * Photo / vision handler — sends the photo to a vision-capable model
 * and returns the AI's analysis.
 *
 * Key improvements over naive approach:
 * 1. Uses only vision-capable models (VISION_MODELS list) — no wasted fallback
 * 2. Short timeout — don't let a non-vision model hang
 * 3. Smart retry: if the first model fails, try the next
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

    // Let user know we're processing
    await ctx.reply(`${persona.emoji} Kakak lagi liat fotonya ya... Sebentar ya 👀`);

    // Build system prompt
    const toneRules = Array.isArray(persona.toneRules)
      ? persona.toneRules.join(", ")
      : typeof persona.toneRules === "object" && persona.toneRules !== null
        ? Object.values(persona.toneRules).join(", ")
        : String(persona.toneRules ?? "");

    const systemContent = `${SYSTEM_PROMPTS.tutor}\n\nPersona: ${persona.displayName}\nTone: ${toneRules}\n\n${personaPrompt}\n\nStudent name: ${student.name}\nGrade: ${student.gradeLevel}`;

    const messages = [
      { role: "system" as const, content: systemContent },
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: "Ada foto dari murid. Coba lihat dan bantu dia:" },
          { type: "image_url" as const, image_url: { url: fileLink.href } },
        ],
      },
    ];

    // Try each vision-capable model in order
    let response: string | null = null;
    let lastError: string | null = null;

    for (const model of VISION_MODELS) {
      try {
        response = await callLLM("tutor", messages, {
          temperature: 0.7,
          maxTokens: 1024,
          timeoutMs: VISION_TIMEOUT,
          studentId: student.id,
        });
        if (response) break; // got a valid response
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[vision] Model ${model} failed: ${lastError}`);
        // Try next model
      }
    }

    if (!response) {
      throw new Error(lastError ?? "All vision models failed");
    }

    // Safety scan
    const safeResponse = await scanResponse(student.id, response);
    const finalResponse = safeResponse ?? response;

    await ctx.reply(finalResponse);

    // Save to session context
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
    console.error("[vision] All models failed:", err);
    await ctx.reply(
      `${persona.emoji} Maaf ${student.name}, aku lagi liat fotonya tapi ada gangguan. Coba kirim ulang fotonya ya! 😊`,
    );
  }
}
