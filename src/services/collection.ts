import { api } from './api';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  location?: string;
  privacy: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';
  isCollaborative: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    name?: string;
    profilePicture?: string;
  };
  collaborators: CollectionCollaborator[];
  memories: CollectionMemory[];
  _count: {
    memories: number;
    collaborators: number;
  };
}

export interface CollectionCollaborator {
  id: string;
  collectionId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  addedAt: string;
  user: {
    id: string;
    username: string;
    name?: string;
    profilePicture?: string;
  };
}

export interface CollectionMemory {
  id: string;
  collectionId: string;
  memoryId: string;
  order: number;
  addedById: string;
  addedAt: string;
  memory: {
    id: string;
    title?: string;
    content: string;
    photos: string[];
    memoryDate?: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
      name?: string;
      profilePicture?: string;
    };
  };
  addedBy: {
    id: string;
    username: string;
    name?: string;
    profilePicture?: string;
  };
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  coverImage?: string;
  location?: string;
  privacy?: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';
  isCollaborative?: boolean;
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  coverImage?: string;
  location?: string;
  privacy?: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';
  isCollaborative?: boolean;
}

export interface UserCollections {
  owned: Collection[];
  collaborated: Collection[];
}

export const collectionService = {
  // Create a new collection
  async createCollection(data: CreateCollectionRequest): Promise<Collection> {
    const response = await api.post<{ collection: Collection }>('/api/collections', data);
    return response.collection;
  },

  // Get user's collections (owned + collaborated)
  async getUserCollections(): Promise<UserCollections> {
    return api.get<UserCollections>('/api/collections');
  },

  // Get collection by ID
  async getCollectionById(id: string): Promise<Collection> {
    const response = await api.get<{ collection: Collection }>(`/api/collections/${id}`);
    return response.collection;
  },

  // Update collection
  async updateCollection(id: string, data: UpdateCollectionRequest): Promise<Collection> {
    const response = await api.put<{ collection: Collection }>(`/api/collections/${id}`, data);
    return response.collection;
  },

  // Delete collection
  async deleteCollection(id: string): Promise<void> {
    await api.delete(`/api/collections/${id}`);
  },

  // Add memory to collection
  async addMemoryToCollection(collectionId: string, memoryId: string): Promise<CollectionMemory> {
    const response = await api.post<{ collectionMemory: CollectionMemory }>(
      `/api/collections/${collectionId}/memories`,
      { memoryId }
    );
    return response.collectionMemory;
  },

  // Remove memory from collection
  async removeMemoryFromCollection(collectionId: string, memoryId: string): Promise<void> {
    await api.delete(`/api/collections/${collectionId}/memories/${memoryId}`);
  },

  // Reorder memory in collection
  async reorderMemory(collectionId: string, memoryId: string, order: number): Promise<CollectionMemory> {
    const response = await api.put<{ collectionMemory: CollectionMemory }>(
      `/api/collections/${collectionId}/memories/${memoryId}/order`,
      { order }
    );
    return response.collectionMemory;
  },

  // Add collaborator
  async addCollaborator(
    collectionId: string,
    userId: string,
    role: 'OWNER' | 'EDITOR' | 'VIEWER'
  ): Promise<CollectionCollaborator> {
    const response = await api.post<{ collaborator: CollectionCollaborator }>(
      `/api/collections/${collectionId}/collaborators`,
      { userId, role }
    );
    return response.collaborator;
  },

  // Update collaborator role
  async updateCollaboratorRole(
    collectionId: string,
    userId: string,
    role: 'OWNER' | 'EDITOR' | 'VIEWER'
  ): Promise<CollectionCollaborator> {
    const response = await api.put<{ collaborator: CollectionCollaborator }>(
      `/api/collections/${collectionId}/collaborators/${userId}`,
      { role }
    );
    return response.collaborator;
  },

  // Remove collaborator
  async removeCollaborator(collectionId: string, userId: string): Promise<void> {
    await api.delete(`/api/collections/${collectionId}/collaborators/${userId}`);
  },

  // Share collection - Get shareable link
  async shareCollection(collectionId: string): Promise<{
    shareUrl: string;
    collectionId: string;
    name: string;
    description?: string;
  }> {
    return await api.post(`/api/collections/${collectionId}/share`, {});
  },
};
