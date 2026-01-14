import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { notificationService } from '../services/notification.js';

const prisma = new PrismaClient();

interface CreateCommentBody {
  content: string;
  parentId?: string;
}

interface MemoryParams {
  memoryId: string;
}

interface CommentParams {
  memoryId: string;
  commentId: string;
}

export async function commentRoutes(fastify: FastifyInstance) {
  // GET /api/memories/:memoryId/comments - Get all comments for a memory
  fastify.get<{ Params: MemoryParams }>(
    '/api/memories/:memoryId/comments',
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

      // Get only top-level comments (parentId is null)
      const comments = await prisma.comment.findMany({
        where: { 
          memoryId,
          parentId: null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
              name: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  profilePicture: true,
                  name: true,
                },
              },
              replies: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      email: true,
                      profilePicture: true,
                      name: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(comments);
    }
  );

  // POST /api/memories/:memoryId/comments - Create comment
  fastify.post<{ Params: MemoryParams; Body: CreateCommentBody }>(
    '/api/memories/:memoryId/comments',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: MemoryParams; Body: CreateCommentBody }>, reply: FastifyReply) => {
      const { memoryId } = request.params;
      const { content, parentId } = request.body;

      if (!content || content.trim().length === 0) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      // Check if memory exists
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
      });

      if (!memory) {
        return reply.code(404).send({ error: 'Memory not found' });
      }

      const comment = await prisma.comment.create({
        data: {
          content: content.trim(),
          memoryId,
          userId: request.user.id,
          parentId: parentId || undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
              name: true,
            },
          },
        },
      });

      // Send notification to memory owner (async, don't await)
      notificationService.notifyComment(memoryId, request.user.id, comment.id).catch(console.error);

      return reply.code(201).send(comment);
    }
  );

  // PUT /api/memories/:memoryId/comments/:commentId - Update comment
  fastify.put<{ Params: CommentParams; Body: CreateCommentBody }>(
    '/api/memories/:memoryId/comments/:commentId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: CommentParams; Body: CreateCommentBody }>, reply: FastifyReply) => {
      const { commentId } = request.params;
      const { content } = request.body;

      if (!content || content.trim().length === 0) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        return reply.code(404).send({ error: 'Comment not found' });
      }

      // Only comment owner can update
      if (comment.userId !== request.user.id) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: { content: content.trim() },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      return reply.send(updatedComment);
    }
  );

  // DELETE /api/memories/:memoryId/comments/:commentId - Delete comment
  fastify.delete<{ Params: CommentParams }>(
    '/api/memories/:memoryId/comments/:commentId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: CommentParams }>, reply: FastifyReply) => {
      const { commentId } = request.params;

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        return reply.code(404).send({ error: 'Comment not found' });
      }

      // Only comment owner can delete
      if (comment.userId !== request.user.id) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      await prisma.comment.delete({
        where: { id: commentId },
      });

      return reply.code(204).send();
    }
  );
}
