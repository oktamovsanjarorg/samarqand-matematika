-- T-181: offline test har savol javobi bilan qayta qurildi. Eski format (bo'lim ballari) javoblarsiz,
-- ularni yangi ko'rinishga o'tkazib bo'lmaydi. Production'da bu paytda offline test yo'q edi (0 ta).
DELETE FROM "OfflineTest";

-- AlterTable
ALTER TABLE "OfflineResult" DROP COLUMN "scores",
DROP COLUMN "total",
ADD COLUMN     "answers" TEXT NOT NULL,
ADD COLUMN     "blank" INTEGER NOT NULL,
ADD COLUMN     "correct" INTEGER NOT NULL,
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "notifiedAt" TIMESTAMPTZ,
ADD COLUMN     "percent" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "score" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "wrong" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "OfflineTest" ADD COLUMN     "format" TEXT NOT NULL,
ADD COLUMN     "notifiedAt" TIMESTAMPTZ,
ADD COLUMN     "questionCount" INTEGER NOT NULL,
ADD COLUMN     "rasch" JSONB NOT NULL,
ADD COLUMN     "scaleMax" DOUBLE PRECISION NOT NULL,
DROP COLUMN "sections",
ADD COLUMN     "sections" JSONB NOT NULL DEFAULT '[]';
