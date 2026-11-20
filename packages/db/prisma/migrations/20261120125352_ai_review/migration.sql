-- CreateEnum
CREATE TYPE "AiReviewStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "AiReview" (
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" "AiReviewStatus" NOT NULL DEFAULT 'PENDING',
    "tries" INTEGER NOT NULL DEFAULT 0,
    "verdict" JSONB,
    "suspected" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "doneAt" TIMESTAMPTZ,

    CONSTRAINT "AiReview_pkey" PRIMARY KEY ("attemptId","questionId")
);

-- CreateIndex
CREATE INDEX "AiReview_status_createdAt_idx" ON "AiReview"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_attemptId_questionId_fkey" FOREIGN KEY ("attemptId", "questionId") REFERENCES "WeeklyAnswer"("attemptId", "questionId") ON DELETE CASCADE ON UPDATE CASCADE;

