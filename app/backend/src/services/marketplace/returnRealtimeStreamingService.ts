import { safeLogger } from '../../utils/safeLogger';
import { getAdminWebSocketService } from '../websocket/adminWebSocketService';
import { redisService } from './redisService';
import { ReturnEvent } from './returnAnalyticsService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ReturnStreamEvent {
  eventId: string;
  eventType: ReturnEventType;
  returnId: string;
  data: Record<string, unknown>;
  metadata: EventMetadata;
  timestamp: Date;
}

export type ReturnEventType =
  | 'return_created'
  | 'return_approved'
  | 'return_rejected'
  | 'return_received'
  | 'return_inspected'
  | 'return_completed'
  | 'return_cancelled'
  | 'refund_initiated'
  | 'refund_processing'
  | 'refund_completed'
  | 'refund_failed'
  | 'alert_generated'
  | 'metrics_updated'
  | 'fraud_detected'
  | 'threshold_exceeded';

export interface EventMetadata {
  source: string;
  correlationId?: string;
  sellerId?: string;
  userId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  broadcast: boolean;
  targetRoles?: string[];
}

export interface ReturnMetricsUpdate {
  activeReturns: number;
  pendingApproval: number;
  pendingRefund: number;
  inTransitReturns: number;
  returnsPerMinute: number;
  refundsPerMinute: number;
  volumeSpikeDetected: boolean;
  timestamp: Date;
}

export interface RefundStatusUpdate {
  refundId: string;
  returnId: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AlertBroadcast {
  alertId: string;
  alertType: 'threshold' | 'anomaly' | 'fraud' | 'system' | 'performance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
  expiresAt?: Date;
  actionRequired: boolean;
}

// ============================================================================
// RETURN REALTIME STREAMING SERVICE
// ============================================================================

class ReturnRealtimeStreamingService {
  private eventBuffer: Map<string, ReturnStreamEvent[]> = new Map();
  private metricsCache: ReturnMetricsUpdate | null = null;
  private lastMetricsBroadcast: Date | null = null;
  private alertHistory: Map<string, AlertBroadcast> = new Map();
  private broadcastThrottleMs = 1000; // Minimum 1 second between broadcasts
  private readonly REDIS_CHANNEL_PREFIX = 'return_stream:';

  // ========================================================================
  // EVENT BROADCASTING
  // ========================================================================

  /**
   * Broadcast a return event to all subscribed admin clients
   */
  async broadcastReturnEvent(event: ReturnStreamEvent): Promise<void> {
    try {
      const adminWs = getAdminWebSocketService();
      if (!adminWs) {
        safeLogger.warn('Admin WebSocket service not available for return event broadcast');
        this.bufferEvent(event);
        return;
      }

      // Determine target rooms based on event metadata
      const rooms = this.determineTargetRooms(event);

      // Broadcast to admin namespace
      const eventPayload = {
        ...event,
        timestamp: event.timestamp.toISOString(),
      };

      // Broadcast to specific rooms
      if (event.metadata.targetRoles && event.metadata.targetRoles.length > 0) {
        for (const role of event.metadata.targetRoles) {
          adminWs.sendToRole(role, 'return_event', eventPayload);
        }
      } else {
        // Broadcast to all admins subscribed to returns
        adminWs.broadcastReturnUpdate(eventPayload);
      }

      // Also publish to Redis for cross-instance broadcasting
      await this.publishToRedis(event);

      safeLogger.debug('Return event broadcasted', {
        eventType: event.eventType,
        returnId: event.returnId,
        rooms: rooms.join(', '),
      });
    } catch (error) {
      safeLogger.error('Error broadcasting return event:', error);
      this.bufferEvent(event);
    }
  }

  /**
   * Broadcast real-time metrics update
   */
  async broadcastMetricsUpdate(metrics: ReturnMetricsUpdate): Promise<void> {
    try {
      // Throttle metrics broadcasts
      if (this.lastMetricsBroadcast) {
        const timeSinceLastBroadcast = Date.now() - this.lastMetricsBroadcast.getTime();
        if (timeSinceLastBroadcast < this.broadcastThrottleMs) {
          this.metricsCache = metrics;
          return;
        }
      }

      const adminWs = getAdminWebSocketService();
      if (!adminWs) {
        safeLogger.warn('Admin WebSocket service not available for metrics broadcast');
        return;
      }

      const metricsPayload = {
        ...metrics,
        timestamp: metrics.timestamp.toISOString(),
      };

      adminWs.broadcastReturnUpdate({
        type: 'metrics_update',
        data: metricsPayload,
      });

      this.lastMetricsBroadcast = new Date();
      this.metricsCache = null;

      safeLogger.debug('Return metrics broadcasted');
    } catch (error) {
      safeLogger.error('Error broadcasting metrics update:', error);
    }
  }

  /**
   * Broadcast refund status update
   */
  async broadcastRefundStatus(update: RefundStatusUpdate): Promise<void> {
    try {
      const adminWs = getAdminWebSocketService();
      if (!adminWs) {
        safeLogger.warn('Admin WebSocket service not available for refund status broadcast');
        return;
      }

      const payload = {
        type: 'refund_status_update',
        data: {
          ...update,
          timestamp: update.timestamp.toISOString(),
        },
      };

      adminWs.broadcastReturnUpdate(payload);

      safeLogger.debug('Refund status update broadcasted', {
        refundId: update.refundId,
        status: update.status,
      });
    } catch (error) {
      safeLogger.error('Error broadcasting refund status:', error);
    }
  }

  /**
   * Broadcast an alert to admins
   */
  async broadcastAlert(alert: AlertBroadcast): Promise<void> {
    try {
      const adminWs = getAdminWebSocketService();
      if (!adminWs) {
        safeLogger.warn('Admin WebSocket service not available for alert broadcast');
        return;
      }

      // Store in alert history
      this.alertHistory.set(alert.alertId, alert);

      // Clean up old alerts
      this.cleanupExpiredAlerts();

      const alertPayload = {
        type: 'alert',
        data: {
          ...alert,
          timestamp: alert.timestamp.toISOString(),
          expiresAt: alert.expiresAt?.toISOString(),
        },
      };

      // Broadcast based on severity
      if (alert.severity === 'critical' || alert.severity === 'error') {
        // Broadcast to all admins for critical/error alerts
        adminWs.broadcastToAllAdmins('return_alert', alertPayload);
      } else {
        // Broadcast only to returns-subscribed admins for info/warning
        adminWs.broadcastReturnUpdate(alertPayload);
      }

      safeLogger.info('Alert broadcasted', {
        alertId: alert.alertId,
        alertType: alert.alertType,
        severity: alert.severity,
      });
    } catch (error) {
      safeLogger.error('Error broadcasting alert:', error);
    }
  }

  // ========================================================================
  // EVENT PROCESSING
  // ========================================================================

  /**
   * Process a return analytics event and broadcast appropriately
   */
  async processReturnAnalyticsEvent(event: Omit<ReturnEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const streamEvent: ReturnStreamEvent = {
        eventId: this.generateEventId(),
        eventType: this.mapEventType(event.eventType),
        returnId: event.returnId,
        data: {
          eventCategory: event.eventCategory,
          eventData: event.eventData,
          previousState: event.previousState,
          newState: event.newState,
        },
        metadata: {
          source: 'return_analytics',
          correlationId: event.returnId,
          priority: this.determineEventPriority(event),
          broadcast: true,
          targetRoles: this.determineTargetRoles(event),
        },
        timestamp: new Date(),
      };

      await this.broadcastReturnEvent(streamEvent);
    } catch (error) {
      safeLogger.error('Error processing return analytics event:', error);
    }
  }

  /**
   * Process multiple events in batch
   */
  async processBatchEvents(events: Omit<ReturnEvent, 'id' | 'timestamp'>[]): Promise<void> {
    const batchPromises = events.map(event => this.processReturnAnalyticsEvent(event));
    await Promise.allSettled(batchPromises);
  }

  // ========================================================================
  // THRESHOLD AND ANOMALY DETECTION
  // ========================================================================

  /**
   * Check metrics against thresholds and generate alerts
   */
  async checkThresholdsAndAlert(metrics: ReturnMetricsUpdate): Promise<void> {
    const thresholds = await this.getThresholds();

    // Check for volume spike
    if (metrics.volumeSpikeDetected) {
      await this.broadcastAlert({
        alertId: this.generateAlertId(),
        alertType: 'anomaly',
        severity: 'warning',
        title: 'Return Volume Spike Detected',
        message: `Unusual spike in return volume detected. Current rate: ${metrics.returnsPerMinute.toFixed(2)}/min`,
        data: {
          currentRate: metrics.returnsPerMinute,
          threshold: thresholds.volumeSpikeThreshold,
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        actionRequired: false,
      });
    }

    // Check pending approval queue
    if (metrics.pendingApproval > thresholds.pendingApprovalThreshold) {
      await this.broadcastAlert({
        alertId: this.generateAlertId(),
        alertType: 'threshold',
        severity: 'warning',
        title: 'High Pending Approval Queue',
        message: `${metrics.pendingApproval} returns awaiting approval (threshold: ${thresholds.pendingApprovalThreshold})`,
        data: {
          current: metrics.pendingApproval,
          threshold: thresholds.pendingApprovalThreshold,
        },
        timestamp: new Date(),
        actionRequired: true,
      });
    }

    // Check pending refund queue
    if (metrics.pendingRefund > thresholds.pendingRefundThreshold) {
      await this.broadcastAlert({
        alertId: this.generateAlertId(),
        alertType: 'threshold',
        severity: 'error',
        title: 'High Pending Refund Queue',
        message: `${metrics.pendingRefund} refunds pending processing (threshold: ${thresholds.pendingRefundThreshold})`,
        data: {
          current: metrics.pendingRefund,
          threshold: thresholds.pendingRefundThreshold,
        },
        timestamp: new Date(),
        actionRequired: true,
      });
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private determineTargetRooms(event: ReturnStreamEvent): string[] {
    const rooms: string[] = ['metrics:returns'];

    switch (event.eventType) {
      case 'fraud_detected':
      case 'alert_generated':
        rooms.push('role:super_admin', 'role:admin');
        break;
      case 'refund_failed':
        rooms.push('role:super_admin', 'role:admin', 'role:analyst');
        break;
      default:
        break;
    }

    return rooms;
  }

  private mapEventType(eventType: string): ReturnEventType {
    const typeMap: Record<string, ReturnEventType> = {
      'return.created': 'return_created',
      'return.approved': 'return_approved',
      'return.rejected': 'return_rejected',
      'return.received': 'return_received',
      'return.inspected': 'return_inspected',
      'return.completed': 'return_completed',
      'return.cancelled': 'return_cancelled',
      'refund.initiated': 'refund_initiated',
      'refund.processing': 'refund_processing',
      'refund.completed': 'refund_completed',
      'refund.failed': 'refund_failed',
      'alert.generated': 'alert_generated',
      'metrics.updated': 'metrics_updated',
      'fraud.detected': 'fraud_detected',
      'threshold.exceeded': 'threshold_exceeded',
    };

    return typeMap[eventType] || 'metrics_updated';
  }

  private determineEventPriority(event: Omit<ReturnEvent, 'id' | 'timestamp'>): 'low' | 'medium' | 'high' | 'urgent' {
    const highPriorityTypes = ['refund.failed', 'fraud.detected', 'threshold.exceeded'];
    const urgentTypes = ['fraud.detected'];

    if (urgentTypes.includes(event.eventType)) {
      return 'urgent';
    }
    if (highPriorityTypes.includes(event.eventType)) {
      return 'high';
    }
    if (event.eventType.startsWith('return.')) {
      return 'medium';
    }
    return 'low';
  }

  private determineTargetRoles(event: Omit<ReturnEvent, 'id' | 'timestamp'>): string[] {
    const criticalEventTypes = ['refund.failed', 'fraud.detected'];

    if (criticalEventTypes.includes(event.eventType)) {
      return ['super_admin', 'admin'];
    }
    return [];
  }

  private bufferEvent(event: ReturnStreamEvent): void {
    const key = 'global';
    if (!this.eventBuffer.has(key)) {
      this.eventBuffer.set(key, []);
    }
    const buffer = this.eventBuffer.get(key)!;
    buffer.push(event);

    // Keep only last 1000 events in buffer
    if (buffer.length > 1000) {
      buffer.shift();
    }
  }

  private async publishToRedis(event: ReturnStreamEvent): Promise<void> {
    try {
      const channel = `${this.REDIS_CHANNEL_PREFIX}${event.eventType}`;
      await redisService.publish(channel, JSON.stringify(event));
    } catch (error) {
      safeLogger.error('Error publishing to Redis:', error);
    }
  }

  private async getThresholds(): Promise<{
    volumeSpikeThreshold: number;
    pendingApprovalThreshold: number;
    pendingRefundThreshold: number;
  }> {
    // Try to get from cache first
    const cached = await redisService.get('return:thresholds');
    if (cached) {
      return cached as {
        volumeSpikeThreshold: number;
        pendingApprovalThreshold: number;
        pendingRefundThreshold: number;
      };
    }

    // Default thresholds
    return {
      volumeSpikeThreshold: 10, // Returns per minute
      pendingApprovalThreshold: 50,
      pendingRefundThreshold: 30,
    };
  }

  private cleanupExpiredAlerts(): void {
    const now = new Date();
    for (const [alertId, alert] of this.alertHistory.entries()) {
      if (alert.expiresAt && alert.expiresAt < now) {
        this.alertHistory.delete(alertId);
      }
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Get buffered events that weren't delivered
   */
  getBufferedEvents(): ReturnStreamEvent[] {
    const allEvents: ReturnStreamEvent[] = [];
    for (const events of this.eventBuffer.values()) {
      allEvents.push(...events);
    }
    return allEvents;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertBroadcast[] {
    this.cleanupExpiredAlerts();
    return Array.from(this.alertHistory.values());
  }

  /**
   * Clear event buffer (after successful delivery)
   */
  clearEventBuffer(): void {
    this.eventBuffer.clear();
  }

  /**
   * Get service statistics
   */
  getStats(): {
    bufferedEvents: number;
    activeAlerts: number;
    lastMetricsBroadcast: string | null;
  } {
    return {
      bufferedEvents: this.getBufferedEvents().length,
      activeAlerts: this.alertHistory.size,
      lastMetricsBroadcast: this.lastMetricsBroadcast?.toISOString() || null,
    };
  }
}

// Export singleton instance
export const returnRealtimeStreamingService = new ReturnRealtimeStreamingService();
