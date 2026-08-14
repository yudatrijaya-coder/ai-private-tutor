import { prisma } from "../src/lib/prisma";

async function main() {
  const a = await prisma.examAttempt.findFirst({
    where: { student: { studentId: "RAIHAN001" }, exam: { type: "WEEKLY" } },
    include: {
      exam: { include: { questions: { select: { id: true, question: true, topic: true, correctAnswer: true, explanation: true } } } },
      improvementPlan: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!a) { console.log("tidak ada attempt"); return; }

  console.log("=== DETAILS (raw) ===");
  const details = (a.details as any) || {};
  console.log(JSON.stringify(details, null, 1).slice(0, 800));

  console.log("\n=== IMPROVEMENT PLAN ===");
  const ip = a.improvementPlan;
  if (ip) {
    console.log("status:", ip.status);
    console.log("narrative:\n", ip.aiNarrative);
    console.log("\nrecommendedSchedule:\n", JSON.stringify(ip.recommendedSch, null, 1));
    if ((ip as any).focusTopics) console.log("\nfocusTopics:\n", JSON.stringify((ip as any).focusTopics, null, 1));
    if ((ip as any).weakAreas) console.log("\nweakAreas:\n", JSON.stringify((ip as any).weakAreas, null, 1));
  } else {
    console.log("TIDAK ADA improvement plan!");
  }
}
main().finally(() => process.exit(0));
