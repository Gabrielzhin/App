import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGroup() {
  try {
    console.log('Checking "Segundo grupo"...\n');

    const group = await prisma.group.findFirst({
      where: {
        name: {
          contains: 'Segundo',
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      console.log('❌ Group not found');
      return;
    }

    console.log(`📋 Group: ${group.name}`);
    console.log(`   ID: ${group.id}`);
    console.log(`   Stored memberCount: ${group.memberCount}`);
    console.log(`   Actual members: ${group.members.length}`);
    console.log(`\n👥 Members:`);
    group.members.forEach((member, i) => {
      console.log(`   ${i + 1}. ${member.user.name} (${member.role})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkGroup();
