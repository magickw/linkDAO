import type { Notification, NotificationPreferences } from '@/types/notifications';

class NotificationService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  // Mock data for development
  private mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'follow',
      userId: 'user1',
      title: 'New Follower',
      message: 'Alex Johnson followed you',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false,
      fromUserId: 'alex123',
      fromUserName: 'Alex Johnson'
    },
    {
      id: '2',
      type: 'community_new_post',
      userId: 'user1',
      title: 'New Community Post',
      message: 'New post in Web3 Developers community',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      read: false,
      communityId: 'web3-devs',
      communityName: 'Web3 Developers',
      postId: 'post123',
      authorId: 'dev456',
      authorName: 'Sarah Chen',
      actionUrl: '/community/web3-devs/post/post123'
    },
    {
      id: '3',
      type: 'community_mention',
      userId: 'user1',
      title: 'Community Mention',
      message: 'You were mentioned in DeFi Discussion',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
      communityId: 'defi-discussion',
      communityName: 'DeFi Discussion',
      postId: 'post456',
      authorId: 'trader789',
      authorName: 'Mike Trader',
      actionUrl: '/community/defi-discussion/post/post456'
    },
    {
      id: '4',
      type: 'tip_received',
      userId: 'user1',
      title: 'Tip Received',
      message: 'You received 10 USDC tip',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: true,
      fromUserId: 'tipper123',
      fromUserName: 'Anonymous Tipper',
      amount: '10 USDC',
      actionUrl: '/wallet/transactions'
    },
    {
      id: '5',
      type: 'community_moderation',
      userId: 'user1',
      title: 'Post Moderated',
      message: 'Your post was approved in Crypto News',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      read: true,
      communityId: 'crypto-news',
      communityName: 'Crypto News',
      postId: 'post789',
      authorId: 'moderator123',
      authorName: 'Community Moderator',
      actionUrl: '/community/crypto-news/post/post789'
    }
  ];

  constructor() {
    this.notifications = [...this.mockNotifications];
  }

  // Subscribe to notification updates
  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.listeners.push(callback);
    // Immediately call with current notifications
    callback(this.notifications);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(callback => callback([...this.notifications]));
  }

  // Get notifications
  async getNotifications(): Promise<Notification[]> {
    return [...this.notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Mark community notifications as read
  async markCommunityAsRead(communityId: string): Promise<void> {
    this.notifications
      .filter(n => 'communityId' in n && n.communityId === communityId)
      .forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Get unread count for specific community
  getCommunityUnreadCount(communityId: string): number {
    return this.notifications.filter(n => 
      !n.read && 'communityId' in n && n.communityId === communityId
    ).length;
  }

  // Add new notification (for real-time updates)
  addNotification(notification: any): void {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    } as Notification;
    
    this.notifications.unshift(newNotification);
    this.notifyListeners();
  }

  // Create community-specific notifications
  createCommunityPostNotification(
    userId: string,
    communityId: string,
    communityName: string,
    postId: string,
    authorId: string,
    authorName: string
  ): void {
    this.addNotification({
      type: 'community_post',
      userId,
      message: `New post in ${communityName}`,
      read: false,
      communityId,
      communityName,
      postId,
      fromUserId: authorId,
      fromUserName: authorName,
      actionUrl: `/community/${communityId}/post/${postId}`
    });
  }

  createCommunityMentionNotification(
    userId: string,
    communityId: string,
    communityName: string,
    postId: string,
    mentionedBy: string,
    mentionedByName: string
  ): void {
    this.addNotification({
      type: 'community_mention',
      userId,
      message: `You were mentioned in ${communityName}`,
      read: false,
      communityId,
      communityName,
      postId,
      fromUserId: mentionedBy,
      fromUserName: mentionedByName,
      actionUrl: `/community/${communityId}/post/${postId}`
    });
  }

  createCommunityModerationNotification(
    userId: string,
    communityId: string,
    communityName: string,
    postId: string,
    action: 'approved' | 'rejected' | 'removed' | 'pinned' | 'locked'
  ): void {
    const actionMessages = {
      approved: 'Your post was approved',
      rejected: 'Your post was rejected',
      removed: 'Your post was removed',
      pinned: 'Your post was pinned',
      locked: 'Your post was locked'
    };

    this.addNotification({
      type: 'community_moderation',
      userId,
      message: `${actionMessages[action]} in ${communityName}`,
      read: false,
      communityId,
      communityName,
      postId,
      moderationAction: action,
      actionUrl: `/community/${communityId}/post/${postId}`
    });
  }

  // Get notification preferences
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    // Mock preferences - in real app, fetch from API
    return {
      userId,
      email: true,
      push: true,
      inApp: true,
      follows: true,
      likes: true,
      comments: true,
      mentions: true,
      tips: true,
      communityPosts: true,
      communityReplies: true,
      communityMentions: true,
      communityModeration: true,
      communityMembers: true,
      governanceProposals: true,
      governanceVotes: true,
      governanceResults: true,
      communityPreferences: {
        'web3-devs': {
          communityId: 'web3-devs',
          enabled: true,
          newPosts: true,
          replies: true,
          mentions: true,
          moderation: true,
          memberActivity: true
        },
        'defi-discussion': {
          communityId: 'defi-discussion',
          enabled: true,
          newPosts: false,
          replies: true,
          mentions: true,
          moderation: true,
          memberActivity: true
        }
      }
    };
  }

  // Update notification preferences
  async updatePreferences(preferences: NotificationPreferences): Promise<void> {
    // In real app, send to API
    console.log('Updated notification preferences:', preferences);
  }

  // Simulate real-time notifications via WebSocket
  simulateRealTimeNotification(): void {
    const types = ['community_post', 'community_mention', 'tip_received', 'follow'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    switch (randomType) {
      case 'community_post':
        this.createCommunityPostNotification(
          'user1',
          'web3-devs',
          'Web3 Developers',
          `post${Date.now()}`,
          'newuser123',
          'New Developer'
        );
        break;
      case 'community_mention':
        this.createCommunityMentionNotification(
          'user1',
          'defi-discussion',
          'DeFi Discussion',
          `post${Date.now()}`,
          'trader456',
          'Pro Trader'
        );
        break;
      case 'tip_received':
        this.addNotification({
          type: 'tip_received',
          userId: 'user1',
          message: 'You received 5 USDC tip',
          read: false,
          transactionHash: `0x${Date.now()}`,
          tokenAmount: '5',
          tokenSymbol: 'USDC',
          actionUrl: '/wallet/transactions'
        });
        break;
      case 'follow':
        this.addNotification({
          type: 'follow',
          userId: 'user1',
          message: 'Someone new followed you',
          read: false,
          fromUserId: `user${Date.now()}`,
          fromUserName: 'New Follower'
        });
        break;
    }
  }
}

export const notificationService = new NotificationService();