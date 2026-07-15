import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const generic = await prisma.scheduleSession.findMany({
    where: { topic: 'Belajar Mandiri', status: 'SCHEDULED' },
    select: { id: true, studentId: true, topic: true, scheduledAt: true },
    orderBy: { scheduledAt: 'desc' },
    take: 5,
  });
  console.log('Generic scheduled:', generic.length);
  generic.forEach(s => console.log(' -', s.id.slice(0,8), '|', s.studentId.slice(0,12), '|',
    s.scheduledAt.toISOString().slice(0,16), '|', s.topic));

  // Cancel future generic
  const now = new Date();
  const { count } = await prisma.scheduleSession.updateMany({
    where: { topic: 'Belajar Mandiri', status: 'SCHEDULED', scheduledAt: { gte: now } },
    data: { status: 'CANCELLED' },
  });
  console.log('Cancelled future generic:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
