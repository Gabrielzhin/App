import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { memoryService } from '../services/memory';
import { friendService } from '../services/friend';
import { groupService } from '../services/group';
import { categoryService } from '../services/category';
import { collectionService } from '../services/collection';
import { Memory, Friendship, Group, Category, Collection } from '../types';

// Query Keys - Centralized for consistency
export const queryKeys = {
  memories: {
    all: ['memories'] as const,
    timeline: (page: number) => ['memories', 'timeline', page] as const,
    detail: (id: string) => ['memories', 'detail', id] as const,
    user: (userId: string, page: number) => ['memories', 'user', userId, page] as const,
    group: (groupId: string, page: number) => ['memories', 'group', groupId, page] as const,
    core: ['memories', 'core'] as const,
  },
  friends: {
    all: ['friends'] as const,
    pending: ['friends', 'pending'] as const,
    sent: ['friends', 'sent'] as const,
  },
  groups: {
    all: ['groups'] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    members: (id: string) => ['groups', 'members', id] as const,
    discover: (query: string) => ['groups', 'discover', query] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  collections: {
    all: ['collections'] as const,
    detail: (id: string) => ['collections', 'detail', id] as const,
  },
};

// Memory Hooks
export function useTimeline(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.memories.timeline(page),
    queryFn: () => memoryService.getTimeline(page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMemoryDetail(memoryId: string) {
  return useQuery({
    queryKey: queryKeys.memories.detail(memoryId),
    queryFn: () => memoryService.getMemory(memoryId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUserMemories(userId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.memories.user(userId, page),
    queryFn: () => memoryService.getUserMemories(userId, page, limit),
    enabled: !!userId,
  });
}

export function useGroupMemories(groupId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.memories.group(groupId, page),
    queryFn: () => memoryService.getGroupMemories(groupId, page, limit),
    enabled: !!groupId,
  });
}

export function useCoreMemories() {
  return useQuery({
    queryKey: queryKeys.memories.core,
    queryFn: () => memoryService.getCoreMemories(),
    staleTime: 10 * 60 * 1000, // 10 minutes - core memories change rarely
  });
}

// Friend Hooks
export function useFriends() {
  return useQuery({
    queryKey: queryKeys.friends.all,
    queryFn: () => friendService.getFriends(),
    staleTime: 10 * 60 * 1000, // 10 minutes - friend list doesn't change often
  });
}

export function usePendingFriendRequests() {
  return useQuery({
    queryKey: queryKeys.friends.pending,
    queryFn: () => friendService.getPendingRequests(),
    staleTime: 1 * 60 * 1000, // 1 minute - more frequent for requests
  });
}

export function useSentFriendRequests() {
  return useQuery({
    queryKey: queryKeys.friends.sent,
    queryFn: () => friendService.getSentRequests(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Group Hooks
export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupService.getGroups(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGroupDetail(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => groupService.getGroup(groupId),
    enabled: !!groupId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: () => groupService.getGroupMembers(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDiscoverGroups(query: string) {
  return useQuery({
    queryKey: queryKeys.groups.discover(query),
    queryFn: () => groupService.discoverGroups(query, 20),
    enabled: query.length > 0,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Category Hooks
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => memoryService.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
  });
}

// Collection Hooks
export function useCollections() {
  return useQuery({
    queryKey: queryKeys.collections.all,
    queryFn: () => collectionService.getCollections(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCollectionDetail(collectionId: string) {
  return useQuery({
    queryKey: queryKeys.collections.detail(collectionId),
    queryFn: () => collectionService.getCollection(collectionId),
    enabled: !!collectionId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Mutation Hooks for invalidating cache
export function useInvalidateMemories() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.memories.all });
  };
}

export function useInvalidateFriends() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.friends.all });
  };
}

export function useInvalidateGroups() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  };
}
