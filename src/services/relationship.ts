import { api } from './api';

export interface RelationshipCategory {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  order: number;
  isDefault: boolean;
  subcategories?: RelationshipSubcategory[];
  _count?: {
    relationships: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipSubcategory {
  id: string;
  categoryId: string;
  userId: string;
  name: string;
  icon?: string;
  order: number;
  isDefault: boolean;
  details?: RelationshipDetail[];
  _count?: {
    relationships: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipDetail {
  id: string;
  subcategoryId: string;
  userId: string;
  name: string;
  icon?: string;
  order: number;
  isDefault: boolean;
  _count?: {
    relationships: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FriendRelationship {
  id: string;
  userId: string;
  friendId: string;
  categoryId?: string;
  category?: RelationshipCategory;
  subcategoryId?: string;
  subcategory?: RelationshipSubcategory;
  detailId?: string;
  detail?: RelationshipDetail;
  customLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export const relationshipService = {
  // Categories
  async getCategories(): Promise<RelationshipCategory[]> {
    const response = await api.get('/api/relationships/categories');
    return response.categories || [];
  },

  async createCategory(name: string, icon?: string, order?: number): Promise<RelationshipCategory> {
    const response = await api.post('/api/relationships/categories', { name, icon, order });
    return response.category;
  },

  async updateCategory(id: string, data: { name?: string; icon?: string; order?: number }): Promise<RelationshipCategory> {
    const response = await api.put(`/api/relationships/categories/${id}`, data);
    return response.category;
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/api/relationships/categories/${id}`);
  },

  // Subcategories
  async getSubcategories(categoryId: string): Promise<RelationshipSubcategory[]> {
    const response = await api.get(`/api/relationships/categories/${categoryId}/subcategories`);
    return response.subcategories || [];
  },

  async createSubcategory(categoryId: string, name: string, icon?: string, order?: number): Promise<RelationshipSubcategory> {
    const response = await api.post('/api/relationships/subcategories', { categoryId, name, icon, order });
    return response.subcategory;
  },

  async updateSubcategory(id: string, data: { name?: string; icon?: string; order?: number }): Promise<RelationshipSubcategory> {
    const response = await api.put(`/api/relationships/subcategories/${id}`, data);
    return response.subcategory;
  },

  async deleteSubcategory(id: string): Promise<void> {
    await api.delete(`/api/relationships/subcategories/${id}`);
  },

  // Details
  async getDetails(subcategoryId: string): Promise<RelationshipDetail[]> {
    const response = await api.get(`/api/relationships/subcategories/${subcategoryId}/details`);
    return response.details || [];
  },

  async createDetail(subcategoryId: string, name: string, icon?: string, order?: number): Promise<RelationshipDetail> {
    const response = await api.post('/api/relationships/details', { subcategoryId, name, icon, order });
    return response.detail;
  },

  async updateDetail(id: string, data: { name?: string; icon?: string; order?: number }): Promise<RelationshipDetail> {
    const response = await api.put(`/api/relationships/details/${id}`, data);
    return response.detail;
  },

  async deleteDetail(id: string): Promise<void> {
    await api.delete(`/api/relationships/details/${id}`);
  },

  // Friend Relationships
  async getFriendRelationships(friendId?: string): Promise<FriendRelationship[]> {
    const url = friendId ? `/api/relationships/friends/${friendId}` : '/api/relationships/friends';
    const response = await api.get(url);
    return response.relationships || [];
  },

  async assignRelationship(data: {
    friendId: string;
    categoryId?: string;
    subcategoryId?: string;
    detailId?: string;
    customLabel?: string;
  }): Promise<FriendRelationship> {
    const response = await api.post('/api/relationships/friends', data);
    return response.relationship;
  },

  async removeRelationship(id: string): Promise<void> {
    await api.delete(`/api/relationships/friends/${id}`);
  },
};
