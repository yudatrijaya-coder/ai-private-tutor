import { prisma } from '../lib/prisma';
import {
  GradeLevel,
  StudentStatus,
  PersonaType,
  MaterialStatus,
  DeliveryType,
  SessionType,
  SessionStatus,
  AgentType,
  JobStatus,
  Prisma,
} from '../generated/prisma/client';
import { GRADE_TOPICS } from '../data/curriculum-topics';
import { getContent } from '../data/curriculum-content';
import QUIZ_MAP_OLD from '../data/quiz-bank';
import { quizKey as quizKeyOld } from '../data/quiz-bank';
import { getQuiz as getQuizSD5 } from '../data/quiz-bank-sd5';
import { getQuiz as getQuizSMP7 } from '../data/quiz-bank-smp7';
import { getQuiz as getQuizSMA11 } from '../data/quiz-bank-sma11';

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Backup Telegram IDs before clearing ────────────────
  console.log('💾 Backing up Telegram IDs...');
  const existingStudents = await prisma.student.findMany({
    where: { telegramId: { not: null } },
    select: { studentId: true, telegramId: true, parentTelegramId: true },
  });
  const telegramBackup = existingStudents.map(s => ({
    studentId: s.studentId,
    telegramId: s.telegramId,
    parentTelegramId: s.parentTelegramId,
  }));
  console.log(`   → ${telegramBackup.length} student(s) with Telegram ID backed up`);

  // Clean existing data in correct order (respecting FK constraints)
  console.log('🧹 Clearing existing data...');
  await prisma.progressSnap.deleteMany();
  await prisma.agentLog.deleteMany();
  await prisma.scheduleSession.deleteMany();
  await prisma.sessionState.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.material.deleteMany();
  await prisma.curriculum.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.student.deleteMany();

  // ── Personas ──────────────────────────────────────────────
  console.log('👤 Creating personas...');
  const personas = await Promise.all([
    prisma.persona.create({
      data: {
        type: PersonaType.KAK_BUDI,
        name: 'Kak Budi',
        greeting: 'Halo adik! Ayo belajar bareng Kak Budi!',
        description: 'Persona ramah untuk siswa SD, menggunakan bahasa sederhana dan ceria',
        toneRules: {
          style: 'cheerful',
          language: 'simple',
          useEmoji: true,
          vocabularyLevel: 'basic',
        },
        forbiddenTopics: ['politik', 'dewasa'],
      },
    }),
    prisma.persona.create({
      data: {
        type: PersonaType.KAK_DEWI,
        name: 'Kak Dewi',
        greeting: 'Hai! Kak Dewi siap bantu kamu belajar',
        description: 'Persona suportif untuk siswa SMP, bahasa santai tapi tetap edukatif',
        toneRules: {
          style: 'supportive',
          language: 'casual',
          useEmoji: true,
          vocabularyLevel: 'intermediate',
        },
        forbiddenTopics: ['politik', 'dewasa'],
      },
    }),
    prisma.persona.create({
      data: {
        type: PersonaType.KAK_RAKA,
        name: 'Kak Raka',
        greeting: 'Siap belajar? Kita gas pol!',
        description: 'Persona energik untuk siswa SMA, bahasa gaul dan memotivasi',
        toneRules: {
          style: 'energetic',
          language: 'slang',
          useEmoji: true,
          vocabularyLevel: 'advanced',
        },
        forbiddenTopics: ['politik'],
      },
    }),
  ]);
  console.log(`   ✓ ${personas.length} personas created\n`);

  // ── Students ─────────────────────────────────────────────
  console.log('🎓 Creating students...');

  const andi = await prisma.student.create({
    data: {
      studentId: 'ANDI001',
      name: 'Andi',
      gradeLevel: GradeLevel.SD_5,
      persona: PersonaType.KAK_BUDI,
      characterPreference: 'mbappe',
      interests: 'bola, sepak bola, Mbappe',
      status: StudentStatus.ACTIVE,
      scheduleConfig: {
        preferredTime: '06:30',
        timezone: 'Asia/Jakarta',
        sessionDuration: 15,
      },
    },
  });

  const sari = await prisma.student.create({
    data: {
      studentId: 'SARI001',
      name: 'Sari',
      gradeLevel: GradeLevel.SMP_1,
      persona: PersonaType.KAK_DEWI,
      characterPreference: 'lisa',
      interests: 'k-pop, dance, Lisa BLACKPINK',
      status: StudentStatus.ACTIVE,
      scheduleConfig: {
        preferredTime: '06:30',
        timezone: 'Asia/Jakarta',
        sessionDuration: 15,
      },
    },
  });

  const budi = await prisma.student.create({
    data: {
      studentId: 'BUDI001',
      name: 'Budi',
      gradeLevel: GradeLevel.SMA_2,
      persona: PersonaType.KAK_RAKA,
      interests: 'coding, game, matematika',
      status: StudentStatus.ACTIVE,
      scheduleConfig: {
        preferredTime: '06:30',
        timezone: 'Asia/Jakarta',
        sessionDuration: 15,
      },
    },
  });

  console.log(`   ✓ Andi (SD/5 - Kak Budi)`);
  console.log(`   ✓ Sari (SMP/1 - Kak Dewi)`);
  console.log(`   ✓ Budi (SMA/2 - Kak Raka)\n`);

  // ── Restore Telegram IDs from backup ─────────────────────
  if (telegramBackup.length > 0) {
    console.log('📞 Restoring Telegram IDs...');
    for (const backup of telegramBackup) {
      const update: Record<string, any> = {};
      if (backup.telegramId) update.telegramId = backup.telegramId;
      if (backup.parentTelegramId) update.parentTelegramId = backup.parentTelegramId;
      if (Object.keys(update).length > 0) {
        await prisma.student.updateMany({
          where: { studentId: backup.studentId },
          data: update,
        });
        console.log(`   ✓ ${backup.studentId}: Telegram ID restored`);
      }
    }
  }

  // ── Curricula, Materials & Quizzes ────────────────────────
  console.log('📚 Creating curricula, materials and quizzes from data bank...\n');

  // Helper: create curriculum + materials + quizzes for a student
  async function createFromDataBank(
    studentId: string,
    gradeLevel: GradeLevel,
    version = 1,
  ) {
    const gradeKey = gradeLevel.toString(); // e.g. "SD_5"
    const topics = GRADE_TOPICS[gradeKey];
    if (!topics || topics.length === 0) {
      console.warn(`   ⚠ No topics found for ${gradeKey}`);
      return;
    }

    const curriculum = await prisma.curriculum.create({
      data: {
        studentId,
        gradeLevel,
        version,
        changelog: `Initial curriculum v${version} (from data bank)`,
        metadata: {
          createdBy: 'seed-script',
          source: 'curriculum-topics + curriculum-content + quiz-bank',
          totalSubjects: [...new Set(topics.map((t) => t.subject))].length,
          totalMaterials: topics.length,
        },
      },
    });

    for (const topic of topics) {
      const content = getContent(topic.subject, topic.topic, topic.subTopic);

      // Create material with content from the bank (READY since no scraping needed)
      const material = await prisma.material.create({
        data: {
          curriculumId: curriculum.id,
          topic: topic.topic,
          subTopic: topic.subTopic,
          subject: topic.subject,
          gradeLevel,
          weekOrder: topic.weekOrder,
          priority: topic.priority,
          delivery: DeliveryType.TEXT,
          status: MaterialStatus.READY,
          processedContent: content,
          metadata: {
            source: 'curriculum-content',
            generatedAt: new Date().toISOString(),
          },
        },
      });

      // Create quiz from bank if available
      let quizQuestions: any[] | undefined;
      if (gradeLevel === "SD_5") {
        quizQuestions = getQuizSD5(topic.subject, topic.topic, topic.subTopic);
      } else if (gradeLevel === "SMP_1") {
        quizQuestions = getQuizSMP7(topic.subject, topic.topic, topic.subTopic);
      } else if (gradeLevel === "SMA_2") {
        quizQuestions = getQuizSMA11(topic.subject, topic.topic, topic.subTopic);
      }
      if (!quizQuestions || quizQuestions.length === 0) {
        quizQuestions = QUIZ_MAP_OLD[quizKeyOld(topic.subject, topic.topic, topic.subTopic)];
      }
      if (quizQuestions && quizQuestions.length > 0) {
        const maxScore = quizQuestions.length * 10;

        await prisma.quiz.create({
          data: {
            materialId: material.id,
            studentId,
            questions: quizQuestions as unknown as Prisma.InputJsonValue,
            maxScore: Math.max(maxScore, 10),
            timeLimit: 5,
          },
        });
      }
    }

    const materialCount = await prisma.material.count({
      where: { curriculumId: curriculum.id },
    });
    const quizCount = await prisma.quiz.count({
      where: {
        material: { curriculumId: curriculum.id },
      },
    });

    console.log(`   ✓ ${gradeKey}: ${materialCount} materials, ${quizCount} quizzes`);
    return curriculum;
  }

  // Create from data bank for each student
  await createFromDataBank(andi.id, GradeLevel.SD_5);
  await createFromDataBank(sari.id, GradeLevel.SMP_1);
  await createFromDataBank(budi.id, GradeLevel.SMA_2);
  console.log('');

  // ── Schedule Sessions ─────────────────────────────────────
  console.log('📅 Creating schedule sessions...');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function setTime(date: Date, hours: number, minutes: number): Date {
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  function getDayName(date: Date): string {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
  }

  const students = [andi, sari, budi];
  let sessionCount = 0;

  for (const student of students) {
    for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
      const date = addDays(todayStart, dayOffset);
      const dayName = getDayName(date);
      const isPast = dayOffset < 0;

      await prisma.scheduleSession.create({
        data: {
          studentId: student.id,
          type: SessionType.DAILY,
          topic: 'Daily Review',
          subject: 'General',
          scheduledAt: setTime(date, 6, 30),
          durationMin: 15,
          status: isPast ? SessionStatus.COMPLETED : SessionStatus.SCHEDULED,
          completedAt: isPast ? setTime(date, 6, 45) : null,
          metadata: { day: dayName, seedGenerated: true },
        },
      });
      sessionCount++;

      if (['Senin', 'Rabu', 'Jumat'].includes(dayName)) {
        await prisma.scheduleSession.create({
          data: {
            studentId: student.id,
            type: SessionType.INTENSIVE,
            topic: 'Intensive Study',
            subject: 'All Subjects',
            scheduledAt: setTime(date, 16, 0),
            durationMin: 120,
            status: isPast ? SessionStatus.COMPLETED : SessionStatus.SCHEDULED,
            completedAt: isPast ? setTime(date, 18, 0) : null,
            metadata: { day: dayName, seedGenerated: true },
          },
        });
        sessionCount++;
      }
    }
  }
  console.log(`   ✓ ${sessionCount} sessions created across ${students.length} students\n`);

  // ── AgentLogs ─────────────────────────────────────────────
  console.log('📋 Creating agent logs...');

  const agentTypes = Object.values(AgentType);
  const jobStatuses = Object.values(JobStatus);
  const actions = ['generate_draft', 'scrape', 'render', 'grade', 'review', 'schedule', 'notify', 'analyze', 'summarize', 'translate'];

  const agentLogs: {
    agentType: AgentType;
    action: string;
    jobId: string;
    studentId: string | null;
    status: JobStatus;
    input: Prisma.InputJsonValue;
    output: Prisma.InputJsonValue;
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < 12; i++) {
    const daysAgo = Math.floor(Math.random() * 3);
    const hoursAgo = Math.floor(Math.random() * 24);
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    const status = jobStatuses[Math.floor(Math.random() * jobStatuses.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const randomStudent = students[Math.floor(Math.random() * students.length)];

    const createdAt = new Date(now.getTime() - daysAgo * 86400000 - hoursAgo * 3600000);
    const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 3600000));

    agentLogs.push({
      agentType,
      action,
      jobId: `job-${i + 1}-${Date.now()}`,
      studentId: randomStudent.id,
      status,
      input: { task: action, timestamp: createdAt.toISOString() } as Prisma.InputJsonValue,
      output: status === JobStatus.COMPLETED
        ? ({ result: `${action} completed successfully`, processedAt: updatedAt.toISOString() } as Prisma.InputJsonValue)
        : ({} as Prisma.InputJsonValue),
      createdAt,
    });
  }

  // Add a few FAILED logs for variety
  agentLogs.push({
    agentType: AgentType.CONTENT,
    action: 'scrape',
    jobId: `job-failed-1`,
    studentId: andi.id,
    status: JobStatus.FAILED,
    input: { task: 'scrape', url: 'https://example.com/math-pecahan' } as Prisma.InputJsonValue,
    output: {} as Prisma.InputJsonValue,
    createdAt: new Date(now.getTime() - 86400000),
  });
  agentLogs.push({
    agentType: AgentType.MEDIA,
    action: 'render',
    jobId: `job-failed-2`,
    studentId: budi.id,
    status: JobStatus.FAILED,
    input: { task: 'render', template: 'physics-video' } as Prisma.InputJsonValue,
    output: {} as Prisma.InputJsonValue,
    createdAt: new Date(now.getTime() - 2 * 86400000),
  });
  agentLogs.push({
    agentType: AgentType.TUTOR,
    action: 'grade',
    jobId: `job-active-1`,
    studentId: sari.id,
    status: JobStatus.ACTIVE,
    input: { task: 'grade', quizId: 'sample-quiz-1' } as Prisma.InputJsonValue,
    output: {} as Prisma.InputJsonValue,
    createdAt: new Date(now.getTime() - 3600000),
  });

  for (const log of agentLogs) {
    await prisma.agentLog.create({
      data: {
        agentType: log.agentType,
        action: log.action,
        jobId: log.jobId,
        studentId: log.studentId,
        status: log.status,
        input: log.input,
        output: log.output,
        createdAt: log.createdAt,
      },
    });
  }
  console.log(`   ✓ ${agentLogs.length} agent logs created\n`);

  // ── ProgressSnaps ─────────────────────────────────────────
  console.log('📊 Creating progress snapshots...');

  function randomBetween(min: number, max: number, decimals = 2): number {
    const val = min + Math.random() * (max - min);
    return parseFloat(val.toFixed(decimals));
  }

  const progressData: Record<string, Record<string, { mastery: number; minMastery: number; maxMastery: number }>> = {
    andi: {
      IPA: { mastery: 0, minMastery: 0.7, maxMastery: 0.9 },
      'Bahasa Indonesia': { mastery: 0, minMastery: 0.2, maxMastery: 0.4 },
      Matematika: { mastery: 0, minMastery: 0.5, maxMastery: 0.7 },
    },
    sari: {
      Matematika: { mastery: 0, minMastery: 0.5, maxMastery: 0.7 },
      'Bahasa Inggris': { mastery: 0, minMastery: 0.8, maxMastery: 0.95 },
      IPA: { mastery: 0, minMastery: 0.6, maxMastery: 0.8 },
    },
    budi: {
      Fisika: { mastery: 0, minMastery: 0.4, maxMastery: 0.6 },
      Kimia: { mastery: 0, minMastery: 0.3, maxMastery: 0.5 },
      Biologi: { mastery: 0, minMastery: 0.5, maxMastery: 0.7 },
    },
  };

  const snapCounts: Record<string, number> = { andi: 0, sari: 0, budi: 0 };

  for (const [studentKey, student] of [
    ['andi', andi] as const,
    ['sari', sari] as const,
    ['budi', budi] as const,
  ]) {
    const subjects = progressData[studentKey];
    for (const [subject, range] of Object.entries(subjects)) {
      for (let day = 4; day >= 0; day--) {
        const snapDate = addDays(todayStart, -day);
        const trend = (5 - day) / 5;
        const mastery = randomBetween(range.minMastery, range.maxMastery) * (0.8 + 0.2 * trend);

        await prisma.progressSnap.create({
          data: {
            studentId: student.id,
            subject,
            topic: subject,
            mastery: Math.min(mastery, 1.0),
            quizCount: Math.floor(randomBetween(1, 5)),
            totalScore: Math.floor(randomBetween(10, 50)),
            totalMax: 50,
            studyMinutes: Math.floor(randomBetween(10, 45)),
            snapDate,
          },
        });
        snapCounts[studentKey]++;
      }
    }
  }
  console.log(`   ✓ Andi: ${snapCounts.andi} snaps (IPA↑, Bahasa↓, Matematika medium)`);
  console.log(`   ✓ Sari: ${snapCounts.sari} snaps (Matematika medium, Inggris↑)`);
  console.log(`   ✓ Budi: ${snapCounts.budi} snaps (Fisika medium, Kimia↓)`);
  console.log('');

  // ── Summary ──────────────────────────────────────────────
  const totalStudents = await prisma.student.count();
  const totalCurricula = await prisma.curriculum.count();
  const totalMaterials = await prisma.material.count();
  const totalQuizzes = await prisma.quiz.count();
  const totalSessions = await prisma.scheduleSession.count();
  const totalAgentLogs = await prisma.agentLog.count();
  const totalProgressSnaps = await prisma.progressSnap.count();
  const totalPersonas = await prisma.persona.count();

  console.log('═══════════════════════════════════════════');
  console.log('✅ SEED COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`   Personas:       ${totalPersonas}`);
  console.log(`   Students:       ${totalStudents}`);
  console.log(`   Curricula:      ${totalCurricula}`);
  console.log(`   Materials:      ${totalMaterials}`);
  console.log(`   Quizzes:        ${totalQuizzes}`);
  console.log(`   ScheduleSess:   ${totalSessions}`);
  console.log(`   AgentLogs:      ${totalAgentLogs}`);
  console.log(`   ProgressSnaps:  ${totalProgressSnaps}`);
  console.log('═══════════════════════════════════════════\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
