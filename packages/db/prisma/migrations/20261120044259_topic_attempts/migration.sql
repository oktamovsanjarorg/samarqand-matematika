-- CreateEnum
CREATE TYPE "CheckResult" AS ENUM ('CORRECT', 'WRONG', 'MANUAL');

-- CreateTable
CREATE TABLE "TopicAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMPTZ,
    "correct" INTEGER,

    CONSTRAINT "TopicAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicAnswer" (
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "response" JSONB,
    "result" "CheckResult",
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TopicAnswer_pkey" PRIMARY KEY ("attemptId","questionId")
);

-- CreateIndex
CREATE INDEX "TopicAttempt_userId_topicId_submittedAt_idx" ON "TopicAttempt"("userId", "topicId", "submittedAt");

-- AddForeignKey
ALTER TABLE "TopicAttempt" ADD CONSTRAINT "TopicAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicAttempt" ADD CONSTRAINT "TopicAttempt_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicAnswer" ADD CONSTRAINT "TopicAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TopicAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicAnswer" ADD CONSTRAINT "TopicAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
