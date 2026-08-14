import { prisma } from "@/lib/prisma";
import { callLLM } from "@/llm/client";
import { ChatMessage } from "@/llm/types";

// Define the expected structure for LLM-generated questions
export interface LLMQuestionOutput {
  question: string;
  options: string[]; // Array of option strings (A, B, C, D)
  correctAnswer: string; // The correct option string (e.g., "A", "B", "C", "D")
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

const getLLMQuestions = async (prompt: string, studentId: string): Promise<LLMQuestionOutput[]> => {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are an expert educator tasked with generating exam questions.
      Generate 5 multiple-choice questions based on the user's request.
      Each question must have 4 options (A, B, C, D) that are single letters.
      Provide the correct answer (the letter of the option), a brief explanation, and the difficulty level (easy, medium, hard).
      Output the questions as a JSON array, for example:
      \`\`\`json
      [
        {
          "question": "What is the capital of France?",
          "options": ["A. Berlin", "B. Madrid", "C. Paris", "D. Rome"],
          "correctAnswer": "C",
          "explanation": "Paris is the capital and most populous city of France.",
          "difficulty": "easy"
        }
      ]
      \`\`\`
      Ensure the output is valid JSON and only contains the JSON array.`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await callLLM("assessment", messages, { maxTokens: 2048, temperature: 0.5, studentId });

  if (!response) {
    console.warn("LLM returned no response for exam question generation.");
    return [];
  }

  try {
    const questions = JSON.parse(response) as LLMQuestionOutput[];
    // Basic validation to ensure the structure matches
    if (Array.isArray(questions) && questions.every(q =>
      typeof q.question === 'string' &&
      Array.isArray(q.options) && q.options.length === 4 &&
      typeof q.correctAnswer === 'string' &&
      ['A', 'B', 'C', 'D'].includes(q.correctAnswer) && // Ensure correct answer is a letter option
      typeof q.explanation === 'string' &&
      ['easy', 'medium', 'hard'].includes(q.difficulty)
    )) {
      return questions;
    } else {
      console.error("LLM returned malformed JSON for exam questions or validation failed:", response);
      return [];
    }
  } catch (error) {
    console.error("Failed to parse LLM response for exam questions as JSON:", error, response);
    return [];
  }
};

export async function generatePreTest(studentId: string, subject: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { curriculums: true } });
  if (!student) throw new Error("Student not found");

  const curriculum = student.curriculums[0]; // Assuming one active curriculum
  if (!curriculum) throw new Error("Curriculum not found");

  const materials = await prisma.material.findMany({ where: { curriculumId: curriculum.id, subject: subject } });

  const topicList = materials.map(m => (m as any).topic || "").filter(Boolean).join(", ");
  
  const prompt = `Generate a pre-test for ${subject} at grade level ${student.gradeLevel}. Focus on the following topics: ${topicList || subject}.`;
  const questionsData = await getLLMQuestions(prompt, studentId);

  const exam = await prisma.exam.create({
    data: {
      title: `Pre-Test for ${subject} (Grade ${student.gradeLevel})`,
      type: "PRE_TEST",
      subject: subject,
      gradeLevel: student.gradeLevel,
      questions: {
        create: questionsData.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty.toUpperCase(),
          bloomLevel: "C2",
          topic: subject, 
        })),
      },
    },
    include: { questions: true }
  });

  return exam;
}

export async function generatePostTest(studentId: string, materialId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found");

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) throw new Error("Material not found");

  const prompt = `Generate a post-test for the material "${(material as any).name}" in ${material.subject} for a student at grade level ${student.gradeLevel}.`;
  const questionsData = await getLLMQuestions(prompt, studentId);

  const exam = await prisma.exam.create({
    data: {
      title: `Post-Test for ${(material as any).name || material.subject}`,
      type: "POST_TEST",
      subject: material.subject,
      gradeLevel: student.gradeLevel,
      materialId: material.id,
      questions: {
        create: questionsData.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty.toUpperCase(),
          bloomLevel: "C2",
          topic: (material as any).topic || material.subject,
        })),
      },
    },
    include: { questions: true }
  });

  return exam;
}
