import { WebSocketService } from './webSocketService';
import { safeLogger } from '../utils/safeLogger';
import { notificationService } from './notificationService';

export interface EarningNotification {
  userId: string;
  type: 'earning_reward' | 'daily_limit_reached' | 'milestone_achieved' | 'streak_bonus';
  title: string;
  message: string;
  tokensEarned?: number;
  activityType?: string;
  metadata?: Record<string, any>;
}

export interface MilestoneData {
  type: 'total_earnings' | 'activity_count' | 'streak' | 'referrals';
  milestone: number;
  currentValue: number;
  reward?: number;
}

class EarningNotificationService {
  private webSocketService: WebSocketService;

  constructor() {
    this.webSocketService = new WebSocketService();
  }

  /**
   * Send real-time earning notification
   */
  async sendEarningNotification(notification: EarningNotification): Promise<void> {
    try {
      // Send real-time WebSocket notification
      await this.webSocketService.sendToUser(notification.userId, {
        type: 'earning_notification',
        data: {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          tokensEarned: notification.tokensEarned,
          activityType: notification.activityType,
          timestamp: new Date().toISOString(),
          metadata: notification.metadata
        }
      });

      // Create persistent notification
      await notificationService.createNotification({
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: {
          tokensEarned: notification.tokensEarned,
          activityType: notification.activityType,
          metadata: notification.metadata
        }
      });

      safeLogger.info(`Earning notification sent to user ${notification.userId}: ${notification.message}`);

    } catch (error) {
      safeLogger.error('Error sending earning notification:', error);
    }
  }

  /**
   * Send milestone achievement notification
   */
  async sendMilestoneNotification(userId: string, milestone: MilestoneData): Promise<void> {
    const milestoneMessages = {
      total_earnings: `Congratulations! You've earned ${milestone.milestone} LDAO tokens in total!`,
      activity_count: `Amazing! You've completed ${milestone.milestone} earning activities!`,
      streak: `Incredible streak! You've maintained ${milestone.milestone} days of activity!`,
      referrals: `Great work! You've successfully referred ${milestone.milestone} new users!`
    };

    const milestoneTitles = {
      total_earnings: 'Earning Milestone Reached!',
      activity_count: 'Activity Milestone Reached!',
      streak: 'Streak Milestone Reached!',
      referrals: 'Referral Milestone Reached!'
    };

    await this.sendEarningNotification({
      userId,
      type: 'milestone_achieved',
      title: milestoneTitles[milestone.type],
      message: milestoneMessages[milestone.type],
      tokensEarned: milestone.reward,
      metadata: {
        milestoneType: milestone.type,
        milestone: milestone.milestone,
        currentValue: milestone.currentValue,
        reward: milestone.reward
      }
    });
  }

  /**
   * Send daily limit reached notification
   */
  async sendDailyLimitNotification(userId: string, activityType: string, limit: number): Promise<void> {
    const activityNames = {
      post: 'posting',
      comment: 'commenting',
      referral: 'referrals',
      marketplace: 'marketplace activities',
      daily_login: 'daily login',
      profile_complete: 'profile completion'
    };

    await this.sendEarningNotification({
      userId,
      type: 'daily_limit_reached',
      title: 'Daily Earning Limit Reached',
      message: `You've reached your daily earning limit of ${limit} LDAO tokens for ${activityNames[activityType] || activityType}. Come back tomorrow for more rewards!`,
      activityType,
      metadata: {
        limit,
        activityType
      }
    });
  }

  /**
   * Send streak bonus notification
   */
  async sendStreakBonusNotification(userId: string, streakDays: number, bonusTokens: number): Promise<void> {
    await this.sendEarningNotification({
      userId,
      type: 'streak_bonus',
      title: 'Streak Bonus Earned!',
      message: `Your ${streakDays}-day activity streak earned you a bonus of ${bonusTokens} LDAO tokens!`,
      tokensEarned: bonusTokens,
      metadata: {
        streakDays,
        bonusTokens
      }
    });
  }

  /**
   * Send batch notifications for multiple users
   */
  async sendBatchNotifications(notifications: EarningNotification[]): Promise<void> {
    const promises = notifications.map(notification => 
      this.sendEarningNotification(notification)
    );

    try {
      await Promise.allSettled(promises);
      safeLogger.info(`Sent ${notifications.length} earning notifications`);
    } catch (error) {
      safeLogger.error('Error sending batch notifications:', error);
    }
  }

  /**
   * Send activity summary notification (daily/weekly)
   */
  async sendActivitySummaryNotification(
    userId: string, 
    period: 'daily' | 'weekly',
    summary: {
      totalTokensEarned: number;
      activitiesCompleted: number;
      topActivityType: string;
      streak: number;
    }
  ): Promise<void> {
    const periodText = period === 'daily' ? 'today' : 'this week';
    const message = `${periodText.charAt(0).toUpperCase() + periodText.slice(1)} you earned ${summary.totalTokensEarned} LDAO tokens from ${summary.activitiesCompleted} activities. Your current streak: ${summary.streak} days!`;

    await this.sendEarningNotification({
      userId,
      type: 'earning_reward',
      title: `${period.charAt(0).toUpperCase() + period.slice(1)} Activity Summary`,
      message,
      tokensEarned: summary.totalTokensEarned,
      metadata: {
        period,
        summary
      }
    });
  }

  /**
   * Send community leaderboard notification
   */
  async sendLeaderboardNotification(
    userId: string,
    position: number,
    totalParticipants: number,
    tokensEarned: number,
    period: string
  ): Promise<void> {
    let message: string;
    let title: string;

    if (position <= 3) {
      title = `🏆 Top ${position} Earner!`;
      message = `Congratulations! You're #${position} on the ${period} earning leaderboard with ${tokensEarned} LDAO tokens!`;
    } else if (position <= 10) {
      title = `🌟 Top 10 Earner!`;
      message = `Great job! You're #${position} on the ${period} earning leaderboard with ${tokensEarned} LDAO tokens!`;
    } else {
      title = `📈 Leaderboard Update`;
      message = `You're #${position} out of ${totalParticipants} on the ${period} earning leaderboard with ${tokensEarned} LDAO tokens!`;
    }

    await this.sendEarningNotification({
      userId,
      type: 'earning_reward',
      title,
      message,
      tokensEarned,
      metadata: {
        leaderboardPosition: position,
        totalParticipants,
        period
      }
    });
  }
}

export const earningNotificationService = new EarningNotificationService();
