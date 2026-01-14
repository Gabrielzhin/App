-- CreateIndex
CREATE INDEX "Memory_userId_createdAt_idx" ON "Memory"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Memory_groupId_createdAt_idx" ON "Memory"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Memory_privacy_createdAt_idx" ON "Memory"("privacy", "createdAt" DESC);
