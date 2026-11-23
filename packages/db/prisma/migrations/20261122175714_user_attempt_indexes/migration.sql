-- CreateIndex
CREATE INDEX "MockAttempt_userId_submittedAt_idx" ON "MockAttempt"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "WeeklyAttempt_userId_submittedAt_idx" ON "WeeklyAttempt"("userId", "submittedAt");
