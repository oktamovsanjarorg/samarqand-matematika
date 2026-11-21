-- T-090: obuna tugashi eslatmasi
ALTER TABLE "Subscription" ADD COLUMN "reminderStage" INTEGER NOT NULL DEFAULT 0;

-- Allaqachon tugagan obunalar uchun deploy'dan keyin "tugadi" xabari ketmasin
UPDATE "Subscription" SET "reminderStage" = 2 WHERE "endsAt" <= now();
