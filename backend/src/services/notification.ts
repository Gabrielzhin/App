import { prisma } from '../index.js';
import type { NotificationType } from '@prisma/client';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actorId?: string;
  memoryId?: string;
  commentId?: string;
  groupId?: string;
  friendshipId?: string;
  collectionId?: string;
}

export const notificationService = {
  // Create a notification
  async create(params: CreateNotificationParams) {
    return prisma.notification.create({
      data: params,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });
  },

  // Get user's notifications
  async getUserNotifications(userId: string, limit = 50, unreadOnly = false) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true,
          },
        },
        memory: {
          select: {
            id: true,
            title: true,
            content: true,
            photos: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            coverImage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  },

  // Get unread count
  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  },

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Security: only mark your own notifications
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  },

  // Mark all as read
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  },

  // Delete notification
  async delete(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Security: only delete your own notifications
      },
    });
  },

  // Helper functions to create specific notification types
  async notifyFriendRequest(userId: string, senderId: string, friendshipId: string) {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true, name: true },
    });

    const displayName = sender?.name || sender?.username || 'Someone';

    return this.create({
      userId,
      type: 'FRIEND_REQUEST',
      title: 'New Friend Request',
      message: `${displayName} sent you a friend request`,
      actorId: senderId,
      friendshipId,
    });
  },

  async notifyFriendAccept(userId: string, acceptorId: string) {
    const acceptor = await prisma.user.findUnique({
      where: { id: acceptorId },
      select: { username: true, name: true },
    });

    const displayName = acceptor?.name || acceptor?.username || 'Someone';

    return this.create({
      userId,
      type: 'FRIEND_ACCEPT',
      title: 'Friend Request Accepted',
      message: `${displayName} accepted your friend request`,
      actorId: acceptorId,
    });
  },

  async notifyComment(memoryId: string, commenterId: string, commentId: string) {
    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
      select: { userId: true, title: true, content: true },
    });

    if (!memory || memory.userId === commenterId) return; // Don't notify yourself

    const commenter = await prisma.user.findUnique({
      where: { id: commenterId },
      select: { username: true, name: true },
    });

    const displayName = commenter?.name || commenter?.username || 'Someone';
    const memoryTitle = memory.title || memory.content.substring(0, 30) + '...';

    return this.create({
      userId: memory.userId,
      type: 'COMMENT',
      title: 'New Comment',
      message: `${displayName} commented on "${memoryTitle}"`,
      actorId: commenterId,
      memoryId,
      commentId,
    });
  },

  async notifyReaction(memoryId: string, reactorId: string, emoji: string) {
    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
      select: { userId: true, title: true, content: true },
    });

    if (!memory || memory.userId === reactorId) return; // Don't notify yourself

    const reactor = await prisma.user.findUnique({
      where: { id: reactorId },
      select: { username: true, name: true },
    });

    const displayName = reactor?.name || reactor?.username || 'Someone';
    const memoryTitle = memory.title || memory.content.substring(0, 30) + '...';

    return this.create({
      userId: memory.userId,
      type: 'REACTION',
      title: 'New Reaction',
      message: `${displayName} reacted ${emoji} to "${memoryTitle}"`,
      actorId: reactorId,
      memoryId,
    });
  },

  async notifyTag(memoryId: string, taggerId: string, taggedUserIds: string[]) {
    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
      select: { title: true, content: true },
    });

    const tagger = await prisma.user.findUnique({
      where: { id: taggerId },
      select: { username: true, name: true },
    });

    const displayName = tagger?.name || tagger?.username || 'Someone';
    const memoryTitle = memory?.title || memory?.content.substring(0, 30) + '...';

    // Create notification for each tagged user (except the tagger)
    const notifications = taggedUserIds
      .filter((userId) => userId !== taggerId)
      .map((userId) =>
        this.create({
          userId,
          type: 'TAG',
          title: 'You Were Tagged',
          message: `${displayName} tagged you in "${memoryTitle}"`,
          actorId: taggerId,
          memoryId,
        })
      );

    return Promise.all(notifications);
  },

  async notifyGroupInvite(userId: string, inviterId: string, groupId: string) {
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { username: true, name: true },
    });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    const displayName = inviter?.name || inviter?.username || 'Someone';

    return this.create({
      userId,
      type: 'GROUP_INVITE',
      title: 'Group Invitation',
      message: `${displayName} invited you to join "${group?.name}"`,
      actorId: inviterId,
      groupId,
    });
  },

  async notifyGroupAccept(inviterId: string, acceptorId: string, groupId: string) {
    const acceptor = await prisma.user.findUnique({
      where: { id: acceptorId },
      select: { username: true, name: true },
    });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    const displayName = acceptor?.name || acceptor?.username || 'Someone';

    return this.create({
      userId: inviterId,
      type: 'GROUP_ACCEPT',
      title: 'Invitation Accepted',
      message: `${displayName} joined "${group?.name}"`,
      actorId: acceptorId,
      groupId,
    });
  },

  async notifyGroupPost(groupId: string, posterId: string, memoryId: string) {
    // Get all group members except the poster
    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { not: posterId },
      },
      select: { userId: true },
    });

    const poster = await prisma.user.findUnique({
      where: { id: posterId },
      select: { username: true, name: true },
    });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    const displayName = poster?.name || poster?.username || 'Someone';

    // Create notification for each member
    const notifications = members.map((member) =>
      this.create({
        userId: member.userId,
        type: 'GROUP_POST',
        title: 'New Group Post',
        message: `${displayName} posted in "${group?.name}"`,
        actorId: posterId,
        groupId,
        memoryId,
      })
    );

    return Promise.all(notifications);
  },

  // Notify user they've been invited to collaborate on a collection
  async notifyCollectionInvite(userId: string, inviterId: string, collectionId: string) {
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { name: true, username: true },
    });

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { name: true },
    });

    const displayName = inviter?.name || inviter?.username || 'Someone';

    return this.create({
      userId,
      type: 'COLLECTION_INVITE',
      title: 'Collection Invitation',
      message: `${displayName} invited you to collaborate on "${collection?.name}"`,
      actorId: inviterId,
      collectionId,
    });
  },

  // Notify collaborators when a memory is added to a shared collection
  async notifyCollectionMemoryAdded(userId: string, adderId: string, collectionId: string, memoryId: string) {
    const adder = await prisma.user.findUnique({
      where: { id: adderId },
      select: { name: true, username: true },
    });

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { name: true },
    });

    const displayName = adder?.name || adder?.username || 'Someone';

    return this.create({
      userId,
      type: 'COLLECTION_MEMORY_ADDED',
      title: 'Collection Updated',
      message: `${displayName} added a memory to "${collection?.name}"`,
      actorId: adderId,
      collectionId,
      memoryId,
    });
  },
};
