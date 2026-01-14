import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, FriendshipStatus } from '@prisma/client';
import { notificationService } from '../services/notification.js';

const prisma = new PrismaClient();

export async function friendRoutes(fastify: FastifyInstance) {
  // GET /api/friends - Get all accepted friends
  fastify.get(
    '/api/friends',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const friendships = await prisma.friendship.findMany({
          where: {
            OR: [
              { userId: request.user.id, status: 'ACCEPTED' },
              { friendId: request.user.id, status: 'ACCEPTED' },
            ],
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                profilePicture: true,
              },
            },
            friend: {
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

        // Add relationship data to each friendship
        const friendshipsWithRelationships = await Promise.all(
          friendships.map(async (friendship) => {
            const friendId = friendship.userId === request.user.id ? friendship.friendId : friendship.userId;
            
            // Get ALL relationships for this friend
            const relationships = await prisma.friendRelationship.findMany({
              where: {
                userId: request.user.id,
                friendId: friendId,
              },
              include: {
                category: true,
                subcategory: true,
                detail: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            });

            // Build relationship array with labels and hierarchies
            const relationshipsData = relationships.map(rel => {
              const hierarchy: string[] = [];
              let label = null;
              
              if (rel.customLabel) {
                label = rel.customLabel;
                hierarchy.push(rel.customLabel);
              } else {
                // Build 3-level hierarchy
                if (rel.category) {
                  label = rel.category.name;
                  hierarchy.push(rel.category.name);
                }
                if (rel.subcategory) {
                  label = rel.subcategory.name;
                  hierarchy.push(rel.subcategory.name);
                }
                if (rel.detail) {
                  label = rel.detail.name;
                  hierarchy.push(rel.detail.name);
                }
              }
              
              return {
                id: rel.id,
                categoryId: rel.categoryId,
                subcategoryId: rel.subcategoryId,
                detailId: rel.detailId,
                label,
                hierarchy,
              };
            });

            // For backward compatibility, set first relationship as primary
            const primaryRelationship = relationshipsData[0];

            return {
              ...friendship,
              relationship: primaryRelationship?.label || null,
              relationshipHierarchy: primaryRelationship?.hierarchy || [],
              relationships: relationshipsData, // Array of ALL relationships
            };
          })
        );

        // Return friendships with relationship data
        return reply.send({ friends: friendshipsWithRelationships });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch friends' });
      }
    }
  );

  // GET /api/friends/requests/pending - Get received friend requests
  fastify.get(
    '/api/friends/requests/pending',
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

        return reply.send({ requests });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch pending requests' });
      }
    }
  );

  // GET /api/friends/requests/sent - Get sent friend requests
  fastify.get(
    '/api/friends/requests/sent',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const requests = await prisma.friendship.findMany({
          where: {
            userId: request.user.id,
            status: 'PENDING',
          },
          include: {
            friend: {
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

        return reply.send({ requests });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch sent requests' });
      }
    }
  );

  // POST /api/friends/request - Send a friend request
  fastify.post<{ Body: { friendId: string } }>(
    '/api/friends/request',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: { friendId: string } }>, reply: FastifyReply) => {
      const { friendId } = request.body;

      if (!friendId) {
        return reply.code(400).send({ error: 'friendId is required' });
      }

      if (friendId === request.user.id) {
        return reply.code(400).send({ error: 'Cannot add yourself as friend' });
      }

      try {
        // Check if friend exists
        const friend = await prisma.user.findUnique({ where: { id: friendId } });
        if (!friend) {
          return reply.code(404).send({ error: 'User not found' });
        }

        // Check for existing friendship
        const existing = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: request.user.id, friendId },
              { userId: friendId, friendId: request.user.id },
            ],
          },
        });

        if (existing) {
          if (existing.status === 'BLOCKED') {
            return reply.code(403).send({ error: 'Cannot send friend request to this user' });
          }
          return reply.code(400).send({ error: 'Friendship already exists or pending' });
        }

        // Create friendship request
        const friendship = await prisma.friendship.create({
          data: {
            userId: request.user.id,
            friendId,
            status: 'PENDING',
          },
          include: {
            friend: {
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

        // Send notification (async, don't await)
        notificationService.notifyFriendRequest(friendId, request.user.id, friendship.id).catch(console.error);

        return reply.code(201).send({ friendship });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to send friend request' });
      }
    }
  );

  // POST /api/friends/accept/:id - Accept a friend request
  fastify.post<{ Params: { id: string } }>(
    '/api/friends/accept/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const friendship = await prisma.friendship.findUnique({
          where: { id: request.params.id },
        });

        if (!friendship) {
          return reply.code(404).send({ error: 'Friend request not found' });
        }

        if (friendship.friendId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized to accept this request' });
        }

        if (friendship.status !== 'PENDING') {
          return reply.code(400).send({ error: 'Request is not pending' });
        }

        const updatedFriendship = await prisma.friendship.update({
          where: { id: request.params.id },
          data: { 
            status: 'ACCEPTED',
            friendshipStartDate: new Date(),
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                profilePicture: true,
              },
            },
            friend: {
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

        // Send notification to the requester (async, don't await)
        notificationService.notifyFriendAccept(friendship.userId, request.user.id).catch(console.error);

        return reply.send({ friendship: updatedFriendship });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to accept friend request' });
      }
    }
  );

  // DELETE /api/friends/reject/:id - Reject/cancel a friend request
  fastify.delete<{ Params: { id: string } }>(
    '/api/friends/reject/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const friendship = await prisma.friendship.findUnique({
          where: { id: request.params.id },
        });

        if (!friendship) {
          return reply.code(404).send({ error: 'Friend request not found' });
        }

        // Can reject if you're the recipient, or cancel if you're the sender
        if (friendship.friendId !== request.user.id && friendship.userId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        await prisma.friendship.delete({
          where: { id: request.params.id },
        });

        return reply.code(204).send();
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to reject friend request' });
      }
    }
  );

  // DELETE /api/friends/:id - Remove a friend
  fastify.delete<{ Params: { id: string } }>(
    '/api/friends/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const friendship = await prisma.friendship.findUnique({
          where: { id: request.params.id },
        });

        if (!friendship) {
          return reply.code(404).send({ error: 'Friendship not found' });
        }

        // Can only remove if you're part of the friendship
        if (friendship.userId !== request.user.id && friendship.friendId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        await prisma.friendship.delete({
          where: { id: request.params.id },
        });

        return reply.code(204).send();
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to remove friend' });
      }
    }
  );

  // PATCH /api/friends/:id/close-friend - Toggle close friend status
  fastify.patch<{ Params: { id: string }; Body: { isCloseFriend: boolean } }>(
    '/api/friends/:id/close-friend',
    {
      preHandler: [fastify.authenticate],
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { isCloseFriend: boolean } }>,
      reply: FastifyReply
    ) => {
      const { isCloseFriend } = request.body;

      try {
        const friendship = await prisma.friendship.findUnique({
          where: { id: request.params.id },
        });

        if (!friendship) {
          return reply.code(404).send({ error: 'Friendship not found' });
        }

        if (friendship.status !== 'ACCEPTED') {
          return reply.code(400).send({ error: 'Friendship must be accepted' });
        }

        // Can only toggle if you're part of the friendship
        if (friendship.userId !== request.user.id && friendship.friendId !== request.user.id) {
          return reply.code(403).send({ error: 'Not authorized' });
        }

        // If adding to close friends, check limit
        if (isCloseFriend && !friendship.isCloseFriend) {
          const closeFriendsCount = await prisma.friendship.count({
            where: {
              OR: [
                { userId: request.user.id, isCloseFriend: true },
                { friendId: request.user.id, isCloseFriend: true },
              ],
            },
          });

          if (closeFriendsCount >= 6) {
            return reply.code(400).send({ error: 'Maximum 6 close friends allowed' });
          }
        }

        const updatedFriendship = await prisma.friendship.update({
          where: { id: request.params.id },
          data: { isCloseFriend },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                profilePicture: true,
              },
            },
            friend: {
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

        return reply.send({ friendship: updatedFriendship });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to toggle close friend status' });
      }
    }
  );

  // POST /api/friends/block/:friendId - Block a user
  fastify.post<{ Params: { friendId: string } }>(
    '/api/friends/block/:friendId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { friendId: string } }>, reply: FastifyReply) => {
      const { friendId } = request.params;

      if (friendId === request.user.id) {
        return reply.code(400).send({ error: 'Cannot block yourself' });
      }

      try {
        // Check if user exists
        const userToBlock = await prisma.user.findUnique({ where: { id: friendId } });
        if (!userToBlock) {
          return reply.code(404).send({ error: 'User not found' });
        }

        // Check for existing relationship
        const existing = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: request.user.id, friendId },
              { userId: friendId, friendId: request.user.id },
            ],
          },
        });

        if (existing) {
          // Update existing relationship to BLOCKED
          const blocked = await prisma.friendship.update({
            where: { id: existing.id },
            data: { 
              status: 'BLOCKED',
              userId: request.user.id, // Always set userId to blocker
              friendId: friendId,
            },
          });
          return reply.send({ message: 'User blocked', blocked });
        } else {
          // Create new BLOCKED relationship
          const blocked = await prisma.friendship.create({
            data: {
              userId: request.user.id,
              friendId,
              status: 'BLOCKED',
            },
          });
          return reply.send({ message: 'User blocked', blocked });
        }
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to block user' });
      }
    }
  );

  // DELETE /api/friends/block/:friendId - Unblock a user
  fastify.delete<{ Params: { friendId: string } }>(
    '/api/friends/block/:friendId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { friendId: string } }>, reply: FastifyReply) => {
      const { friendId } = request.params;

      try {
        // Find the blocked relationship where current user is the blocker
        const blocked = await prisma.friendship.findFirst({
          where: {
            userId: request.user.id,
            friendId,
            status: 'BLOCKED',
          },
        });

        if (!blocked) {
          return reply.code(404).send({ error: 'No block relationship found' });
        }

        // Delete the block
        await prisma.friendship.delete({
          where: { id: blocked.id },
        });

        return reply.send({ message: 'User unblocked' });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to unblock user' });
      }
    }
  );

  // GET /api/friends/blocked - Get list of blocked users
  fastify.get(
    '/api/friends/blocked',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const blockedRelationships = await prisma.friendship.findMany({
          where: {
            userId: request.user.id,
            status: 'BLOCKED',
          },
          include: {
            friend: {
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
            updatedAt: 'desc',
          },
        });

        const blockedUsers = blockedRelationships.map(rel => ({
          blockId: rel.id,
          user: rel.friend,
          blockedAt: rel.updatedAt,
        }));

        return reply.send({ blockedUsers });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch blocked users' });
      }
    }
  );

  // GET /api/friends/block-status/:friendId - Check if a user is blocked
  fastify.get<{ Params: { friendId: string } }>(
    '/api/friends/block-status/:friendId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { friendId: string } }>, reply: FastifyReply) => {
      const { friendId } = request.params;

      try {
        // Check if current user blocked this person
        const youBlocked = await prisma.friendship.findFirst({
          where: {
            userId: request.user.id,
            friendId,
            status: 'BLOCKED',
          },
        });

        // Check if this person blocked current user
        const blockedYou = await prisma.friendship.findFirst({
          where: {
            userId: friendId,
            friendId: request.user.id,
            status: 'BLOCKED',
          },
        });

        return reply.send({
          youBlocked: !!youBlocked,
          blockedYou: !!blockedYou,
          isBlocked: !!(youBlocked || blockedYou),
        });
      } catch (error: any) {
      }
    }
  );

  // PUT /api/friends/:friendId/relationship - Update relationship with a friend
  fastify.put<{ Params: { friendId: string }; Body: { relationship: string } }>(
    '/api/friends/:friendId/relationship',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { friendId: string }; Body: { relationship: string } }>, reply: FastifyReply) => {
      try {
        const { friendId } = request.params;
        const { relationship } = request.body;
        const userId = request.user.id;

        // Check if friendship exists
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: userId, friendId: friendId, status: 'ACCEPTED' },
              { userId: friendId, friendId: userId, status: 'ACCEPTED' },
            ],
          },
        });

        if (!friendship) {
          return reply.code(404).send({ error: 'Friendship not found' });
        }

        // Find existing friend relationship
        const existing = await prisma.friendRelationship.findFirst({
          where: {
            userId: userId,
            friendId: friendId,
          },
        });

        if (existing) {
          // Update existing relationship
          await prisma.friendRelationship.update({
            where: { id: existing.id },
            data: {
              customLabel: relationship,
              categoryId: null,
              subcategoryId: null,
              detailId: null,
            },
          });
        } else {
          // Create new relationship
          await prisma.friendRelationship.create({
            data: {
              userId: userId,
              friendId: friendId,
              customLabel: relationship,
            },
          });
        }

        return reply.send({ success: true });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to update relationship' });
      }
    }
  );

  // GET /api/friends/:friendId/groups-in-common - Get groups both users are in
  fastify.get<{ Params: { friendId: string } }>(
    '/api/friends/:friendId/groups-in-common',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: { friendId: string } }>, reply: FastifyReply) => {
      try {
        const { friendId } = request.params;
        const userId = request.user.id;

        // Get user's groups
        const userGroups = await prisma.groupMember.findMany({
          where: {
            userId: userId,
          },
          select: {
            groupId: true,
          },
        });

        const userGroupIds = userGroups.map(g => g.groupId);

        // Get friend's groups that overlap with user's groups
        const commonGroups = await prisma.groupMember.findMany({
          where: {
            userId: friendId,
            groupId: {
              in: userGroupIds,
            },
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                description: true,
                avatarUrl: true,
                color: true,
                memberCount: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'desc',
          },
        });

        const groups = commonGroups.map(cg => ({
          ...cg.group,
          joinedAt: cg.joinedAt,
        }));

        return reply.send({ 
          count: groups.length,
          groups: groups,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch groups in common' });
      }
    }
  );
}
