import { api } from './api';
import { Reaction, ReactionType } from '../types';

export const reactionService = {
  async getReactions(memoryId: string): Promise<Reaction[]> {
    try {
      const response = await api.get<Reaction[]>(`/api/memories/${memoryId}/reactions`);
      return Array.isArray(response) ? response : [];
    } catch (error: any) {
      console.error('Error fetching reactions:', error);
      return [];
    }
  },

  async toggleReaction(memoryId: string, type: ReactionType): Promise<{ removed?: boolean; type?: ReactionType } | Reaction> {
    return api.post(`/api/memories/${memoryId}/reactions`, { type });
  },

  async deleteReaction(memoryId: string, reactionId: string): Promise<void> {
    return api.delete(`/api/memories/${memoryId}/reactions/${reactionId}`, {});
  },
};
