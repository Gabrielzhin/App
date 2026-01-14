import { api } from './api';

export type OrbitItemType = 'PERSON' | 'GROUP' | 'CATEGORY';

export interface OrbitItem {
  id: string;
  name: string;
  type: OrbitItemType;
  icon?: string;
  color: string;
  position: number;
  targetUserId?: string;
  groupId?: string;
  categoryId?: string;
  memberIds: string[];
  targetUser?: {
    id: string;
    username: string;
    name?: string;
    profilePicture?: string;
  };
  group?: {
    id: string;
    name: string;
    avatarUrl?: string;
    color?: string;
    memberCount: number;
  };
  category?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
}

export interface CreateOrbitItemRequest {
  name: string;
  type: OrbitItemType;
  icon?: string;
  color?: string;
  position: number;
  targetUserId?: string;
  groupId?: string;
  categoryId?: string;
  memberIds?: string[];
}

export interface UpdateOrbitItemRequest {
  name?: string;
  icon?: string;
  color?: string;
  position?: number;
  memberIds?: string[];
}

export interface AvailableFriend {
  id: string;
  username: string;
  name?: string;
  profilePicture?: string;
}

export interface AvailableGroup {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  memberCount: number;
}

export const orbitService = {
  async getUserOrbit(): Promise<OrbitItem[]> {
    return await api.get<OrbitItem[]>('/api/orbit');
  },

  async createOrbitItem(data: CreateOrbitItemRequest): Promise<OrbitItem> {
    return await api.post<OrbitItem>('/api/orbit', data);
  },

  async updateOrbitItem(itemId: string, data: UpdateOrbitItemRequest): Promise<OrbitItem> {
    return await api.put<OrbitItem>(`/api/orbit/${itemId}`, data);
  },

  async deleteOrbitItem(itemId: string): Promise<void> {
    await api.delete(`/api/orbit/${itemId}`);
  },

  async swapPositions(itemId1: string, itemId2: string): Promise<void> {
    await api.post('/api/orbit/swap', { itemId1, itemId2 });
  },

  async getAvailableFriends(): Promise<AvailableFriend[]> {
    return await api.get<AvailableFriend[]>('/api/orbit/available/friends');
  },

  async getAvailableGroups(): Promise<AvailableGroup[]> {
    return await api.get<AvailableGroup[]>('/api/orbit/available/groups');
  },

  // Helper: Get member count for custom groups
  getMemberCount(item: OrbitItem): number {
    if (item.type === 'GROUP' && item.group) {
      return item.group.memberCount;
    }
    if (item.type === 'PERSON') {
      return 1;
    }
    return item.memberIds?.length || 0;
  },

  // Helper: Get display name with fallback
  getDisplayName(item: OrbitItem): string {
    if (item.name) return item.name;
    if (item.targetUser) return item.targetUser.name || item.targetUser.username;
    if (item.group) return item.group.name;
    if (item.category) return item.category.name;
    return 'Unknown';
  },

  // Helper: Get color with fallback
  getColor(item: OrbitItem): string {
    if (item.color) return item.color;
    if (item.group?.color) return item.group.color;
    if (item.category?.color) return item.category.color;
    return '#6366f1';
  },

  // Helper: Get icon with fallback
  getIcon(item: OrbitItem): string | undefined {
    if (item.icon) return item.icon;
    if (item.type === 'GROUP') return 'account-group';
    if (item.type === 'CATEGORY' && item.category?.icon) return item.category.icon;
    return undefined;
  },
};
