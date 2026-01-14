import { api } from './api';
import { Memory, PaginatedResponse, Category } from '../types';

export interface CreateMemoryRequest {
  content: string;
  title?: string;
  aboutUserId?: string;
  groupId?: string;
  photos?: string[];
  audioUrl?: string;
  moods?: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  memoryDate?: string;
  privacy?: string;
  categoryIds?: string[];
  taggedUserIds?: string[];
  isDraft?: boolean;
}

export const memoryService = {
  async getTimeline(page = 1, limit = 20): Promise<PaginatedResponse<Memory> | Memory[]> {
    return api.get('/api/memories/me', { page, limit });
  },

  async getMemory(id: string): Promise<Memory> {
    return api.get(`/api/memories/${id}`);
  },

  async createMemory(data: CreateMemoryRequest): Promise<Memory> {
    return api.post('/api/memories', data);
  },

  async updateMemory(id: string, data: Partial<CreateMemoryRequest>): Promise<Memory> {
    return api.put(`/api/memories/${id}`, data);
  },

  async deleteMemory(id: string): Promise<void> {
    return api.delete(`/api/memories/${id}`);
  },

  async getUserMemories(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Memory>> {
    return api.get(`/api/users/${userId}/memories`, { page, limit });
  },

  async getGroupMemories(groupId: string, page = 1, limit = 20): Promise<PaginatedResponse<Memory>> {
    return api.get(`/api/groups/${groupId}/memories`, { page, limit });
  },

  async getDrafts(): Promise<Memory[]> {
    return api.get('/api/memories/drafts');
  },

  async autoSaveDraft(id: string, data: Partial<CreateMemoryRequest>): Promise<Memory> {
    return api.patch(`/api/memories/${id}/autosave`, data);
  },

  async toggleCore(id: string, isCore: boolean, coreReason?: string): Promise<Memory> {
    const response = await api.put(`/api/memories/${id}/core`, { isCore, coreReason });
    return response.memory;
  },

  async getCoreMemories(): Promise<Memory[]> {
    const response = await api.get('/api/memories/core');
    return response.memories || [];
  },
};

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    return api.get('/api/categories');
  },

  async createCategory(name: string, color: string, icon: string): Promise<Category> {
    return api.post('/api/categories', { name, color, icon });
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    return api.put(`/api/categories/${id}`, data);
  },

  async deleteCategory(id: string): Promise<void> {
    return api.delete(`/api/categories/${id}`);
  },
};
