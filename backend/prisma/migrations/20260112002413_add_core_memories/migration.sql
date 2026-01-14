-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "coreReason" TEXT,
ADD COLUMN     "isCore" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Memory_userId_isCore_idx" ON "Memory"("userId", "isCore");
