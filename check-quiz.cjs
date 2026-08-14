const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findUnique({ 
    where: { id: 'SMP_1' }
  });
  console.log('Student:', student?.id, student?.name);
  
  const topics = await prisma.topic.findMany({
    where: { subject: 'IPA', studentId: 'SMP_1' },
    include: { subTopics: true }
  });
  
  console.log('\nIPA Topics:', topics.length);
  let missingQuiz = [];
  for (const t of topics) {
    console.log('\n## Topic:', t.title);
    for (const st of t.subTopics) {
      const quiz = await prisma.quiz.findFirst({
        where: { studentId: 'SMP_1', subTopicId: st.id }
      });
      const status = quiz ? '[✓]' : '[✗]';
      console.log(status, st.title);
      if (!quiz) missingQuiz.push({topic: t.title, subTopic: st.title, subTopicId: st.id});
    }
  }
  
  console.log('\n\n=== MISSING QUIZZES ===');
  console.log('Total missing:', missingQuiz.length);
  missingQuiz.forEach(q => {
    console.log(q.topic + ' > ' + q.subTopic + ' (ID: ' + q.subTopicId + ')');
  });
  
  await prisma.$disconnect();
}
main().catch(console.error);
