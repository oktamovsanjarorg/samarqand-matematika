-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receiptHash" TEXT;

-- CreateIndex
CREATE INDEX "Payment_receiptHash_idx" ON "Payment"("receiptHash");
