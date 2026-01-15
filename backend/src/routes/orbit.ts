import { FastifyInstance } from 'fastify';
import { orbitService } from '../services/orbit.js';
import { OrbitItemType } from '@prisma/client';

export async function orbitRoutes(fastify: FastifyInstance) {
  // Get user's orbit configuration
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.id;
        const items = await orbitService.getUserOrbit(userId);
        return items;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch orbit' });
      }
    },
  });

  // Create orbit item
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.id;
        const data = request.body as {
          name: string;
          type: OrbitItemType;
          icon?: string;
          color?: string;
          position: number;
          targetUserId?: string;
          groupId?: string;
          categoryId?: string;
          memberIds?: string[];
        };

        const item = await orbitService.createOrbitItem(userId, data);
        return item;
      } catch (error: any) {
        reply.status(400).send({ error: error.message || 'Failed to create orbit item' });
      }
    },
  });

  // Update orbit item
  fastify.put('/:itemId', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.id;
        const { itemId } = request.params as { itemId: string };
        const data = request.body as {
          name?: string;
          icon?: string;
          color?: string;
          position?: number;
          memberIds?: string[];
        };

        const item = await orbitService.updateOrbitItem(itemId, userId, data);
        return item;
      } catch (error: any) {
        reply.status(400).send({ error: error.message || 'Failed to update orbit item' });
      }
    },
  });

  // Delete orbit item
  fastify.delete('/:itemId', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.id;
        const { itemId } = request.params as { itemId: string };

        await orbitService.deleteOrbitItem(itemId, userId);
        return { success: true };
      } catch (error: any) {
        reply.status(400).send({ error: error.message || 'Failed to delete orbit item' });
      }
    },
  });

  // Swap positions
  fastify.post('/swap', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.id;
        const { itemId1, itemId2 } = request.body as { itemId1: string; itemId2: string };

        await orbitService.swapPositions(userId, itemId1, itemId2);
        return { success: true };
      } catch (error: any) {
        reply.status(400).send({ error: error.message || 'Failed to swap positions' });
      }
    },
  });

  // Get available friends
  fastify.get('/available/friends', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.id;
        const friends = await orbitService.getAvailableFriends(userId);
        return friends;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch available friends' });
      }
    },
  });

  // Get available groups
  fastify.get('/available/groups', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.id;
        const groups = await orbitService.getAvailableGroups(userId);
        return groups;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch available groups' });
      }
    },
  });
}
