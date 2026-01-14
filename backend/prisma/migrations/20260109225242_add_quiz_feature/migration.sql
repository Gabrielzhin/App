-- CreateTable
CREATE TABLE "UserQuizAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendQuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizOwnerId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 10,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserQuizAnswer_userId_idx" ON "UserQuizAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuizAnswer_userId_questionId_key" ON "UserQuizAnswer"("userId", "questionId");

-- CreateIndex
CREATE INDEX "FriendQuizAttempt_userId_idx" ON "FriendQuizAttempt"("userId");

-- CreateIndex
CREATE INDEX "FriendQuizAttempt_quizOwnerId_idx" ON "FriendQuizAttempt"("quizOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendQuizAttempt_userId_quizOwnerId_key" ON "FriendQuizAttempt"("userId", "quizOwnerId");

-- AddForeignKey
ALTER TABLE "UserQuizAnswer" ADD CONSTRAINT "UserQuizAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendQuizAttempt" ADD CONSTRAINT "FriendQuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendQuizAttempt" ADD CONSTRAINT "FriendQuizAttempt_quizOwnerId_fkey" FOREIGN KEY ("quizOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
