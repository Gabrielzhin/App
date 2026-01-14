import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { prisma } from './index.js';

interface UserSocket {
  userId: string;
  socketId: string;
}

const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

export function initializeSocket(fastify: FastifyInstance) {
  const io = new Server(fastify.server, {
    cors: {
      origin: (origin, callback) => {
        // Allow all origins in development for mobile apps
        if (!origin || process.env.NODE_ENV !== 'production') {
          callback(null, true);
          return;
        }
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = await fastify.jwt.verify(token) as any;
      socket.data.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Track user's socket connections
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle joining group chat rooms
    socket.on('join_group', async (groupId: string) => {
      try {
        // Verify user is member of group
        const member = await prisma.groupMember.findFirst({
          where: {
            groupId,
            userId,
          },
        });

        if (member) {
          socket.join(`group:${groupId}`);
          console.log(`User ${userId} joined group:${groupId}`);
        }
      } catch (error) {
        console.error('Error joining group:', error);
      }
    });

    // Handle leaving group chat rooms
    socket.on('leave_group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      console.log(`User ${userId} left group:${groupId}`);
    });

    // Handle joining DM room
    socket.on('join_dm', (otherUserId: string) => {
      // Create consistent room name for DM (sorted user IDs)
      const roomName = `dm:${[userId, otherUserId].sort().join(':')}`;
      socket.join(roomName);
      console.log(`User ${userId} joined ${roomName}`);
    });

    // Handle leaving DM room
    socket.on('leave_dm', (otherUserId: string) => {
      const roomName = `dm:${[userId, otherUserId].sort().join(':')}`;
      socket.leave(roomName);
      console.log(`User ${userId} left ${roomName}`);
    });

    // Handle typing indicators for groups
    socket.on('typing_group', async ({ groupId, isTyping }: { groupId: string; isTyping: boolean }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      socket.to(`group:${groupId}`).emit('user_typing_group', {
        userId,
        username: user?.username,
        groupId,
        isTyping,
      });
    });

    // Handle typing indicators for DMs
    socket.on('typing_dm', async ({ otherUserId, isTyping }: { otherUserId: string; isTyping: boolean }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      const roomName = `dm:${[userId, otherUserId].sort().join(':')}`;
      socket.to(roomName).emit('user_typing_dm', {
        userId,
        username: user?.username,
        isTyping,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected (socket ${socket.id})`);
      
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
}

// Export function to emit events from routes
export function getIO(fastify: FastifyInstance) {
  return (fastify as any).io;
}
