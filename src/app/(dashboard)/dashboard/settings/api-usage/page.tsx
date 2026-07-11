import { prisma } from "@/lib/prisma";
import { UsageView } from "./UsageView";

export const dynamic = "force-dynamic";

export default async function ApiUsagePage() {
  // Aggregate usage stats
  const [totalUsage, byAgent, byStudent, recentUsage] = await Promise.all([
    // Total aggregates
    prisma.apiUsage.aggregate({
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true, costUsd: true },
      _count: true,
    }),

    // By agent type
    prisma.apiUsage.groupBy({
      by: ["agentType"],
      _sum: { totalTokens: true, costUsd: true, latencyMs: true },
      _count: true,
      orderBy: { _sum: { costUsd: "desc" } },
    }),

    // By student
    prisma.apiUsage.groupBy({
      by: ["studentId"],
      _sum: { totalTokens: true, costUsd: true },
      _count: true,
      orderBy: { _sum: { costUsd: "desc" } },
      take: 10,
    }),

    // Recent usage (last 50)
    prisma.apiUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  // Resolve student names for by-student data
  const studentIds = byStudent.map((s) => s.studentId).filter(Boolean) as string[];
  const students = studentIds.length > 0
    ? await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true },
      })
    : [];
  const studentMap = new Map(students.map((s) => [s.id, s.name]));

  const total = totalUsage._sum;
  const count = totalUsage._count;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          💰 Penggunaan API
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Total biaya dan token yang digunakan oleh seluruh agent
        </p>
      </div>

      <UsageView
        total={{ ...total, count }}
        byAgent={byAgent.map((a) => ({
          agentType: a.agentType ?? "unknown",
          totalTokens: a._sum.totalTokens ?? 0,
          costUsd: a._sum.costUsd ?? 0,
          avgLatency: a._sum.latencyMs ? Math.round(a._sum.latencyMs / a._count) : 0,
          count: a._count,
        }))}
        byStudent={byStudent.map((s) => ({
          studentId: s.studentId ?? "",
          name: studentMap.get(s.studentId ?? "") ?? "Unknown",
          totalTokens: s._sum.totalTokens ?? 0,
          costUsd: s._sum.costUsd ?? 0,
          count: s._count,
        }))}
        recentUsage={recentUsage.map((u) => ({
          id: u.id,
          model: u.model,
          agentType: u.agentType ?? "",
          promptTokens: u.promptTokens,
          completionTokens: u.completionTokens,
          totalTokens: u.totalTokens,
          latencyMs: u.latencyMs ?? 0,
          costUsd: u.costUsd,
          createdAt: u.createdAt,
        }))}
      />
    </div>
  );
}
