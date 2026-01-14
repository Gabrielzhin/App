// Script to upgrade a user to FULL mode for testing
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upgradeUser(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { mode: 'FULL' },
    });
    
    console.log(`✅ User ${email} upgraded to FULL mode`);
    console.log(`User ID: ${user.id}`);
    console.log(`Mode: ${user.mode}`);
  } catch (error) {
    console.error('❌ Error upgrading user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run upgrade-user <email>');
  process.exit(1);
}

upgradeUser(email);
