-- CreateTable
CREATE TABLE "MemoryCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT DEFAULT '📦',
    "color" TEXT DEFAULT '#8B5CF6',
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryInCollection" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryInCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryCollection_userId_idx" ON "MemoryCollection"("userId");

-- CreateIndex
CREATE INDEX "MemoryInCollection_collectionId_idx" ON "MemoryInCollection"("collectionId");

-- CreateIndex
CREATE INDEX "MemoryInCollection_memoryId_idx" ON "MemoryInCollection"("memoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryInCollection_memoryId_collectionId_key" ON "MemoryInCollection"("memoryId", "collectionId");

-- AddForeignKey
ALTER TABLE "MemoryCollection" ADD CONSTRAINT "MemoryCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryInCollection" ADD CONSTRAINT "MemoryInCollection_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryInCollection" ADD CONSTRAINT "MemoryInCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "MemoryCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
