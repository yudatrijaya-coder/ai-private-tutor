-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "telegramId" TEXT,
    "gradeLevel" TEXT NOT NULL,
    "persona" TEXT DEFAULT 'KAK_BUDI',
    "characterPreference" TEXT,
    "interests" TEXT,
    "scheduleConfig" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "changelog" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Curriculum_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subTopic" TEXT,
    "subject" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "weekOrder" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "delivery" TEXT NOT NULL DEFAULT 'TEXT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "prerequisiteId" TEXT,
    "sourceUrls" JSONB,
    "rawContent" TEXT,
    "processedContent" TEXT,
    "videoUrl" TEXT,
    "videoScript" TEXT,
    "characterUsed" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Material_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'QUIZ',
    "questions" JSONB NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "timeLimit" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quiz_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quiz_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "masteryAfter" REAL,
    "timeSpent" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressSnap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "mastery" REAL NOT NULL,
    "quizCount" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "totalMax" INTEGER NOT NULL DEFAULT 0,
    "studyMinutes" INTEGER NOT NULL DEFAULT 0,
    "snapDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressSnap_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "topic" TEXT,
    "subject" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 15,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "currentMode" TEXT NOT NULL DEFAULT 'chat',
    "context" JSONB,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SessionState_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "toneRules" JSONB NOT NULL,
    "forbiddenTopics" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL,
    "actions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Intervention_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentType" TEXT NOT NULL,
    "jobId" TEXT,
    "studentId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "traceId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'parent'
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_MaterialPrerequisites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MaterialPrerequisites_A_fkey" FOREIGN KEY ("A") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MaterialPrerequisites_B_fkey" FOREIGN KEY ("B") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_telegramId_key" ON "Student"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_studentId_version_key" ON "Curriculum"("studentId", "version");

-- CreateIndex
CREATE INDEX "ProgressSnap_studentId_subject_snapDate_idx" ON "ProgressSnap"("studentId", "subject", "snapDate");

-- CreateIndex
CREATE INDEX "ScheduleSession_studentId_scheduledAt_idx" ON "ScheduleSession"("studentId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionState_studentId_key" ON "SessionState"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_type_key" ON "Persona"("type");

-- CreateIndex
CREATE INDEX "AgentLog_agentType_status_idx" ON "AgentLog"("agentType", "status");

-- CreateIndex
CREATE INDEX "AgentLog_createdAt_idx" ON "AgentLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "_MaterialPrerequisites_AB_unique" ON "_MaterialPrerequisites"("A", "B");

-- CreateIndex
CREATE INDEX "_MaterialPrerequisites_B_index" ON "_MaterialPrerequisites"("B");
