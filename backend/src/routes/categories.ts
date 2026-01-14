import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateCategoryBody {
  name: string;
  color?: string;
  icon?: string;
  groupId?: string;
}

interface UpdateCategoryBody {
  name?: string;
  color?: string;
  icon?: string;
}

export function categoryRoutes(fastify: FastifyInstance) {
  // Create a new category
  fastify.post<{ Body: CreateCategoryBody }>(
    '/api/categories',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user;

      const { name, color, icon, groupId } = request.body;

      if (!name || name.trim() === '') {
        return reply.code(400).send({ error: 'Category name is required' });
      }

      // If groupId is provided, verify user is a member of that group
      if (groupId) {
        const membership = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: user.id,
            },
          },
        });

        if (!membership) {
          return reply.code(403).send({ error: 'You must be a member of this group' });
        }
      }

      try {
        const category = await prisma.category.create({
          data: {
            userId: user.id,
            groupId,
            name: name.trim(),
            color,
            icon,
          },
        });

        return reply.code(201).send(category);
      } catch (error) {
        console.error('Error creating category:', error);
        return reply.code(500).send({ error: 'Failed to create category' });
      }
    }
  );

  // Get all categories for the authenticated user
  // Query param: ?groupId=xxx to filter by specific group
  fastify.get('/api/categories', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest<{ Querystring: { groupId?: string } }>, reply: FastifyReply) => {
    const user = request.user;
    const { groupId } = request.query;

    try {
      let whereClause: any = {
        userId: user.id,
      };

      if (groupId) {
        // Get categories for this specific group
        // User must be a member to see group categories
        const membership = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: user.id,
            },
          },
        });

        if (!membership) {
          return reply.code(403).send({ error: 'You must be a member of this group' });
        }

        whereClause.groupId = groupId;
      } else {
        // Get only personal categories (not group-specific)
        whereClause.groupId = null;
      }

      const categories = await prisma.category.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              memories: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return reply.send(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return reply.code(500).send({ error: 'Failed to fetch categories' });
    }
  });

  // Update a category
  fastify.put<{ Params: { id: string }; Body: UpdateCategoryBody }>(
    '/api/categories/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user;

      const { id } = request.params;
      const { name, color, icon } = request.body;

      try {
        // Check if category exists and belongs to user
        const existingCategory = await prisma.category.findUnique({
          where: { id },
        });

        if (!existingCategory) {
          return reply.code(404).send({ error: 'Category not found' });
        }

        if (existingCategory.userId !== user.id) {
          return reply.code(403).send({ error: 'Not authorized to update this category' });
        }

        // Build update data
        const updateData: any = {};
        if (name !== undefined && name.trim() !== '') {
          updateData.name = name.trim();
        }
        if (color !== undefined) {
          updateData.color = color;
        }
        if (icon !== undefined) {
          updateData.icon = icon;
        }

        const updatedCategory = await prisma.category.update({
          where: { id },
          data: updateData,
        });

        return reply.send(updatedCategory);
      } catch (error) {
        console.error('Error updating category:', error);
        return reply.code(500).send({ error: 'Failed to update category' });
      }
    }
  );

  // Delete a category
  fastify.delete<{ Params: { id: string } }>(
    '/api/categories/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user;

      const { id } = request.params;

      try {
        // Check if category exists and belongs to user
        const existingCategory = await prisma.category.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                memories: true,
              },
            },
          },
        });

        if (!existingCategory) {
          return reply.code(404).send({ error: 'Category not found' });
        }

        if (existingCategory.userId !== user.id) {
          return reply.code(403).send({ error: 'Not authorized to delete this category' });
        }

        // Delete the category (cascade will delete MemoryCategory records)
        await prisma.category.delete({
          where: { id },
        });

        return reply.code(204).send();
      } catch (error) {
        console.error('Error deleting category:', error);
        return reply.code(500).send({ error: 'Failed to delete category' });
      }
    }
  );
}
