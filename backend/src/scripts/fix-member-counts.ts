import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMemberCounts() {
  try {
    console.log('Starting member count fix...');

    const groups = await prisma.group.findMany({
      include: {
        members: true,
      },
    });

    console.log(`Found ${groups.length} groups to process`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const group of groups) {
      const actualCount = group.members.length;
      const storedCount = group.memberCount;

      if (actualCount !== storedCount) {
        await prisma.group.update({
          where: { id: group.id },
          data: { memberCount: actualCount },
        });
        console.log(`✅ Fixed "${group.name}": ${storedCount} → ${actualCount} members`);
        fixed++;
      } else {
        alreadyCorrect++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  Fixed: ${fixed} groups`);
    console.log(`  Already correct: ${alreadyCorrect} groups`);
    console.log(`  Total: ${groups.length} groups`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMemberCounts();
