-- AlterTable
ALTER TABLE "MockTest" ADD COLUMN     "announcedAt" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "WeeklyTest" ADD COLUMN     "announcedAt" TIMESTAMPTZ;

-- Allaqachon ochilgan testlar e'lon qilingan deb belgilanadi: deploy paytida eski testlar haqida xabar ketmaydi
UPDATE "WeeklyTest" SET "announcedAt" = now() WHERE "opensAt" <= now();
UPDATE "MockTest" SET "announcedAt" = now() WHERE "opensAt" <= now();
