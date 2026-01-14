-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAutoSaved" TIMESTAMP(3),
ADD COLUMN     "moods" TEXT[];

-- CreateIndex
CREATE INDEX "Memory_userId_isDraft_idx" ON "Memory"("userId", "isDraft");
