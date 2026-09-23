import { prisma } from "../src/lib/prisma";
import { MATH_ENHANCEMENT_MODULES } from "../src/data/math-enhancement-smp7";

async function main() {
  const raihan = await prisma.student.findUnique({
    where: { studentId: "RAIHAN001" },
    include: {
      curriculums: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!raihan) {
    console.error("Student RAIHAN001 not found");
    process.exit(1);
  }

  if (raihan.curriculums.length === 0) {
    console.error("No active curriculum found for RAIHAN001");
    process.exit(1);
  }

  const activeCurriculum = raihan.curriculums[0];
  console.log(
    `Injecting into Student: ${raihan.name} (${raihan.studentId}), Curriculum v${activeCurriculum.version} (${activeCurriculum.id})`
  );

  const subject = "Matematika Tingkat Lanjut";
  let injectedCount = 0;
  let quizCount = 0;

  for (const mod of MATH_ENHANCEMENT_MODULES) {
    // 1. Check or Upsert Material
    let material = await prisma.material.findFirst({
      where: {
        curriculumId: activeCurriculum.id,
        subject,
        topic: mod.topic,
        subTopic: mod.subTopic,
      },
    });

    if (!material) {
      material = await prisma.material.create({
        data: {
          curriculumId: activeCurriculum.id,
          subject,
          topic: mod.topic,
          subTopic: mod.subTopic,
          weekOrder: mod.weekOrder,
          priority: mod.priority,
          gradeLevel: "SMP_1",
          status: "READY",
          processedContent: mod.slide,
          metadata: {
            slide_sibi: mod.slide,
            slide: mod.slide,
            category: "math_enhancement",
          },
        },
      });
      injectedCount++;
      console.log(`+ Material: ${mod.topic} - ${mod.subTopic}`);
    } else {
      // Update content to ensure latest slides
      material = await prisma.material.update({
        where: { id: material.id },
        data: {
          status: "READY",
          processedContent: mod.slide,
          metadata: {
            slide_sibi: mod.slide,
            slide: mod.slide,
            category: "math_enhancement",
          },
        },
      });
      console.log(`= Updated Material: ${mod.topic} - ${mod.subTopic}`);
    }

    // 2. Attach Quiz
    const existingQuiz = await prisma.quiz.findFirst({
      where: {
        materialId: material.id,
        studentId: raihan.id,
      },
    });

    if (!existingQuiz) {
      await prisma.quiz.create({
        data: {
          materialId: material.id,
          studentId: raihan.id,
          type: "QUIZ",
          questions: mod.questions as any,
          maxScore: 100,
        },
      });
      quizCount++;
      console.log(`  + Quiz attached (${mod.questions.length} questions)`);
    } else {
      await prisma.quiz.update({
        where: { id: existingQuiz.id },
        data: {
          questions: mod.questions as any,
          maxScore: 100,
        },
      });
      console.log(`  = Quiz updated (${mod.questions.length} questions)`);
    }

    // 3. Upsert TopicMastery
    const existingMastery = await prisma.topicMastery.findFirst({
      where: {
        studentId: raihan.id,
        subject,
        topic: mod.topic,
        subTopic: mod.subTopic,
      },
    });

    if (!existingMastery) {
      await prisma.topicMastery.create({
        data: {
          studentId: raihan.id,
          subject,
          topic: mod.topic,
          subTopic: mod.subTopic,
          mastery: 0,
          weaknessLevel: "moderate",
          quizAttempts: 0,
          quizScoreSum: 0,
          quizScoreMax: 100,
        },
      });
      console.log(`  + TopicMastery registered: ${mod.topic}`);
    }
  }

  // Also ensure parent TopicMastery row (topic aggregate) exists for dashboard radar
  const uniqueTopics = Array.from(new Set(MATH_ENHANCEMENT_MODULES.map((m) => m.topic)));
  for (const topic of uniqueTopics) {
    const parentMastery = await prisma.topicMastery.findFirst({
      where: {
        studentId: raihan.id,
        subject,
        topic,
        subTopic: "",
      },
    });

    if (!parentMastery) {
      await prisma.topicMastery.create({
        data: {
          studentId: raihan.id,
          subject,
          topic,
          subTopic: "",
          mastery: 0,
          weaknessLevel: "moderate",
          quizAttempts: 0,
          quizScoreSum: 0,
          quizScoreMax: 100,
        },
      });
    }
  }

  console.log("\nDone!");
  console.log(`Injected: ${injectedCount} new materials, ${quizCount} new quizzes.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
