import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CORE_MEMORIES_CATEGORY = {
  name: 'Core Memories',
  icon: '🎯',
  color: '#9333EA', // Purple-600
  isProtected: true,
};

/**
 * Seeds the Core Memories category for a specific user
 * @param userId - The user ID to seed the category for
 * @returns The created category or existing category
 */
export async function seedCoreMemoriesCategory(userId: string) {
  try {
    // Check if user already has Core Memories category
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: 'Core Memories',
      },
    });

    if (existing) {
      console.log(`Core Memories category already exists for user ${userId}`);
      return existing;
    }

    // Create Core Memories category
    const category = await prisma.category.create({
      data: {
        userId,
        ...CORE_MEMORIES_CATEGORY,
      },
    });

    console.log(`Created Core Memories category for user ${userId}`);
    return category;
  } catch (error) {
    console.error(`Failed to seed Core Memories for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Seeds Core Memories category for all existing users
 */
export async function seedAllUsersCoreMemories() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    console.log(`Seeding Core Memories category for ${users.length} users...`);

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      const existing = await prisma.category.findFirst({
        where: {
          userId: user.id,
          name: 'Core Memories',
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.category.create({
        data: {
          userId: user.id,
          ...CORE_MEMORIES_CATEGORY,
        },
      });

      created++;
    }

    console.log(`✅ Core Memories seeding complete: ${created} created, ${skipped} skipped`);
  } catch (error) {
    console.error('Failed to seed Core Memories for all users:', error);
    throw error;
  }
}

// Only run directly if this is the main module (not imported)
const isDirectExecution = import.meta.url.startsWith('file:') && 
  process.argv[1]?.replace(/\\/g, '/').endsWith('seed-core-memories.ts');

if (isDirectExecution) {
  seedAllUsersCoreMemories()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
