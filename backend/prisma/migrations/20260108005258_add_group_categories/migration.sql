-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Category_groupId_idx" ON "Category"("groupId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
