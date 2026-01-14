-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "aboutUserId" TEXT,
ADD COLUMN     "memoryDate" TIMESTAMP(3),
ADD COLUMN     "taggedUserIds" TEXT[],
ADD COLUMN     "title" TEXT;
