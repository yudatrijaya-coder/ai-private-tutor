/*
  Warnings:

  - Added the required column `studentId` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
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
INSERT INTO "new_Student" ("characterPreference", "createdAt", "gradeLevel", "id", "interests", "name", "persona", "scheduleConfig", "status", "telegramId", "updatedAt") SELECT "characterPreference", "createdAt", "gradeLevel", "id", "interests", "name", "persona", "scheduleConfig", "status", "telegramId", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");
CREATE UNIQUE INDEX "Student_telegramId_key" ON "Student"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
