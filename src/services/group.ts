import { api } from './api';
import { Group, GroupMember } from '../types';

export interface CreateGroupRequest {
  name: string;
  description?: string;
  privacy?: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY';
  coverImage?: string;
  avatarUrl?: string;
  color?: string;
}

export const groupService = {
  async getGroups(): Promise<Group[] | { data: Group[] }> {
    return api.get('/api/groups');
  },

  async getGroup(id: string): Promise<Group> {
    return api.get(`/api/groups/${id}`);
  },

  async createGroup(data: CreateGroupRequest): Promise<Group> {
    return api.post('/api/groups', data);
  },

  async updateGroup(id: string, data: Partial<CreateGroupRequest>): Promise<Group> {
    return api.put(`/api/groups/${id}`, data);
  },

  async deleteGroup(id: string): Promise<void> {
    return api.delete(`/api/groups/${id}`);
  },

  async joinGroup(id: string): Promise<void> {
    return api.post(`/api/groups/${id}/join`);
  },

  async leaveGroup(id: string): Promise<void> {
    return api.post(`/api/groups/${id}/leave`);
  },

  async getMembers(id: string): Promise<GroupMember[]> {
    return api.get(`/api/groups/${id}/members`);
  },

  async inviteMember(groupId: string, userId: string): Promise<void> {
    return api.post(`/api/groups/${groupId}/invite`, { userId });
  },

  async discoverGroups(query?: string, limit = 20): Promise<Group[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    params.append('limit', limit.toString());
    return api.get(`/api/groups/discover?${params.toString()}`);
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    return api.delete(`/api/groups/${groupId}/members/${userId}`);
  },

  async updateMemberRole(groupId: string, userId: string, role: 'MEMBER' | 'ADMIN'): Promise<void> {
    return api.put(`/api/groups/${groupId}/members/${userId}/role`, { role });
  },
};
