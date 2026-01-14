import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password.js';
import { seedDefaultRelationships } from '../../prisma/seed-relationships.js';
import { seedCoreMemoriesCategory } from '../../prisma/seed-core-memories.js';

const prisma = new PrismaClient();

interface RegisterBody {
  email: string;
  username: string;
  password: string;
  name?: string;
  profilePicture?: string;
  referredBy?: string; // Referral code
}

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post<{ Body: RegisterBody }>(
    '/api/auth/register',
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      const { email, username, password, name, profilePicture, referredBy } = request.body;

      // Validate input
      if (!email || !username || !password) {
        return reply.code(400).send({
          error: 'Email, username, and password are required',
        });
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
      if (!usernameRegex.test(username)) {
        return reply.code(400).send({
          error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens',
        });
      }

      if (password.length < 8) {
        return reply.code(400).send({
          error: 'Password must be at least 8 characters',
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username: { equals: username, mode: 'insensitive' } }
          ]
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return reply.code(409).send({
            error: 'User with this email already exists',
          });
        } else {
          return reply.code(409).send({
            error: 'Username is already taken',
          });
        }
      }

      // Find referrer if referral code provided
      let referrerId: string | undefined;
      if (referredBy) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: referredBy },
        });
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          username,
          name,
          profilePicture,
          passwordHash,
          mode: 'RESTRICTED', // New users start in freemium mode
          referredBy: referrerId,
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          profilePicture: true,
          mode: true,
          referralCode: true,
        },
      });

      // Seed default relationship categories for new user
      await seedDefaultRelationships(user.id);

      // Seed Core Memories category for new user
      await seedCoreMemoriesCategory(user.id);

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        mode: user.mode,
      });

      return reply.code(201).send({
        user,
        token,
      });
    }
  );

  // POST /api/auth/login
  fastify.post<{ Body: LoginBody }>(
    '/api/auth/login',
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { email, password } = request.body;

      // Validate input
      if (!email || !password) {
        return reply.code(400).send({
          error: 'Email and password are required',
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
              plan: true,
            },
          },
        },
      });

      if (!user) {
        return reply.code(401).send({
          error: 'Invalid email or password',
        });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(401).send({
          error: 'Invalid email or password',
        });
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        mode: user.mode,
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          profilePicture: user.profilePicture,
          mode: user.mode,
          referralCode: user.referralCode,
          subscription: user.subscription,
        },
        token,
      });
    }
  );

  // GET /api/auth/me (get current user info)
  fastify.get(
    '/api/auth/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          profilePicture: true,
          mode: true,
          referralCode: true,
          profileVisibility: true,
          emailVerified: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
              plan: true,
              currentPeriodEnd: true,
              trialEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send(user);
    }
  );

  // GET /api/auth/check-username?username=xxx (check username availability)
  fastify.get<{ Querystring: { username: string } }>(
    '/api/auth/check-username',
    async (request: FastifyRequest<{ Querystring: { username: string } }>, reply: FastifyReply) => {
      const { username } = request.query;

      if (!username) {
        return reply.code(400).send({ error: 'Username is required' });
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
      if (!usernameRegex.test(username)) {
        return reply.send({ 
          available: false, 
          error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens' 
        });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          username: { equals: username, mode: 'insensitive' }
        },
      });

      return reply.send({ 
        available: !existingUser,
        username 
      });
    }
  );
}
