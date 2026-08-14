
import { generatePreTest, generatePostTest } from '../src/services/exam-generator';
import { prisma } from '../src/lib/prisma';

async function main() {
  const studentId = "RAIHAN001";
  const subject = "Bahasa Indonesia";
  const materialId = "some-material-id"; // Replace with a real material ID

  console.log("Generating Pre-Test...");
  const preTest = await generatePreTest(studentId, subject);
  console.log("Pre-Test Generated:", preTest);

  console.log("Generating Post-Test...");
  const postTest = await generatePostTest(studentId, materialId);
  console.log("Post-Test Generated:", postTest);

  // Cleanup
  await prisma.exam.deleteMany({ where: { id: { in: [preTest.id, postTest.id] } } });
  console.log("Cleaned up generated exams.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
