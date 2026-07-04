import { SkeletonQueueMonitor, SkeletonAgentGrid } from "@/components/Skeleton";

export default function AgentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="animate-pulse w-48 h-8 rounded mb-2" style={{ backgroundColor: "var(--su-bg-hover)" }} />
        <div className="animate-pulse w-72 h-4 rounded" style={{ backgroundColor: "var(--su-bg-hover)" }} />
      </div>

      <SkeletonQueueMonitor />
      <SkeletonAgentGrid />
    </div>
  );
}
