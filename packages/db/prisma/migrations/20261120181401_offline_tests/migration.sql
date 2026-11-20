-- CreateTable
CREATE TABLE "OfflineTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "groupId" TEXT,
    "sections" TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineResult" (
    "id" TEXT NOT NULL,
    "offlineTestId" TEXT NOT NULL,
    "userId" TEXT,
    "line" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "scores" DOUBLE PRECISION[],
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OfflineResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfflineTest_date_idx" ON "OfflineTest"("date");

-- CreateIndex
CREATE INDEX "OfflineResult_offlineTestId_idx" ON "OfflineResult"("offlineTestId");

-- CreateIndex
CREATE INDEX "OfflineResult_userId_idx" ON "OfflineResult"("userId");

-- AddForeignKey
ALTER TABLE "OfflineTest" ADD CONSTRAINT "OfflineTest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineTest" ADD CONSTRAINT "OfflineTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineResult" ADD CONSTRAINT "OfflineResult_offlineTestId_fkey" FOREIGN KEY ("offlineTestId") REFERENCES "OfflineTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineResult" ADD CONSTRAINT "OfflineResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

