/**
 * Reminder & Homework handler — personal assistant features
 *
 * LLM detects intent and returns [REMINDER:<action>:<json>] or [HOMEWORK:<action>:<json>]
 * This handler parses and executes the action.
 */

import type { Context } from "telegraf";
import type { Student } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { bot } from "../bot";

// ─── Parse helpers ────────────────────────────────────────────

function extractCommand(text: string, prefix: string): { action: string; data: Record<string, any> } | null {
  const regex = new RegExp(`\\[${prefix}:([^\\]]+)\\]`, "i");
  const match = text.match(regex);
  if (!match) return null;

  const raw = match[1].trim();
  // Format: ACTION or ACTION:{...json...}
  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) return { action: raw.toUpperCase(), data: {} };

  const action = raw.slice(0, colonIdx).toUpperCase();
  try {
    const data = JSON.parse(raw.slice(colonIdx + 1));
    return { action, data };
  } catch {
    return { action, data: {} };
  }
}

// ─── Reminder handlers ────────────────────────────────────────

async function handleCreateReminder(studentId: string, data: Record<string, any>): Promise<string> {
  const title = data.title || "Pengingat";
  const remindAt = data.remindAt ? new Date(data.remindAt) : new Date(Date.now() + 3600_000); // default 1 jam
  const category = data.category || "general";
  const description = data.description || null;

  const reminder = await prisma.reminder.create({
    data: { studentId, title, description, remindAt, category },
  });

  return `✅ Baik, aku catat ya!\n📌 *${title}*${description ? `\n📝 ${description}` : ""}\n⏰ ${remindAt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}\n\nNanti aku ingatkan pas waktunya ya! 🫶`;
}

async function handleListReminders(studentId: string): Promise<string> {
  const reminders = await prisma.reminder.findMany({
    where: { studentId, status: "pending", remindAt: { gte: new Date() } },
    orderBy: { remindAt: "asc" },
    take: 10,
  });

  if (reminders.length === 0) return "📭 Belum ada pengingat tersimpan. Bilang aja *'Ingatkan aku ulangan matematika besok'* ya! 😊";

  const lines = reminders.map((r, i) => {
    const date = r.remindAt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    return `${i + 1}. *${r.title}* — ${date}${r.category !== "general" ? ` (${r.category})` : ""}`;
  });

  return `📋 *Daftar Pengingat:*\n\n${lines.join("\n")}`;
}

async function handleDeleteReminder(studentId: string, data: Record<string, any>): Promise<string> {
  if (data.all) {
    await prisma.reminder.updateMany({
      where: { studentId, status: "pending" },
      data: { status: "cancelled" },
    });
    return "✅ Semua pengingat dihapus!";
  }

  const count = data.id
    ? await prisma.reminder.deleteMany({ where: { id: data.id, studentId } }).then(r => r.count)
    : data.title
      ? await prisma.reminder.deleteMany({ where: { title: { contains: data.title }, studentId, status: "pending" } }).then(r => r.count)
      : 0;

  return count > 0 ? "✅ Pengingat dihapus!" : "❌ Pengingat tidak ditemukan.";
}

// ─── Homework handlers ────────────────────────────────────────

async function handleCreateHomework(studentId: string, data: Record<string, any>): Promise<string> {
  const subject = data.subject || "Umum";
  const description = data.description || "Tugas";
  const deadlineAt = data.deadlineAt ? new Date(data.deadlineAt) : new Date(Date.now() + 86400_000 * 3); // default 3 hari

  const task = await prisma.homeworkTask.create({
    data: { studentId, subject, description, deadlineAt },
  });

  const dl = deadlineAt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  return `✅ Tugas *${subject}* dicatat!\n📝 ${description}\n📅 Deadline: ${dl}\n\nSemangat ya! 💪`;
}

async function handleListHomework(studentId: string): Promise<string> {
  const tasks = await prisma.homeworkTask.findMany({
    where: { studentId, status: { in: ["pending", "overdue"] } },
    orderBy: { deadlineAt: "asc" },
    take: 10,
  });

  if (tasks.length === 0) return "🎉 Yeay, gak ada PR yang pending! Santai dulu... atau mau aku cariin soal latihan? 😄";

  const now = new Date();
  const lines = tasks.map((t, i) => {
    const overdue = t.deadlineAt < now;
    const dls = t.deadlineAt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    return `${i + 1}. *${t.subject}* — ${t.description.substring(0, 50)}${t.description.length > 50 ? "..." : ""}\n   📅 ${dls}${overdue ? " ⚠️ LEWAT DEADLINE!" : ""}`;
  });

  return `📚 *Daftar PR:*\n\n${lines.join("\n\n")}`;
}

async function handleSubmitHomework(studentId: string, data: Record<string, any>): Promise<string> {
  const count = data.id
    ? await prisma.homeworkTask.updateMany({ where: { id: data.id, studentId }, data: { status: "submitted" } }).then(r => r.count)
    : data.subject
      ? await prisma.homeworkTask.updateMany({ where: { subject: data.subject, studentId, status: "pending" }, data: { status: "submitted" } }).then(r => r.count)
      : 0;

  return count > 0 ? "✅ Tugas ditandai selesai! Mantap! 🎉" : "❌ Tugas tidak ditemukan.";
}

// ─── Main entry point ─────────────────────────────────────────

export async function handleReminderCommand(ctx: Context, student: Student, response: string): Promise<void> {
  // Check for [REMINDER] command
  const reminderCmd = extractCommand(response, "REMINDER");

  if (reminderCmd) {
    let reply: string;
    switch (reminderCmd.action) {
      case "CREATE":
        reply = await handleCreateReminder(student.id, reminderCmd.data);
        break;
      case "LIST":
        reply = await handleListReminders(student.id);
        break;
      case "DELETE":
        reply = await handleDeleteReminder(student.id, reminderCmd.data);
        break;
      default:
        reply = "❌ Perintah reminder tidak dikenal.";
    }
    await ctx.reply(reply, { parse_mode: "Markdown" });
    return;
  }

  // Check for [HOMEWORK] command
  const hwCmd = extractCommand(response, "HOMEWORK");

  if (hwCmd) {
    let reply: string;
    switch (hwCmd.action) {
      case "CREATE":
        reply = await handleCreateHomework(student.id, hwCmd.data);
        break;
      case "LIST":
        reply = await handleListHomework(student.id);
        break;
      case "SUBMIT":
        reply = await handleSubmitHomework(student.id, hwCmd.data);
        break;
      default:
        reply = "❌ Perintah tugas tidak dikenal.";
    }
    await ctx.reply(reply, { parse_mode: "Markdown" });
    return;
  }

  // Not a reminder/homework command — reply as normal
  await ctx.reply(response);
}

// ─── Cron reminder sender ─────────────────────────────────────

export async function processPendingReminders(): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 60_000); // 1 menit ke depan

  const reminders = await prisma.reminder.findMany({
    where: {
      status: "pending",
      remindAt: { gte: now, lte: windowEnd },
    },
    include: { student: true },
  });

  for (const reminder of reminders) {
    try {
      if (reminder.student.telegramId) {
        await bot?.telegram.sendMessage(
          reminder.student.telegramId,
          `⏰ *Pengingat!*\n\n📌 ${reminder.title}${reminder.description ? `\n📝 ${reminder.description}` : ""}\n\nJangan lupa ya! 🫶`,
          { parse_mode: "Markdown" },
        );
      }

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "sent" },
      });

      console.log(`[reminder] Sent reminder ${reminder.id} to student ${reminder.studentId}`);
    } catch (err) {
      console.error(`[reminder] Failed to send reminder ${reminder.id}:`, err);
    }
  }

  // Mark overdue homework
  const overdueThreshold = new Date(now.getTime() - 3600_000); // 1 jam lewat deadline
  const overdueTasks = await prisma.homeworkTask.updateMany({
    where: {
      status: "pending",
      deadlineAt: { lte: overdueThreshold },
    },
    data: { status: "overdue" },
  });

  if (overdueTasks.count > 0) {
    console.log(`[reminder] Marked ${overdueTasks.count} homework as overdue`);
  }
}
