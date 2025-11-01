import { WebSocket, WebSocketServer } from 'ws';
import { safeLogger } from '../utils/safeLogger';
import { IncomingMessage } from 'http';
import { safeLogger } from '../utils/safeLogger';
import { URL } from 'url';
import { safeLogger } from '../utils/safeLogger';
import jwt from 'jsonwebtoken';
import { safeLogger } from '../utils/safeLogger';

interface NotificationClient {
  id: string;
  userId: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: Date;
}

interface NotificationMessage {
  type: 'notification' | 'live_update' | 'batch_notifications' | 'ping' | 'pong';
  payload?: any;
}

interface LiveUpdate {
  type: 'new_posts' | 'new_comments' | 'new_reactions' | 'live_discussion';
  count: number;
  lastUpdate: Date;
  priority: string;
  contextId: string;
}

class RealTimeNotificationService {
  private wss: WebSocketServer;
  private clients: Map<string, NotificationClient> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private postSubscriptions: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({ 
      port,
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start heartbeat to clean up dead connections
    this.heartbeatInterval = setInterval(this.heartbeat.bind(this), 30000);
    
    safeLogger.info(`Real-time notification service started on port ${port}`);
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    try {
      const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      const userId = url.searchParams.get('userId');

      if (!token || !userId) {
        safeLogger.info('Missing token or userId in WebSocket connection');
        return false;
      }

      // Verify JWT token (in production, use proper secret)
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      jwt.verify(token, secret);

      return true;
    } catch (error) {
      safeLogger.error('WebSocket verification failed:', error);
      return false;
    }
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId')!;
      const clientId = this.generateClientId();

      const client: NotificationClient = {
        id: clientId,
        userId,
        ws,
        subscriptions: new Set(),
        lastPing: new Date()
      };

      this.clients.set(clientId, client);

      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(clientId);

      safeLogger.info(`Client connected: ${clientId} for user ${userId}`);

      // Set up message handlers
      ws.on('message', (data) => this.handleMessage(clientId, data));
      ws.on('close', () => this.handleDisconnection(clientId));
      ws.on('error', (error) => this.handleError(clientId, error));

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: 'pong',
        payload: { status: 'connected', clientId }
      });

    } catch (error) {
      safeLogger.error('Error handling WebSocket connection:', error);
      ws.close();
    }
  }

  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const message = JSON.parse(data.toString()) as NotificationMessage;

      switch (message.type) {
        case 'ping':
          client.lastPing = new Date();
          this.sendToClient(clientId, { type: 'pong' });
          break;

        case 'subscribe_post':
          this.subscribeToPost(clientId, message.payload.postId);
          break;

        case 'unsubscribe_post':
          this.unsubscribeFromPost(clientId, message.payload.postId);
          break;

        case 'mark_read':
          this.handleMarkRead(clientId, message.payload.notificationId);
          break;

        case 'mark_all_read':
          this.handleMarkAllRead(clientId, message.payload.category);
          break;

        case 'dismiss':
          this.handleDismiss(clientId, message.payload.notificationId);
          break;

        default:
          safeLogger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      safeLogger.error('Error handling WebSocket message:', error);
    }
  }

  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    safeLogger.info(`Client disconnected: ${clientId}`);

    // Remove from user connections
    const userClients = this.userConnections.get(client.userId);
    if (userClients) {
      userClients.delete(clientId);
      if (userClients.size === 0) {
        this.userConnections.delete(client.userId);
      }
    }

    // Remove from post subscriptions
    client.subscriptions.forEach(postId => {
      const subscribers = this.postSubscriptions.get(postId);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.postSubscriptions.delete(postId);
        }
      }
    });

    this.clients.delete(clientId);
  }

  private handleError(clientId: string, error: Error): void {
    safeLogger.error(`WebSocket error for client ${clientId}:`, error);
    this.handleDisconnection(clientId);
  }

  private subscribeToPost(clientId: string, postId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(postId);

    if (!this.postSubscriptions.has(postId)) {
      this.postSubscriptions.set(postId, new Set());
    }
    this.postSubscriptions.get(postId)!.add(clientId);

    safeLogger.info(`Client ${clientId} subscribed to post ${postId}`);
  }

  private unsubscribeFromPost(clientId: string, postId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(postId);

    const subscribers = this.postSubscriptions.get(postId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.postSubscriptions.delete(postId);
      }
    }

    safeLogger.info(`Client ${clientId} unsubscribed from post ${postId}`);
  }

  private handleMarkRead(clientId: string, notificationId: string): void {
    // In a real implementation, update database
    safeLogger.info(`Marking notification ${notificationId} as read for client ${clientId}`);
  }

  private handleMarkAllRead(clientId: string, category?: string): void {
    // In a real implementation, update database
    safeLogger.info(`Marking all notifications as read for client ${clientId}, category: ${category}`);
  }

  private handleDismiss(clientId: string, notificationId: string): void {
    // In a real implementation, update database
    safeLogger.info(`Dismissing notification ${notificationId} for client ${clientId}`);
  }

  private sendToClient(clientId: string, message: NotificationMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      safeLogger.error(`Error sending message to client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    }
  }

  private sendToUser(userId: string, message: NotificationMessage): void {
    const userClients = this.userConnections.get(userId);
    if (!userClients) return;

    userClients.forEach(clientId => {
      this.sendToClient(clientId, message);
    });
  }

  private sendToPostSubscribers(postId: string, message: NotificationMessage): void {
    const subscribers = this.postSubscriptions.get(postId);
    if (!subscribers) return;

    subscribers.forEach(clientId => {
      this.sendToClient(clientId, message);
    });
  }

  private heartbeat(): void {
    const now = new Date();
    const timeout = 60000; // 1 minute timeout

    this.clients.forEach((client, clientId) => {
      if (now.getTime() - client.lastPing.getTime() > timeout) {
        safeLogger.info(`Client ${clientId} timed out`);
        client.ws.terminate();
        this.handleDisconnection(clientId);
      }
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods for sending notifications

  public sendNotificationToUser(userId: string, notification: any): void {
    this.sendToUser(userId, {
      type: 'notification',
      payload: notification
    });
  }

  public sendBatchNotificationsToUser(userId: string, notifications: any[]): void {
    this.sendToUser(userId, {
      type: 'batch_notifications',
      payload: notifications
    });
  }

  public sendLiveUpdate(contextId: string, update: LiveUpdate): void {
    // Send to all subscribers of the context (post, discussion, etc.)
    this.sendToPostSubscribers(contextId, {
      type: 'live_update',
      payload: update
    });
  }

  public broadcastToAllUsers(message: NotificationMessage): void {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  // Notification creation methods

  public createMentionNotification(userId: string, data: {
    postId: string;
    commentId?: string;
    mentionedBy: string;
    mentionedByUsername: string;
    mentionedByAvatar?: string;
    context: string;
  }): void {
    const notification = {
      id: `mention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      category: 'mention',
      priority: 'high',
      urgency: 'immediate',
      title: 'You were mentioned',
      message: `${data.mentionedByUsername} mentioned you`,
      timestamp: new Date(),
      read: false,
      dismissed: false,
      actionUrl: `/post/${data.postId}${data.commentId ? `#comment-${data.commentId}` : ''}`,
      metadata: data
    };

    this.sendNotificationToUser(userId, notification);
  }

  public createTipNotification(userId: string, data: {
    postId: string;
    tipAmount: number;
    tokenSymbol: string;
    tipperAddress: string;
    tipperUsername: string;
    tipperAvatar?: string;
    message?: string;
  }): void {
    const notification = {
      id: `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      category: 'tip',
      priority: 'high',
      urgency: 'immediate',
      title: 'You received a tip!',
      message: `${data.tipperUsername} tipped you ${data.tipAmount} ${data.tokenSymbol}`,
      timestamp: new Date(),
      read: false,
      dismissed: false,
      actionUrl: `/post/${data.postId}`,
      metadata: data
    };

    this.sendNotificationToUser(userId, notification);
  }

  public createGovernanceNotification(userId: string, data: {
    proposalId: string;
    proposalTitle: string;
    action: 'created' | 'voting_started' | 'voting_ending' | 'executed' | 'rejected';
    votingDeadline?: Date;
    timeRemaining?: number;
    quorumStatus?: 'met' | 'not_met' | 'approaching';
    userVoteStatus?: 'voted' | 'not_voted';
  }): void {
    const notification = {
      id: `governance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      category: 'governance',
      priority: 'urgent',
      urgency: 'immediate',
      title: 'Governance Alert',
      message: this.getGovernanceMessage(data.action, data.proposalTitle),
      timestamp: new Date(),
      read: false,
      dismissed: false,
      actionUrl: `/governance/proposal/${data.proposalId}`,
      metadata: data
    };

    this.sendNotificationToUser(userId, notification);
  }

  public createCommunityNotification(userId: string, data: {
    communityId: string;
    communityName: string;
    communityIcon?: string;
    eventType: 'new_member' | 'new_post' | 'announcement' | 'event' | 'milestone';
    eventData: Record<string, any>;
  }): void {
    const notification = {
      id: `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      category: 'community',
      priority: 'normal',
      urgency: 'timely',
      title: 'Community Update',
      message: this.getCommunityMessage(data.eventType, data.communityName),
      timestamp: new Date(),
      read: false,
      dismissed: false,
      actionUrl: `/community/${data.communityId}`,
      metadata: data
    };

    this.sendNotificationToUser(userId, notification);
  }

  public createReactionNotification(userId: string, data: {
    postId: string;
    reactionType: string;
    reactionEmoji: string;
    reactorAddress: string;
    reactorUsername: string;
    reactorAvatar?: string;
    tokenAmount?: number;
  }): void {
    const notification = {
      id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      category: 'reaction',
      priority: 'low',
      urgency: 'eventual',
      title: 'New reaction',
      message: `${data.reactorUsername} reacted with ${data.reactionEmoji}`,
      timestamp: new Date(),
      read: false,
      dismissed: false,
      actionUrl: `/post/${data.postId}`,
      metadata: data
    };

    this.sendNotificationToUser(userId, notification);
  }

  public notifyNewComment(postId: string, data: {
    commentId: string;
    authorId: string;
    authorUsername: string;
    authorAvatar?: string;
    content: string;
  }): void {
    const liveUpdate: LiveUpdate = {
      type: 'new_comments',
      count: 1,
      lastUpdate: new Date(),
      priority: 'normal',
      contextId: postId
    };

    this.sendLiveUpdate(postId, liveUpdate);

    // Also send as notification to post subscribers
    const notification = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'comment',
      priority: 'normal',
      urgency: 'timely',
      title: 'New comment',
      message: `${data.authorUsername} commented on a post you're following`,
      timestamp: new Date(),
      read: false,
      dismissed: false,
      actionUrl: `/post/${postId}#comment-${data.commentId}`,
      metadata: { ...data, postId }
    };

    // Send to all post subscribers
    const subscribers = this.postSubscriptions.get(postId);
    if (subscribers) {
      subscribers.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client) {
          this.sendToClient(clientId, {
            type: 'notification',
            payload: { ...notification, userId: client.userId }
          });
        }
      });
    }
  }

  public notifyReactionUpdate(postId: string, data: {
    commentId?: string;
    reactionType: string;
    reactionEmoji: string;
    count: number;
    userReacted: boolean;
    tokenAmount?: number;
  }): void {
    const liveUpdate: LiveUpdate = {
      type: 'new_reactions',
      count: 1,
      lastUpdate: new Date(),
      priority: 'low',
      contextId: postId
    };

    this.sendLiveUpdate(postId, liveUpdate);
  }

  private getGovernanceMessage(action: string, proposalTitle: string): string {
    switch (action) {
      case 'created':
        return `New proposal: ${proposalTitle}`;
      case 'voting_started':
        return `Voting started for: ${proposalTitle}`;
      case 'voting_ending':
        return `Voting ends soon for: ${proposalTitle}`;
      case 'executed':
        return `Proposal executed: ${proposalTitle}`;
      case 'rejected':
        return `Proposal rejected: ${proposalTitle}`;
      default:
        return `Proposal update: ${proposalTitle}`;
    }
  }

  private getCommunityMessage(eventType: string, communityName: string): string {
    switch (eventType) {
      case 'new_member':
        return `New member joined ${communityName}`;
      case 'new_post':
        return `New post in ${communityName}`;
      case 'announcement':
        return `New announcement in ${communityName}`;
      case 'event':
        return `New event in ${communityName}`;
      case 'milestone':
        return `${communityName} reached a milestone`;
      default:
        return `Update in ${communityName}`;
    }
  }

  public getStats(): {
    connectedClients: number;
    connectedUsers: number;
    postSubscriptions: number;
  } {
    return {
      connectedClients: this.clients.size,
      connectedUsers: this.userConnections.size,
      postSubscriptions: this.postSubscriptions.size
    };
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}

export default RealTimeNotificationService;