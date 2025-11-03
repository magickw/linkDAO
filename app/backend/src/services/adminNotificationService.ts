import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { PushNotificationService } from './pushNotificationService';
import { getAdminWebSocketService } from './adminWebSocketService';

const databaseService = new DatabaseService();
const pushNotificationService = PushNotificationService.getInstance();

export interface AdminNotificationTemplate {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'moderation' | 'system' | 'security' | 'user' | 'seller' | 'dispute';
}

export interface AdminNotificationData {
  adminId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'moderation' | 'system' | 'security' | 'user' | 'seller' | 'dispute';
  metadata?: any;
}

export class AdminNotificationService {
  private templates: Map<string, AdminNotificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: AdminNotificationTemplate[] = [
      // Moderation notifications
      {
        type: 'MODERATION_REQUIRED',
        title: 'Content Moderation Required',
        message: 'New content requires moderation review',
        actionUrl: '/admin/moderation',
        priority: 'high',
        category: 'moderation'
      },
      {
        type: 'MODERATION_URGENT',
        title: 'Urgent Moderation Required',
        message: 'Content requires immediate attention',
        actionUrl: '/admin/moderation',
        priority: 'critical',
        category: 'moderation'
      },
      
      // System notifications
      {
        type: 'SYSTEM_ALERT',
        title: 'System Alert',
        message: 'System requires attention',
        actionUrl: '/admin/system',
        priority: 'high',
        category: 'system'
      },
      {
        type: 'SYSTEM_CRITICAL',
        title: 'Critical System Alert',
        message: 'System requires immediate attention',
        actionUrl: '/admin/system',
        priority: 'critical',
        category: 'system'
      },
      
      // Security notifications
      {
        type: 'SECURITY_ALERT',
        title: 'Security Alert',
        message: 'Security incident detected',
        actionUrl: '/admin/security',
        priority: 'high',
        category: 'security'
      },
      {
        type: 'SECURITY_CRITICAL',
        title: 'Critical Security Alert',
        message: 'Critical security incident requires immediate attention',
        actionUrl: '/admin/security',
        priority: 'critical',
        category: 'security'
      },
      
      // User management notifications
      {
        type: 'USER_FLAGGED',
        title: 'User Flagged',
        message: 'User behavior requires review',
        actionUrl: '/admin/users',
        priority: 'medium',
        category: 'user'
      },
      
      // Seller notifications
      {
        type: 'SELLER_APPLICATION',
        title: 'New Seller Application',
        message: 'New seller application requires review',
        actionUrl: '/admin/sellers',
        priority: 'medium',
        category: 'seller'
      },
      
      // Dispute notifications
      {
        type: 'DISPUTE_ESCALATED',
        title: 'Dispute Escalated',
        message: 'Dispute requires escalation',
        actionUrl: '/admin/disputes',
        priority: 'high',
        category: 'dispute'
      },
      {
        type: 'DISPUTE_URGENT',
        title: 'Urgent Dispute',
        message: 'Dispute requires immediate attention',
        actionUrl: '/admin/disputes',
        priority: 'critical',
        category: 'dispute'
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.type, template);
    });
  }

  /**
   * Send notification to a specific admin
   */
  async sendNotification(data: AdminNotificationData): Promise<void> {
    try {
      // Store notification in database
      await this.storeNotification(data);

      // Send real-time notification via WebSocket
      await this.sendRealTimeNotification(data);

      // Send push notification if enabled
      await this.sendPushNotification(data);

    } catch (error) {
      safeLogger.error('Error sending admin notification:', error);
    }
  }

  /**
   * Send notification to all admins with specific permissions
   */
  async sendNotificationToRole(
    role: string,
    type: string,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Get all admins with the specified role
      const admins = await databaseService.getAdminsWithRole(role);
      
      // Send notification to each admin
      const promises = admins.map(admin => 
        this.sendNotification({
          adminId: admin.id,
          type,
          title,
          message,
          actionUrl: this.getActionUrlForType(type),
          priority: this.getPriorityForType(type),
          category: this.getCategoryForType(type),
          metadata
        })
      );

      await Promise.allSettled(promises);
    } catch (error) {
      safeLogger.error('Error sending notification to role:', error);
    }
  }

  /**
   * Send notification to all admins with specific permission
   */
  async sendNotificationToPermission(
    permission: string,
    type: string,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Get all admins with the specified permission
      const admins = await databaseService.getAdminsWithPermission(permission);
      
      // Send notification to each admin
      const promises = admins.map(admin => 
        this.sendNotification({
          adminId: admin.id,
          type,
          title,
          message,
          actionUrl: this.getActionUrlForType(type),
          priority: this.getPriorityForType(type),
          category: this.getCategoryForType(type),
          metadata
        })
      );

      await Promise.allSettled(promises);
    } catch (error) {
      safeLogger.error('Error sending notification to permission:', error);
    }
  }

  /**
   * Get notifications for an admin
   */
  async getAdminNotifications(
    adminId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await databaseService.getAdminNotifications(adminId, limit, offset);
    } catch (error) {
      safeLogger.error('Error getting admin notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      return await databaseService.markAdminNotificationAsRead(notificationId);
    } catch (error) {
      safeLogger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for an admin
   */
  async markAllAsRead(adminId: string): Promise<boolean> {
    try {
      return await databaseService.markAllAdminNotificationsAsRead(adminId);
    } catch (error) {
      safeLogger.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(adminId: string): Promise<number> {
    try {
      return await databaseService.getAdminUnreadNotificationCount(adminId);
    } catch (error) {
      safeLogger.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Private helper methods

  private async storeNotification(data: AdminNotificationData): Promise<void> {
    try {
      const notification = {
        adminId: data.adminId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        priority: data.priority,
        category: data.category,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        read: false
      };

      await databaseService.createAdminNotification(notification);
    } catch (error) {
      safeLogger.error('Error storing admin notification:', error);
    }
  }

  private async sendRealTimeNotification(data: AdminNotificationData): Promise<void> {
    try {
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.sendToAdmin(data.adminId, 'admin_notification', {
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          priority: data.priority,
          category: data.category,
          metadata: data.metadata,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      safeLogger.error('Error sending real-time admin notification:', error);
    }
  }

  private async sendPushNotification(data: AdminNotificationData): Promise<void> {
    try {
      // Check if push notifications are enabled for this admin
      const preferences = await databaseService.getAdminNotificationPreferences(data.adminId);
      if (!preferences.push || !preferences.types.includes(data.type)) {
        return;
      }

      // Get admin push tokens
      const pushTokens = await databaseService.getAdminPushTokens(data.adminId);
      if (!pushTokens || pushTokens.length === 0) {
        return;
      }

      // Send push notification
      await pushNotificationService.sendToTokens(pushTokens, {
        title: data.title,
        body: data.message,
        actionUrl: data.actionUrl,
        data: {
          type: data.type,
          priority: data.priority,
          category: data.category,
          ...data.metadata
        }
      });
    } catch (error) {
      safeLogger.error('Error sending push notification:', error);
    }
  }

  private getActionUrlForType(type: string): string {
    const template = this.templates.get(type);
    return template?.actionUrl || '/admin';
  }

  private getPriorityForType(type: string): 'low' | 'medium' | 'high' | 'critical' {
    const template = this.templates.get(type);
    return template?.priority || 'medium';
  }

  private getCategoryForType(type: string): 'moderation' | 'system' | 'security' | 'user' | 'seller' | 'dispute' {
    const template = this.templates.get(type);
    return template?.category || 'system';
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      await databaseService.deleteOldAdminNotifications(cutoffDate);
      safeLogger.info(`Cleaned up admin notifications older than ${daysOld} days`);
    } catch (error) {
      safeLogger.error('Error cleaning up old admin notifications:', error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(adminId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    try {
      return await databaseService.getAdminNotificationStats(adminId);
    } catch (error) {
      safeLogger.error('Error getting admin notification stats:', error);
      return { total: 0, unread: 0, byType: {}, byCategory: {} };
    }
  }
}

export const adminNotificationService = new AdminNotificationService();
