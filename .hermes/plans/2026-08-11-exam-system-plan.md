# AI-Driven Exam & Personalized Improvement Plan (Opsi C) Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implement a comprehensive exam system (Opsi C) featuring Pre-tests (diagnostic) and Post-tests (per module) that dynamically adjust a student's intensive schedule and generate a personalized improvement plan using SumoPod AI.

**Architecture:**
1.  **Exam Creation / Selection**: Extend `/api/exam` (or create a dedicated helper) to handle `PRE_TEST` (comprehensive across all subjects/topics in grade level) and `POST_TEST` (specific to a completed material/module).
2.  **Exam Attempts**: Students take exams on the web app. Responses are graded and saved as `ExamAttempt` with `details` containing weak subtopics.
3.  **AI Improvement Plan Trigger**: On completion of an exam, a background worker/process is triggered.
4.  **AI Analysis Service**: An AI worker reads the attempt details, queries SumoPod for structured JSON mapping weaknesses to next week's slots, and creates/updates an `ImprovementPlan`.
5.  **Schedule Adaptation**: If approved (or automatically if "Direct Action" preferred), the new schedule is applied to `ScheduleSession` for the next week.

**Tech Stack:** Next.js (App Router), Prisma, PostgreSQL, Tailwind, SumoPod LLM client.

---

## Step-by-Step Plan

### Task 1: Refactor `schema.prisma` and migrate if necessary
**Objective:** Confirm schema state. Although the schema has `Exam`, `ExamQuestion`, `ExamAttempt`, and `ImprovementPlan`, ensure PostgreSQL database is fully synced and type definitions are updated.
**Files:**
- Modify: `prisma/schema.prisma` (verify models, update relations if needed)
**Steps:**
1. Run `npx prisma db push` to ensure Postgres is in sync.
2. Run `npx prisma generate` to rebuild client.
3. Verify connection.

### Task 2: Implement dynamic Exam Generation Service (`src/services/exam-generator.ts`)
**Objective:** Create a helper service that generates exams based on the student's GradeLevel (for `PRE_TEST`) or specific module/material (for `POST_TEST`). It should:
- For `PRE_TEST`: select a mixture of topics across all materials in the student's curriculum.
- For `POST_TEST`: select topics from a specific material.
- Implement difficulty distribution: 30% Easy, 40% Medium, 30% Hard/HOTS.
- Populate the `Exam` and `ExamQuestion` tables.
**Files:**
- Create: `src/services/exam-generator.ts`
**Verification:**
- Run a manual script to verify that `PRE_TEST` and `POST_TEST` generation successfully saves to the database.

### Task 3: Refactor /api/exam API Routes
**Objective:** Update `src/app/api/exam/route.ts` to accept `type` ("PRE_TEST" | "POST_TEST") and generate accordingly using the `exam-generator` service.
- If `PRE_TEST`, generate a grade-wide baseline test.
- If `POST_TEST`, require `materialId` and generate a module-specific exam.
**Files:**
- Modify: `src/app/api/exam/route.ts`
**Verification:**
- Test with curl to generate both `PRE_TEST` and `POST_TEST`.

### Task 4: Implement Student Exam Page and Scoring
**Objective:** Update the frontend student exam page to load dynamic exams, allow completion, calculate the score, classify weaknesses by subtopic, and save the result as `ExamAttempt`.
**Files:**
- Modify: `src/app/(student)/student/quiz/page.tsx` (handle `exam=true` query param, pull from `/api/exam`, grade, and save to `/api/exam/attempt`)
- Create: `src/app/api/exam/attempt/route.ts` (handles saving the attempt and returning details)
**Verification:**
- Simulate taking an exam and saving the attempt.

### Task 5: Build AI Improvement Plan Analysis (`src/services/improvement-analysis.ts`)
**Objective:** Implement the AI analysis service that runs when an exam is completed.
- It queries SumoPod for structured feedback.
- Input: Student curriculum, Exam score, Weakness mapping (e.g., "Rotasi Bumi: HARD_FAILED"), Current Schedule.
- Prompt: Strict instruction to recommend a new study schedule selecting ONLY topics from the weakness list, outputting a structured JSON (narrative + schedule mapping).
- Saves to `ImprovementPlan` in database.
**Files:**
- Create: `src/services/improvement-analysis.ts`
**Verification:**
- Mock an `ExamAttempt` and verify that the service successfully generates and saves an `ImprovementPlan`.

### Task 6: Implement Schedule Adaptation Trigger
**Objective:** Write a script or Next.js route that transitions a draft `ImprovementPlan` to `APPLIED`, mutating the student's `ScheduleSession` for the upcoming week based on the AI recommendations.
**Files:**
- Create: `src/app/api/exam/apply-plan/route.ts`
**Verification:**
- Trigger the endpoint with a mock plan ID and verify that next week's `ScheduleSession` database entries are updated with the weak topics.

### Task 7: Update Dashboard UI for Exams
**Objective:** Update the student dashboard to display:
- Baseline Pre-test prompt if not yet taken.
- Post-test prompt when a module is completed.
- Recommendation details from the latest `ImprovementPlan` once generated.
**Files:**
- Modify: `src/app/(student)/student/page.tsx`
- Modify: `src/app/(student)/student/achievement/page.tsx`
**Verification:**
- Visually verify dashboard updates.
