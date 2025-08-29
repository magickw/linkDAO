import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types/notifications';

describe('NotificationService', () => {
  beforeEach(() => {
    // Reset the service state before each test
    notificationService['notifications'] = [];
    notificationService['listeners'] = [];
  });

  describe('subscription', () => {
    it('should call callback immediately with current notifications', () => {
      const callback = jest.fn();
      
      notificationService.subscribe(callback);
      
      expect(callback).toHaveBeenCalledWith([]);
    });

    it('should notify listeners when notifications change', () => {
      const callback = jest.fn();
      notificationService.subscribe(callback);
      
      // Clear the initial call
      callback.mockClear();
      
      notificationService.addNotification({
        type: 'follow',
        userId: 'user1',
        message: 'Test notification',
        read: false,
        fromUserId: 'user2',
        fromUserName: 'Test User',
      });
      
      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'follow',
            message: 'Test notification',
          })
        ])
      );
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = notificationService.subscribe(callback);
      
      // Add notification to trigger callback
      notificationService.addNotification({
        type: 'follow',
        userId: 'user1',
        message: 'Test notification',
        read: false,
        fromUserId: 'user2',
        fromUserName: 'Test User',
      });
      
      expect(callback).toHaveBeenCalledTimes(2); // Initial + update
      
      // Unsubscribe and add another notification
      unsubscribe();
      callback.mockClear();
      
      notificationService.addNotification({
        type: 'like',
        userId: 'user1',
        message: 'Another notification',
        read: false,
        fromUserId: 'user3',
        fromUserName: 'Another User',
      });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    beforeEach(() => {
      // Add some test notifications
      notificationService.addNotification({
        type: 'follow',
        userId: 'user1',
        message: 'Follow notification',
        read: false,
        fromUserId: 'user2',
        fromUserName: 'Test User',
      });
      
      notificationService.addNotification({
        type: 'community_post',
        userId: 'user1',
        message: 'Community post notification',
        read: true,
        communityId: 'test-community',
        communityName: 'Test Community',
        postId: 'post123',
        fromUserId: 'user3',
        fromUserName: 'Community User',
      });
    });

    it('should return all notifications by default', async () => {
      const notifications = await notificationService.getNotifications();
      expect(notifications).toHaveLength(2);
    });

    it('should filter by read status', async () => {
      const unreadNotifications = await notificationService.getNotifications({ read: false });
      expect(unreadNotifications).toHaveLength(1);
      expect(unreadNotifications[0].read).toBe(false);
      
      const readNotifications = await notificationService.getNotifications({ read: true });
      expect(readNotifications).toHaveLength(1);
      expect(readNotifications[0].read).toBe(true);
    });

    it('should filter by type', async () => {
      const followNotifications = await notificationService.getNotifications({ 
        type: ['follow'] 
      });
      expect(followNotifications).toHaveLength(1);
      expect(followNotifications[0].type).toBe('follow');
    });

    it('should filter by community', async () => {
      const communityNotifications = await notificationService.getNotifications({ 
        communityId: 'test-community' 
      });
      expect(communityNotifications).toHaveLength(1);
      expect(communityNotifications[0].type).toBe('community_post');
    });

    it('should apply limit and offset', async () => {
      const limitedNotifications = await notificationService.getNotifications({ 
        limit: 1 
      });
      expect(limitedNotifications).toHaveLength(1);
      
      const offsetNotifications = await notificationService.getNotifications({ 
        offset: 1 
      });
      expect(offsetNotifications).toHaveLength(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      notificationService.addNotification({
        type: 'follow',
        userId: 'user1',
        message: 'Test notification',
        read: false,
        fromUserId: 'user2',
        fromUserName: 'Test User',
      });
      
      const notifications = await notificationService.getNotifications();
      const notificationId = notifications[0].id;
      
      await notificationService.markAsRead(notificationId);
      
      const updatedNotifications = await notificationService.getNotifications();
      expect(updatedNotifications[0].read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      notificationService.addNotification({
        type: 'follow',
        userId: 'user1',
        message: 'Test notification 1',
        read: false,
        fromUserId: 'user2',
        fromUserName: 'Test User',
      });
      
      notificationService.addNotification({
        type: 'like',
        userId: 'user1',
        message: 'Test notification 2',
        read: false,
        fromUserId: 'user3',
        fromUserName: 'Another User',
      });
      
      await notificationService.markAllAsRead();
      
      const notifications = await notificationService.getNotifications();
      expect(notifications.every(n => n.read)).toBe(true);
    });
  });

  describe('community notifications', () => {
    it('should create community post notification', () => {
      const callback = jest.fn();
      notificationService.subscribe(callback);
      callback.mockClear();
      
      notificationService.createCommunityPostNotification(
        'user1',
        'test-community',
        'Test Community',
        'post123',
        'author1',
        'Author Name'
      );
      
      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'community_post',
            message: 'New post in Test Community',
            communityId: 'test-community',
            postId: 'post123',
            actionUrl: '/community/test-community/post/post123',
          })
        ])
      );
    });

    it('should create community mention notification', () => {
      const callback = jest.fn();
      notificationService.subscribe(callback);
      callback.mockClear();
      
      notificationService.createCommunityMentionNotification(
        'user1',
        'test-community',
        'Test Community',
        'post123',
        'mentioner1',
        'Mentioner Name'
      );
      
      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'community_mention',
            message: 'You were mentioned in Test Community',
            communityId: 'test-community',
            postId: 'post123',
            actionUrl: '/community/test-community/post/post123',
          })
        ])
      );
    });

    it('should create community moderation notification', () => {
      const callback = jest.fn();
      notificationService.subscribe(callback);
      callback.mockClear();
      
      notificationService.createCommunityModerationNotification(
        'user1',
        'test-community',
        'Test Community',
        'post123',
        'approved'
      );
      
      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'community_moderation',
            message: 'Your post was approved in Test Community',
            communityId: 'test-community',
            postId: 'post123',
            moderationAction: 'approved',
          })
        ])
      );
    });
  });

  describe('unread counts', () => {
    beforeEach(() => {
      notificationService.addNotification({
        type: 'follow',
        userId: 'user1',
        message: 'Follow notification',
        read: false,
        fromUserId: 'user2',
        fromUserName: 'Test User',
      });
      
      notificationService.addNotification({
        type: 'community_post',
        userId: 'user1',
        message: 'Community post notification',
        read: false,
        communityId: 'test-community',
        communityName: 'Test Community',
        postId: 'post123',
        fromUserId: 'user3',
        fromUserName: 'Community User',
      });
      
      notificationService.addNotification({
        type: 'community_mention',
        userId: 'user1',
        message: 'Community mention notification',
        read: true,
        communityId: 'test-community',
        communityName: 'Test Community',
        postId: 'post456',
        fromUserId: 'user4',
        fromUserName: 'Mentioner',
      });
    });

    it('should return correct unread count', () => {
      expect(notificationService.getUnreadCount()).toBe(2);
    });

    it('should return correct community unread count', () => {
      expect(notificationService.getCommunityUnreadCount('test-community')).toBe(1);
      expect(notificationService.getCommunityUnreadCount('other-community')).toBe(0);
    });
  });
});