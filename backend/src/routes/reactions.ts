import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, ReactionType } from '@prisma/client';
import { notificationService } from '../services/notification.js';

const prisma = new PrismaClient();

interface MemoryParams {
  memoryId: string;
}

interface ReactionBody {
  type: ReactionType;
}

export async function reactionRoutes(fastify: FastifyInstance) {
  // GET /api/memories/:memoryId/reactions - Get all reactions for a memory
  fastify.get<{ Params: MemoryParams }>(
    '/api/memories/:memoryId/reactions',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: MemoryParams }>, reply: FastifyReply) => {
      const { memoryId } = request.params;

      // Check if memory exists
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memory) {
        return reply.code(404).send({ error: 'Memory not found' });
      }

      const reactions = await prisma.reaction.findMany({
        where: { memoryId },
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(reactions);
    }
  );

  // POST /api/memories/:memoryId/reactions - Add or toggle reaction
  fastify.post<{ Params: MemoryParams; Body: ReactionBody }>(
    '/api/memories/:memoryId/reactions',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: MemoryParams; Body: ReactionBody }>, reply: FastifyReply) => {
      const { memoryId } = request.params;
      const { type } = request.body;

      if (!type) {
        return reply.code(400).send({ error: 'Reaction type is required' });
      }

      // Check if memory exists
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memory) {
        return reply.code(404).send({ error: 'Memory not found' });
      }

      // Check if user already reacted with this type
      const existingReaction = await prisma.reaction.findFirst({
        where: {
          memoryId,
          userId: request.user.id,
          type,
        },
      });

      if (existingReaction) {
        // Remove reaction (toggle off)
        await prisma.reaction.delete({
          where: { id: existingReaction.id },
        });
        return reply.send({ removed: true, type });
      } else {
        // Add new reaction
        const reaction = await prisma.reaction.create({
          data: {
            type,
            memoryId,
            userId: request.user.id,
          },
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
        });
        
        // Send notification (async, don't await)
        notificationService.notifyReaction(memoryId, request.user.id, type).catch(console.error);
        
        return reply.code(201).send(reaction);
      }
    }
  );

  // DELETE /api/memories/:memoryId/reactions/:reactionId - Remove reaction
  fastify.delete<{ Params: { memoryId: string; reactionId: string } }>(
    '/api/memories/:memoryId/reactions/:reactionId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { memoryId: string; reactionId: string } }>, reply: FastifyReply) => {
      const { reactionId } = request.params;

      const reaction = await prisma.reaction.findUnique({
        where: { id: reactionId },
      });

      if (!reaction) {
        return reply.code(404).send({ error: 'Reaction not found' });
      }

      // Only reaction owner can delete
      if (reaction.userId !== request.user.id) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      await prisma.reaction.delete({
        where: { id: reactionId },
      });

      return reply.code(204).send();
    }
  );
}
