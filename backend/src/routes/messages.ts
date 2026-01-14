import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SendMessageBody {
  content: string;
  groupId?: string;
  recipientId?: string;
}

interface GroupParams {
  groupId: string;
}

interface ConversationParams {
  userId: string;
}

interface MessageParams {
  messageId: string;
}

export async function messageRoutes(fastify: FastifyInstance) {
  // GET /api/groups/:groupId/messages - Get group messages
  fastify.get<{ Params: GroupParams }>(
    '/api/groups/:groupId/messages',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: GroupParams }>, reply: FastifyReply) => {
      const { groupId } = request.params;
      const limit = parseInt((request.query as any).limit || '50');
      const before = (request.query as any).before;

      // Check if user is member of group
      const membership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: request.user.id,
        },
      });

      if (!membership) {
        return reply.code(403).send({ error: 'Not a member of this group' });
      }

      const messages = await prisma.groupMessage.findMany({
        where: {
          groupId,
          ...(before && { createdAt: { lt: new Date(before) } }),
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return reply.send(messages);
    }
  );

  // POST /api/groups/:groupId/messages - Send group message
  fastify.post<{ Params: GroupParams; Body: SendMessageBody }>(
    '/api/groups/:groupId/messages',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: GroupParams; Body: SendMessageBody }>, reply: FastifyReply) => {
      const { groupId } = request.params;
      const { content } = request.body;

      if (!content || content.trim().length === 0) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      // Check if user is member of group
      const membership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: request.user.id,
        },
      });

      if (!membership) {
        return reply.code(403).send({ error: 'Not a member of this group' });
      }

      const message = await prisma.groupMessage.create({
        data: {
          content: content.trim(),
          groupId,
          senderId: request.user.id,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      // Emit WebSocket event to group room
      const io = (fastify as any).io;
      if (io) {
        io.to(`group:${groupId}`).emit('new_group_message', message);
      }

      return reply.code(201).send(message);
    }
  );

  // DELETE /api/messages/:messageId - Delete message
  fastify.delete<{ Params: MessageParams }>(
    '/api/messages/:messageId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: MessageParams }>, reply: FastifyReply) => {
      const { messageId } = request.params;

      const message = await prisma.groupMessage.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      // Only sender can delete
      if (message.senderId !== request.user.id) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      await prisma.groupMessage.delete({
        where: { id: messageId },
      });

      return reply.code(204).send();
    }
  );

  // GET /api/messages/direct/:userId - Get direct messages with user (alias for /api/conversations/:userId/messages)
  fastify.get<{ Params: { userId: string } }>(
    '/api/messages/direct/:userId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      const { userId } = request.params;
      const limit = parseInt((request.query as any).limit || '50');
      const before = (request.query as any).before;

      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: request.user.id, recipientId: userId },
            { senderId: userId, recipientId: request.user.id },
          ],
          ...(before && { createdAt: { lt: new Date(before) } }),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: limit,
      });

      return reply.send({ messages });
    }
  );

  // POST /api/messages/direct - Send direct message
  fastify.post<{ Body: { receiverId: string; content: string } }>(
    '/api/messages/direct',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: { receiverId: string; content: string } }>, reply: FastifyReply) => {
      const { receiverId, content } = request.body;

      if (!receiverId) {
        return reply.code(400).send({ error: 'receiverId is required' });
      }

      if (!content || content.trim().length === 0) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      // Check if recipient exists
      const recipient = await prisma.user.findUnique({
        where: { id: receiverId },
      });

      if (!recipient) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const message = await prisma.directMessage.create({
        data: {
          content: content.trim(),
          senderId: request.user.id,
          recipientId: receiverId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      // Emit WebSocket event to DM room
      const io = (fastify as any).io;
      if (io) {
        const roomName = `dm:${[request.user.id, receiverId].sort().join(':')}`;
        io.to(roomName).emit('new_dm', message);
      }

      return reply.code(201).send({ message });
    }
  );

  // PATCH /api/messages/direct/:userId/read - Mark messages as read
  fastify.patch<{ Params: { userId: string } }>(
    '/api/messages/direct/:userId/read',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      const { userId } = request.params;

      // Mark all messages from this user as read
      await prisma.directMessage.updateMany({
        where: {
          senderId: userId,
          recipientId: request.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return reply.send({ success: true });
    }
  );

  // GET /api/messages/conversations - Get user conversations (alias for /api/conversations)
  fastify.get(
    '/api/messages/conversations',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Get all direct messages involving this user
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: request.user.id },
            { recipientId: request.user.id },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Group by conversation partner
      const conversationsMap = new Map();
      messages.forEach((msg) => {
        const partnerId = msg.senderId === request.user.id ? msg.recipientId : msg.senderId;
        const partner = msg.senderId === request.user.id ? msg.recipient : msg.sender;
        
        if (!conversationsMap.has(partnerId)) {
          // Count unread messages from this partner
          const unreadCount = messages.filter(
            m => m.senderId === partnerId && m.recipientId === request.user.id && !m.read
          ).length;

          conversationsMap.set(partnerId, {
            user: partner,
            lastMessage: msg,
            unreadCount,
          });
        }
      });

      return reply.send({ conversations: Array.from(conversationsMap.values()) });
    }
  );

  // GET /api/conversations - Get user conversations
  fastify.get(
    '/api/conversations',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Get all direct messages involving this user
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: request.user.id },
            { recipientId: request.user.id },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Group by conversation partner
      const conversations = new Map();
      messages.forEach((msg) => {
        const partnerId = msg.senderId === request.user.id ? msg.recipientId : msg.senderId;
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, {
            partner: msg.senderId === request.user.id ? msg.recipient : msg.sender,
            lastMessage: msg,
            unreadCount: 0,
          });
        }
      });

      return reply.send(Array.from(conversations.values()));
    }
  );

  // GET /api/conversations/:userId/messages - Get direct messages with user
  fastify.get<{ Params: ConversationParams }>(
    '/api/conversations/:userId/messages',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: ConversationParams }>, reply: FastifyReply) => {
      const { userId } = request.params;
      const limit = parseInt((request.query as any).limit || '50');
      const before = (request.query as any).before;

      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: request.user.id, recipientId: userId },
            { senderId: userId, recipientId: request.user.id },
          ],
          ...(before && { createdAt: { lt: new Date(before) } }),
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return reply.send(messages);
    }
  );

  // POST /api/conversations/:userId/messages - Send direct message
  fastify.post<{ Params: ConversationParams; Body: SendMessageBody }>(
    '/api/conversations/:userId/messages',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: ConversationParams; Body: SendMessageBody }>, reply: FastifyReply) => {
      const { userId } = request.params;
      const { content } = request.body;

      if (!content || content.trim().length === 0) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      // Check if recipient exists
      const recipient = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!recipient) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const message = await prisma.directMessage.create({
        data: {
          content: content.trim(),
          senderId: request.user.id,
          recipientId: userId,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              username: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      return reply.code(201).send(message);
    }
  );
}
