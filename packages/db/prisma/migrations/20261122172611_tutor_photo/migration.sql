-- CreateTable
CREATE TABLE "TutorPhoto" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" TEXT,
    "path" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorPhoto_messageId_key" ON "TutorPhoto"("messageId");

-- CreateIndex
CREATE INDEX "TutorPhoto_chatId_idx" ON "TutorPhoto"("chatId");

-- AddForeignKey
ALTER TABLE "TutorPhoto" ADD CONSTRAINT "TutorPhoto_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "TutorChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorPhoto" ADD CONSTRAINT "TutorPhoto_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TutorMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
