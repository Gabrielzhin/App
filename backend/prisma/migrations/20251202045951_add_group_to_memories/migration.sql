-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Memory_groupId_idx" ON "Memory"("groupId");

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
