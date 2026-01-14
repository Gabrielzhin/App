import { PrismaClient, OrbitItemType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateOrbitItemData {
  name: string;
  type: OrbitItemType;
  icon?: string;
  color?: string;
  position: number;
  targetUserId?: string;
  groupId?: string;
  categoryId?: string;
  memberIds?: string[];
}

export interface UpdateOrbitItemData {
  name?: string;
  icon?: string;
  color?: string;
  position?: number;
  memberIds?: string[];
}

export const orbitService = {
  // Get all orbit items for a user
  async getUserOrbit(userId: string) {
    const items = await prisma.orbitItem.findMany({
      where: { userId },
      include: {
        targetUser: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            color: true,
            memberCount: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    return items;
  },

  // Create a new orbit item
  async createOrbitItem(userId: string, data: CreateOrbitItemData) {
    // Check if position is already taken
    const existing = await prisma.orbitItem.findUnique({
      where: {
        userId_position: {
          userId,
          position: data.position,
        },
      },
    });

    if (existing) {
      throw new Error('Position already occupied');
    }

    const item = await prisma.orbitItem.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color || '#6366f1',
        position: data.position,
        targetUserId: data.targetUserId,
        groupId: data.groupId,
        categoryId: data.categoryId,
        memberIds: data.memberIds || [],
      },
      include: {
        targetUser: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            color: true,
            memberCount: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    return item;
  },

  // Update an orbit item
  async updateOrbitItem(itemId: string, userId: string, data: UpdateOrbitItemData) {
    // Verify ownership
    const item = await prisma.orbitItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.userId !== userId) {
      throw new Error('Orbit item not found or unauthorized');
    }

    // If updating position, check if new position is available
    if (data.position !== undefined && data.position !== item.position) {
      const existing = await prisma.orbitItem.findUnique({
        where: {
          userId_position: {
            userId,
            position: data.position,
          },
        },
      });

      if (existing) {
        throw new Error('Position already occupied');
      }
    }

    const updated = await prisma.orbitItem.update({
      where: { id: itemId },
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        position: data.position,
        memberIds: data.memberIds,
      },
      include: {
        targetUser: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            color: true,
            memberCount: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    return updated;
  },

  // Delete an orbit item
  async deleteOrbitItem(itemId: string, userId: string) {
    // Verify ownership
    const item = await prisma.orbitItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.userId !== userId) {
      throw new Error('Orbit item not found or unauthorized');
    }

    await prisma.orbitItem.delete({
      where: { id: itemId },
    });

    return { success: true };
  },

  // Swap positions of two orbit items
  async swapPositions(userId: string, itemId1: string, itemId2: string) {
    const [item1, item2] = await Promise.all([
      prisma.orbitItem.findUnique({ where: { id: itemId1 } }),
      prisma.orbitItem.findUnique({ where: { id: itemId2 } }),
    ]);

    if (!item1 || !item2 || item1.userId !== userId || item2.userId !== userId) {
      throw new Error('Items not found or unauthorized');
    }

    // Swap positions using transaction
    await prisma.$transaction([
      prisma.orbitItem.update({
        where: { id: itemId1 },
        data: { position: item2.position },
      }),
      prisma.orbitItem.update({
        where: { id: itemId2 },
        data: { position: item1.position },
      }),
    ]);

    return { success: true };
  },

  // Get available friends to add to orbit
  async getAvailableFriends(userId: string) {
    // Get friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' },
        ],
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
        friend: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });

    // Get friends who are not already in orbit
    const orbitItems = await prisma.orbitItem.findMany({
      where: {
        userId,
        type: 'PERSON',
      },
      select: { targetUserId: true },
    });

    const orbitUserIds = new Set(orbitItems.map((item) => item.targetUserId).filter(Boolean));

    const friends = friendships.map((f) => {
      const friendUser = f.userId === userId ? f.friend : f.user;
      return friendUser;
    });

    return friends.filter((f) => !orbitUserIds.has(f.id));
  },

  // Get available groups to add to orbit
  async getAvailableGroups(userId: string) {
    // Get user's groups
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            color: true,
            memberCount: true,
          },
        },
      },
    });

    // Get groups not already in orbit
    const orbitItems = await prisma.orbitItem.findMany({
      where: {
        userId,
        type: 'GROUP',
      },
      select: { groupId: true },
    });

    const orbitGroupIds = new Set(orbitItems.map((item) => item.groupId).filter(Boolean));

    return memberships
      .map((m) => m.group)
      .filter((g) => !orbitGroupIds.has(g.id));
  },
};
