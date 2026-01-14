import { prisma } from '../index.js';
import type { CollectionPrivacy, CollaboratorRole } from '@prisma/client';

interface CreateCollectionParams {
  name: string;
  description?: string;
  coverImage?: string;
  location?: string;
  privacy?: CollectionPrivacy;
  userId: string;
  isCollaborative?: boolean;
}

interface UpdateCollectionParams {
  name?: string;
  description?: string;
  coverImage?: string;
  location?: string;
  privacy?: CollectionPrivacy;
  isCollaborative?: boolean;
}

interface AddMemoryParams {
  collectionId: string;
  memoryId: string;
  addedById: string;
  order?: number;
}

interface ReorderMemoryParams {
  collectionId: string;
  memoryId: string;
  newOrder: number;
  userId: string;
}

export const collectionService = {
  // Create a new collection
  async create(params: CreateCollectionParams) {
    const collection = await prisma.collection.create({
      data: {
        name: params.name,
        description: params.description,
        coverImage: params.coverImage,
        location: params.location,
        privacy: params.privacy || 'PRIVATE',
        isCollaborative: params.isCollaborative || false,
        userId: params.userId,
        collaborators: {
          create: {
            userId: params.userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                profilePicture: true,
              },
            },
          },
        },
        memories: {
          include: {
            memory: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    profilePicture: true,
                  },
                },
              },
            },
            addedBy: {
              select: {
                id: true,
                username: true,
                name: true,
                profilePicture: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            memories: true,
            collaborators: true,
          },
        },
      },
    });

    return collection;
  },

  // Get collection by ID with permission check
  async getById(collectionId: string, userId: string) {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                profilePicture: true,
              },
            },
          },
        },
        memories: {
          include: {
            memory: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    profilePicture: true,
                  },
                },
              },
            },
            addedBy: {
              select: {
                id: true,
                username: true,
                name: true,
                profilePicture: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            memories: true,
            collaborators: true,
          },
        },
      },
    });

    if (!collection) {
      return null;
    }

    // Check permission: owner, collaborator, or public/friends_only with proper access
    const isCollaborator = collection.collaborators.some(c => c.userId === userId);
    const isOwner = collection.userId === userId;
    const isPublic = collection.privacy === 'PUBLIC';
    
    if (!isOwner && !isCollaborator && !isPublic) {
      // TODO: Check if userId is friend of owner for FRIENDS_ONLY
      if (collection.privacy === 'PRIVATE') {
        return null;
      }
    }

    return collection;
  },

  // Get user's collections (created + collaborated)
  async getUserCollections(userId: string) {
    const [ownedCollections, collaboratedCollections] = await Promise.all([
      // Collections created by user
      prisma.collection.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              profilePicture: true,
            },
          },
          _count: {
            select: {
              memories: true,
              collaborators: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Collections where user is a collaborator
      prisma.collectionCollaborator.findMany({
        where: {
          userId,
          role: { not: 'OWNER' }, // Exclude owned collections (already in first query)
        },
        include: {
          collection: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  profilePicture: true,
                },
              },
              _count: {
                select: {
                  memories: true,
                  collaborators: true,
                },
              },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      }),
    ]);

    return {
      owned: ownedCollections,
      collaborated: collaboratedCollections.map(c => c.collection),
    };
  },

  // Update collection
  async update(collectionId: string, userId: string, params: UpdateCollectionParams) {
    // Verify user is owner or editor
    const collaborator = await prisma.collectionCollaborator.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });

    if (!collaborator || (collaborator.role !== 'OWNER' && collaborator.role !== 'EDITOR')) {
      throw new Error('Insufficient permissions');
    }

    return prisma.collection.update({
      where: { id: collectionId },
      data: params,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                profilePicture: true,
              },
            },
          },
        },
        _count: {
          select: {
            memories: true,
            collaborators: true,
          },
        },
      },
    });
  },

  // Delete collection
  async delete(collectionId: string, userId: string) {
    // Verify user is owner
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== userId) {
      throw new Error('Only the owner can delete a collection');
    }

    return prisma.collection.delete({
      where: { id: collectionId },
    });
  },

  // Add memory to collection
  async addMemory(params: AddMemoryParams) {
    // Check if memory already exists in collection
    const existing = await prisma.collectionMemory.findUnique({
      where: {
        collectionId_memoryId: {
          collectionId: params.collectionId,
          memoryId: params.memoryId,
        },
      },
    });

    if (existing) {
      throw new Error('Memory already exists in this collection');
    }

    // Get the highest order number and add 1
    const highestOrder = await prisma.collectionMemory.findFirst({
      where: { collectionId: params.collectionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const order = params.order ?? (highestOrder ? highestOrder.order + 1 : 0);

    return prisma.collectionMemory.create({
      data: {
        collectionId: params.collectionId,
        memoryId: params.memoryId,
        addedById: params.addedById,
        order,
      },
      include: {
        memory: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                profilePicture: true,
              },
            },
          },
        },
        addedBy: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });
  },

  // Remove memory from collection
  async removeMemory(collectionId: string, memoryId: string, userId: string) {
    // Verify user is owner or editor
    const collaborator = await prisma.collectionCollaborator.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });

    if (!collaborator || collaborator.role === 'VIEWER') {
      throw new Error('Insufficient permissions');
    }

    return prisma.collectionMemory.delete({
      where: {
        collectionId_memoryId: {
          collectionId,
          memoryId,
        },
      },
    });
  },

  // Reorder memory in collection
  async reorderMemory(params: ReorderMemoryParams) {
    // Verify user is owner or editor
    const collaborator = await prisma.collectionCollaborator.findUnique({
      where: {
        collectionId_userId: {
          collectionId: params.collectionId,
          userId: params.userId,
        },
      },
    });

    if (!collaborator || collaborator.role === 'VIEWER') {
      throw new Error('Insufficient permissions');
    }

    return prisma.collectionMemory.update({
      where: {
        collectionId_memoryId: {
          collectionId: params.collectionId,
          memoryId: params.memoryId,
        },
      },
      data: {
        order: params.newOrder,
      },
    });
  },

  // Add collaborator
  async addCollaborator(collectionId: string, userId: string, role: CollaboratorRole, addedByUserId: string) {
    // Verify addedBy user is owner or editor
    const addedBy = await prisma.collectionCollaborator.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId: addedByUserId,
        },
      },
    });

    if (!addedBy || (addedBy.role !== 'OWNER' && addedBy.role !== 'EDITOR')) {
      throw new Error('Insufficient permissions');
    }

    // Check if user is already a collaborator
    const existing = await prisma.collectionCollaborator.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });

    if (existing) {
      throw new Error('User is already a collaborator');
    }

    return prisma.collectionCollaborator.create({
      data: {
        collectionId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });
  },

  // Update collaborator role
  async updateCollaboratorRole(collectionId: string, userId: string, role: CollaboratorRole, updatedByUserId: string) {
    // Verify updatedBy user is owner
    const updatedBy = await prisma.collectionCollaborator.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId: updatedByUserId,
        },
      },
    });

    if (!updatedBy || updatedBy.role !== 'OWNER') {
      throw new Error('Only the owner can update collaborator roles');
    }

    return prisma.collectionCollaborator.update({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });
  },

  // Remove collaborator
  async removeCollaborator(collectionId: string, userId: string, removedByUserId: string) {
    // Verify removedBy user is owner, or user is removing themselves
    if (userId !== removedByUserId) {
      const removedBy = await prisma.collectionCollaborator.findUnique({
        where: {
          collectionId_userId: {
            collectionId,
            userId: removedByUserId,
          },
        },
      });

      if (!removedBy || removedBy.role !== 'OWNER') {
        throw new Error('Only the owner can remove collaborators');
      }
    }

    // Cannot remove owner
    const collaborator = await prisma.collectionCollaborator.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });

    if (collaborator?.role === 'OWNER') {
      throw new Error('Cannot remove the owner from the collection');
    }

    return prisma.collectionCollaborator.delete({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });
  },

  // Check if user can edit collection
  async canEdit(collectionId: string, userId: string): Promise<boolean> {
    const collaborator = await prisma.collectionCollaborator.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId,
        },
      },
    });

    return !!collaborator && (collaborator.role === 'OWNER' || collaborator.role === 'EDITOR');
  },

  // Check if user can view collection
  async canView(collectionId: string, userId: string): Promise<boolean> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        collaborators: {
          where: { userId },
        },
      },
    });

    if (!collection) {
      return false;
    }

    // Owner or collaborator can always view
    if (collection.userId === userId || collection.collaborators.length > 0) {
      return true;
    }

    // Public collections can be viewed by anyone
    if (collection.privacy === 'PUBLIC') {
      return true;
    }

    // TODO: Check if userId is friend of owner for FRIENDS_ONLY
    if (collection.privacy === 'FRIENDS_ONLY') {
      // For now, return false. Implement friend check later.
      return false;
    }

    return false;
  },
};
