import { prisma } from "@/lib/prisma";
import { callLLM } from "@/llm/client";
import { ChatMessage } from "@/llm/types";

export interface ImprovementAnalysisResult {
  narrative: string;
  recommendedSchedule: any;
}

export async function analyzeExamAttempt(attemptId: string) {
  // 1. Fetch the ExamAttempt and associated Exam data
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { include: { questions: true } },
      student: {
        include: {
          curriculums: { take: 1 },
          scheduleSessions: {
            where: { scheduledAt: { gte: new Date() } },
            orderBy: { scheduledAt: "asc" },
            take: 20,
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new Error(`ExamAttempt with ID ${attemptId} not found.`);
  }

  const { student, exam } = attempt;

  // 2. Prepare the prompt for LLM via 9Router
  const systemPrompt = "You are an expert AI Education Counselor. You analyze student exam performance and provide actionable improvement plans.";

  const userPrompt = `Analyze the student's exam performance and provide a descriptive narrative and a recommended study schedule.

STUDENT INFO:
- Name: ${student.name}
- Grade Level: ${student.gradeLevel}

EXAM INFO:
- Title: ${exam.title}
- Subject: ${exam.subject}
- Type: ${exam.type}
- Score: ${attempt.score}
- Details/Answers: ${JSON.stringify(attempt.details)}

EXAM QUESTIONS:
${JSON.stringify(exam.questions.map(q => ({ question: q.question, correctAnswer: q.correctAnswer, difficulty: q.difficulty })))}

CURRENT UPCOMING SCHEDULE:
${JSON.stringify(student.scheduleSessions.map(s => ({ topic: s.topic, subject: s.subject, scheduledAt: s.scheduledAt, type: s.type })))}

INSTRUCTIONS:
1. Provide a "narrative" evaluating the student's performance, highlighting specific topics they struggled with.
2. Provide a "recommendedSchedule" which is a JSON array of objects with keys: topic, subject, durationMin, priority ("high"|"medium"|"low"), reason.
3. OUTPUT ONLY A VALID JSON OBJECT with keys: "narrative" (string) and "recommendedSchedule" (array).

JSON Output:`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // 3. Call LLM via 9Router (assessment role)
  const response = await callLLM("assessment", messages, {
    maxTokens: 2048,
    temperature: 0.4,
    studentId: student.id,
  });

  if (!response) {
    throw new Error("LLM returned no response for improvement analysis.");
  }

  // Parse JSON — handle markdown code fences if present
  let jsonStr = response.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const result: ImprovementAnalysisResult = JSON.parse(jsonStr);

  // 4. Save the result into ImprovementPlan
  const improvementPlan = await prisma.improvementPlan.create({
    data: {
      attemptId: attempt.id,
      studentId: student.id,
      aiNarrative: result.narrative,
      recommendedSch: result.recommendedSchedule,
      status: "DRAFT",
    },
  });

  // Update attempt status to ANALYZED
  await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: { status: "ANALYZED" },
  });

  return improvementPlan;
}
