import { api } from './api';
import { Memory } from '../types';

export interface DashboardStats {
  coreMemories: number;
  totalMemories: number;
  collections: number;
  thisWeek: number;
  thisMonth: number;
  topMoods: MoodStat[];
  drafts: number;
}

export interface MoodStat {
  mood: string;
  count: number;
}

export interface DraftMemory {
  id: string;
  title?: string;
  content: string;
  lastAutoSaved?: string;
  updatedAt: string;
}

export const statsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    return await api.get<DashboardStats>('/api/stats/dashboard');
  },

  async getTopMoods(limit: number = 3): Promise<MoodStat[]> {
    return await api.get<MoodStat[]>(`/api/stats/moods/top?limit=${limit}`);
  },

  async getOlderMemories(): Promise<Memory[]> {
    return await api.get<Memory[]>('/api/stats/memories/older');
  },

  async getDrafts(): Promise<DraftMemory[]> {
    return await api.get<DraftMemory[]>('/api/stats/drafts');
  },
};
