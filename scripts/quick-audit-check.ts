import { prisma } from "../src/lib/prisma";

async function main() {
  const mats = await prisma.material.findMany({
    where: {
      gradeLevel: { in: ["SMP_1", "SMA_2"] },
      videoUrl: { not: null },
      NOT: { videoUrl: "" },
    },
    select: { id: true, topic: true, subject: true, gradeLevel: true, videoUrl: true },
  });

  const smp = mats.filter(m => m.gradeLevel === "SMP_1");
  const sma = mats.filter(m => m.gradeLevel === "SMA_2");

  console.log("DB materials with videoUrl:");
  console.log("  SMP_1:", smp.length);
  console.log("  SMA_2:", sma.length);
  console.log("  Total:", mats.length);

  const flagged = ["OZAdSVoMnh4", "ushsEHIzvTY", "FH-GCEiGk-Y", "lPqPfLz3ppY"];
  const urls = mats.map(m => m.videoUrl || "");
  for (const id of flagged) {
    const found = urls.some(u => u.includes(id));
    console.log("  " + id + ":", found ? "STILL IN DB" : "NOT IN DB");
  }
}

main().finally(() => prisma.$disconnect());
