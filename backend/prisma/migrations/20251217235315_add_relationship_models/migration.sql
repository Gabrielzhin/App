-- CreateTable
CREATE TABLE "RelationshipCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipDetail" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendRelationship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "detailId" TEXT,
    "customLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RelationshipCategory_userId_order_idx" ON "RelationshipCategory"("userId", "order");

-- CreateIndex
CREATE INDEX "RelationshipCategory_userId_isDefault_idx" ON "RelationshipCategory"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "RelationshipSubcategory_categoryId_order_idx" ON "RelationshipSubcategory"("categoryId", "order");

-- CreateIndex
CREATE INDEX "RelationshipSubcategory_userId_idx" ON "RelationshipSubcategory"("userId");

-- CreateIndex
CREATE INDEX "RelationshipDetail_subcategoryId_order_idx" ON "RelationshipDetail"("subcategoryId", "order");

-- CreateIndex
CREATE INDEX "RelationshipDetail_userId_idx" ON "RelationshipDetail"("userId");

-- CreateIndex
CREATE INDEX "FriendRelationship_userId_friendId_idx" ON "FriendRelationship"("userId", "friendId");

-- CreateIndex
CREATE INDEX "FriendRelationship_friendId_idx" ON "FriendRelationship"("friendId");

-- CreateIndex
CREATE INDEX "FriendRelationship_categoryId_idx" ON "FriendRelationship"("categoryId");

-- CreateIndex
CREATE INDEX "FriendRelationship_subcategoryId_idx" ON "FriendRelationship"("subcategoryId");

-- CreateIndex
CREATE INDEX "FriendRelationship_detailId_idx" ON "FriendRelationship"("detailId");

-- AddForeignKey
ALTER TABLE "RelationshipCategory" ADD CONSTRAINT "RelationshipCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipSubcategory" ADD CONSTRAINT "RelationshipSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RelationshipCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipSubcategory" ADD CONSTRAINT "RelationshipSubcategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipDetail" ADD CONSTRAINT "RelationshipDetail_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "RelationshipSubcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipDetail" ADD CONSTRAINT "RelationshipDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRelationship" ADD CONSTRAINT "FriendRelationship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRelationship" ADD CONSTRAINT "FriendRelationship_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RelationshipCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRelationship" ADD CONSTRAINT "FriendRelationship_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "RelationshipSubcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRelationship" ADD CONSTRAINT "FriendRelationship_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "RelationshipDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
