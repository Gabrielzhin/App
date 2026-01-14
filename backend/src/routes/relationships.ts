import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware to verify authentication
async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function relationshipRoutes(fastify: FastifyInstance) {
  // ============================================================
  // CATEGORY MANAGEMENT
  // ============================================================

  // GET /api/relationships/categories - List user's categories
  fastify.get(
    '/api/relationships/categories',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).id;

      const categories = await prisma.relationshipCategory.findMany({
        where: { userId },
        include: {
          subcategories: {
            orderBy: { order: 'asc' },
            include: {
              details: {
                orderBy: { order: 'asc' },
              },
            },
          },
          _count: {
            select: { relationships: true },
          },
        },
        orderBy: { order: 'asc' },
      });

      return reply.send({ categories });
    }
  );

  // POST /api/relationships/categories - Create custom category
  fastify.post<{
    Body: {
      name: string;
      icon?: string;
      order?: number;
    };
  }>(
    '/api/relationships/categories',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{
      Body: { name: string; icon?: string; order?: number };
    }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { name, icon, order } = request.body;

      if (!name || name.trim().length === 0) {
        return reply.code(400).send({ error: 'Category name is required' });
      }

      // Check if category with same name already exists for this user
      const existing = await prisma.relationshipCategory.findFirst({
        where: {
          userId,
          name: { equals: name, mode: 'insensitive' },
        },
      });

      if (existing) {
        return reply.code(409).send({ error: 'Category with this name already exists' });
      }

      const category = await prisma.relationshipCategory.create({
        data: {
          userId,
          name: name.trim(),
          icon: icon || null,
          order: order ?? 0,
          isDefault: false,
        },
        include: {
          subcategories: true,
        },
      });

      return reply.code(201).send({ category });
    }
  );

  // PUT /api/relationships/categories/:id - Update category
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; icon?: string; order?: number };
  }>(
    '/api/relationships/categories/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { name?: string; icon?: string; order?: number };
    }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { id } = request.params;
      const { name, icon, order } = request.body;

      // Verify ownership
      const category = await prisma.relationshipCategory.findFirst({
        where: { id, userId },
      });

      if (!category) {
        return reply.code(404).send({ error: 'Category not found' });
      }

      // Check if name conflicts with another category
      if (name) {
        const existing = await prisma.relationshipCategory.findFirst({
          where: {
            userId,
            name: { equals: name.trim(), mode: 'insensitive' },
            id: { not: id },
          },
        });

        if (existing) {
          return reply.code(409).send({ error: 'Category with this name already exists' });
        }
      }

      const updated = await prisma.relationshipCategory.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(icon !== undefined && { icon }),
          ...(order !== undefined && { order }),
        },
        include: {
          subcategories: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return reply.send({ category: updated });
    }
  );

  // DELETE /api/relationships/categories/:id - Delete category
  fastify.delete<{ Params: { id: string } }>(
    '/api/relationships/categories/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { id } = request.params;

      // Verify ownership
      const category = await prisma.relationshipCategory.findFirst({
        where: { id, userId },
        include: {
          _count: {
            select: { relationships: true },
          },
        },
      });

      if (!category) {
        return reply.code(404).send({ error: 'Category not found' });
      }

      // Prevent deletion if category has active relationships
      if (category._count.relationships > 0) {
        return reply.code(409).send({
          error: 'Cannot delete category with active relationships',
          count: category._count.relationships,
        });
      }

      // Delete category (cascades to subcategories and details)
      await prisma.relationshipCategory.delete({
        where: { id },
      });

      return reply.send({ message: 'Category deleted successfully' });
    }
  );

  // ============================================================
  // SUBCATEGORY MANAGEMENT
  // ============================================================

  // GET /api/relationships/subcategories/:categoryId - List subcategories
  fastify.get<{ Params: { categoryId: string } }>(
    '/api/relationships/subcategories/:categoryId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { categoryId: string } }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { categoryId } = request.params;

      // Verify category ownership
      const category = await prisma.relationshipCategory.findFirst({
        where: { id: categoryId, userId },
      });

      if (!category) {
        return reply.code(404).send({ error: 'Category not found' });
      }

      const subcategories = await prisma.relationshipSubcategory.findMany({
        where: { categoryId },
        include: {
          details: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { relationships: true },
          },
        },
        orderBy: { order: 'asc' },
      });

      return reply.send({ subcategories });
    }
  );

  // POST /api/relationships/subcategories - Create subcategory
  fastify.post<{
    Body: {
      categoryId: string;
      name: string;
      icon?: string;
      order?: number;
    };
  }>(
    '/api/relationships/subcategories',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{
      Body: { categoryId: string; name: string; icon?: string; order?: number };
    }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { categoryId, name, icon, order } = request.body;

      if (!categoryId || !name || name.trim().length === 0) {
        return reply.code(400).send({ error: 'Category ID and name are required' });
      }

      // Verify category ownership
      const category = await prisma.relationshipCategory.findFirst({
        where: { id: categoryId, userId },
      });

      if (!category) {
        return reply.code(404).send({ error: 'Category not found' });
      }

      // Check for duplicate name in same category
      const existing = await prisma.relationshipSubcategory.findFirst({
        where: {
          categoryId,
          name: { equals: name.trim(), mode: 'insensitive' },
        },
      });

      if (existing) {
        return reply.code(409).send({ error: 'Subcategory with this name already exists in this category' });
      }

      const subcategory = await prisma.relationshipSubcategory.create({
        data: {
          categoryId,
          userId,
          name: name.trim(),
          icon: icon || null,
          order: order ?? 0,
          isDefault: false,
        },
        include: {
          details: true,
        },
      });

      return reply.code(201).send({ subcategory });
    }
  );

  // PUT /api/relationships/subcategories/:id - Update subcategory
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; icon?: string; order?: number };
  }>(
    '/api/relationships/subcategories/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { name?: string; icon?: string; order?: number };
    }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { id } = request.params;
      const { name, icon, order } = request.body;

      // Verify ownership
      const subcategory = await prisma.relationshipSubcategory.findFirst({
        where: { id, userId },
      });

      if (!subcategory) {
        return reply.code(404).send({ error: 'Subcategory not found' });
      }

      // Check name conflict
      if (name) {
        const existing = await prisma.relationshipSubcategory.findFirst({
          where: {
            categoryId: subcategory.categoryId,
            name: { equals: name.trim(), mode: 'insensitive' },
            id: { not: id },
          },
        });

        if (existing) {
          return reply.code(409).send({ error: 'Subcategory with this name already exists in this category' });
        }
      }

      const updated = await prisma.relationshipSubcategory.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(icon !== undefined && { icon }),
          ...(order !== undefined && { order }),
        },
        include: {
          details: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return reply.send({ subcategory: updated });
    }
  );

  // DELETE /api/relationships/subcategories/:id - Delete subcategory
  fastify.delete<{ Params: { id: string } }>(
    '/api/relationships/subcategories/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { id } = request.params;

      // Verify ownership
      const subcategory = await prisma.relationshipSubcategory.findFirst({
        where: { id, userId },
        include: {
          _count: {
            select: { relationships: true },
          },
        },
      });

      if (!subcategory) {
        return reply.code(404).send({ error: 'Subcategory not found' });
      }

      // Prevent deletion if has active relationships
      if (subcategory._count.relationships > 0) {
        return reply.code(409).send({
          error: 'Cannot delete subcategory with active relationships',
          count: subcategory._count.relationships,
        });
      }

      // Delete subcategory (cascades to details)
      await prisma.relationshipSubcategory.delete({
        where: { id },
      });

      return reply.send({ message: 'Subcategory deleted successfully' });
    }
  );

  // ============================================================
  // DETAIL MANAGEMENT
  // ============================================================

  // GET /api/relationships/details/:subcategoryId - List details
  fastify.get<{ Params: { subcategoryId: string } }>(
    '/api/relationships/details/:subcategoryId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { subcategoryId: string } }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { subcategoryId } = request.params;

      // Verify subcategory ownership
      const subcategory = await prisma.relationshipSubcategory.findFirst({
        where: { id: subcategoryId, userId },
      });

      if (!subcategory) {
        return reply.code(404).send({ error: 'Subcategory not found' });
      }

      const details = await prisma.relationshipDetail.findMany({
        where: { subcategoryId },
        include: {
          _count: {
            select: { relationships: true },
          },
        },
        orderBy: { order: 'asc' },
      });

      return reply.send({ details });
    }
  );

  // POST /api/relationships/details - Create detail
  fastify.post<{
    Body: {
      subcategoryId: string;
      name: string;
      icon?: string;
      order?: number;
    };
  }>(
    '/api/relationships/details',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{
      Body: { subcategoryId: string; name: string; icon?: string; order?: number };
    }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { subcategoryId, name, icon, order } = request.body;

      if (!subcategoryId || !name || name.trim().length === 0) {
        return reply.code(400).send({ error: 'Subcategory ID and name are required' });
      }

      // Verify subcategory ownership
      const subcategory = await prisma.relationshipSubcategory.findFirst({
        where: { id: subcategoryId, userId },
      });

      if (!subcategory) {
        return reply.code(404).send({ error: 'Subcategory not found' });
      }

      // Check for duplicate name in same subcategory
      const existing = await prisma.relationshipDetail.findFirst({
        where: {
          subcategoryId,
          name: { equals: name.trim(), mode: 'insensitive' },
        },
      });

      if (existing) {
        return reply.code(409).send({ error: 'Detail with this name already exists in this subcategory' });
      }

      const detail = await prisma.relationshipDetail.create({
        data: {
          subcategoryId,
          userId,
          name: name.trim(),
          icon: icon || null,
          order: order ?? 0,
          isDefault: false,
        },
      });

      return reply.code(201).send({ detail });
    }
  );

  // PUT /api/relationships/details/:id - Update detail
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; icon?: string; order?: number };
  }>(
    '/api/relationships/details/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { name?: string; icon?: string; order?: number };
    }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { id } = request.params;
      const { name, icon, order } = request.body;

      // Verify ownership
      const detail = await prisma.relationshipDetail.findFirst({
        where: { id, userId },
      });

      if (!detail) {
        return reply.code(404).send({ error: 'Detail not found' });
      }

      // Check name conflict
      if (name) {
        const existing = await prisma.relationshipDetail.findFirst({
          where: {
            subcategoryId: detail.subcategoryId,
            name: { equals: name.trim(), mode: 'insensitive' },
            id: { not: id },
          },
        });

        if (existing) {
          return reply.code(409).send({ error: 'Detail with this name already exists in this subcategory' });
        }
      }

      const updated = await prisma.relationshipDetail.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(icon !== undefined && { icon }),
          ...(order !== undefined && { order }),
        },
      });

      return reply.send({ detail: updated });
    }
  );

  // DELETE /api/relationships/details/:id - Delete detail
  fastify.delete<{ Params: { id: string } }>(
    '/api/relationships/details/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { id } = request.params;

      // Verify ownership
      const detail = await prisma.relationshipDetail.findFirst({
        where: { id, userId },
        include: {
          _count: {
            select: { relationships: true },
          },
        },
      });

      if (!detail) {
        return reply.code(404).send({ error: 'Detail not found' });
      }

      // Prevent deletion if has active relationships
      if (detail._count.relationships > 0) {
        return reply.code(409).send({
          error: 'Cannot delete detail with active relationships',
          count: detail._count.relationships,
        });
      }

      await prisma.relationshipDetail.delete({
        where: { id },
      });

      return reply.send({ message: 'Detail deleted successfully' });
    }
  );

  // ============================================================
  // FRIEND RELATIONSHIP ASSIGNMENT
  // ============================================================

  // GET /api/relationships/friends/:friendId - Get relationships for a friend
  fastify.get<{ Params: { friendId: string } }>(
    '/api/relationships/friends/:friendId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { friendId: string } }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { friendId } = request.params;

      const relationships = await prisma.friendRelationship.findMany({
        where: {
          userId,
          friendId,
        },
        include: {
          category: true,
          subcategory: true,
          detail: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return reply.send({ relationships });
    }
  );

  // POST /api/relationships/friends - Assign relationship to friend
  fastify.post<{
    Body: {
      friendId: string;
      categoryId?: string;
      subcategoryId?: string;
      detailId?: string;
      customLabel?: string;
    };
  }>(
    '/api/relationships/friends',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{
      Body: {
        friendId: string;
        categoryId?: string;
        subcategoryId?: string;
        detailId?: string;
        customLabel?: string;
      };
    }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { friendId, categoryId, subcategoryId, detailId, customLabel } = request.body;

      if (!friendId) {
        return reply.code(400).send({ error: 'Friend ID is required' });
      }

      // At least one of categoryId, subcategoryId, or detailId must be provided
      if (!categoryId && !subcategoryId && !detailId) {
        return reply.code(400).send({ error: 'At least one relationship level (category, subcategory, or detail) is required' });
      }

      // Verify friend exists and is actually a friend
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId, friendId, status: 'ACCEPTED' },
            { userId: friendId, friendId: userId, status: 'ACCEPTED' },
          ],
        },
      });

      if (!friendship) {
        return reply.code(404).send({ error: 'Friendship not found or not accepted' });
      }

      // Verify ownership of relationship components
      if (categoryId) {
        const category = await prisma.relationshipCategory.findFirst({
          where: { id: categoryId, userId },
        });
        if (!category) {
          return reply.code(404).send({ error: 'Category not found' });
        }
      }

      if (subcategoryId) {
        const subcategory = await prisma.relationshipSubcategory.findFirst({
          where: { id: subcategoryId, userId },
        });
        if (!subcategory) {
          return reply.code(404).send({ error: 'Subcategory not found' });
        }
      }

      if (detailId) {
        const detail = await prisma.relationshipDetail.findFirst({
          where: { id: detailId, userId },
        });
        if (!detail) {
          return reply.code(404).send({ error: 'Detail not found' });
        }
      }

      // Check if this exact relationship already exists (same category/subcategory/detail combination)
      const existing = await prisma.friendRelationship.findFirst({
        where: {
          userId,
          friendId,
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          detailId: detailId || null,
        },
        include: {
          category: true,
          subcategory: true,
          detail: true,
        },
      });

      if (existing) {
        // Return existing relationship to prevent exact duplicates
        return reply.code(200).send({ relationship: existing });
      }

      // Create the new relationship (allows multiple different relationships per friend)
      const relationship = await prisma.friendRelationship.create({
        data: {
          userId,
          friendId,
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          detailId: detailId || null,
          customLabel: customLabel || null,
        },
        include: {
          category: true,
          subcategory: true,
          detail: true,
        },
      });

      return reply.code(201).send({ relationship });
    }
  );

  // DELETE /api/relationships/friends/:id - Remove relationship assignment
  fastify.delete<{ Params: { id: string } }>(
    '/api/relationships/friends/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = (request.user as any).id;
      const { id } = request.params;

      // Verify ownership
      const relationship = await prisma.friendRelationship.findFirst({
        where: { id, userId },
      });

      if (!relationship) {
        return reply.code(404).send({ error: 'Relationship not found' });
      }

      await prisma.friendRelationship.delete({
        where: { id },
      });

      return reply.send({ message: 'Relationship removed successfully' });
    }
  );

  // GET /api/relationships/friends - Get all friend relationships for current user
  fastify.get(
    '/api/relationships/friends',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any).id;

      const relationships = await prisma.friendRelationship.findMany({
        where: { userId },
        include: {
          category: true,
          subcategory: true,
          detail: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ relationships });
    }
  );
}
