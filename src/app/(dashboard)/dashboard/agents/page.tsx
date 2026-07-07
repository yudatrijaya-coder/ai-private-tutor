import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { AgentPipelineView } from "./AgentPipelineView";
import { QueueMonitor } from "./QueueMonitor";
import { PipelineTrigger } from "./PipelineTrigger";
import { SkeletonAgentGrid, SkeletonQueueMonitor } from "@/components/Skeleton";

export const dynamic = "force-dynamic";

/* ── Agent summary section ── */

async function AgentSummarySection() {
  const logs = await prisma.agentLog.groupBy({
    by: ["agentType", "status"],
    _count: { id: true },
  });

  // Transform into per-agent-type summary
  const agentMap = new Map<
    string,
    {
      agentType: string;
      queued: number;
      active: number;
      completed: number;
      failed: number;
      retrying: number;
      total: number;
    }
  >();

  for (const row of logs) {
    const type = row.agentType;
    if (!agentMap.has(type)) {
      agentMap.set(type, {
        agentType: type,
        queued: 0,
        active: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
        total: 0,
      });
    }
    const entry = agentMap.get(type)!;
    const count = row._count.id;
    entry.total += count;

    switch (row.status) {
      case "QUEUED":
        entry.queued = count;
        break;
      case "ACTIVE":
        entry.active = count;
        break;
      case "COMPLETED":
        entry.completed = count;
        break;
      case "FAILED":
        entry.failed = count;
        break;
      case "RETRYING":
        entry.retrying = count;
        break;
    }
  }

  const agents = Array.from(agentMap.values());

  return <AgentPipelineView agents={agents} />;
}

/* ── Page ── */

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          🤖 Agent Pipeline
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--su-text-dim)" }}>
          Status real-time & trigger pipeline agent AI
        </p>
      </div>

      {/* Pipeline Trigger */}
      <PipelineTrigger />

      {/* Queue Monitor — client component with its own fetch */}
      <Suspense fallback={<SkeletonQueueMonitor />}>
        <QueueMonitor />
      </Suspense>

      {/* Agent Summary — server data */}
      <Suspense fallback={<SkeletonAgentGrid />}>
        <AgentSummarySection />
      </Suspense>
    </div>
  );
}
