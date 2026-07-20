import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { ReactFlowMindmap } from "./ReactFlowMindmap";
import { parseMindmapFromMarkdown, type MindmapNode } from "@/lib/mindmap-template";
import { MindmapTracker } from "@/components/MindmapTracker";

async function MindmapContent({ materialId, source }: { materialId: string; source?: string }) {
  noStore();
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, topic: true, processedContent: true, metadata: true },
  });
  if (!material) return <div className="text-center py-20 text-amber-400">Materi tidak ditemukan</div>;

  const metadata = material.metadata as Record<string, any> | null;

  // Pick mindmap data based on source
  let rawNodes = (source === "sibi" ? metadata?.mindmap_sibi : metadata?.mindmap) as MindmapNode[] | undefined;
  
  // Fallback if requested source is empty
  if (!rawNodes || rawNodes.length === 0) {
    rawNodes = (metadata?.mindmap || metadata?.mindmap_sibi) as MindmapNode[] | undefined;
  }

  if (rawNodes && rawNodes.length > 0) {
    return (
      <ReactFlowMindmap
        centerTitle={material.topic || "Mindmap"}
        rawNodes={rawNodes}
      />
    );
  }

  // Fallback: parse dari slides markdown
  const raw = (metadata?.slide as string) || material.processedContent || "";
  if (!raw) return <div className="text-center py-20 text-amber-400">Konten belum tersedia</div>;

  rawNodes = parseMindmapFromMarkdown(raw);

  // Fallback flat bullet: coba pakai slidesToMindmap
  if (!rawNodes || rawNodes.length === 0) {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const bulletLines = lines
      .filter(l => l.length > 0)
      .filter(l => !/^[-•=*]{1,3}$/.test(l))
      .map(l => l.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim())
      .filter(l => l.length > 5);
    if (bulletLines.length > 0) {
      rawNodes = [{
        id: "branch-0",
        label: "Pokok Bahasan",
        children: bulletLines.map((label) => ({
          label: label.length > 60 ? label.substring(0, 57) + "..." : label,
        })),
      }];
    }
  }

  if (!rawNodes || rawNodes.length === 0) return <div className="text-center py-20 text-amber-400">Belum ada konten</div>;

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
  searchParams?: Promise<{ id?: string; source?: string }>;
}) {
  const { subject } = await params;
  const id = searchParams ? (await searchParams).id : undefined;
  const sp = searchParams ? await searchParams : undefined;
  const source = sp?.source;

  return (
    <MindmapTracker subject={decodeURIComponent(subject)} materialId={id}>
    <div className="min-h-0 flex-1 flex flex-col" style={{ background: "linear-gradient(135deg, #fef9ef, #fdf2e9, #fef7e6)" }}>
      {/* Source Selector Bar */}
      <div className="px-6 py-2 flex items-center justify-center gap-4 bg-amber-50/50 border-b border-amber-100">
          <Link href={`?id=${id}&source=default`} className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all ${source !== 'sibi' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-200/30 text-amber-600'}`}>🤖 LLM</Link>
          <Link href={`?id=${id}&source=sibi`} className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all ${source === 'sibi' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-200/30 text-amber-600'}`}>📚 SIBI</Link>
      </div>

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
          {id ? <MindmapContent materialId={id} source={source} /> : (
            <div className="text-center py-20 text-amber-400">ID materi tidak ditemukan</div>
          )}
        </Suspense>
      </div>
      <div className="px-6 py-2 text-center border-t border-amber-200/50 shrink-0 bg-white/40 z-10">
        <p className="text-xs text-amber-300" style={{ fontFamily: "'Nunito', sans-serif" }}>🧠 Peta Konsep interaktif — scroll, zoom, & drag</p>
      </div>
    </div>
    </MindmapTracker>
  );
}
