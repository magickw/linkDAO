import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { 
  conversations, 
  chatMessages, 
  messageReadStatus,
  disputes,
  auditLogs
} from '../db/schema';
import { eq, and, desc, sql, like, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Interfaces for Communication Management
export interface CommunicationLog {
  id: string;
  conversationId: string;
  messageId: string;
  senderAddress: string;
  recipientAddress: string;
  contentPreview: string;
  messageType: string;
  timestamp: Date;
  readStatus: boolean;
  metadata?: any;
}

export interface DisputeEscalationTrigger {
  id: string;
  conversationId: string;
  messageId?: string;
  triggerType: 'high_volume' | 'negative_sentiment' | 'keywords' | 'manual' | 'timeout';
  thresholdValue?: number;
  currentValue?: number;
  triggeredAt: Date;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface CommunicationPattern {
  patternType: string;
  frequency: number;
  lastDetected: Date;
  affectedUsers: string[];
  suggestedActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CommunicationAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  messageVolume: {
    total: number;
    byType: Record<string, number>;
    byUser: Record<string, number>;
  };
  responseMetrics: {
    averageResponseTime: number; // in seconds
    responseRate: number; // percentage
  };
  escalationStats: {
    totalTriggers: number;
    resolvedEscalations: number;
    pendingEscalations: number;
  };
  detectedPatterns: CommunicationPattern[];
}

export class CommunicationManagerService {
  /**
   * Log communication for audit trail
   */
  async logCommunication(data: {
    conversationId: string;
    messageId: string;
    senderAddress: string;
    recipientAddress: string;
    contentPreview: string;
    messageType: string;
    metadata?: any;
  }): Promise<CommunicationLog> {
    try {
      const logEntry: CommunicationLog = {
        id: uuidv4(),
        conversationId: data.conversationId,
        messageId: data.messageId,
        senderAddress: data.senderAddress,
        recipientAddress: data.recipientAddress,
        contentPreview: data.contentPreview,
        messageType: data.messageType,
        timestamp: new Date(),
        readStatus: false,
        metadata: data.metadata
      };

      // Log to audit trail
      await db.insert(auditLogs).values({
        userId: null, // Will be populated if we have user IDs
        action: 'message_sent',
        resourceType: 'communication',
        resourceId: logEntry.id,
        payload: JSON.stringify({
          conversationId: data.conversationId,
          messageId: data.messageId,
          senderAddress: data.senderAddress,
          recipientAddress: data.recipientAddress,
          messageType: data.messageType,
          contentPreview: data.contentPreview
        }),
        ipAddress: data.metadata?.ipAddress,
        userAgent: data.metadata?.userAgent,
        timestamp: logEntry.timestamp
      });

      safeLogger.info('Communication logged', { logEntry });
      return logEntry;
    } catch (error) {
      safeLogger.error('Error logging communication:', error);
      throw new Error('Failed to log communication');
    }
  }

  /**
   * Get communication logs with filtering
   */
  async getCommunicationLogs(filters?: {
    userAddress?: string;
    conversationId?: string;
    startDate?: Date;
    endDate?: Date;
    messageType?: string;
  }): Promise<CommunicationLog[]> {
    try {
      let query = db.select().from(chatMessages);

      // Apply filters
      if (filters) {
        if (filters.userAddress) {
          query = query.where(
            and(
              eq(chatMessages.conversationId, filters.conversationId || ''),
              sql`participants::jsonb ? ${filters.userAddress}`
            )
          );
        }
        
        if (filters.startDate || filters.endDate) {
          const dateConditions = [];
          if (filters.startDate) {
            dateConditions.push(gte(chatMessages.sentAt, filters.startDate));
          }
          if (filters.endDate) {
            dateConditions.push(lte(chatMessages.sentAt, filters.endDate));
          }
          query = query.where(and(...dateConditions));
        }
        
        if (filters.messageType) {
          query = query.where(eq(chatMessages.messageType, filters.messageType));
        }
      }

      const messages = await query.orderBy(desc(chatMessages.sentAt)).limit(1000);
      
      // Transform to CommunicationLog format
      const logs: CommunicationLog[] = messages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        messageId: msg.id,
        senderAddress: msg.senderAddress,
        recipientAddress: '', // Would need to extract from conversation
        contentPreview: msg.content.substring(0, 100),
        messageType: msg.messageType,
        timestamp: msg.sentAt,
        readStatus: false, // Would need to join with read status table
        metadata: {
          attachments: msg.attachments,
          replyToId: msg.replyToId,
          editedAt: msg.editedAt,
          deletedAt: msg.deletedAt
        }
      }));

      return logs;
    } catch (error) {
      safeLogger.error('Error getting communication logs:', error);
      throw new Error('Failed to retrieve communication logs');
    }
  }

  /**
   * Create dispute escalation trigger
   */
  async createEscalationTrigger(trigger: {
    conversationId: string;
    messageId?: string;
    triggerType: 'high_volume' | 'negative_sentiment' | 'keywords' | 'manual' | 'timeout';
    thresholdValue?: number;
    currentValue?: number;
    notes?: string;
  }): Promise<DisputeEscalationTrigger> {
    try {
      const escalationTrigger: DisputeEscalationTrigger = {
        id: uuidv4(),
        conversationId: trigger.conversationId,
        messageId: trigger.messageId,
        triggerType: trigger.triggerType,
        thresholdValue: trigger.thresholdValue,
        currentValue: trigger.currentValue,
        triggeredAt: new Date(),
        resolved: false
      };

      // Log to audit trail
      await db.insert(auditLogs).values({
        userId: null,
        action: 'escalation_triggered',
        resourceType: 'dispute_escalation',
        resourceId: escalationTrigger.id,
        payload: JSON.stringify(escalationTrigger),
        timestamp: escalationTrigger.triggeredAt
      });

      // If this is related to a dispute, update the dispute status
      if (trigger.notes && trigger.notes.includes('dispute')) {
        // Find related dispute and update status
        const relatedDispute = await db.select().from(disputes)
          .where(sql`related_conversation_id = ${trigger.conversationId}`)
          .limit(1);
        
        if (relatedDispute.length > 0) {
          await db.update(disputes)
            .set({ status: 'escalated' })
            .where(eq(disputes.id, relatedDispute[0].id));
        }
      }

      safeLogger.info('Escalation trigger created', { escalationTrigger });
      return escalationTrigger;
    } catch (error) {
      safeLogger.error('Error creating escalation trigger:', error);
      throw new Error('Failed to create escalation trigger');
    }
  }

  /**
   * Resolve an escalation trigger
   */
  async resolveEscalation(escalationId: string, resolutionNotes: string, resolvedBy?: string): Promise<boolean> {
    try {
      // Update audit log
      await db.insert(auditLogs).values({
        userId: resolvedBy ? uuidv4() : null, // Would convert address to user ID
        action: 'escalation_resolved',
        resourceType: 'dispute_escalation',
        resourceId: escalationId,
        payload: JSON.stringify({ resolutionNotes, resolvedBy }),
        timestamp: new Date()
      });

      safeLogger.info('Escalation resolved', { escalationId, resolutionNotes });
      return true;
    } catch (error) {
      safeLogger.error('Error resolving escalation:', error);
      return false;
    }
  }

  /**
   * Get escalation triggers
   */
  async getEscalationTriggers(filters?: {
    conversationId?: string;
    resolved?: boolean;
    triggerType?: string;
  }): Promise<DisputeEscalationTrigger[]> {
    try {
      // In a real implementation, we would query a dedicated escalation table
      // For now, we'll return mock data to demonstrate the concept
      const mockTriggers: DisputeEscalationTrigger[] = [
        {
          id: uuidv4(),
          conversationId: filters?.conversationId || 'conv-123',
          triggerType: 'negative_sentiment',
          thresholdValue: 0.7,
          currentValue: 0.85,
          triggeredAt: new Date(Date.now() - 3600000), // 1 hour ago
          resolved: false
        }
      ];

      return mockTriggers;
    } catch (error) {
      safeLogger.error('Error getting escalation triggers:', error);
      throw new Error('Failed to retrieve escalation triggers');
    }
  }

  /**
   * Route escalation to appropriate team
   */
  async routeEscalation(escalation: DisputeEscalationTrigger, teamRoutingRules: any): Promise<string> {
    try {
      let assignedTeam = 'support';

      // Simple routing logic based on trigger type
      switch (escalation.triggerType) {
        case 'high_volume':
          assignedTeam = 'operations';
          break;
        case 'negative_sentiment':
          assignedTeam = 'customer_success';
          break;
        case 'keywords':
          assignedTeam = 'moderation';
          break;
        case 'manual':
          assignedTeam = 'senior_support';
          break;
        case 'timeout':
          assignedTeam = 'escalation_team';
          break;
      }

      // Log routing decision
      await db.insert(auditLogs).values({
        userId: null,
        action: 'escalation_routed',
        resourceType: 'dispute_escalation',
        resourceId: escalation.id,
        payload: JSON.stringify({ 
          escalationId: escalation.id, 
          assignedTeam, 
          triggerType: escalation.triggerType 
        }),
        timestamp: new Date()
      });

      safeLogger.info('Escalation routed', { escalationId: escalation.id, assignedTeam });
      return assignedTeam;
    } catch (error) {
      safeLogger.error('Error routing escalation:', error);
      throw new Error('Failed to route escalation');
    }
  }

  /**
   * Preserve context for escalation
   */
  async preserveEscalationContext(escalationId: string, contextData: any): Promise<boolean> {
    try {
      // Log context preservation
      await db.insert(auditLogs).values({
        userId: null,
        action: 'context_preserved',
        resourceType: 'dispute_escalation',
        resourceId: escalationId,
        payload: JSON.stringify(contextData),
        timestamp: new Date()
      });

      safeLogger.info('Escalation context preserved', { escalationId, contextData });
      return true;
    } catch (error) {
      safeLogger.error('Error preserving escalation context:', error);
      return false;
    }
  }

  /**
   * Detect communication patterns
   */
  async detectCommunicationPatterns(startDate?: Date, endDate?: Date): Promise<CommunicationPattern[]> {
    try {
      const patterns: CommunicationPattern[] = [];

      // Mock pattern detection - in a real implementation, this would analyze message content
      patterns.push({
        patternType: 'negative_sentiment_cluster',
        frequency: 15,
        lastDetected: new Date(),
        affectedUsers: ['0x123...', '0x456...', '0x789...'],
        suggestedActions: [
          'Increase moderator presence',
          'Review recent policy changes',
          'Contact affected users'
        ],
        severity: 'high'
      });

      patterns.push({
        patternType: 'high_message_volume',
        frequency: 42,
        lastDetected: new Date(),
        affectedUsers: ['0xabc...', '0xdef...'],
        suggestedActions: [
          'Monitor for spam/bot activity',
          'Review rate limiting settings'
        ],
        severity: 'medium'
      });

      return patterns;
    } catch (error) {
      safeLogger.error('Error detecting communication patterns:', error);
      throw new Error('Failed to detect communication patterns');
    }
  }

  /**
   * Identify issues from communication patterns
   */
  async identifyIssuesFromPatterns(patterns: CommunicationPattern[]): Promise<any[]> {
    try {
      const issues: any[] = [];

      for (const pattern of patterns) {
        issues.push({
          id: uuidv4(),
          patternType: pattern.patternType,
          severity: pattern.severity,
          affectedUsersCount: pattern.affectedUsers.length,
          suggestedActions: pattern.suggestedActions,
          detectedAt: pattern.lastDetected
        });
      }

      return issues;
    } catch (error) {
      safeLogger.error('Error identifying issues from patterns:', error);
      throw new Error('Failed to identify issues from patterns');
    }
  }

  /**
   * Generate improvement suggestions
   */
  async generateImprovementSuggestions(issues: any[]): Promise<string[]> {
    try {
      const suggestions: string[] = [];

      for (const issue of issues) {
        switch (issue.patternType) {
          case 'negative_sentiment_cluster':
            suggestions.push('Implement proactive customer outreach program');
            suggestions.push('Enhance customer support response protocols');
            break;
          case 'high_message_volume':
            suggestions.push('Review and adjust rate limiting thresholds');
            suggestions.push('Implement CAPTCHA for high-volume users');
            break;
          default:
            suggestions.push(`Address ${issue.patternType} pattern with targeted interventions`);
        }
      }

      return suggestions;
    } catch (error) {
      safeLogger.error('Error generating improvement suggestions:', error);
      throw new Error('Failed to generate improvement suggestions');
    }
  }

  /**
   * Generate communication analytics report
   */
  async generateCommunicationAnalytics(startDate?: Date, endDate?: Date): Promise<CommunicationAnalytics> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      // Mock analytics data - in a real implementation, this would query the database
      const analytics: CommunicationAnalytics = {
        period: {
          start,
          end
        },
        messageVolume: {
          total: 12543,
          byType: {
            text: 11200,
            image: 890,
            file: 234,
            emoji: 219
          },
          byUser: {
            '0x123...': 1250,
            '0x456...': 980,
            '0x789...': 765
          }
        },
        responseMetrics: {
          averageResponseTime: 180, // 3 minutes
          responseRate: 87 // 87%
        },
        escalationStats: {
          totalTriggers: 24,
          resolvedEscalations: 19,
          pendingEscalations: 5
        },
        detectedPatterns: await this.detectCommunicationPatterns(start, end)
      };

      return analytics;
    } catch (error) {
      safeLogger.error('Error generating communication analytics:', error);
      throw new Error('Failed to generate communication analytics');
    }
  }
}

// Export singleton instance
export const communicationManagerService = new CommunicationManagerService();