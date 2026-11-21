-- CreateTable
CREATE TABLE "TrashItem" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "data" JSONB NOT NULL,
    "deletedById" TEXT,
    "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrashItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrashItem_deletedAt_idx" ON "TrashItem"("deletedAt");

-- AddForeignKey
ALTER TABLE "TrashItem" ADD CONSTRAINT "TrashItem_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
