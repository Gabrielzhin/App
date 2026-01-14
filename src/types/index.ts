// Core types matching your Prisma schema

export type UserMode = 'RESTRICTED' | 'FULL';

export type MemoryPrivacy = 'PUBLIC' | 'FRIENDS' | 'ONLY_TAGGED' | 'PRIVATE';

export type GroupPrivacy = 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY';

export type ProfileVisibility = 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';

export type ReactionType = 
  | 'MADE_ME_THINK'
  | 'I_RELATE'
  | 'THANK_YOU'
  | 'THIS_INSPIRED_ME'
  | 'BEAUTIFUL_MOMENT'
  | 'SAVING_THIS';

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  bio?: string;
  profilePicture?: string;
  coverImage?: string;
  mode: UserMode;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileVisibility?: ProfileVisibility;
  referralCode: string;
  createdAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  aboutUserId?: string;
  groupId?: string;
  title?: string;
  content: string;
  photos: string[];
  audioUrl?: string;
  moods: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  memoryDate?: string;
  privacy: MemoryPrivacy;
  isDraft: boolean;
  lastAutoSaved?: string;
  isCore: boolean;
  coreReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  categories?: Category[];
  taggedFriends?: User[];
  _count?: {
    comments: number;
  };
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
  groupId?: string;
  isDefault: boolean;
}

export interface Comment {
  id: string;
  content: string;
  memoryId: string;
  userId: string;
  parentId?: string;
  user?: User;
  replies?: Comment[];
  createdAt: string;
}

export interface Reaction {
  id: string;
  type: ReactionType;
  memoryId: string;
  userId: string;
  user?: User;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  privacy: GroupPrivacy;
  coverImage?: string;
  avatarUrl?: string;
  color?: string;
  memberCount: number;
  createdAt: string;
  members?: GroupMember[];
  currentUserRole?: 'OWNER' | 'ADMIN' | 'MEMBER';
  isMember?: boolean;
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user?: User;
}

export interface RelationshipCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface RelationshipSubcategory {
  id: string;
  categoryId: string;
  name: string;
}

export interface RelationshipDetail {
  id: string;
  subcategoryId: string;
  name: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  groupId?: string;
  conversationId?: string;
  createdAt: string;
  sender?: User;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  updatedAt: string;
}

// Subscription types
export type SubscriptionStatus = 
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'PAUSED';

export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  plan: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  gracePeriodEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StripePrice {
  id: string;
  object: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  recurring?: {
    interval: 'month' | 'year';
    interval_count: number;
  };
  product: {
    id: string;
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  };
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
