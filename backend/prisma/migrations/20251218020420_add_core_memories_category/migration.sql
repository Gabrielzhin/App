-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isProtected" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Category_userId_isProtected_idx" ON "Category"("userId", "isProtected");
