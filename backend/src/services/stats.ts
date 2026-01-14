import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const statsService = {
  /**
   * Get comprehensive dashboard stats for a user
   */
  async getDashboardStats(userId: string) {
    const [
      coreMemories,
      totalMemories,
      collections,
      thisWeekCount,
      thisMonthCount,
      topMoods,
      drafts,
    ] = await Promise.all([
      // Core memories (using isCore field)
      prisma.memory.count({
        where: {
          userId,
          isDraft: false,
          isCore: true,
        },
      }),

      // Total memories
      prisma.memory.count({
        where: {
          userId,
          isDraft: false,
        },
      }),

      // Collections count - user owns or collaborates on
      prisma.collection.count({
        where: {
          OR: [
            { userId }, // Collections user owns
            { 
              collaborators: {
                some: {
                  userId,
                }
              }
            } // Collections user collaborates on
          ]
        },
      }),

      // Memories this week
      prisma.memory.count({
        where: {
          userId,
          isDraft: false,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),

      // Memories this month
      prisma.memory.count({
        where: {
          userId,
          isDraft: false,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),

      // Top 3 moods
      statsService.getTopMoods(userId, 3),

      // Draft count
      prisma.memory.count({
        where: {
          userId,
          isDraft: true,
        },
      }),
    ]);

    return {
      coreMemories,
      totalMemories,
      collections,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      topMoods,
      drafts,
    };
  },

  /**
   * Get top N most-used moods for a user
   */
  async getTopMoods(userId: string, limit: number = 3) {
    // Get all memories with moods
    const memories = await prisma.memory.findMany({
      where: {
        userId,
        isDraft: false,
        moods: {
          isEmpty: false,
        },
      },
      select: {
        moods: true,
      },
    });

    // Count mood occurrences
    const moodCounts = new Map<string, number>();
    
    memories.forEach((memory) => {
      memory.moods.forEach((mood) => {
        const count = moodCounts.get(mood) || 0;
        moodCounts.set(mood, count + 1);
      });
    });

    // Sort by count and take top N
    const sortedMoods = Array.from(moodCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([mood, count]) => ({ mood, count }));

    return sortedMoods;
  },

  /**
   * Get older memories (not from this month)
   * Returns random selection of 2-3 memories from different time periods
   */
  async getOlderMemories(userId: string) {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get older memories
    const olderMemories = await prisma.memory.findMany({
      where: {
        userId,
        isDraft: false,
        createdAt: {
          lt: oneMonthAgo,
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
        categories: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Get pool of recent older memories
    });

    if (olderMemories.length === 0) {
      return [];
    }

    // Randomly select 2-3 memories from different time periods
    const selectedMemories: typeof olderMemories = [];
    
    if (olderMemories.length <= 3) {
      return olderMemories;
    }

    // Try to get memories from different time ranges
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    // Find one from 1-3 months ago
    const recent = olderMemories.find(
      (m) => m.createdAt > threeMonthsAgo && m.createdAt < oneMonthAgo
    );
    if (recent) selectedMemories.push(recent);

    // Find one from 3-6 months ago
    const medium = olderMemories.find(
      (m) => m.createdAt > sixMonthsAgo && m.createdAt < threeMonthsAgo
    );
    if (medium) selectedMemories.push(medium);

    // Find one from 6+ months ago
    const older = olderMemories.find(
      (m) => m.createdAt < sixMonthsAgo
    );
    if (older) selectedMemories.push(older);

    // If we didn't get 3, fill with random from pool
    while (selectedMemories.length < 3 && selectedMemories.length < olderMemories.length) {
      const randomIndex = Math.floor(Math.random() * olderMemories.length);
      const randomMemory = olderMemories[randomIndex];
      
      if (!selectedMemories.find((m) => m.id === randomMemory.id)) {
        selectedMemories.push(randomMemory);
      }
    }

    return selectedMemories;
  },

  /**
   * Get drafts for a user
   */
  async getDrafts(userId: string) {
    return prisma.memory.findMany({
      where: {
        userId,
        isDraft: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        lastAutoSaved: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  },
};
