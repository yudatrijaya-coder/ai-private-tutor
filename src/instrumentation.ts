/**
 * Next.js Instrumentation — runs once at server startup.
 *
 * Initialises BullMQ workers for the agent pipeline.
 * Gracefully degrades to in-memory queue when Redis is unavailable.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // instrumentation runs in both Node.js and Edge runtimes.
  // Skip for Edge — BullMQ/ioredis need Node.js APIs.
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { initQueues } = await import("@/queue/runner");
  const { processScrapeJob } = await import("@/agents/content/worker");
  const { processCurriculumReviewJob } = await import(
    "@/agents/curriculum/worker"
  );
  const { processAssessmentGenerate, processAssessmentEvaluate } =
    await import("@/agents/assessment/worker");
  const { processMediaRender, processMediaYtFallback } = await import(
    "@/agents/media/worker"
  );
  const { processGuardianReportJob } = await import(
    "@/agents/guardian/worker"
  );
  const { processSchedulerAssign, processSchedulerReminder } = await import(
    "@/agents/scheduler/worker"
  );

  const result = await initQueues({
    "content:scrape": processScrapeJob as any,
    "curriculum:review": processCurriculumReviewJob as any,
    "assessment:generate": processAssessmentGenerate as any,
    "assessment:evaluate": processAssessmentEvaluate as any,
    "media:render": processMediaRender as any,
    "media:yt-fallback": processMediaYtFallback as any,
    "guardian:report": processGuardianReportJob as any,
    "scheduler:assign": processSchedulerAssign as any,
    "scheduler:reminder": processSchedulerReminder as any,
  });

  console.log(`[instrumentation] Queues: ${result.ok ? "OK" : "DISABLED"}`);

  // If Redis is unavailable, register local in-memory processors
  if (!result.ok) {
    const { registerProcessor } = await import("@/queue/local");

    // Local adapters — extract job.data from BullMQ Job signature
    // but receive the payload directly since local queue calls with raw data
    const adapters: Record<string, (data: any) => Promise<void>> = {
      "content:scrape": (data) => processScrapeJob({ data, id: "local", name: "content:scrape" } as any),
      "curriculum:review": (data) => processCurriculumReviewJob({ data, id: "local", name: "curriculum:review" } as any),
      "assessment:generate": (data) => processAssessmentGenerate({ data, id: "local", name: "assessment:generate" } as any),
      "assessment:evaluate": (data) => processAssessmentEvaluate({ data, id: "local", name: "assessment:evaluate" } as any),
      "media:render": (data) => processMediaRender({ data, id: "local", name: "media:render" } as any),
      "media:yt-fallback": (data) => processMediaYtFallback({ data, id: "local", name: "media:yt-fallback" } as any),
      "guardian:report": (data) => processGuardianReportJob({ data, id: "local", name: "guardian:report" } as any),
      "scheduler:assign": (data) => processSchedulerAssign({ data, id: "local", name: "scheduler:assign" } as any),
      "scheduler:reminder": (data) => processSchedulerReminder({ data, id: "local", name: "scheduler:reminder" } as any),
    };

    for (const [name, fn] of Object.entries(adapters)) {
      registerProcessor(name, fn);
    }

    console.log(`[instrumentation] Registered ${Object.keys(adapters).length} local queue processors`);
  }
}
