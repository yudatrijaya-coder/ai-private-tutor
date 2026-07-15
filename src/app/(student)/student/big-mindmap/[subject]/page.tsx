import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";
import { BigMindmap } from "./BigMindmap";
import { parseMindmapFromMarkdown, type MindmapNode } from "@/lib/mindmap-template";

const STUDENT_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ?? "student-dev-secret-change-in-production",
);

interface TopicNode {
  label: string;
  materialId: string;
  children: { label: string }[];
}

async function getSessionStudent(): Promise<{ studentId: string; gradeLevel?: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, STUDENT_JWT_SECRET);
    return payload as { studentId: string; gradeLevel?: string };
  } catch {
    return null;
  }
}

async function BigMindmapContent({ subjectName }: { subjectName: string }) {
  noStore();

  const session = await getSessionStudent();
  if (!session) return <div className="text-center py-20 text-amber-400">Silakan login dulu</div>;

  const student = await prisma.student.findUnique({
    where: { studentId: session.studentId },
    select: { id: true, gradeLevel: true },
  });
  if (!student) return <div className="text-center py-20 text-amber-400">Siswa tidak ditemukan</div>;

  // Get all materials for this subject (latest curriculum)
  const curriculum = await prisma.curriculum.findFirst({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!curriculum) return <div className="text-center py-20 text-amber-400">Kurikulum belum tersedia</div>;

  const materials = await prisma.material.findMany({
    where: { curriculumId: curriculum.id, subject: subjectName },
    select: { id: true, topic: true, rawContent: true, metadata: true },
    orderBy: { weekOrder: "asc" },
  });

  if (materials.length === 0) {
    return <div className="text-center py-20 text-amber-400">Belum ada materi untuk {subjectName}</div>;
  }

  // Build topic nodes: parse mindmap from each material's slides
  const topics: TopicNode[] = materials.map((m) => {
    let children: { label: string }[] = [];

    // 1st: use pre-generated metadata.mindmap
    const metaMindmap = m.metadata as Record<string, any> | null;
    const storedMindmap = metaMindmap?.mindmap as MindmapNode[] | undefined;
    if (storedMindmap && storedMindmap.length > 0) {
      // Flatten all children from all branches into one set
      const seen = new Set<string>();
      storedMindmap.forEach((branch) => {
        branch.children.forEach((c) => {
          if (!seen.has(c.label) && c.label.length > 0) {
            seen.add(c.label);
            children.push(c);
          }
        });
      });
    }

    // 2nd fallback: parse from rawContent
    if (children.length === 0 && m.rawContent) {
      const parsed = parseMindmapFromMarkdown(m.rawContent);
      const seen = new Set<string>();
      parsed.forEach((branch) => {
        branch.children.forEach((c) => {
          if (!seen.has(c.label) && c.label.length > 0) {
            seen.add(c.label);
            children.push({ label: c.label.length > 55 ? c.label.slice(0, 52) + "..." : c.label });
          }
        });
      });
    }

    // 3rd fallback: extract key bullet lines from rawContent
    if (children.length === 0 && m.rawContent) {
      const lines = m.rawContent.split("\n")
        .map(l => l.trim())
        .filter(l => /^[-*•]\s/.test(l) || /^\d+\.\s/.test(l))
        .map(l => l.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter(l => l.length > 5 && l.length < 60);
      const seen = new Set<string>();
      lines.slice(0, 4).forEach((l) => {
        const shortLabel = l.length > 50 ? l.slice(0, 47) + "..." : l;
        if (!seen.has(shortLabel)) {
          seen.add(shortLabel);
          children.push({ label: shortLabel });
        }
      });
    }

    // Limit to 4 sub-topics per material
    return {
      label: m.topic,
      materialId: m.id,
      children: children.slice(0, 4),
    };
  });

  const gradeLevel = student.gradeLevel || undefined;

  return (
    <>
      {topics.length > 0 && (
        <div className="flex-1">
          <BigMindmap subjectName={subjectName} topics={topics} gradeLevel={gradeLevel} />
        </div>
      )}
    </>
  );
}

export default async function BigMindmapPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;
  const decodedSubject = decodeURIComponent(subject);

  return (
    <div className="min-h-0 flex-1 flex flex-col" style={{ background: "linear-gradient(135deg, #fef9ef, #fdf2e9, #fef7e6)" }}>
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-amber-200/50 bg-white/60 backdrop-blur-sm z-10">
        <Link
          href={`/student/subject/${encodeURIComponent(decodedSubject)}`}
          className="text-sm text-amber-700 hover:text-amber-900 transition-colors"
        >
          ← Kembali
        </Link>
        <h1 className="text-base font-bold text-amber-900 truncate mx-2" style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}>
          🗺️ Peta Besar — {decodedSubject}
        </h1>
        <div />
      </div>

      {/* Divider: petunjuk */}
      <div className="px-6 py-1.5 text-center shrink-0">
        <p className="text-xs text-amber-400" style={{ fontFamily: "'Nunito', sans-serif" }}>
          🧭 Klik topic untuk lihat peta konsep detail • scroll/zoom untuk jelajahi semua cabang
        </p>
      </div>

      {/* Mindmap */}
      <Suspense fallback={
        <div className="flex items-center justify-center flex-1 text-amber-400 text-sm">
          <span className="animate-bounce text-4xl mr-3">🗺️</span> Menyusun peta besar...
        </div>
      }>
        <BigMindmapContent subjectName={decodedSubject} />
      </Suspense>
    </div>
  );
}
