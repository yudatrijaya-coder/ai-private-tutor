import { prisma } from "./src/lib/prisma";

async function main() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    include: {
      curriculums: {
        include: { materials: { include: { quizzes: true } } }
      }
    }
  });

  console.log(`Checking readiness for ${students.length} students...\n`);

  for (const student of students) {
    const cur = student.curriculums[0];
    const materials = cur?.materials || [];
    const quizMaterials = materials.filter(m => m.quizzes.length > 0);
    
    console.log(`Student: ${student.studentId} (${student.name})`);
    console.log(`  Curriculum: ${cur ? "Found" : "Missing"}`);
    console.log(`  Materials: ${materials.length}`);
    console.log(`  Materials with Quizzes: ${quizMaterials.length}`);
    console.log(`  Status: ${quizMaterials.length > 0 ? "READY" : "NOT READY"}\n`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
