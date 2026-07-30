-- AI Private Tutor — performance indexes
-- Created: 2026-07-30
-- 
-- All use CONCURRENTLY so writes are not blocked during index build.
-- Each IF NOT EXISTS makes them idempotent.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Material_curriculumId_subject_weekOrder_idx" ON "Material"("curriculumId", subject, "weekOrder");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Quiz_materialId_idx" ON "Quiz"("materialId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Quiz_studentId_idx" ON "Quiz"("studentId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Attempt_studentId_createdAt_idx" ON "Attempt"("studentId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ScheduleSession_status_scheduledAt_idx" ON "ScheduleSession"(status, "scheduledAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "StudentActivity_materialId_idx" ON "StudentActivity"("materialId") WHERE "materialId" IS NOT NULL;
