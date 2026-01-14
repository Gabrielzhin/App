import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import compress from '@fastify/compress';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, UserMode } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const prisma = new PrismaClient();
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  bodyLimit: 1048576, // 1MB for webhook payloads
});

const allowedOrigins = [
  'http://localhost:3000',        // Web dev
  'http://localhost:5173',        // Vite
  'http://10.0.2.2:3000',         // Android Emulator → host
  'http://127.0.0.1:3000',

  // Capacitor / Cordova
  'capacitor://localhost',
  'ionic://localhost',

  // Expo / React Native
  'http://localhost',
  'exp://127.0.0.1',
];

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow non-browser requests (Postman, curl, mobile apps)
    if (!origin) {
      cb(null, true);
      return;
    }

    // Allow Expo development URLs (exp://192.168.x.x:8081)
    if (origin?.startsWith('exp://')) {
      cb(null, true);
      return;
    }

    // Allow any localhost/127.0.0.1 with any port in development
    if (process.env.NODE_ENV !== 'production') {
      const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/;
      if (localhostPattern.test(origin)) {
        cb(null, true);
        return;
      }
    }

    // Check whitelist
    if (allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'supersecret-change-in-production',
});

await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Enable gzip/deflate compression for all responses (60-80% smaller payloads)
await fastify.register(compress, {
  global: true,
  encodings: ['gzip', 'deflate'],
  threshold: 1024, // Only compress responses larger than 1KB
});

// Serve static files from public directory (for Stripe redirect pages)
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
});
// Extend FastifyInstance with custom decorators
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireFullMode: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Extend FastifyRequest with user property
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      mode: string;
    };
  }
}

// Authentication decorator
fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    
    // Load user from database (including mode)
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, mode: true },
    });
    
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }
    
    request.user = user;
  } catch (err) {
    reply.send(err);
  }
});

// Permission middleware for FULL mode
fastify.decorate('requireFullMode', async function (request: FastifyRequest, reply: FastifyReply) {
  if (request.user?.mode === 'RESTRICTED') {
    return reply.code(403).send({
      error: 'Upgrade required',
      message: 'This action requires a full subscription',
    });
  }
});

// Register routes
import { authRoutes } from './routes/auth.js';
import { memoryRoutes } from './routes/memories.js';
import { commentRoutes } from './routes/comments.js';
import { messageRoutes } from './routes/messages.js';
import { stripeRoutes } from './routes/stripe.js';
import { webhookRoutes } from './routes/webhooks.js';
import { verificationRoutes } from './routes/verification.js';
import { payoutRoutes } from './routes/payouts.js';
import { adminRoutes } from './routes/admin.js';
import { userRoutes } from './routes/users.js';
import { devRoutes } from './routes/dev.js';
import { searchRoutes } from './routes/search.js';
import { groupRoutes } from './routes/groups.js';
import { categoryRoutes } from './routes/categories.js';
import { uploadRoutes } from './routes/uploads.js';
import { relationshipRoutes } from './routes/relationships.js';
import collectionsRoutes from './routes/collections.js';
import { friendRoutes } from './routes/friends.js';
import { reactionRoutes } from './routes/reactions.js';
import notificationRoutes from './routes/notifications.js';
import { orbitRoutes } from './routes/orbit.js';
import { statsRoutes } from './routes/stats.js';
import { quizRoutes } from './routes/quiz.js';
import { initializeSocket } from './socket.js';

// Register webhook routes first (before body parser)
await fastify.register(webhookRoutes);

await fastify.register(authRoutes);
await fastify.register(memoryRoutes);
await fastify.register(commentRoutes);
await fastify.register(reactionRoutes);
  await fastify.register(messageRoutes);
await fastify.register(stripeRoutes);
await fastify.register(verificationRoutes);
await fastify.register(payoutRoutes);
await fastify.register(adminRoutes);
await fastify.register(userRoutes);
await fastify.register(devRoutes);
await fastify.register(searchRoutes);
await fastify.register(groupRoutes, { prefix: '/api/groups' });
await fastify.register(categoryRoutes);
await fastify.register(uploadRoutes, { prefix: '/api/uploads' });
await fastify.register(relationshipRoutes);
await fastify.register(collectionsRoutes);
await fastify.register(friendRoutes);
await fastify.register(notificationRoutes);
await fastify.register(orbitRoutes, { prefix: '/api/orbit' });
await fastify.register(statsRoutes);
await fastify.register(quizRoutes);

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '4000', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    // Initialize Socket.io after Fastify starts
    const io = initializeSocket(fastify);
    (fastify as any).io = io;
    
    console.log(`🚀 Server ready at http://${host}:${port}`);
    console.log(`🔌 WebSocket server ready at ws://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});
