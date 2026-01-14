import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UpdateProfileBody {
  name?: string;
  username?: string;
  bio?: string;
  profilePicture?: string;
  profileVisibility?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
}

interface SearchUsersQuery {
  q: string;
  limit?: string;
}

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/users/me - Get current user profile
  fastify.get(
    '/api/users/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: request.user.id },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            bio: true,
            profilePicture: true,
            coverImage: true,
            mode: true,
            emailVerified: true,
            phoneVerified: true,
            profileVisibility: true,
            referralCode: true,
            createdAt: true,
          },
        });

        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }

        return reply.send(user);
      } catch (error) {
        console.error('Get user error:', error);
        return reply.code(500).send({ error: 'Failed to fetch user profile' });
      }
    }
  );

  // PUT /api/users/profile - Update current user profile
  fastify.put<{ Body: UpdateProfileBody }>(
    '/api/users/profile',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: UpdateProfileBody }>, reply: FastifyReply) => {
      const { name, username, bio, profilePicture, profileVisibility } = request.body;

      try {
        // Validate username if provided
        if (username) {
          const usernameRegex = /^[a-z0-9_-]{3,30}$/;
          if (!usernameRegex.test(username)) {
            return reply.code(400).send({
              error: 'Username must be 3-30 characters and contain only lowercase letters, numbers, underscores, or hyphens',
            });
          }

          // Check if username is already taken by another user
          const existingUser = await prisma.user.findFirst({
            where: {
              username: { equals: username, mode: 'insensitive' },
              NOT: { id: request.user.id },
            },
          });

          if (existingUser) {
            return reply.code(409).send({ error: 'Username is already taken' });
          }
        }

        // Update user
        const updatedUser = await prisma.user.update({
          where: { id: request.user.id },
          data: {
            ...(name !== undefined && { name }),
            ...(username !== undefined && { username: username.toLowerCase() }),
            ...(bio !== undefined && { bio }),
            ...(profilePicture !== undefined && { profilePicture }),
            ...(profileVisibility !== undefined && { profileVisibility }),
          },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            bio: true,
            profilePicture: true,
            mode: true,
            emailVerified: true,
            phoneVerified: true,
            profileVisibility: true,
            referralCode: true,
            createdAt: true,
          },
        });

        return reply.send(updatedUser);
      } catch (error) {
        console.error('Update profile error:', error);
        return reply.code(500).send({ error: 'Failed to update profile' });
      }
    }
  );

  // PUT /api/users/privacy - Update privacy settings
  fastify.put<{ Body: { profileVisibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE' } }>(
    '/api/users/privacy',
    {
      preHandler: [fastify.authenticate],
    },
    async (
      request: FastifyRequest<{ Body: { profileVisibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE' } }>,
      reply: FastifyReply
    ) => {
      const { profileVisibility } = request.body;

      if (!profileVisibility || !['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'].includes(profileVisibility)) {
        return reply.code(400).send({ error: 'Invalid privacy setting' });
      }

      try {
        const updatedUser = await prisma.user.update({
          where: { id: request.user.id },
          data: { profileVisibility },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            profileVisibility: true,
          },
        });

        return reply.send(updatedUser);
      } catch (error) {
        console.error('Update privacy error:', error);
        return reply.code(500).send({ error: 'Failed to update privacy settings' });
      }
    }
  );

  // GET /api/users/:id - Get user by ID
  fastify.get<{ Params: { id: string } }>(
    '/api/users/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            username: true,
            name: true,
            bio: true,
            profilePicture: true,
            profileVisibility: true,
            createdAt: true,
          },
        });

        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }

        return reply.send(user);
      } catch (error) {
        console.error('Get user by ID error:', error);
        return reply.code(500).send({ error: 'Failed to fetch user' });
      }
    }
  );

  // GET /api/users/search - Search users
  fastify.get<{ Querystring: SearchUsersQuery }>(
    '/api/users/search',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Querystring: SearchUsersQuery }>, reply: FastifyReply) => {
      const { q, limit = '20' } = request.query;

      if (!q || q.trim().length < 2) {
        return reply.send([]);
      }

      try {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
            NOT: { id: request.user.id },
          },
          select: {
            id: true,
            username: true,
            name: true,
            bio: true,
            profilePicture: true,
          },
          take: parseInt(limit),
        });

        return reply.send(users);
      } catch (error) {
        console.error('Search users error:', error);
        return reply.code(500).send({ error: 'Failed to search users' });
      }
    }
  );

  // GET /api/users/friends - Get user's friends
  fastify.get(
    '/api/users/friends',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const friendships = await prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [
              { userId: request.user.id },
              { friendId: request.user.id },
            ],
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                profilePicture: true,
              },
            },
            friend: {
              select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                profilePicture: true,
              },
            },
          },
        });

        // Map to get the friend (not the current user)
        const friends = friendships.map((friendship) => ({
          id: friendship.id,
          isCloseFriend: friendship.isCloseFriend,
          friend: friendship.userId === request.user.id ? friendship.friend : friendship.user,
        }));

        return reply.send(friends);
      } catch (error) {
        console.error('Get friends error:', error);
        return reply.code(500).send({ error: 'Failed to fetch friends' });
      }
    }
  );

  // POST /api/users/friend-request - Send friend request
  fastify.post<{ Body: { friendId: string } }>(
    '/api/users/friend-request',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: { friendId: string } }>, reply: FastifyReply) => {
      const { friendId } = request.body;

      if (!friendId) {
        return reply.code(400).send({ error: 'Friend ID is required' });
      }

      if (friendId === request.user.id) {
        return reply.code(400).send({ error: 'Cannot send friend request to yourself' });
      }

      try {
        // Check if friend exists
        const friend = await prisma.user.findUnique({ where: { id: friendId } });
        if (!friend) {
          return reply.code(404).send({ error: 'User not found' });
        }

        // Check if friendship already exists
        const existingFriendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: request.user.id, friendId },
              { userId: friendId, friendId: request.user.id },
            ],
          },
        });

        if (existingFriendship) {
          if (existingFriendship.status === 'PENDING') {
            return reply.code(400).send({ error: 'Friend request already sent' });
          } else if (existingFriendship.status === 'ACCEPTED') {
            return reply.code(400).send({ error: 'Already friends' });
          } else if (existingFriendship.status === 'BLOCKED') {
            return reply.code(400).send({ error: 'Cannot send friend request' });
          }
        }

        // Create friend request
        const friendship = await prisma.friendship.create({
          data: {
            userId: request.user.id,
            friendId,
            status: 'PENDING',
          },
        });

        return reply.code(201).send(friendship);
      } catch (error) {
        console.error('Send friend request error:', error);
        return reply.code(500).send({ error: 'Failed to send friend request' });
      }
    }
  );

  // GET /api/users/friend-requests - Get pending friend requests
  fastify.get(
    '/api/users/friend-requests',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const requests = await prisma.friendship.findMany({
          where: {
            friendId: request.user.id,
            status: 'PENDING',
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                bio: true,
                profilePicture: true,
              },
            },
          },
        });

        return reply.send(requests);
      } catch (error) {
        console.error('Get friend requests error:', error);
        return reply.code(500).send({ error: 'Failed to fetch friend requests' });
      }
    }
  );

  // PUT /api/users/friend-request/:id/accept - Accept friend request
  fastify.put<{ Params: { id: string } }>(
    '/api/users/friend-request/:id/accept',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const friendship = await prisma.friendship.findUnique({
          where: { id },
        });

        if (!friendship) {
          return reply.code(404).send({ error: 'Friend request not found' });
        }

        if (friendship.friendId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        if (friendship.status !== 'PENDING') {
          return reply.code(400).send({ error: 'Friend request is not pending' });
        }

        const updatedFriendship = await prisma.friendship.update({
          where: { id },
          data: { status: 'ACCEPTED' },
        });

        return reply.send(updatedFriendship);
      } catch (error) {
        console.error('Accept friend request error:', error);
        return reply.code(500).send({ error: 'Failed to accept friend request' });
      }
    }
  );

  // DELETE /api/users/friend-request/:id - Reject/delete friend request
  fastify.delete<{ Params: { id: string } }>(
    '/api/users/friend-request/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const friendship = await prisma.friendship.findUnique({
          where: { id },
        });

        if (!friendship) {
          return reply.code(404).send({ error: 'Friend request not found' });
        }

        // Only the receiver can reject, or sender can cancel
        if (friendship.friendId !== request.user.id && friendship.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        await prisma.friendship.delete({
          where: { id },
        });

        return reply.code(204).send();
      } catch (error) {
        console.error('Delete friend request error:', error);
        return reply.code(500).send({ error: 'Failed to delete friend request' });
      }
    }
  );

  // DELETE /api/users/friendship/:id - Remove friend
  fastify.delete<{ Params: { id: string } }>(
    '/api/users/friendship/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const friendship = await prisma.friendship.findUnique({
          where: { id },
        });

        if (!friendship) {
          return reply.code(404).send({ error: 'Friendship not found' });
        }

        // Must be one of the friends
        if (friendship.userId !== request.user.id && friendship.friendId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        await prisma.friendship.delete({
          where: { id },
        });

        return reply.code(204).send();
      } catch (error) {
        console.error('Remove friend error:', error);
        return reply.code(500).send({ error: 'Failed to remove friend' });
      }
    }
  );
}
