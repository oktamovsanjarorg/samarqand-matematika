-- CreateTable
CREATE TABLE "MockTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateId" TEXT,
    "template" JSONB NOT NULL,
    "opensAt" TIMESTAMPTZ NOT NULL,
    "closesAt" TIMESTAMPTZ NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockQuestion" (
    "mockTestId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "section" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MockQuestion_pkey" PRIMARY KEY ("mockTestId","questionId")
);

-- CreateTable
CREATE TABLE "MockAttempt" (
    "id" TEXT NOT NULL,
    "mockTestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMPTZ NOT NULL,
    "submittedAt" TIMESTAMPTZ,
    "raw" DOUBLE PRECISION,

    CONSTRAINT "MockAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockAnswer" (
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "section" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "response" JSONB,
    "result" "CheckResult",
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "MockAnswer_pkey" PRIMARY KEY ("attemptId","questionId")
);

-- CreateIndex
CREATE INDEX "MockTest_isPublished_closesAt_idx" ON "MockTest"("isPublished", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "MockAttempt_mockTestId_userId_key" ON "MockAttempt"("mockTestId", "userId");

-- AddForeignKey
ALTER TABLE "MockTest" ADD CONSTRAINT "MockTest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExamTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockQuestion" ADD CONSTRAINT "MockQuestion_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "MockTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockQuestion" ADD CONSTRAINT "MockQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAttempt" ADD CONSTRAINT "MockAttempt_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "MockTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAttempt" ADD CONSTRAINT "MockAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAnswer" ADD CONSTRAINT "MockAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "MockAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAnswer" ADD CONSTRAINT "MockAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

