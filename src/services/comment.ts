import { api } from './api';
import { Comment } from '../types';

export const commentService = {
  async getComments(memoryId: string): Promise<Comment[]> {
    return api.get(`/api/memories/${memoryId}/comments`);
  },

  async createComment(memoryId: string, content: string, parentId?: string): Promise<Comment> {
    return api.post(`/api/memories/${memoryId}/comments`, { content, parentId });
  },

  async updateComment(memoryId: string, commentId: string, content: string): Promise<Comment> {
    return api.put(`/api/memories/${memoryId}/comments/${commentId}`, { content });
  },

  async deleteComment(memoryId: string, commentId: string): Promise<void> {
    return api.delete(`/api/memories/${memoryId}/comments/${commentId}`);
  },
};
