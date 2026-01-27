/**
 * Real-time Compliance Monitoring Service
 * 
 * Provides WebSocket-based real-time monitoring for seller compliance,
 * including live violation alerts and dashboard updates.
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { logger } from '../../utils/logger';
import { sellerReturnPerformanceService } from './sellerReturnPerformanceService';
import { complianceMonitoringService } from './complianceMonitoringService';

export interface ComplianceAlert {
  id: string;
  type: 'violation' | 'score_change' | 'threshold_breach' | 'policy_update';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sellerId: string;
  sellerName: string;
  timestamp: Date;
  message: string;
  details: any;
  requiresAction: boolean;
  actionDeadline?: Date;
}

export interface RealTimeComplianceUpdate {
  type: 'compliance_alert' | 'score_update' | 'violation_detected' | 'system_status';
  timestamp: Date;
  data: any;
}

export interface ComplianceWebSocketClient {
  id: string;
  ws: WebSocket;
  userId: string;
  permissions: string[];
  subscribedSellers: Set<string>;
  lastActivity: Date;
  isActive: boolean;
}

export class RealTimeComplianceMonitoringService extends EventEmitter {
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, ComplianceWebSocketClient> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly PORT = process.env.COMPLIANCE_WS_PORT ? parseInt(process.env.COMPLIANCE_WS_PORT) : 8080;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MONITORING_INTERVAL = 60000; // 1 minute

  constructor() {
    super();
    this.initializeWebSocketServer();
    this.startRealTimeMonitoring();
  }

  /**
   * Initialize WebSocket server for real-time compliance updates
   */
  private initializeWebSocketServer(): void {
    try {
      this.wss = new WebSocket.Server({ 
        port: this.PORT,
        path: '/compliance-monitoring'
      });

      this.wss.on('connection', (ws: WebSocket, request) => {
        this.handleNewConnection(ws, request);
      });

      this.wss.on('error', (error) => {
        logger.error('WebSocket server error:', error);
      });

      // Start heartbeat interval
      setInterval(() => {
        this.performHeartbeat();
      }, this.HEARTBEAT_INTERVAL);

      logger.info(`Real-time compliance monitoring WebSocket server started on port ${this.PORT}`);
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleNewConnection(ws: WebSocket, request: any): void {
    const clientId = this.generateClientId();
    const client: ComplianceWebSocketClient = {
      id: clientId,
      ws,
      userId: '',
      permissions: [],
      subscribedSellers: new Set(),
      lastActivity: new Date(),
      isActive: true
    };

    this.clients.set(clientId, client);

    ws.on('message', async (message: WebSocket.Data) => {
      await this.handleClientMessage(clientId, message);
    });

    ws.on('close', () => {
      this.handleClientDisconnection(clientId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket client error (${clientId}):`, error);
      this.handleClientDisconnection(clientId);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection_established',
      clientId,
      timestamp: new Date(),
      message: 'Connected to real-time compliance monitoring'
    });

    logger.info(`New compliance monitoring client connected: ${clientId}`);
  }

  /**
   * Handle client messages
   */
  private async handleClientMessage(clientId: string, message: WebSocket.Data): Promise<void> {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      client.lastActivity = new Date();

      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'authenticate':
          await this.handleAuthentication(clientId, data);
          break;
        
        case 'subscribe_seller':
          await this.handleSellerSubscription(clientId, data.sellerId);
          break;
        
        case 'unsubscribe_seller':
          await this.handleSellerUnsubscription(clientId, data.sellerId);
          break;
        
        case 'get_compliance_snapshot':
          await this.sendComplianceSnapshot(clientId, data.sellerId);
          break;
        
        default:
          logger.warn(`Unknown message type from client ${clientId}:`, data.type);
      }
    } catch (error) {
      logger.error(`Error handling message from client ${clientId}:`, error);
    }
  }

  /**
   * Handle client authentication
   */
  private async handleAuthentication(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // TODO: Implement proper JWT authentication
    client.userId = data.userId || 'anonymous';
    client.permissions = data.permissions || ['read_compliance'];

    this.sendToClient(clientId, {
      type: 'authentication_success',
      userId: client.userId,
      permissions: client.permissions,
      timestamp: new Date()
    });
  }

  /**
   * Handle seller subscription
   */
  private async handleSellerSubscription(clientId: string, sellerId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!client.permissions.includes('read_compliance')) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Insufficient permissions to subscribe to seller compliance',
        timestamp: new Date()
      });
      return;
    }

    client.subscribedSellers.add(sellerId);

    // Send current compliance data for the seller
    await this.sendComplianceSnapshot(clientId, sellerId);

    this.sendToClient(clientId, {
      type: 'subscription_success',
      sellerId,
      timestamp: new Date()
    });
  }

  /**
   * Handle seller unsubscription
   */
  private async handleSellerUnsubscription(clientId: string, sellerId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscribedSellers.delete(sellerId);

    this.sendToClient(clientId, {
      type: 'unsubscription_success',
      sellerId,
      timestamp: new Date()
    });
  }

  /**
   * Send compliance snapshot to client
   */
  private async sendComplianceSnapshot(clientId: string, sellerId: string): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const complianceMetrics = await sellerReturnPerformanceService.getSellerComplianceMetrics(
        sellerId,
        startDate,
        endDate
      );

      this.sendToClient(clientId, {
        type: 'compliance_snapshot',
        sellerId,
        data: complianceMetrics,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error(`Error sending compliance snapshot for seller ${sellerId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: `Failed to get compliance data for seller ${sellerId}`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.performComplianceChecks();
    }, this.MONITORING_INTERVAL);

    logger.info('Real-time compliance monitoring started');
  }

  /**
   * Perform compliance checks and send real-time updates
   */
  private async performComplianceChecks(): Promise<void> {
    try {
      // Get all active sellers (placeholder - would get from database)
      const activeSellers = await this.getActiveSellers();

      for (const sellerId of activeSellers) {
        await this.checkSellerCompliance(sellerId);
      }
    } catch (error) {
      logger.error('Error performing compliance checks:', error);
    }
  }

  /**
   * Check compliance for a specific seller
   */
  private async checkSellerCompliance(sellerId: string): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const currentMetrics = await sellerReturnPerformanceService.getSellerComplianceMetrics(
        sellerId,
        startDate,
        endDate
      );

      // Check for new violations
      if (currentMetrics.violations.length > 0) {
        await this.broadcastViolationAlert(sellerId, currentMetrics);
      }

      // Check for significant score changes
      await this.checkScoreChanges(sellerId, currentMetrics);

      // Check threshold breaches
      await this.checkThresholdBreaches(sellerId, currentMetrics);

    } catch (error) {
      logger.error(`Error checking compliance for seller ${sellerId}:`, error);
    }
  }

  /**
   * Broadcast violation alert to subscribed clients
   */
  private async broadcastViolationAlert(sellerId: string, metrics: any): Promise<void> {
    const alert: ComplianceAlert = {
      id: this.generateAlertId(),
      type: 'violation',
      severity: this.getHighestViolationSeverity(metrics.violations),
      sellerId,
      sellerName: metrics.sellerName,
      timestamp: new Date(),
      message: `New compliance violations detected for ${metrics.sellerName}`,
      details: {
        violations: metrics.violations,
        complianceScore: metrics.complianceScore
      },
      requiresAction: metrics.violations.some((v: any) => v.severity === 'critical'),
      actionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };

    this.broadcastToSubscribedClients(sellerId, {
      type: 'compliance_alert',
      data: alert,
      timestamp: new Date()
    });

    // Emit for internal processing
    this.emit('violation_detected', alert);
  }

  /**
   * Check for significant score changes
   */
  private async checkScoreChanges(sellerId: string, currentMetrics: any): Promise<void> {
    // Get previous score (placeholder - would get from cache/database)
    const previousScore = await this.getPreviousComplianceScore(sellerId);
    
    if (previousScore && Math.abs(currentMetrics.complianceScore - previousScore) > 5) {
      const alert: ComplianceAlert = {
        id: this.generateAlertId(),
        type: 'score_change',
        severity: Math.abs(currentMetrics.complianceScore - previousScore) > 15 ? 'high' : 'medium',
        sellerId,
        sellerName: currentMetrics.sellerName,
        timestamp: new Date(),
        message: `Compliance score changed from ${previousScore} to ${currentMetrics.complianceScore}`,
        details: {
          previousScore,
          newScore: currentMetrics.complianceScore,
          change: currentMetrics.complianceScore - previousScore
        },
        requiresAction: false
      };

      this.broadcastToSubscribedClients(sellerId, {
        type: 'compliance_alert',
        data: alert,
        timestamp: new Date()
      });
    }

    // Store current score for next comparison
    await this.storeComplianceScore(sellerId, currentMetrics.complianceScore);
  }

  /**
   * Check for threshold breaches
   */
  private async checkThresholdBreaches(sellerId: string, metrics: any): Promise<void> {
    const thresholds = {
      complianceScore: 70,
      processingTimeCompliance: 80,
      approvalRateDeviation: 20
    };

    const breaches: string[] = [];

    if (metrics.complianceScore < thresholds.complianceScore) {
      breaches.push(`Compliance score below ${thresholds.complianceScore}`);
    }

    if (metrics.processingTimeCompliance < thresholds.processingTimeCompliance) {
      breaches.push(`Processing time compliance below ${thresholds.processingTimeCompliance}%`);
    }

    if (metrics.approvalRateDeviation > thresholds.approvalRateDeviation) {
      breaches.push(`Approval rate deviation exceeds ${thresholds.approvalRateDeviation}%`);
    }

    if (breaches.length > 0) {
      const alert: ComplianceAlert = {
        id: this.generateAlertId(),
        type: 'threshold_breach',
        severity: breaches.length > 2 ? 'high' : 'medium',
        sellerId,
        sellerName: metrics.sellerName,
        timestamp: new Date(),
        message: `Threshold breaches detected: ${breaches.join(', ')}`,
        details: {
          breaches,
          metrics: {
            complianceScore: metrics.complianceScore,
            processingTimeCompliance: metrics.processingTimeCompliance,
            approvalRateDeviation: metrics.approvalRateDeviation
          }
        },
        requiresAction: breaches.some(b => b.includes('critical'))
      };

      this.broadcastToSubscribedClients(sellerId, {
        type: 'compliance_alert',
        data: alert,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast message to clients subscribed to a seller
   */
  private broadcastToSubscribedClients(sellerId: string, message: any): void {
    for (const client of this.clients.values()) {
      if (client.isActive && client.subscribedSellers.has(sellerId)) {
        this.sendToClient(client.id, message);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error);
      this.handleClientDisconnection(clientId);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.isActive = false;
      this.clients.delete(clientId);
      logger.info(`Compliance monitoring client disconnected: ${clientId}`);
    }
  }

  /**
   * Perform heartbeat to check client connections
   */
  private performHeartbeat(): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (!client.isActive || client.ws.readyState !== WebSocket.OPEN) {
        this.handleClientDisconnection(clientId);
        continue;
      }

      // Check if client is stale (no activity for 5 minutes)
      const staleTime = 5 * 60 * 1000; // 5 minutes
      if (Date.now() - client.lastActivity.getTime() > staleTime) {
        this.sendToClient(clientId, {
          type: 'ping',
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Get active sellers (placeholder implementation)
   */
  private async getActiveSellers(): Promise<string[]> {
    // TODO: Implement actual query to get active sellers
    return ['seller-1', 'seller-2', 'seller-3'];
  }

  /**
   * Get previous compliance score (placeholder implementation)
   */
  private async getPreviousComplianceScore(sellerId: string): Promise<number | null> {
    // TODO: Implement actual cache/database lookup
    return null;
  }

  /**
   * Store compliance score (placeholder implementation)
   */
  private async storeComplianceScore(sellerId: string, score: number): Promise<void> {
    // TODO: Implement actual cache/database storage
  }

  /**
   * Get highest violation severity
   */
  private getHighestViolationSeverity(violations: any[]): 'low' | 'medium' | 'high' | 'critical' {
    if (violations.some(v => v.severity === 'critical')) return 'critical';
    if (violations.some(v => v.severity === 'high')) return 'high';
    if (violations.some(v => v.severity === 'major')) return 'medium';
    return 'low';
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  public getStats(): any {
    return {
      connectedClients: this.clients.size,
      activeClients: Array.from(this.clients.values()).filter(c => c.isActive).length,
      totalSubscriptions: Array.from(this.clients.values()).reduce((sum, c) => sum + c.subscribedSellers.size, 0),
      uptime: process.uptime()
    };
  }

  /**
   * Graceful shutdown
   */
  public shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    for (const client of this.clients.values()) {
      client.ws.close();
    }

    this.clients.clear();
    logger.info('Real-time compliance monitoring service shut down');
  }
}

export const realTimeComplianceMonitoringService = new RealTimeComplianceMonitoringService();