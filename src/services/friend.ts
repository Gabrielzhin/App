import { api } from './api';
import { User } from '../types';

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  isCloseFriend: boolean;
  friendshipStartDate?: string;
  createdAt: string;
  user?: User;
  friend?: User;
  relationship?: string; // Custom relationship label
  relationshipHierarchy?: string[]; // 3-level hierarchy: [category, subcategory, detail]
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

export interface FriendRequest {
  id: string;
  userId: string;
  friendId: string;
  status: 'PENDING';
  createdAt: string;
  user: User;
}

export const friendService = {
  // Get all friends
  async getFriends(): Promise<Friendship[]> {
    try {
      const response = await api.get<{ friends: Friendship[] }>('/api/friends');
      console.log('🔍 getFriends response:', JSON.stringify(response, null, 2));
      return response.friends || [];
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status === 404) {
        console.warn('Friend routes not implemented on backend yet');
        return [];
      }
      throw error;
    }
  },

  // Get pending friend requests (received)
  async getPendingRequests(): Promise<FriendRequest[]> {
    try {
      const response = await api.get<{ requests: FriendRequest[] }>('/api/friends/requests/pending');
      return response.requests || [];
    } catch (error: any) {
      console.error('Error fetching pending requests:', error);
      if (error.response?.status === 404) {
        console.warn('Friend request routes not implemented on backend yet');
        return [];
      }
      throw error;
    }
  },

  // Get sent friend requests
  async getSentRequests(): Promise<FriendRequest[]> {
    try {
      const response = await api.get<{ requests: FriendRequest[] }>('/api/friends/requests/sent');
      return response.requests || [];
    } catch (error: any) {
      console.error('Error fetching sent requests:', error);
      if (error.response?.status === 404) {
        console.warn('Sent request routes not implemented on backend yet');
        return [];
      }
      throw error;
    }
  },

  // Send a friend request
  async sendFriendRequest(friendId: string): Promise<Friendship> {
    try {
      const response = await api.post<{ friendship: Friendship }>('/api/friends/request', {
        friendId,
      });
      return response.friendship;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },

  // Accept a friend request
  async acceptFriendRequest(friendshipId: string): Promise<Friendship> {
    try {
      const response = await api.post<{ friendship: Friendship }>(
        `/api/friends/accept/${friendshipId}`
      );
      return response.friendship;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  },

  // Reject a friend request
  async rejectFriendRequest(friendshipId: string): Promise<void> {
    try {
      await api.delete(`/api/friends/reject/${friendshipId}`);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  },

  // Remove a friend
  async removeFriend(friendshipId: string): Promise<void> {
    try {
      await api.delete(`/api/friends/${friendshipId}`);
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  },

  // Toggle close friend status
  async toggleCloseFriend(friendshipId: string, isCloseFriend: boolean): Promise<Friendship> {
    try {
      const response = await api.patch<{ friendship: Friendship }>(
        `/api/friends/${friendshipId}/close-friend`,
        { isCloseFriend }
      );
      return response.friendship;
    } catch (error) {
      console.error('Error toggling close friend:', error);
      throw error;
    }
  },

  // Search users by username or email
  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await api.get<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(query)}`);
      return response.users || [];
    } catch (error: any) {
      console.error('Error searching users:', error);
      console.error('Error response:', error.response?.data);
      return [];
    }
  },

  // Get direct messages with a specific user
  async getDirectMessages(userId: string): Promise<DirectMessage[]> {
    try {
      const response = await api.get<{ messages: DirectMessage[] }>(
        `/api/messages/direct/${userId}`
      );
      return response.messages || [];
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      throw error;
    }
  },

  // Send a direct message
  async sendDirectMessage(receiverId: string, content: string): Promise<DirectMessage> {
    try {
      const response = await api.post<{ message: DirectMessage }>('/api/messages/direct', {
        receiverId,
        content,
      });
      return response.message;
    } catch (error) {
      console.error('Error sending direct message:', error);
      throw error;
    }
  },

  // Mark messages as read
  async markMessagesAsRead(userId: string): Promise<void> {
    try {
      await api.patch(`/api/messages/direct/${userId}/read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  // Get user conversations (list of people with DMs)
  async getConversations(): Promise<Array<{ user: User; lastMessage: DirectMessage; unreadCount: number }>> {
    try {
      const response = await api.get<{ 
        conversations: Array<{ user: User; lastMessage: DirectMessage; unreadCount: number }> 
      }>('/api/messages/conversations');
      return response.conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Update relationship with a friend
  async updateRelationship(friendId: string, relationship: string): Promise<void> {
    try {
      await api.put(`/api/friends/${friendId}/relationship`, { relationship });
    } catch (error) {
      console.error('Error updating relationship:', error);
      throw error;
    }
  },

  // Get groups in common with a friend
  async getGroupsInCommon(friendId: string): Promise<{ count: number; groups: any[] }> {
    try {
      return await api.get(`/api/friends/${friendId}/groups-in-common`);
    } catch (error) {
      console.error('Error fetching groups in common:', error);
      return { count: 0, groups: [] };
    }
  },
};
