import { api } from './api';
import { User } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  referralCode?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<any>('/api/auth/login', credentials);
    // Backend might return { user, token } or { data: { user, token } }
    const data = response.data || response;
    if (data.token) {
      await api.setToken(data.token);
    }
    return data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<any>('/api/auth/register', data);
    // Backend might return { user, token } or { data: { user, token } }
    const result = response.data || response;
    if (result.token) {
      await api.setToken(result.token);
    }
    return result;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } finally {
      await api.clearToken();
    }
  },

  async getMe(): Promise<User> {
    return api.get<User>('/api/auth/me');
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return api.put<User>('/api/auth/me', data);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return api.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },
};
