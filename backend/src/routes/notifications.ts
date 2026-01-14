import type { FastifyInstance } from 'fastify';
import { notificationService } from '../services/notification.js';

export default async function notificationRoutes(fastify: FastifyInstance) {
  // Get user notifications
  fastify.get(
    '/api/notifications',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { limit, unreadOnly } = request.query as {
        limit?: string;
        unreadOnly?: string;
      };

      const notifications = await notificationService.getUserNotifications(
        userId,
        limit ? parseInt(limit) : 50,
        unreadOnly === 'true'
      );

      return reply.send({ notifications });
    }
  );

  // Get unread count
  fastify.get(
    '/api/notifications/unread-count',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const count = await notificationService.getUnreadCount(userId);

      return reply.send({ count });
    }
  );

  // Mark notification as read
  fastify.put(
    '/api/notifications/:id/read',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      await notificationService.markAsRead(id, userId);

      return reply.send({ success: true });
    }
  );

  // Mark all as read
  fastify.put(
    '/api/notifications/read-all',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;

      await notificationService.markAllAsRead(userId);

      return reply.send({ success: true });
    }
  );

  // Delete notification
  fastify.delete(
    '/api/notifications/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      await notificationService.delete(id, userId);

      return reply.send({ success: true });
    }
  );
}
