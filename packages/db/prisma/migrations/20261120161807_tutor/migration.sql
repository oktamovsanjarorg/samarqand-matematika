-- CreateEnum
CREATE TYPE "TutorMode" AS ENUM ('PRACTICE', 'REVIEW', 'FREE');

-- CreateEnum
CREATE TYPE "TutorRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "TutorChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "TutorMode" NOT NULL,
    "questionId" TEXT,
    "attemptId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TutorChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" "TutorRole" NOT NULL,
    "text" TEXT NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutorChat_userId_updatedAt_idx" ON "TutorChat"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "TutorMessage_chatId_createdAt_idx" ON "TutorMessage"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "TutorChat" ADD CONSTRAINT "TutorChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorChat" ADD CONSTRAINT "TutorChat_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorMessage" ADD CONSTRAINT "TutorMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "TutorChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

