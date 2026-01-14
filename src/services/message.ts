import { api } from './api';
import { Message } from '../types';

export interface SendMessageRequest {
  content: string;
}

export const messageService = {
  // Group Messages
  async getGroupMessages(groupId: string, limit = 50, before?: string): Promise<Message[]> {
    return api.get(`/api/groups/${groupId}/messages`, { limit, before });
  },

  async sendGroupMessage(groupId: string, content: string): Promise<Message> {
    return api.post(`/api/groups/${groupId}/messages`, { content });
  },

  async deleteMessage(messageId: string): Promise<void> {
    return api.delete(`/api/messages/${messageId}`);
  },

  // Direct Messages
  async getConversations(): Promise<any[]> {
    return api.get('/api/conversations');
  },

  async getDirectMessages(userId: string, limit = 50, before?: string): Promise<Message[]> {
    return api.get(`/api/conversations/${userId}/messages`, { limit, before });
  },

  async sendDirectMessage(userId: string, content: string): Promise<Message> {
    return api.post(`/api/conversations/${userId}/messages`, { content });
  },
};
