-- AlterTable
ALTER TABLE "WeeklyAnswer" ADD COLUMN     "reviewedAt" TIMESTAMPTZ,
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "teacherNote" TEXT,
ADD COLUMN     "teacherPoints" INTEGER;

-- AddForeignKey
ALTER TABLE "WeeklyAnswer" ADD CONSTRAINT "WeeklyAnswer_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

