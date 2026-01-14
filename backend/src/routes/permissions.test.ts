import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const API_URL = 'http://localhost:4000';
const prisma = new PrismaClient();

describe('Permission Enforcement - Phase 3', () => {
  let restrictedToken: string;
  let restrictedUserId: string;
  let fullToken: string;
  let fullUserId: string;
  let memoryId: string;

  beforeAll(async () => {
    // Create RESTRICTED user
    const restrictedRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `restricted-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Restricted User',
      }),
    });
    const restrictedData = await restrictedRes.json() as any;
    restrictedToken = restrictedData.token;
    restrictedUserId = restrictedData.user.id;

    // Create FULL user (manually set mode in database)
    const fullRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `full-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Full User',
      }),
    });
    const fullData = await fullRes.json() as any;
    fullToken = fullData.token;
    fullUserId = fullData.user.id;

    // Upgrade to FULL mode
    await prisma.user.update({
      where: { id: fullUserId },
      data: { mode: 'FULL' },
    });
  });

  describe('Memory Endpoints', () => {
    it('RESTRICTED user cannot create memory', async () => {
      const response = await fetch(`${API_URL}/api/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${restrictedToken}`,
        },
        body: JSON.stringify({ content: 'Test memory' }),
      });

      expect(response.status).toBe(403);
      const data = await response.json() as any;
      expect(data.error).toContain('Upgrade required');
    });

    it('FULL user can create memory', async () => {
      const response = await fetch(`${API_URL}/api/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fullToken}`,
        },
        body: JSON.stringify({
          content: 'My first memory',
          photos: ['https://example.com/photo.jpg'],
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.content).toBe('My first memory');
      expect(data.userId).toBe(fullUserId);
      memoryId = data.id;
    });

    it('RESTRICTED user can read memories', async () => {
      const response = await fetch(`${API_URL}/api/memories`, {
        headers: { Authorization: `Bearer ${restrictedToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('RESTRICTED user cannot update memory', async () => {
      // First create a memory as FULL user
      const createRes = await fetch(`${API_URL}/api/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fullToken}`,
        },
        body: JSON.stringify({ content: 'Memory to update' }),
      });
      const memory = await createRes.json() as any;

      // Try to update as RESTRICTED user (even though it's not their memory)
      const response = await fetch(`${API_URL}/api/memories/${memory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${restrictedToken}`,
        },
        body: JSON.stringify({ content: 'Updated content' }),
      });

      expect(response.status).toBe(403);
    });

    it('FULL user can update their memory', async () => {
      const response = await fetch(`${API_URL}/api/memories/${memoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fullToken}`,
        },
        body: JSON.stringify({ content: 'Updated memory content' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.content).toBe('Updated memory content');
    });

    it('RESTRICTED user cannot delete memory', async () => {
      // Create memory as FULL user
      const createRes = await fetch(`${API_URL}/api/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fullToken}`,
        },
        body: JSON.stringify({ content: 'Memory to delete' }),
      });
      const memory = await createRes.json() as any;

      // Try to delete as RESTRICTED user
      const response = await fetch(`${API_URL}/api/memories/${memory.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${restrictedToken}` },
      });

      expect(response.status).toBe(403);
    });

    it('FULL user can delete their memory', async () => {
      const response = await fetch(`${API_URL}/api/memories/${memoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${fullToken}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Comment Endpoints', () => {
    let testMemoryId: string;

    beforeAll(async () => {
      // Create a memory to comment on
      const res = await fetch(`${API_URL}/api/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fullToken}`,
        },
        body: JSON.stringify({ content: 'Memory for comments' }),
      });
      const data = await res.json() as any;
      testMemoryId = data.id;
    });

    it('RESTRICTED user cannot create comment', async () => {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${restrictedToken}`,
        },
        body: JSON.stringify({
          content: 'Nice memory!',
          memoryId: testMemoryId,
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json() as any;
      expect(data.error).toContain('Upgrade required');
    });

    it('FULL user can create comment', async () => {
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fullToken}`,
        },
        body: JSON.stringify({
          content: 'Great memory!',
          memoryId: testMemoryId,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.content).toBe('Great memory!');
      expect(data.userId).toBe(fullUserId);
    });

    it('RESTRICTED user cannot delete comment', async () => {
      // Create comment as FULL user
      const createRes = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fullToken}`,
        },
        body: JSON.stringify({
          content: 'Comment to delete',
          memoryId: testMemoryId,
        }),
      });
      const comment = await createRes.json() as any;

      // Try to delete as RESTRICTED user
      const response = await fetch(`${API_URL}/api/comments/${comment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${restrictedToken}` },
      });

      expect(response.status).toBe(403);
    });

    it('FULL user can delete their comment', async () => {
      // Create comment
      const createRes = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fullToken}`,
        },
        body: JSON.stringify({
          content: 'Comment to delete',
          memoryId: testMemoryId,
        }),
      });
      const comment = await createRes.json() as any;

      // Delete it
      const response = await fetch(`${API_URL}/api/comments/${comment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${fullToken}` },
      });

      expect(response.status).toBe(204);
    });
  });
});
