import { SkeletonStatsBar, SkeletonCard } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <SkeletonStatsBar />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="flex gap-3 mt-8">
        <div
          className="px-4 py-2 rounded-lg"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <div className="animate-pulse w-28 h-4 rounded" style={{ backgroundColor: "var(--su-bg-hover)" }} />
        </div>
        <div
          className="px-4 py-2 rounded-lg"
          style={{ backgroundColor: "var(--su-bg-card)", border: "1px solid var(--su-border)" }}
        >
          <div className="animate-pulse w-20 h-4 rounded" style={{ backgroundColor: "var(--su-bg-hover)" }} />
        </div>
      </div>
    </div>
  );
}
