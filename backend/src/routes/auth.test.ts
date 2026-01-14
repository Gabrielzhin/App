import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_URL = 'http://localhost:4000';

describe('Auth API', () => {
  let authToken: string;
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
  };

  it('should register a new user', async () => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    expect(response.status).toBe(201);
    const data = await response.json() as any;
    
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testUser.email);
    expect(data.user.mode).toBe('RESTRICTED');
    expect(data.token).toBeDefined();
    expect(data.user.referralCode).toBeDefined();

    authToken = data.token;
  });

  it('should not register duplicate email', async () => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    expect(response.status).toBe(409);
    const data = await response.json() as any;
    expect(data.error).toContain('already exists');
  });

  it('should login with correct credentials', async () => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(data.user).toBeDefined();
    expect(data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'wrongpassword',
      }),
    });

    expect(response.status).toBe(401);
  });

  it('should get current user info with valid token', async () => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(data.email).toBe(testUser.email);
    expect(data.mode).toBe('RESTRICTED');
  });

  it('should reject /api/auth/me without token', async () => {
    const response = await fetch(`${API_URL}/api/auth/me`);
    expect(response.status).toBe(401);
  });
});
