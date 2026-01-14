import { api } from './api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    name?: string;
    profilePicture?: string;
  };
  memory?: {
    id: string;
    title?: string;
    content: string;
    photos: string[];
  };
  group?: {
    id: string;
    name: string;
    coverImage?: string;
  };
}

export const notificationService = {
  async getNotifications(unreadOnly = false): Promise<Notification[]> {
    const response = await api.get<{ notifications: Notification[] }>('/api/notifications', {
      unreadOnly: unreadOnly.toString(),
    });
    return response.notifications;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>('/api/notifications/unread-count');
    return response.count;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/api/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put('/api/notifications/read-all');
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/api/notifications/${notificationId}`);
  },
};
