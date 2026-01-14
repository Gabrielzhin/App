import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    name: 'Work',
    icon: '💼',
    order: 1,
    subcategories: [
      { name: 'Colleague', icon: '👔', order: 1 },
      { name: 'Manager', icon: '👨‍💼', order: 2 },
      { name: 'Client', icon: '🤝', order: 3 },
      { name: 'Mentor', icon: '🎓', order: 4 },
    ],
  },
  {
    name: 'School',
    icon: '🎓',
    order: 2,
    subcategories: [
      { name: 'Classmate', icon: '📚', order: 1 },
      { name: 'Study Group', icon: '👥', order: 2 },
      { name: 'Teacher', icon: '👨‍🏫', order: 3 },
    ],
  },
  {
    name: 'Family',
    icon: '👨‍👩‍👧‍👦',
    order: 3,
    subcategories: [
      { name: 'Immediate Family', icon: '❤️', order: 1 },
      { name: 'Extended Family', icon: '🏡', order: 2 },
      { name: 'In-Laws', icon: '💑', order: 3 },
    ],
  },
  {
    name: 'Social',
    icon: '🎉',
    order: 4,
    subcategories: [
      { name: 'Close Friend', icon: '💙', order: 1 },
      { name: 'Acquaintance', icon: '👋', order: 2 },
      { name: 'Party Friend', icon: '🍻', order: 3 },
      { name: 'Neighbor', icon: '🏘️', order: 4 },
    ],
  },
  {
    name: 'Online',
    icon: '🌐',
    order: 5,
    subcategories: [
      { name: 'Gaming', icon: '🎮', order: 1 },
      { name: 'Social Media', icon: '📱', order: 2 },
      { name: 'Forum', icon: '💬', order: 3 },
    ],
  },
  {
    name: 'Hobby',
    icon: '🎨',
    order: 6,
    subcategories: [
      { name: 'Sports Team', icon: '⚽', order: 1 },
      { name: 'Music Group', icon: '🎵', order: 2 },
      { name: 'Art Circle', icon: '🖼️', order: 3 },
      { name: 'Book Club', icon: '📖', order: 4 },
    ],
  },
  {
    name: 'Organization',
    icon: '🏢',
    order: 7,
    subcategories: [
      { name: 'Volunteer Group', icon: '🤲', order: 1 },
      { name: 'Club Member', icon: '🎯', order: 2 },
      { name: 'Religious Community', icon: '🙏', order: 3 },
    ],
  },
];

async function seedDefaultRelationships(userId: string) {
  console.log(`Seeding default relationship categories for user ${userId}...`);

  for (const categoryData of DEFAULT_CATEGORIES) {
    const { subcategories, ...categoryFields } = categoryData;

    // Create category
    const category = await prisma.relationshipCategory.create({
      data: {
        ...categoryFields,
        userId,
        isDefault: true,
      },
    });

    console.log(`  ✓ Created category: ${category.name}`);

    // Create subcategories
    for (const subcategory of subcategories) {
      await prisma.relationshipSubcategory.create({
        data: {
          ...subcategory,
          categoryId: category.id,
          userId,
          isDefault: true,
        },
      });

      console.log(`    ✓ Created subcategory: ${subcategory.name}`);
    }
  }

  console.log('✅ Default relationship categories seeded successfully!');
}

// Seed all existing users
async function seedAllUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  console.log(`Found ${users.length} users to seed\n`);

  for (const user of users) {
    // Check if user already has categories
    const existingCategories = await prisma.relationshipCategory.count({
      where: { userId: user.id },
    });

    if (existingCategories > 0) {
      console.log(`⏭️  User ${user.email} already has ${existingCategories} categories, skipping...\n`);
      continue;
    }

    await seedDefaultRelationships(user.id);
    console.log(`✅ Completed seeding for ${user.email}\n`);
  }

  console.log('🎉 All users seeded!');
}

// Only run directly if this is the main module (not imported)
const isDirectExecution = import.meta.url.startsWith('file:') && 
  process.argv[1]?.replace(/\\/g, '/').endsWith('seed-relationships.ts');

if (isDirectExecution) {
  seedAllUsers()
    .catch((e) => {
      console.error('Error seeding relationship categories:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedDefaultRelationships };
