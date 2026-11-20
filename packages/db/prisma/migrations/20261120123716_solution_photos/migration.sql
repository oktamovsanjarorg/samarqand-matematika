-- CreateTable
CREATE TABLE "SolutionPhoto" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolutionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolutionPhoto_attemptId_questionId_idx" ON "SolutionPhoto"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "SolutionPhoto" ADD CONSTRAINT "SolutionPhoto_attemptId_questionId_fkey" FOREIGN KEY ("attemptId", "questionId") REFERENCES "WeeklyAnswer"("attemptId", "questionId") ON DELETE CASCADE ON UPDATE CASCADE;

