-- AlterTable
ALTER TABLE "Memory" ADD COLUMN     "latitude" DECIMAL(10,8),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "longitude" DECIMAL(11,8);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryCategory" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "MemoryCategory_memoryId_idx" ON "MemoryCategory"("memoryId");

-- CreateIndex
CREATE INDEX "MemoryCategory_categoryId_idx" ON "MemoryCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryCategory_memoryId_categoryId_key" ON "MemoryCategory"("memoryId", "categoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryCategory" ADD CONSTRAINT "MemoryCategory_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryCategory" ADD CONSTRAINT "MemoryCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
