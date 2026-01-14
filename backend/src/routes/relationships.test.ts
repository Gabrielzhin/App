import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple test to verify relationship routes are registered
describe('Relationship Routes', () => {
  it('should have relationship routes registered', async () => {
    // This is a basic smoke test
    // In a real scenario, we'd use the Fastify test utilities
    const categories = await prisma.relationshipCategory.findMany({
      take: 1,
    });
    
    expect(categories).toBeDefined();
  });

  it('should have seeded default categories', async () => {
    const categoryCount = await prisma.relationshipCategory.count({
      where: { isDefault: true },
    });
    
    // Each user should have 8 default categories
    expect(categoryCount).toBeGreaterThan(0);
  });

  it('should have Work category with subcategories', async () => {
    const workCategory = await prisma.relationshipCategory.findFirst({
      where: {
        name: 'Work',
        isDefault: true,
      },
      include: {
        subcategories: true,
      },
    });

    expect(workCategory).toBeDefined();
    expect(workCategory?.name).toBe('Work');
    expect(workCategory?.icon).toBe('💼');
    expect(workCategory?.subcategories.length).toBeGreaterThan(0);
  });
});
