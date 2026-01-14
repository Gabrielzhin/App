/*
  Warnings:

  - You are about to drop the column `emoji` on the `Reaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[memoryId,userId,type]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Reaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('MADE_ME_THINK', 'I_RELATE', 'THANK_YOU', 'THIS_INSPIRED_ME', 'BEAUTIFUL_MOMENT', 'SAVING_THIS');

-- DropIndex
DROP INDEX "Reaction_memoryId_userId_emoji_key";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "reactionId" TEXT;

-- AlterTable
ALTER TABLE "Reaction" DROP COLUMN "emoji",
ADD COLUMN     "type" "ReactionType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_memoryId_userId_type_key" ON "Reaction"("memoryId", "userId", "type");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reactionId_fkey" FOREIGN KEY ("reactionId") REFERENCES "Reaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
