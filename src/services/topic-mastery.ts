/**
 * TopicMastery Service
 * 
 * Tracks per-topic mastery (0-100%) for each student using a weighted
 * moving average. Recent attempts have more weight than older ones.
 * 
 * Mastery Algorithm:
 *   newMastery = (oldMastery * 0.85) + (scorePercent * 0.15)
 * 
 * Weakness thresholds:
 *   < 50%  → "severe"
 *   50-70% → "moderate"
 *   70-85% → "mild"
 *   > 85%  → "none"
 */

import { prisma } from "@/lib/prisma";

const DECAY_FACTOR = 0.85;

export interface MasteryUpdateInput {
  studentId: string;
  subject: string;
  topic: string;
  subTopic?: string | null;
  score: number;
  maxScore: number;
  attemptType: "quiz" | "exam";
  timeSpentMs?: number;
  expectedTimeMs?: number;
}

/**
 * Update mastery for a given topic after a quiz or exam attempt.
 */
export async function updateTopicMastery(input: MasteryUpdateInput): Promise<void> {
  const { studentId, subject, topic, subTopic, score, maxScore, attemptType, timeSpentMs, expectedTimeMs } = input;
  const scorePercent = maxScore > 0 ? (score / maxScore) * 100 : 0;

  const existing = await prisma.topicMastery.findFirst({
    where: {
      studentId,
      subject,
      topic,
      subTopic: subTopic ?? null,
    },
  });

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let newMastery: number;
  if (existing) {
    newMastery = (existing.mastery * DECAY_FACTOR) + (scorePercent * (1 - DECAY_FACTOR));
  } else {
    newMastery = scorePercent;
  }
  newMastery = Math.max(0, Math.min(100, newMastery));

  let newConfidence = existing?.confidenceScore ?? 50;
  if (timeSpentMs && expectedTimeMs) {
    const speedRatio = Math.min(1, expectedTimeMs / Math.max(1, timeSpentMs));
    const accuracyRatio = scorePercent / 100;
    newConfidence = Math.round((speedRatio * 0.3 + accuracyRatio * 0.7) * 100);
  }

  let newStreak = existing?.streakDays ?? 0;
  if (existing?.streakUpdatedAt) {
    const lastUpdate = new Date(existing.streakUpdatedAt);
    lastUpdate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStreak = (existing?.streakDays ?? 0) + 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const weaknessLevel = newMastery < 50 ? "severe" : newMastery < 70 ? "moderate" : newMastery < 85 ? "mild" : "none";

  const data: any = {
    mastery: Math.round(newMastery * 100) / 100,
    confidenceScore: Math.max(0, Math.min(100, newConfidence)),
    weaknessLevel,
    lastAttemptAt: now,
    streakDays: newStreak,
    streakUpdatedAt: now,
  };

  if (attemptType === "quiz") {
    data.quizAttempts = { increment: 1 };
    data.quizScoreSum = { increment: score };
    data.quizScoreMax = existing
      ? Math.max(existing.quizScoreMax, maxScore)
      : maxScore;
  } else {
    data.examAttempts = { increment: 1 };
    data.examScoreSum = { increment: score };
    data.examScoreMax = existing
      ? Math.max(existing.examScoreMax, maxScore)
      : maxScore;
  }

  await prisma.topicMastery.upsert({
    where: {
      studentId_subject_topic_subTopic: {
        studentId,
        subject,
        topic,
        subTopic: (subTopic ?? "") || "",
      },
    },
    create: {
      studentId,
      subject,
      topic,
      subTopic: (subTopic ?? "") || "",
      mastery: data.mastery,
      confidenceScore: data.confidenceScore,
      weaknessLevel: data.weaknessLevel,
      lastAttemptAt: now,
      streakDays: data.streakDays,
      streakUpdatedAt: now,
      quizAttempts: attemptType === "quiz" ? 1 : 0,
      quizScoreSum: attemptType === "quiz" ? score : 0,
      quizScoreMax: attemptType === "quiz" ? maxScore : 0,
      examAttempts: attemptType === "exam" ? 1 : 0,
      examScoreSum: attemptType === "exam" ? score : 0,
      examScoreMax: attemptType === "exam" ? maxScore : 0,
    },
    update: data,
  });
}

/**
 * Get mastery data for achievement page.
 * Returns the format the achievement page expects:
 * { subjects, totalQuizzes, totalSlides, totalMindmaps, totalVideos,
 *   recentActivity, overallMastery }
 */
export async function getStudentMasteryMap(studentId: string) {
  // Fetch StudentSubjectMastery (existing per-subject data)
  const subjectMasteries = await prisma.studentSubjectMastery.findMany({
    where: { studentId },
  });

  // Fetch TopicMastery (new per-topic data)
  const topicMasteries = await prisma.topicMastery.findMany({
    where: { studentId },
    orderBy: [{ subject: "asc" }, { topic: "asc" }],
  });

  // Fetch activity data
  const [quizAttempts, examAttempts, slideViews, mindmapViews, videoClicks] = await Promise.all([
    prisma.attempt.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { quiz: { include: { material: true } } },
    }),
    prisma.examAttempt.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.studentActivity.findMany({
      where: { studentId, type: "slide_view" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.studentActivity.findMany({
      where: { studentId, type: "mindmap_view" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.studentActivity.findMany({
      where: { studentId, type: "video_click" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Build subjects array — merge SubjectMastery + TopicMastery
  const subjectMap: Record<string, any> = {};

  // Initialize from StudentSubjectMastery
  for (const sm of subjectMasteries) {
    subjectMap[sm.subject] = {
      subject: sm.subject,
      mastery: sm.mastery ?? 0,
      quizCount: sm.quizCount ?? 0,
      quizTotalScore: sm.quizTotalScore ?? 0,
      quizTotalMax: sm.quizTotalMax ?? 0,
      quizBestScore: sm.quizBestScore ?? 0,
      quizBestMax: sm.quizBestMax ?? 0,
      examCount: sm.examCount ?? 0,
      slidesRead: sm.slidesRead ?? 0,
      mindmapsOpen: sm.mindmapsOpen ?? 0,
      videosWatched: sm.videosWatched ?? 0,
      lastActiveAt: sm.lastActiveAt?.toISOString() ?? null,
    };
  }

  // Override/augment with TopicMastery averages
  const topicBySubject: Record<string, number[]> = {};
  for (const tm of topicMasteries) {
    if (!topicBySubject[tm.subject]) topicBySubject[tm.subject] = [];
    topicBySubject[tm.subject].push(tm.mastery);
  }

  for (const [subject, masteries] of Object.entries(topicBySubject)) {
    // TopicMastery disimpan skala 0-100; normalisasi ke fraksi 0-1 agar
    // konsisten dengan StudentSubjectMastery (0-1) yang dicampur di sini.
    const avgMastery = (masteries.reduce((a, b) => a + b, 0) / masteries.length) / 100;
    if (subjectMap[subject]) {
      subjectMap[subject].mastery = avgMastery;
    } else {
      subjectMap[subject] = {
        subject,
        mastery: avgMastery,
        quizCount: 0,
        quizTotalScore: 0,
        quizTotalMax: 0,
        quizBestScore: 0,
        quizBestMax: 0,
        examCount: 0,
        slidesRead: 0,
        mindmapsOpen: 0,
        videosWatched: 0,
        lastActiveAt: null,
      };
    }
  }

  const subjects = Object.values(subjectMap);

  // Build recent activity
  const recentActivity: any[] = [];

  for (const a of quizAttempts) {
    if (a.quiz?.material) {
      recentActivity.push({
        type: "quiz_complete",
        subject: a.quiz.material.subject,
        topic: a.quiz.material.topic || a.quiz.material.subject,
        score: a.score,
        maxScore: a.maxScore,
        createdAt: a.createdAt.toISOString(),
      });
    }
  }

  for (const a of examAttempts) {
    recentActivity.push({
      type: "exam_complete",
      subject: "IPA",
      topic: "Ujian",
      score: a.score,
      maxScore: a.maxScore,
      createdAt: a.createdAt.toISOString(),
    });
  }

  for (const a of slideViews) {
    recentActivity.push({
      type: "slide_view",
      subject: a.metadata && (a.metadata as any).subject ? (a.metadata as any).subject : "Umum",
      topic: a.metadata && (a.metadata as any).title ? (a.metadata as any).title : "Slide",
      createdAt: a.createdAt.toISOString(),
    });
  }

  for (const a of mindmapViews) {
    recentActivity.push({
      type: "mindmap_view",
      subject: a.metadata && (a.metadata as any).subject ? (a.metadata as any).subject : "Umum",
      topic: a.metadata && (a.metadata as any).title ? (a.metadata as any).title : "Mindmap",
      createdAt: a.createdAt.toISOString(),
    });
  }

  for (const a of videoClicks) {
    recentActivity.push({
      type: "video_click",
      subject: a.metadata && (a.metadata as any).subject ? (a.metadata as any).subject : "Umum",
      topic: a.metadata && (a.metadata as any).title ? (a.metadata as any).title : "Video",
      createdAt: a.createdAt.toISOString(),
    });
  }

  // Sort by createdAt desc
  recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate overall mastery
  const overallMastery = subjects.length > 0
    ? subjects.reduce((sum, s) => sum + s.mastery, 0) / subjects.length
    : 0;

  // Top weaknesses from TopicMastery
  const topWeaknesses = topicMasteries
    .filter(m => m.weaknessLevel !== "none")
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5)
    .map(m => ({
      subject: m.subject,
      topic: m.topic,
      mastery: m.mastery / 100,
      weaknessLevel: m.weaknessLevel,
      confidenceScore: m.confidenceScore,
    }));

  return {
    subjects,
    totalQuizzes: quizAttempts.length,
    totalExams: examAttempts.length,
    totalSlides: slideViews.length,
    totalMindmaps: mindmapViews.length,
    totalVideos: videoClicks.length,
    recentActivity: recentActivity.slice(0, 20),
    overallMastery,
    bySubject: Object.fromEntries(
      Object.entries(topicBySubject).map(([k, v]) => [
        k,
        v.map((m, i) => {
          const tm = topicMasteries.filter(t => t.subject === k)[i];
          return tm ? {
            topic: tm.topic,
            subTopic: tm.subTopic,
            mastery: tm.mastery / 100,
            confidenceScore: tm.confidenceScore,
            weaknessLevel: tm.weaknessLevel,
            streakDays: tm.streakDays,
            lastAttemptAt: tm.lastAttemptAt.toISOString(),
            quizAttempts: tm.quizAttempts,
            examAttempts: tm.examAttempts,
          } : null;
        }).filter(Boolean)
      ])
    ),
    topWeaknesses,
    totalTopics: topicMasteries.length,
  };
}

/**
 * Backfill TopicMastery from existing quiz/exam attempts.
 */
export async function backfillMasteryFromAttempts(studentId: string) {
  const attempts = await prisma.attempt.findMany({
    where: { studentId },
    orderBy: { createdAt: "asc" },
  });

  for (const attempt of attempts) {
    const score = attempt.score ?? 0;
    const maxScore = attempt.maxScore ?? 0;
    if (attempt.quizId) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: attempt.quizId },
        include: { material: true },
      });
      if (quiz?.material) {
        await updateTopicMastery({
          studentId,
          subject: quiz.material.subject,
          topic: quiz.material.topic || quiz.material.subject,
          subTopic: (quiz.material.metadata as any)?.subTopic || null,
          score,
          maxScore,
          attemptType: "quiz",
        });
      }
    }
  }

  const examAttempts = await prisma.examAttempt.findMany({
    where: { studentId },
    orderBy: { createdAt: "asc" },
  });

  for (const attempt of examAttempts) {
    const score = attempt.score ?? 0;
    const maxScore = 100;
    if (attempt.examId) {
      const exam = await prisma.exam.findUnique({ where: { id: attempt.examId } });
      if (exam) {
        const questions = await prisma.examQuestion.findMany({
          where: { examId: attempt.examId },
          take: 1,
        });
        await updateTopicMastery({
          studentId,
          subject: exam.subject,
          topic: questions[0]?.topic || exam.subject,
          subTopic: questions[0]?.subTopic || null,
          score,
          maxScore,
          attemptType: "exam",
        });
      }
    }
  }
}
