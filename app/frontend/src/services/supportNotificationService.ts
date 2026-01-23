import { io, Socket } from 'socket.io-client';

export interface SupportNotification {
  id: string;
  type: 'ticket-update' | 'ticket-response' | 'chat-message' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

import { ENV_CONFIG } from '../config/environment';

class SupportNotificationService {
  private socket: Socket | null = null;
  private notifications: SupportNotification[] = [];
  private listeners: Set<(notifications: SupportNotification[]) => void> = new Set();

  connect(token: string): void {
    const url = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
    
    this.socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('notification', (notification: SupportNotification) => {
      this.notifications.unshift(notification);
      this.notifyListeners();
      this.showBrowserNotification(notification);
    });
  }

  subscribe(callback: (notifications: SupportNotification[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.notifications);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
      this.socket?.emit('mark-notification-read', { notificationId });
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
    this.socket?.emit('mark-all-notifications-read');
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  private async showBrowserNotification(notification: SupportNotification): Promise<void> {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png',
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
        });
      }
    }
  }
}

export const supportNotificationService = new SupportNotificationService();
