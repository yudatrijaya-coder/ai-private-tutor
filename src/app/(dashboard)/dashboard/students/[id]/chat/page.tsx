import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChatView } from "./ChatView";

export const dynamic = "force-dynamic";

export default async function ChatHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student =
    (await prisma.student.findUnique({
      where: { id },
      select: { id: true, name: true, gradeLevel: true },
    })) ??
    (await prisma.student.findUnique({
      where: { studentId: id },
      select: { id: true, name: true, gradeLevel: true },
    }));
  if (!student) notFound();

  const chats = await prisma.chatLog.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <a
          href={`/dashboard/students/${id}`}
          className="text-sm hover:underline"
          style={{ color: "var(--su-text-dim)" }}
        >
          ← Kembali ke profil
        </a>
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--su-bg-card)",
          border: "1px solid var(--su-border)",
        }}
      >
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          💬 Riwayat Chat — {student.name}
        </h1>
        <p className="text-sm" style={{ color: "var(--su-text-dim)" }}>
          {chats.length} pesan terakhir
        </p>
      </div>

      <ChatView chats={chats.reverse()} />
    </div>
  );
}
