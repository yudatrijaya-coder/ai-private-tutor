/**
 * Fill remaining pending materials (content <50 chars OR slides missing) for
 * latest curriculum per student — direct per-material LLM generation, bypasses
 * batch-generate route's name-matching (which fails on newlines/brackets).
 *
 * Run: npx tsx scripts/fill-pending-content.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { callLLM } from "../src/llm/client";
import type { AgentRole } from "../src/llm/types";
import { normalizeVideoUrl } from "../src/lib/video-url";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[t.slice(0, i).trim()] = v;
  }
}
loadEnv();

const TARGETS = [
  "0d3fbf85-a1ee-4c5c-bdd9-f752ed75b69d", // Raihan SMP_1
  "e30b6559-1d33-4aa5-a39a-22102f29894d", // Shofi SMA_2
  "7e99e9fa-d631-4bf9-a8d1-816f0d222dcc", // Tiumu SMA_2
];

function gradeLabel(gl: string): string {
  if (gl === "SD_5") return "SD Kelas 5";
  if (gl === "SMP_1") return "SMP Kelas 7";
  return "SMA Kelas 11";
}

function parseBlock(resp: string) {
  const content = resp.match(/===KONTEN:\n?([\s\S]*?)(?:===SLIDES:|$)/)?.[1]?.trim() ?? null;
  const slides = resp.match(/===SLIDES:\n?([\s\S]*?)(?:===VIDEO:|$)/)?.[1]?.trim() ?? null;
  const video = resp.match(/===VIDEO:\n?([\s\S]*?)(?:===SELESAI|$)/)?.[1]?.trim() ?? null;
  return { content, slides, video };
}

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\n/g, " ").slice(0, 60);
}

async function main(): Promise<void> {
  let done = 0;
  let failed = 0;
  for (const studentId of TARGETS) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      console.log("skip " + studentId + ": not found");
      continue;
    }
    const curriculum = await prisma.curriculum.findFirst({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: { materials: { orderBy: { weekOrder: "asc" } } },
    });
    if (!curriculum) {
      console.log("skip " + student.name + ": no curriculum");
      continue;
    }

    const pending = curriculum.materials.filter((m) => {
      const contentLen = (m.processedContent ?? "").length;
      const hasSlides = Boolean((m.metadata as Record<string, unknown>)?.slides);
      return contentLen < 50 || !hasSlides;
    });
    console.log("\n=== " + student.name + ": " + pending.length + " pending");

    for (const m of pending) {
      const needContent = (m.processedContent ?? "").length < 50;
      const subTopic = m.subTopic ?? m.topic;
      const topicLine =
        "Subject: " + m.subject + " | Topic: " + m.topic + " | SubTopic: " + subTopic + " | Week: " + m.weekOrder;
      const kontenInstr = needContent
        ? "300-500 kata konten pembelajaran lengkap dengan contoh konkret"
        : "ringkasan 1 paragraf saja, konten utama sudah ada, hanya slides yang dibutuhkan";
      const prompt =
        "Kamu adalah pengajar kurikulum Merdeka. Buatkan materi ajar untuk " +
        gradeLabel(student.gradeLevel) +
        " dalam Bahasa Indonesia.\n\nSUB-TOPIK:\n" +
        topicLine +
        "\n\nFormat EXACT:\n===KONTEN:\n{" +
        kontenInstr +
        "}\n===SLIDES:\n{5-8 bullet point, tiap bullet max 15 kata, Bahasa Indonesia}\n===VIDEO:\n{1 judul video YouTube edukatif Bahasa Indonesia yang relevan}\n===SELESAI";

      try {
        const resp = await callLLM(
          "content",
          [
            { role: "system", content: "Kamu pembuat konten pembelajaran. Ikuti format output PERSIS." },
            { role: "user", content: prompt },
          ],
          { temperature: 0.6 }
        );
        if (!resp) throw new Error("empty LLM response");
        const parsed = parseBlock(resp);
        const meta = ((m.metadata as Record<string, unknown>) || {}) as Record<string, unknown>;
        const newSlides: string | undefined = parsed.slides ?? (meta.slides as string | undefined);
        await prisma.material.update({
          where: { id: m.id },
          data: {
            processedContent: needContent ? parsed.content ?? m.processedContent ?? "" : m.processedContent ?? "",
            videoUrl: parsed.video ? normalizeVideoUrl(parsed.video) || m.videoUrl : m.videoUrl,
            metadata: { ...meta, slides: newSlides },
            status: "READY",
          },
        });
        done++;
        console.log(
          "  OK [" + m.subject + "] " + clean(subTopic) +
          " content=" + (needContent ? (parsed.content ? "new" : "MISS") : "kept") +
          " slides=" + (parsed.slides ? "new" : "MISS")
        );
      } catch (e) {
        failed++;
        console.log("  ERR [" + m.subject + "] " + clean(subTopic) + ": " + String(e).slice(0, 120));
      }
    }
  }
  console.log("\nDONE: " + done + " filled, " + failed + " failed");
  await prisma.$disconnect();
}

main();