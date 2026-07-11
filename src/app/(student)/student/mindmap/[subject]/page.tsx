import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { ReactFlowMindmap } from "./ReactFlowMindmap";
import { parseMindmapFromMarkdown } from "@/lib/mindmap-template";

async function MindmapContent({ materialId }: { materialId: string }) {
  noStore();
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, topic: true, processedContent: true, metadata: true },
  });
  if (!material) return <div className="text-center py-20 text-amber-400">Materi tidak ditemukan</div>;

  const metadata = material.metadata as Record<string, any> | null;
  const raw = (metadata?.slides as string) || material.processedContent || "";
  if (!raw) return <div className="text-center py-20 text-amber-400">Konten belum tersedia</div>;

  const rawNodes = parseMindmapFromMarkdown(raw);

  if (rawNodes.length === 0) return <div className="text-center py-20 text-amber-400">Belum ada konten</div>;

  return (
    <ReactFlowMindmap
      centerTitle={material.topic || "Mindmap"}
      rawNodes={rawNodes}
    />
  );
}

export default async function MindmapPage({
  params, searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams?: Promise<{ id?: string }>;
}) {
  const { subject } = await params;
  const id = searchParams ? (await searchParams).id : undefined;

  return (
    <div className="min-h-0 flex-1 flex flex-col" style={{ background: "linear-gradient(135deg, #fef9ef, #fdf2e9, #fef7e6)" }}>
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-amber-200/50 bg-white/60 backdrop-blur-sm z-10">
        <Link href={`/student/subject/${subject}`} className="text-sm text-amber-700 hover:text-amber-900 transition-colors">← Kembali</Link>
        <h1 className="text-base font-bold text-amber-900 truncate mx-2" style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}>🧠 Peta Konsep</h1>
        <div />
      </div>
      <div className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-amber-400 text-sm">
            <span className="animate-bounce text-4xl mr-3">🧠</span> Menyiapkan...
          </div>
        }>
          {id ? <MindmapContent materialId={id} /> : (
            <div className="text-center py-20 text-amber-400">ID materi tidak ditemukan</div>
          )}
        </Suspense>
      </div>
      <div className="px-6 py-2 text-center border-t border-amber-200/50 shrink-0 bg-white/40 z-10">
        <p className="text-xs text-amber-300" style={{ fontFamily: "'Nunito', sans-serif" }}>🧠 Peta Konsep interaktif — scroll, zoom, & drag</p>
      </div>
    </div>
  );
}
