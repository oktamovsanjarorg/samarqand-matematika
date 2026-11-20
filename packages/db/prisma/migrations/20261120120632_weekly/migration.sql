-- CreateTable
CREATE TABLE "WeeklyTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "opensAt" TIMESTAMPTZ NOT NULL,
    "closesAt" TIMESTAMPTZ NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "reminderStage" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyQuestion" (
    "weeklyTestId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "WeeklyQuestion_pkey" PRIMARY KEY ("weeklyTestId","questionId")
);

-- CreateTable
CREATE TABLE "WeeklyAttempt" (
    "id" TEXT NOT NULL,
    "weeklyTestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMPTZ,
    "correct" INTEGER,
    "score" INTEGER,

    CONSTRAINT "WeeklyAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAnswer" (
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "response" JSONB,
    "result" "CheckResult",
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WeeklyAnswer_pkey" PRIMARY KEY ("attemptId","questionId")
);

-- CreateIndex
CREATE INDEX "WeeklyTest_isPublished_closesAt_idx" ON "WeeklyTest"("isPublished", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAttempt_weeklyTestId_userId_key" ON "WeeklyAttempt"("weeklyTestId", "userId");

-- AddForeignKey
ALTER TABLE "WeeklyQuestion" ADD CONSTRAINT "WeeklyQuestion_weeklyTestId_fkey" FOREIGN KEY ("weeklyTestId") REFERENCES "WeeklyTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyQuestion" ADD CONSTRAINT "WeeklyQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAttempt" ADD CONSTRAINT "WeeklyAttempt_weeklyTestId_fkey" FOREIGN KEY ("weeklyTestId") REFERENCES "WeeklyTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAttempt" ADD CONSTRAINT "WeeklyAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAnswer" ADD CONSTRAINT "WeeklyAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "WeeklyAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAnswer" ADD CONSTRAINT "WeeklyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

