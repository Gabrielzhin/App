import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Predefined quiz questions
export const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What is my favorite way to spend a free day?",
    options: [
      { letter: "A", text: "Sleeping" },
      { letter: "B", text: "Watching movies/series" },
      { letter: "C", text: "Going out with friends" },
      { letter: "D", text: "Doing something creative" }
    ]
  },
  {
    id: 2,
    question: "What's my biggest weakness?",
    options: [
      { letter: "A", text: "Overthinking" },
      { letter: "B", text: "Being late" },
      { letter: "C", text: "Being too nice" },
      { letter: "D", text: "Procrastinating" }
    ]
  },
  {
    id: 3,
    question: "What time of day am I most productive?",
    options: [
      { letter: "A", text: "Early morning" },
      { letter: "B", text: "Afternoon" },
      { letter: "C", text: "Evening" },
      { letter: "D", text: "Late night" }
    ]
  },
  {
    id: 4,
    question: "What kind of movies do I like the most?",
    options: [
      { letter: "A", text: "Comedy" },
      { letter: "B", text: "Romance" },
      { letter: "C", text: "Action" },
      { letter: "D", text: "Horror" }
    ]
  },
  {
    id: 5,
    question: "What would I rather do on a weekend?",
    options: [
      { letter: "A", text: "Stay home" },
      { letter: "B", text: "Go on an adventure" },
      { letter: "C", text: "Hang out with friends" },
      { letter: "D", text: "Catch up on sleep" }
    ]
  },
  {
    id: 6,
    question: "What's my love language?",
    options: [
      { letter: "A", text: "Words of affirmation" },
      { letter: "B", text: "Quality time" },
      { letter: "C", text: "Acts of service" },
      { letter: "D", text: "Gifts" },
      { letter: "E", text: "Physical Touch" }
    ]
  },
  {
    id: 7,
    question: "What's my biggest green flag?",
    options: [
      { letter: "A", text: "Loyalty" },
      { letter: "B", text: "Humor" },
      { letter: "C", text: "Honesty" },
      { letter: "D", text: "Supportiveness" }
    ]
  },
  {
    id: 8,
    question: "If plans change last minute, they usually feel:",
    options: [
      { letter: "A", text: "Relieved" },
      { letter: "B", text: "Annoyed" },
      { letter: "C", text: "Excited" },
      { letter: "D", text: "Anxious" },
      { letter: "E", text: "Totally fine" }
    ]
  },
  {
    id: 9,
    question: "What matters most to them right now?",
    options: [
      { letter: "A", text: "Stability" },
      { letter: "B", text: "Growth" },
      { letter: "C", text: "Relationships" },
      { letter: "D", text: "Freedom" },
      { letter: "E", text: "Peace" }
    ]
  },
  {
    id: 10,
    question: "What kind of decisions do they make?",
    options: [
      { letter: "A", text: "Carefully planned" },
      { letter: "B", text: "Intuitive" },
      { letter: "C", text: "Emotion-driven" },
      { letter: "D", text: "Logical" },
      { letter: "E", text: "A mix of everything" }
    ]
  }
];

export async function quizRoutes(fastify: FastifyInstance) {
  // GET /api/quiz/questions - Get all quiz questions
  fastify.get(
    '/api/quiz/questions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ questions: QUIZ_QUESTIONS });
    }
  );

  // GET /api/quiz/my-answers - Get current user's quiz answers
  fastify.get(
    '/api/quiz/my-answers',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const answers = await prisma.userQuizAnswer.findMany({
          where: { userId: request.user.id },
          orderBy: { questionId: 'asc' },
        });

        return reply.send({ answers });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch quiz answers' });
      }
    }
  );

  // POST /api/quiz/my-answers - Save/update user's quiz answers
  fastify.post(
    '/api/quiz/my-answers',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { answers } = request.body as { answers: { questionId: number; answer: string }[] };

        if (!answers || !Array.isArray(answers)) {
          return reply.code(400).send({ error: 'Invalid answers format' });
        }

        // Validate answers
        for (const ans of answers) {
          if (!ans.questionId || !ans.answer || ans.questionId < 1 || ans.questionId > 10) {
            return reply.code(400).send({ error: 'Invalid answer data' });
          }
        }

        // Upsert all answers
        const updatedAnswers = await Promise.all(
          answers.map(ans =>
            prisma.userQuizAnswer.upsert({
              where: {
                userId_questionId: {
                  userId: request.user.id,
                  questionId: ans.questionId,
                },
              },
              update: {
                answer: ans.answer,
              },
              create: {
                userId: request.user.id,
                questionId: ans.questionId,
                answer: ans.answer,
              },
            })
          )
        );

        return reply.send({ 
          message: 'Quiz answers saved successfully',
          answers: updatedAnswers 
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to save quiz answers' });
      }
    }
  );

  // GET /api/quiz/user/:userId - Get if a user has completed their quiz
  fastify.get(
    '/api/quiz/user/:userId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };

        const answerCount = await prisma.userQuizAnswer.count({
          where: { userId },
        });

        const hasCompleted = answerCount >= 10;

        return reply.send({ 
          userId,
          hasCompleted,
          answeredQuestions: answerCount 
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to check quiz status' });
      }
    }
  );

  // POST /api/quiz/attempt/:quizOwnerId - Submit a quiz attempt for a friend
  fastify.post(
    '/api/quiz/attempt/:quizOwnerId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { quizOwnerId } = request.params as { quizOwnerId: string };
        const { answers } = request.body as { answers: Record<string, string> };

        if (!answers || typeof answers !== 'object') {
          return reply.code(400).send({ error: 'Invalid answers format' });
        }

        // Can't take your own quiz
        if (quizOwnerId === request.user.id) {
          return reply.code(400).send({ error: 'You cannot take your own quiz' });
        }

        // Get the quiz owner's answers
        const correctAnswers = await prisma.userQuizAnswer.findMany({
          where: { userId: quizOwnerId },
        });

        if (correctAnswers.length < 10) {
          return reply.code(400).send({ error: 'This user has not completed their quiz yet' });
        }

        // Calculate score
        let score = 0;
        const correctAnswersMap = new Map(
          correctAnswers.map(a => [a.questionId.toString(), a.answer])
        );

        for (const [questionId, userAnswer] of Object.entries(answers)) {
          const correctAnswer = correctAnswersMap.get(questionId);
          if (correctAnswer === userAnswer) {
            score++;
          }
        }

        // Save attempt
        const attempt = await prisma.friendQuizAttempt.upsert({
          where: {
            userId_quizOwnerId: {
              userId: request.user.id,
              quizOwnerId,
            },
          },
          update: {
            answers,
            score,
            totalQuestions: 10,
            completedAt: new Date(),
          },
          create: {
            userId: request.user.id,
            quizOwnerId,
            answers,
            score,
            totalQuestions: 10,
          },
        });

        return reply.send({ 
          attempt,
          score,
          totalQuestions: 10,
          percentage: Math.round((score / 10) * 100)
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to submit quiz attempt' });
      }
    }
  );

  // GET /api/quiz/attempts/my-quiz - Get all attempts on my quiz (who took my quiz)
  fastify.get(
    '/api/quiz/attempts/my-quiz',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const attempts = await prisma.friendQuizAttempt.findMany({
          where: { quizOwnerId: request.user.id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                profilePicture: true,
              },
            },
          },
          orderBy: { score: 'desc' },
        });

        return reply.send({ attempts });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch quiz attempts' });
      }
    }
  );

  // GET /api/quiz/attempts/friend/:friendId - Get my attempt on a friend's quiz
  fastify.get(
    '/api/quiz/attempts/friend/:friendId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { friendId } = request.params as { friendId: string };

        const attempt = await prisma.friendQuizAttempt.findUnique({
          where: {
            userId_quizOwnerId: {
              userId: request.user.id,
              quizOwnerId: friendId,
            },
          },
        });

        return reply.send({ attempt });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch quiz attempt' });
      }
    }
  );
}
