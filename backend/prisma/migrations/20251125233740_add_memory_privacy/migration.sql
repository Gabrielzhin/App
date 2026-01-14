-- CreateEnum
CREATE TYPE "MemoryPrivacy" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "privacy" "MemoryPrivacy" NOT NULL DEFAULT 'PUBLIC';
