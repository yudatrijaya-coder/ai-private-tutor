import { prisma } from "@/lib/prisma";
import { AgentPipelineView } from "./AgentPipelineView";
import { QueueMonitor } from "./QueueMonitor";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  // Group by agentType, count by status
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

  return (
    <div className="space-y-6">
      <QueueMonitor />
      <AgentPipelineView agents={agents} />
    </div>
  );
}
