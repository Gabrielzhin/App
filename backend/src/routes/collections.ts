import type { FastifyInstance } from 'fastify';
import { collectionService } from '../services/collection.js';
import { notificationService } from '../services/notification.js';
import type { CollectionPrivacy, CollaboratorRole } from '@prisma/client';

export default async function collectionRoutes(fastify: FastifyInstance) {
  // Create collection
  fastify.post(
    '/api/collections',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { name, description, coverImage, location, privacy, isCollaborative } = request.body as {
        name: string;
        description?: string;
        coverImage?: string;
        location?: string;
        privacy?: CollectionPrivacy;
        isCollaborative?: boolean;
      };

      if (!name) {
        return reply.code(400).send({ error: 'Collection name is required' });
      }

      const collection = await collectionService.create({
        name,
        description,
        coverImage,
        location,
        privacy,
        userId,
        isCollaborative,
      });

      return reply.send({ collection });
    }
  );

  // Get user's collections (owned + collaborated)
  fastify.get(
    '/api/collections',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const collections = await collectionService.getUserCollections(userId);

      return reply.send(collections);
    }
  );

  // Get collection by ID
  fastify.get(
    '/api/collections/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      const collection = await collectionService.getById(id, userId);

      if (!collection) {
        return reply.code(404).send({ error: 'Collection not found or access denied' });
      }

      return reply.send({ collection });
    }
  );

  // Update collection
  fastify.put(
    '/api/collections/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      const { name, description, coverImage, location, privacy, isCollaborative } = request.body as {
        name?: string;
        description?: string;
        coverImage?: string;
        location?: string;
        privacy?: CollectionPrivacy;
        isCollaborative?: boolean;
      };

      try {
        const collection = await collectionService.update(id, userId, {
          name,
          description,
          coverImage,
          location,
          privacy,
          isCollaborative,
        });

        return reply.send({ collection });
      } catch (error) {
        return reply.code(403).send({ error: (error as Error).message });
      }
    }
  );

  // Delete collection
  fastify.delete(
    '/api/collections/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      try {
        await collectionService.delete(id, userId);
        return reply.send({ success: true });
      } catch (error) {
        return reply.code(403).send({ error: (error as Error).message });
      }
    }
  );

  // Add memory to collection
  fastify.post(
    '/api/collections/:id/memories',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id: collectionId } = request.params as { id: string };
      const { memoryId } = request.body as { memoryId: string };

      if (!memoryId) {
        return reply.code(400).send({ error: 'Memory ID is required' });
      }

      // Check if user can edit collection
      const canEdit = await collectionService.canEdit(collectionId, userId);
      if (!canEdit) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      try {
        const collectionMemory = await collectionService.addMemory({
          collectionId,
          memoryId,
          addedById: userId,
        });

        // Get collection details for notification
        const collection = await collectionService.getById(collectionId, userId);
        
        // Notify collaborators (async, don't await)
        if (collection && collection.isCollaborative) {
          collection.collaborators
            .filter(c => c.userId !== userId)
            .forEach(c => {
              notificationService.notifyCollectionMemoryAdded(
                c.userId,
                userId,
                collectionId,
                memoryId
              ).catch(console.error);
            });
        }

        return reply.send({ collectionMemory });
      } catch (error) {
        return reply.code(400).send({ error: (error as Error).message });
      }
    }
  );

  // Remove memory from collection
  fastify.delete(
    '/api/collections/:id/memories/:memoryId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id: collectionId, memoryId } = request.params as { id: string; memoryId: string };

      try {
        await collectionService.removeMemory(collectionId, memoryId, userId);
        return reply.send({ success: true });
      } catch (error) {
        return reply.code(403).send({ error: (error as Error).message });
      }
    }
  );

  // Reorder memory in collection
  fastify.put(
    '/api/collections/:id/memories/:memoryId/order',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id: collectionId, memoryId } = request.params as { id: string; memoryId: string };
      const { order } = request.body as { order: number };

      if (order === undefined) {
        return reply.code(400).send({ error: 'Order is required' });
      }

      try {
        const collectionMemory = await collectionService.reorderMemory({
          collectionId,
          memoryId,
          newOrder: order,
          userId,
        });

        return reply.send({ collectionMemory });
      } catch (error) {
        return reply.code(403).send({ error: (error as Error).message });
      }
    }
  );

  // Add collaborator
  fastify.post(
    '/api/collections/:id/collaborators',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id: collectionId } = request.params as { id: string };
      const { userId: collaboratorUserId, role } = request.body as {
        userId: string;
        role: CollaboratorRole;
      };

      if (!collaboratorUserId || !role) {
        return reply.code(400).send({ error: 'User ID and role are required' });
      }

      try {
        const collaborator = await collectionService.addCollaborator(
          collectionId,
          collaboratorUserId,
          role,
          userId
        );

        // Notify the invited user (async, don't await)
        notificationService.notifyCollectionInvite(
          collaboratorUserId,
          userId,
          collectionId
        ).catch(console.error);

        return reply.send({ collaborator });
      } catch (error) {
        return reply.code(400).send({ error: (error as Error).message });
      }
    }
  );

  // Update collaborator role
  fastify.put(
    '/api/collections/:id/collaborators/:userId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const currentUserId = request.user!.id;
      const { id: collectionId, userId: collaboratorUserId } = request.params as {
        id: string;
        userId: string;
      };
      const { role } = request.body as { role: CollaboratorRole };

      if (!role) {
        return reply.code(400).send({ error: 'Role is required' });
      }

      try {
        const collaborator = await collectionService.updateCollaboratorRole(
          collectionId,
          collaboratorUserId,
          role,
          currentUserId
        );

        return reply.send({ collaborator });
      } catch (error) {
        return reply.code(403).send({ error: (error as Error).message });
      }
    }
  );

  // Remove collaborator
  fastify.delete(
    '/api/collections/:id/collaborators/:userId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const currentUserId = request.user!.id;
      const { id: collectionId, userId: collaboratorUserId } = request.params as {
        id: string;
        userId: string;
      };

      try {
        await collectionService.removeCollaborator(collectionId, collaboratorUserId, currentUserId);
        return reply.send({ success: true });
      } catch (error) {
        return reply.code(403).send({ error: (error as Error).message });
      }
    }
  );

  // Share collection - Generate shareable link
  fastify.post(
    '/api/collections/:id/share',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id: collectionId } = request.params as { id: string };

      try {
        const collection = await collectionService.getById(collectionId, userId);
        
        if (!collection) {
          return reply.code(404).send({ error: 'Collection not found' });
        }

        // Check if user owns or collaborates on this collection
        const isOwner = collection.userId === userId;
        const isCollaborator = collection.collaborators?.some(
          c => c.userId === userId
        );

        if (!isOwner && !isCollaborator) {
          return reply.code(403).send({ error: 'Not authorized to share this collection' });
        }

        // Generate share URL
        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collections/${collectionId}`;
        
        return reply.send({ 
          shareUrl,
          collectionId,
          name: collection.name,
          description: collection.description,
        });
      } catch (error) {
        return reply.code(500).send({ error: 'Failed to generate share link' });
      }
    }
  );
}
