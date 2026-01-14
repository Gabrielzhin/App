import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
// Prisma client regenerated with new schema

// Optimized select for group memories (reduces payload by ~60%)
const groupMemorySelect = {
  id: true,
  title: true,
  content: true,
  photos: true,
  audioUrl: true,
  memoryDate: true,
  location: true,
  moods: true,
  groupId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      profilePicture: true,
    },
  },
  categories: {
    select: {
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
      },
    },
  },
  _count: {
    select: {
      comments: true,
      reactions: true,
    },
  },
};

// Optimized select for group list (lightweight)
const groupListSelect = {
  id: true,
  name: true,
  description: true,
  avatarUrl: true,
  color: true,
  privacy: true,
  memberCount: true,
  createdAt: true,
};

// Optimized select for member info
const memberUserSelect = {
  id: true,
  name: true,
  username: true,
  profilePicture: true,
};

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  coverImage: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  privacy: z.enum(['PUBLIC', 'PRIVATE', 'FRIENDS_ONLY']).optional(),
  memberIds: z.array(z.string()).optional(),
});

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  privacy: z.enum(['PUBLIC', 'PRIVATE', 'FRIENDS_ONLY']).optional(),
});

const AddMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['MEMBER', 'ADMIN']).optional(),
});

const InviteMemberSchema = z.object({
  userId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
});

const RespondInvitationSchema = z.object({
  accept: z.boolean(),
});

// Helper function to suggest relationship based on group
async function suggestRelationship(groupName: string, userId: string) {
  // Determine suggested category based on group name keywords
  let suggestedCategoryName = 'Social'; // default
  
  const lowerName = groupName.toLowerCase();
  if (lowerName.includes('work') || lowerName.includes('company') || lowerName.includes('corp') || lowerName.includes('inc')) {
    suggestedCategoryName = 'Work';
  } else if (lowerName.includes('school') || lowerName.includes('university') || lowerName.includes('college') || lowerName.includes('academy')) {
    suggestedCategoryName = 'School';
  } else if (lowerName.includes('hobby') || lowerName.includes('club') || lowerName.includes('sport')) {
    suggestedCategoryName = 'Hobby';
  } else if (lowerName.includes('org') || lowerName.includes('organization') || lowerName.includes('foundation')) {
    suggestedCategoryName = 'Organization';
  } else if (lowerName.includes('online') || lowerName.includes('gaming') || lowerName.includes('discord')) {
    suggestedCategoryName = 'Online';
  }

  // Find the category
  const category = await prisma.relationshipCategory.findFirst({
    where: {
      userId,
      name: suggestedCategoryName,
    },
  });

  if (!category) {
    return null; // User doesn't have this category (shouldn't happen with defaults)
  }

  // Check if subcategory with group name already exists
  const existingSubcategory = await prisma.relationshipSubcategory.findFirst({
    where: {
      categoryId: category.id,
      name: groupName,
    },
  });

  return {
    categoryId: category.id,
    categoryName: suggestedCategoryName,
    subcategoryName: groupName,
    subcategoryId: existingSubcategory?.id,
    shouldCreateSubcategory: !existingSubcategory,
  };
}

export async function groupRoutes(fastify: FastifyInstance) {
  // Create a group (requires FULL mode)
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireFullMode],
  }, async (request, reply) => {
    const { name, description, avatarUrl, coverImage, color, privacy, memberIds } = CreateGroupSchema.parse(request.body);
    const userId = request.user!.id;

    const memberCount = 1 + (memberIds?.length || 0);

    // Create group with creator as OWNER
    const group = await prisma.group.create({
      data: {
        name,
        description,
        avatarUrl,
        coverImage,
        color,
        privacy: privacy || 'FRIENDS_ONLY',
        memberCount,
        creatorId: userId,
        members: {
          create: [
            { userId, role: 'OWNER' },
            ...(memberIds || []).map((id: string) => ({ 
              userId: id, 
              role: 'MEMBER' as const,
              invitedBy: userId,
            })),
          ],
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    return reply.send(group);
  });

  // Get all groups the user is a member of
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user!.id;

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        coverImage: true,
        color: true,
        privacy: true,
        memberCount: true,
        createdAt: true,
        updatedAt: true,
        members: {
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
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return reply.send(groups);
  });

  // Get a specific group
  fastify.get('/:groupId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const userId = request.user!.id;

    // First, try to find the group and check if user is a member
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
        members: {
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
        },
        _count: {
          select: { members: true, memories: true },
        },
      },
    });

    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    const currentMember = group.members.find(m => m.userId === userId);
    const isMember = !!currentMember;
    const isAdmin = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

    // If not a member and group is not public, deny access
    if (!isMember && group.privacy !== 'PUBLIC') {
      return reply.code(403).send({ error: 'Group not found or access denied' });
    }

    // For non-members viewing public groups, hide member list and show limited info
    let members = group.members;
    if (!isMember || (group.privacy === 'PUBLIC' && !isAdmin)) {
      // Hide detailed member list for non-members or non-admins
      members = [];
    }

    const groupWithRole = {
      ...group,
      members,
      currentUserRole: currentMember?.role || null,
      isMember,
    };

    return reply.send(groupWithRole);
  });

  // Update a group (only OWNER or ADMIN)
  fastify.put('/:groupId', {
    preHandler: [fastify.authenticate, fastify.requireFullMode],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const userId = request.user!.id;
    const updates = UpdateGroupSchema.parse(request.body);

    // Check if user is OWNER or ADMIN
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return reply.code(403).send({ error: 'Only group owners or admins can update the group' });
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updates,
      include: {
        members: {
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
        },
      },
    });

    return reply.send(group);
  });

  // Delete a group (only OWNER)
  fastify.delete('/:groupId', {
    preHandler: [fastify.authenticate, fastify.requireFullMode],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const userId = request.user!.id;

    // Check if user is OWNER
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        role: 'OWNER',
      },
    });

    if (!membership) {
      return reply.code(403).send({ error: 'Only group owners can delete the group' });
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return reply.send({ message: 'Group deleted successfully' });
  });

  // Add member to group (OWNER or ADMIN)
  fastify.post('/:groupId/members', {
    preHandler: [fastify.authenticate, fastify.requireFullMode],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const currentUserId = request.user!.id;
    const { userId, role = 'MEMBER' } = AddMemberSchema.parse(request.body);

    // Check if current user is OWNER or ADMIN
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: currentUserId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return reply.code(403).send({ error: 'Only group owners or admins can add members' });
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (existingMember) {
      return reply.code(400).send({ error: 'User is already a member' });
    }

    await prisma.$transaction([
      prisma.groupMember.create({
        data: {
          groupId,
          userId,
          role,
        },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    const newMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
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
    });

    return reply.send(newMember);
  });

  // Remove member from group (OWNER or ADMIN, or self-leave)
  fastify.delete('/:groupId/members/:memberId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { groupId, memberId } = request.params as { groupId: string; memberId: string };
    const currentUserId = request.user!.id;
    const userId = memberId; // Keep internal logic the same

    // Check if user is removing themselves or is OWNER/ADMIN
    const isRemovingSelf = userId === currentUserId;
    
    if (!isRemovingSelf) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: currentUserId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (!membership) {
        return reply.code(403).send({ error: 'Only group owners or admins can remove members' });
      }
    }

    // Prevent owner from leaving if they're the only member
    const memberToRemove = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (memberToRemove?.role === 'OWNER' && isRemovingSelf) {
      const memberCount = await prisma.groupMember.count({
        where: { groupId },
      });

      if (memberCount > 1) {
        return reply.code(400).send({ 
          error: 'Transfer ownership before leaving. You are the only owner.' 
        });
      }
    }

    await prisma.$transaction([
      prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return reply.send({ message: 'Member removed successfully' });
  });

  // Update member role (only OWNER)
  fastify.put('/:groupId/members/:userId/role', {
    preHandler: [fastify.authenticate, fastify.requireFullMode],
  }, async (request, reply) => {
    const { groupId, userId } = request.params as { groupId: string; userId: string };
    const currentUserId = request.user!.id;
    const { role } = z.object({ role: z.enum(['MEMBER', 'ADMIN', 'OWNER']) }).parse(request.body);

    // Only OWNER can change roles
    const ownerMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: currentUserId,
        role: 'OWNER',
      },
    });

    if (!ownerMembership) {
      return reply.code(403).send({ error: 'Only group owners can change member roles' });
    }

    // If changing to OWNER, demote current owner to ADMIN
    if (role === 'OWNER') {
      await prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: currentUserId,
          },
        },
        data: { role: 'ADMIN' },
      });
    }

    const updatedMember = await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return reply.send(updatedMember);
  });

  // Get group members (with privacy rules for public groups)
  fastify.get('/:groupId/members', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const currentUserId = request.user!.id;

    // Verify user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: currentUserId,
        },
      },
    });

    if (!membership) {
      return reply.code(403).send({ error: 'You must be a member to view members' });
    }

    // Get the group to check privacy
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { privacy: true },
    });

    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    const isAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN';

    // For PUBLIC groups, only admins can see the full member list
    if (group.privacy === 'PUBLIC' && !isAdmin) {
      return reply.send([]);
    }

    // Get all members for admins or for non-public groups
    const members = await prisma.groupMember.findMany({
      where: { groupId },
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
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: 'asc' },
      ],
    });

    return reply.send(members);
  });

  // Get group memories (visible to all members)
  fastify.get('/:groupId/memories', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    const currentUserId = request.user!.id;

    // Verify user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: currentUserId,
        },
      },
    });

    if (!membership) {
      return reply.code(403).send({ error: 'Only group members can view memories' });
    }

    // Use optimized select instead of include for better performance
    const memories = await prisma.memory.findMany({
      where: { groupId },
      select: groupMemorySelect,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit), 50), // Cap at 50
      skip: (Number(page) - 1) * Number(limit),
    });

    // Transform categories from nested to flat structure
    const transformedMemories = memories.map(memory => ({
      ...memory,
      categories: memory.categories?.map(mc => mc.category) || [],
    }));

    return reply.send(transformedMemories);
  });

  // ===== NEW ENDPOINTS =====

  // Discover public groups
  fastify.get('/discover', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { q, limit = 20 } = request.query as { q?: string; limit?: number };
    const userId = request.user!.id;

    // Use optimized select for lighter payload
    const groups = await prisma.group.findMany({
      where: {
        privacy: 'PUBLIC',
        ...(q && {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        ...groupListSelect,
        creator: {
          select: memberUserSelect,
        },
        _count: {
          select: { members: true, memories: true },
        },
      },
      take: Math.min(Number(limit), 50),
      orderBy: { memberCount: 'desc' },
    });

    return reply.send(groups);
  });

  // Send group invitation
  fastify.post('/:groupId/invitations', {
    preHandler: [fastify.authenticate, fastify.requireFullMode],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const currentUserId = request.user!.id;
    const body = InviteMemberSchema.parse(request.body);
    
    // Support both single userId and multiple userIds
    const userIds = body.userIds || (body.userId ? [body.userId] : []);
    
    if (userIds.length === 0) {
      return reply.code(400).send({ error: 'userId or userIds is required' });
    }

    // Check if current user is OWNER or ADMIN
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: currentUserId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return reply.code(403).send({ error: 'Only group owners or admins can send invitations' });
    }

    const invitations = [];
    
    for (const userId of userIds) {
      // Check if user is already a member
      const existingMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });

      if (existingMember) {
        continue; // Skip already members
      }

      // Check if invitation already exists
      const existingInvitation = await prisma.groupInvitation.findUnique({
        where: { groupId_inviteeId: { groupId, inviteeId: userId } },
      });

      if (existingInvitation && existingInvitation.status === 'PENDING') {
        continue; // Skip if already invited
      }

      // Create invitation (expires in 7 days)
      const invitation = await prisma.groupInvitation.create({
        data: {
          groupId,
          inviterId: currentUserId,
          inviteeId: userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              coverImage: true,
              privacy: true,
            },
          },
          inviter: {
            select: {
              id: true,
              name: true,
              username: true,
              profilePicture: true,
            },
          },
        },
      });
      
      invitations.push(invitation);
    }

    return reply.send({ invitations, count: invitations.length });
  });

  // Get user's pending invitations
  fastify.get('/invitations/pending', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user!.id;

    const invitations = await prisma.groupInvitation.findMany({
      where: {
        inviteeId: userId,
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            coverImage: true,
            color: true,
            privacy: true,
            memberCount: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(invitations);
  });

  // Respond to group invitation
  fastify.post('/invitations/:invitationId/respond', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { invitationId } = request.params as { invitationId: string };
    const userId = request.user!.id;
    const { accept } = RespondInvitationSchema.parse(request.body);

    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: { group: true },
    });

    if (!invitation) {
      return reply.code(404).send({ error: 'Invitation not found' });
    }

    if (invitation.inviteeId !== userId) {
      return reply.code(403).send({ error: 'This invitation is not for you' });
    }

    if (invitation.status !== 'PENDING') {
      return reply.code(400).send({ error: 'Invitation already responded to' });
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { status: 'EXPIRED' },
      });
      return reply.code(400).send({ error: 'Invitation has expired' });
    }

    if (accept) {
      // Add user to group
      await prisma.$transaction([
        prisma.groupMember.create({
          data: {
            groupId: invitation.groupId,
            userId,
            role: 'MEMBER',
            invitedBy: invitation.inviterId,
          },
        }),
        prisma.groupInvitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        }),
        prisma.group.update({
          where: { id: invitation.groupId },
          data: { memberCount: { increment: 1 } },
        }),
      ]);

      // Get relationship suggestion
      const suggestion = await suggestRelationship(invitation.group.name, userId);

      return reply.send({ 
        message: 'Invitation accepted', 
        group: invitation.group,
        relationshipSuggestion: suggestion,
      });
    } else {
      await prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { status: 'DECLINED', respondedAt: new Date() },
      });

      return reply.send({ message: 'Invitation declined' });
    }
  });

  // Join public group directly
  fastify.post('/:groupId/join', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const userId = request.user!.id;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    if (group.privacy !== 'PUBLIC') {
      return reply.code(403).send({ error: 'This group is not public. You need an invitation.' });
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingMember) {
      return reply.code(400).send({ error: 'You are already a member' });
    }

    await prisma.$transaction([
      prisma.groupMember.create({
        data: { groupId, userId, role: 'MEMBER' },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    // Get relationship suggestion
    const suggestion = await suggestRelationship(group.name, userId);

    return reply.send({ 
      message: 'Successfully joined group',
      relationshipSuggestion: suggestion,
    });
  });

  // GET /api/groups/:groupId/invitations - Get group's pending invitations (admins only)
  fastify.get('/:groupId/invitations', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const currentUserId = request.user!.id;

    // Check if current user is OWNER or ADMIN
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: currentUserId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      return reply.code(403).send({ error: 'Only group owners or admins can view invitations' });
    }

    const invitations = await prisma.groupInvitation.findMany({
      where: {
        groupId,
        status: 'PENDING',
      },
      include: {
        invitee: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(invitations.map(inv => ({
      id: inv.id,
      userId: inv.inviteeId,
      status: inv.status,
      createdAt: inv.createdAt,
      user: inv.invitee,
    })));
  });

  // DELETE /api/groups/invitations/:invitationId - Cancel invitation
  fastify.delete('/invitations/:invitationId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { invitationId } = request.params as { invitationId: string };
    const currentUserId = request.user!.id;

    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: {
        group: {
          include: {
            members: {
              where: {
                userId: currentUserId,
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return reply.code(404).send({ error: 'Invitation not found' });
    }

    // Only admins of the group can cancel invitations
    if (invitation.group.members.length === 0) {
      return reply.code(403).send({ error: 'Only group admins can cancel invitations' });
    }

    await prisma.groupInvitation.delete({
      where: { id: invitationId },
    });

    return reply.send({ message: 'Invitation canceled' });
  });

  // PUT /api/groups/:groupId/members/:userId - Update member role (owner only)
  fastify.put('/:groupId/members/:userId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { groupId, userId } = request.params as { groupId: string; userId: string };
    const currentUserId = request.user!.id;
    const { role } = z.object({ role: z.enum(['MEMBER', 'ADMIN']) }).parse(request.body);

    // Check if current user is OWNER
    const ownerMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: currentUserId,
        role: 'OWNER',
      },
    });

    if (!ownerMembership) {
      return reply.code(403).send({ error: 'Only group owners can change member roles' });
    }

    // Update member role
    const updatedMember = await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return reply.send(updatedMember);
  });
}
