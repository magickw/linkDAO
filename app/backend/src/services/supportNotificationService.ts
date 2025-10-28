import { Server } from 'socket.io';

export interface SupportNotification {
  id: string;
  userId: string;
  type: 'ticket-update' | 'ticket-response' | 'chat-message' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

class SupportNotificationService {
  private io: Server | null = null;
  private userSockets: Map<string, string> = new Map();

  initialize(io: Server): void {
    this.io = io;

    io.on('connection', (socket) => {
      const userId = socket.handshake.auth.userId;
      if (userId) {
        this.userSockets.set(userId, socket.id);
      }

      socket.on('mark-notification-read', ({ notificationId }) => {
        // Handle marking notification as read
      });

      socket.on('mark-all-notifications-read', () => {
        // Handle marking all as read
      });

      socket.on('disconnect', () => {
        if (userId) {
          this.userSockets.delete(userId);
        }
      });
    });
  }

  sendNotification(userId: string, notification: Omit<SupportNotification, 'id' | 'userId' | 'read' | 'createdAt'>): void {
    if (!this.io) return;

    const fullNotification: SupportNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      ...notification,
      read: false,
      createdAt: new Date(),
    };

    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', fullNotification);
    }
  }

  sendTicketUpdate(userId: string, ticketId: string, status: string): void {
    this.sendNotification(userId, {
      type: 'ticket-update',
      title: 'Ticket Status Updated',
      message: `Your support ticket has been updated to: ${status}`,
      data: { ticketId, status },
    });
  }

  sendTicketResponse(userId: string, ticketId: string): void {
    this.sendNotification(userId, {
      type: 'ticket-response',
      title: 'New Response',
      message: 'Support team has responded to your ticket',
      data: { ticketId },
    });
  }
}

export const supportNotificationService = new SupportNotificationService();
