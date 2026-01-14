import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SearchQuery {
  q?: string;
  type?: 'memories' | 'users' | 'all';
  limit?: number;
}

export async function searchRoutes(fastify: FastifyInstance) {
  // GET /api/search/friends - Search friends by name or username
  fastify.get<{ Querystring: { q?: string } }>(
    '/api/search/friends',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { q } = request.query;
        
        if (!q || q.trim().length === 0) {
          return reply.send([]);
        }

        const searchTerm = q.trim().toLowerCase();

        // Get user's accepted friendships
        const friendships = await prisma.friendship.findMany({
          where: {
            OR: [
              { userId: request.user.id, status: 'ACCEPTED' },
              { friendId: request.user.id, status: 'ACCEPTED' },
            ],
          },
          select: {
            userId: true,
            friendId: true,
          },
        });

        // Extract friend IDs
        const friendIds = friendships.map(f => 
          f.userId === request.user.id ? f.friendId : f.userId
        );

        if (friendIds.length === 0) {
          return reply.send([]);
        }

        // Search within friends only
        const friends = await prisma.user.findMany({
          where: {
            id: { in: friendIds },
            OR: [
              {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
              {
                username: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
          take: 20,
        });

        return reply.send(friends);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to search friends' });
      }
    }
  );

  // GET /api/search/users/all - List all users (for finding friends)
  fastify.get(
    '/api/search/users/all',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get all blocked relationships
        const blockedRelationships = await prisma.friendship.findMany({
          where: {
            OR: [
              { userId: request.user.id, status: 'BLOCKED' },
              { friendId: request.user.id, status: 'BLOCKED' },
            ],
          },
          select: {
            userId: true,
            friendId: true,
          },
        });

        const blockedUserIds = new Set(
          blockedRelationships.map(rel => 
            rel.userId === request.user.id ? rel.friendId : rel.userId
          )
        );

        const users = await prisma.user.findMany({
          where: {
            id: {
              not: request.user.id, // Exclude current user
              notIn: Array.from(blockedUserIds), // Exclude blocked users
            },
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            profilePicture: true,
            createdAt: true,
          },
          take: 50,
          orderBy: { createdAt: 'desc' },
        });

        return reply.send(users);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch users' });
      }
    }
  );

  // GET /api/search - Search for memories and users
  fastify.get<{ Querystring: SearchQuery }>(
    '/api/search',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
      const { q, type = 'all', limit = 20 } = request.query;

      if (!q || q.trim().length === 0) {
        return reply.send({ memories: [], users: [] });
      }

      const searchTerm = q.trim().toLowerCase();
      // Parse limit as integer
      const takeLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
      const results: any = {};

      try {

        // Search memories
        if (type === 'all' || type === 'memories') {
          const memories = await prisma.memory.findMany({
            where: {
              isDraft: false, // Don't include drafts in search
              OR: [
                // User's own memories (search by title or content)
                {
                  userId: request.user.id,
                  OR: [
                    {
                      title: {
                        contains: searchTerm,
                        mode: 'insensitive',
                      },
                    },
                    {
                      content: {
                        contains: searchTerm,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
                // Public memories
                {
                  privacy: 'PUBLIC',
                  OR: [
                    {
                      title: {
                        contains: searchTerm,
                        mode: 'insensitive',
                      },
                    },
                    {
                      content: {
                        contains: searchTerm,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
                // Friends' memories (simplified - shows all FRIENDS privacy)
                {
                  privacy: 'FRIENDS',
                  OR: [
                    {
                      title: {
                        contains: searchTerm,
                        mode: 'insensitive',
                      },
                    },
                    {
                      content: {
                        contains: searchTerm,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              ],
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            take: takeLimit,
            orderBy: { createdAt: 'desc' },
          });

          results.memories = memories;
        }

        // Search users
        if (type === 'all' || type === 'users') {
          // Get blocked user IDs
          const blockedRelationships = await prisma.friendship.findMany({
            where: {
              OR: [
                { userId: request.user.id, status: 'BLOCKED' },
                { friendId: request.user.id, status: 'BLOCKED' },
              ],
            },
            select: {
              userId: true,
              friendId: true,
            },
          });

          const blockedUserIds = new Set(
            blockedRelationships.map(rel => 
              rel.userId === request.user.id ? rel.friendId : rel.userId
            )
          );

          const users = await prisma.user.findMany({
            where: {
              OR: [
                {
                  name: {
                    contains: searchTerm,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: searchTerm,
                    mode: 'insensitive',
                  },
                },
                {
                  username: {
                    contains: searchTerm,
                    mode: 'insensitive',
                  },
                },
              ],
              // Don't include current user or blocked users in results
              id: {
                not: request.user.id,
                notIn: Array.from(blockedUserIds),
              },
            },
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              profilePicture: true,
              bio: true,
            },
            take: takeLimit,
          });

          results.users = users;
        }

        return reply.send(results);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ 
          error: 'Search failed',
          message: error.message 
        });
      }
    }
  );

  // GET /api/search/global - Global search across memories and users
  fastify.get<{ Querystring: { q: string; type?: 'memories' | 'users' | 'all'; limit?: number } }>(
    '/api/search/global',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { q, type = 'all', limit = 20 } = request.query;
        
        if (!q || q.trim().length < 2) {
          return reply.send({ memories: [], users: [], total: 0 });
        }

        const searchTerm = q.trim().toLowerCase();
        const results: { memories: any[]; users: any[]; total: number } = {
          memories: [],
          users: [],
          total: 0,
        };

        // Search memories
        if (type === 'all' || type === 'memories') {
          const memories = await prisma.memory.findMany({
            where: {
              AND: [
                { isDraft: false },
                {
                  OR: [
                    // User's own memories
                    { userId: request.user.id },
                    // Public memories
                    { privacy: 'PUBLIC' },
                    // Friends' memories
                    {
                      privacy: 'FRIENDS',
                      user: {
                        OR: [
                          { 
                            friendshipsInitiated: { 
                              some: { 
                                friendId: request.user.id, 
                                status: 'ACCEPTED' 
                              } 
                            }
                          },
                          {
                            friendshipsReceived: {
                              some: {
                                userId: request.user.id,
                                status: 'ACCEPTED'
                              }
                            }
                          }
                        ]
                      }
                    },
                    // Group memories where user is member
                    {
                      group: {
                        members: {
                          some: {
                            userId: request.user.id
                          }
                        }
                      }
                    }
                  ]
                },
                {
                  OR: [
                    { content: { contains: searchTerm, mode: 'insensitive' } },
                    { title: { contains: searchTerm, mode: 'insensitive' } },
                    { location: { contains: searchTerm, mode: 'insensitive' } },
                  ]
                }
              ]
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  profilePicture: true,
                }
              },
              categories: {
                include: {
                  category: true,
                }
              },
              _count: {
                select: {
                  comments: true,
                  reactions: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: limit,
          });

          results.memories = memories.map(memory => ({
            ...memory,
            categories: memory.categories.map(c => c.category),
          }));
        }

        // Search users
        if (type === 'all' || type === 'users') {
          const users = await prisma.user.findMany({
            where: {
              AND: [
                { id: { not: request.user.id } }, // Exclude self
                {
                  OR: [
                    { username: { contains: searchTerm, mode: 'insensitive' } },
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                  ]
                }
              ]
            },
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              profilePicture: true,
              bio: true,
              friendshipsInitiated: {
                where: {
                  friendId: request.user.id,
                },
                select: {
                  status: true,
                }
              },
              friendshipsReceived: {
                where: {
                  userId: request.user.id,
                },
                select: {
                  status: true,
                }
              }
            },
            take: limit,
          });

          // Add friendship status to each user
          results.users = users.map(user => {
            const sentRequest = user.friendshipsReceived[0];
            const receivedRequest = user.friendshipsInitiated[0];
            
            let friendshipStatus = null;
            if (sentRequest) {
              friendshipStatus = sentRequest.status;
            } else if (receivedRequest) {
              friendshipStatus = receivedRequest.status;
            }

            return {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              profilePicture: user.profilePicture,
              bio: user.bio,
              friendshipStatus,
            };
          });
        }

        results.total = results.memories.length + results.users.length;

        return reply.send(results);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({ 
          error: 'Global search failed',
          message: error.message 
        });
      }
    }
  );
}
