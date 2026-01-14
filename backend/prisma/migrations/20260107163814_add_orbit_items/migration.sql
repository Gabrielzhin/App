/*
  Warnings:

  - You are about to drop the column `displayName` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrbitItemType" AS ENUM ('PERSON', 'GROUP', 'CATEGORY');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "displayName";

-- CreateTable
CREATE TABLE "OrbitItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrbitItemType" NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "position" INTEGER NOT NULL,
    "targetUserId" TEXT,
    "groupId" TEXT,
    "categoryId" TEXT,
    "memberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrbitItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrbitItem_userId_idx" ON "OrbitItem"("userId");

-- CreateIndex
CREATE INDEX "OrbitItem_targetUserId_idx" ON "OrbitItem"("targetUserId");

-- CreateIndex
CREATE INDEX "OrbitItem_groupId_idx" ON "OrbitItem"("groupId");

-- CreateIndex
CREATE INDEX "OrbitItem_categoryId_idx" ON "OrbitItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "OrbitItem_userId_position_key" ON "OrbitItem"("userId", "position");

-- AddForeignKey
ALTER TABLE "OrbitItem" ADD CONSTRAINT "OrbitItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrbitItem" ADD CONSTRAINT "OrbitItem_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrbitItem" ADD CONSTRAINT "OrbitItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrbitItem" ADD CONSTRAINT "OrbitItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
