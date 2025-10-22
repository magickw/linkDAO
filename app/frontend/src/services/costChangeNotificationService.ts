/**
 * Cost Change Notification Service
 * Manages user notifications for cost changes and prioritization updates
 */

import { 
  PaymentMethod,
  PaymentMethodType,
  PrioritizedPaymentMethod 
} from '../types/paymentPrioritization';

interface CostChangeNotification {
  id: string;
  type: 'gas_price_change' | 'exchange_rate_change' | 'prioritization_update' | 'network_congestion' | 'cost_savings_opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: string;
  oldValue?: number;
  newValue?: number;
  percentageChange?: number;
  affectedMethods: PaymentMethod[];
  actionRequired?: string;
  actionButtons?: NotificationAction[];
  timestamp: Date;
  expiresAt?: Date;
  isRead: boolean;
  isDismissed: boolean;
  context?: string; // checkout session or user context
}

interface NotificationAction {
  label: string;
  action: 'dismiss' | 'switch_method' | 'view_alternatives' | 'set_alert' | 'custom';
  data?: any;
  style?: 'primary' | 'secondary' | 'warning' | 'danger';
}

interface NotificationPreferences {
  enableGasPriceAlerts: boolean;
  enableExchangeRateAlerts: boolean;
  enablePrioritizationUpdates: boolean;
  enableCostSavingsAlerts: boolean;
  gasPriceThresholds: {
    warningThreshold: number; // USD
    criticalThreshold: number; // USD
  };
  exchangeRateThresholds: {
    warningPercentage: number;
    criticalPercentage: number;
  };
  notificationMethods: {
    inApp: boolean;
    browser: boolean;
    sound: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  };
}

export class CostChangeNotificationService {
  private notifications: Map<string, CostChangeNotification> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private preferences: NotificationPreferences;
  private notificationQueue: CostChangeNotification[] = [];
  private isProcessingQueue = false;

  constructor(preferences?: Partial<NotificationPreferences>) {
    this.preferences = {
      enableGasPriceAlerts: true,
      enableExchangeRateAlerts: true,
      enablePrioritizationUpdates: true,
      enableCostSavingsAlerts: true,
      gasPriceThresholds: {
        warningThreshold: 25, // $25
        criticalThreshold: 50 // $50
      },
      exchangeRateThresholds: {
        warningPercentage: 5, // 5%
        criticalPercentage: 10 // 10%
      },
      notificationMethods: {
        inApp: true,
        browser: false,
        sound: false
      },
      ...preferences
    };

    this.requestBrowserNotificationPermission();
  }

  /**
   * Create and display a gas price change notification
   */
  notifyGasPriceChange(
    chainId: number,
    oldPrice: number,
    newPrice: number,
    affectedMethods: PaymentMethod[],
    context?: string
  ): void {
    if (!this.preferences.enableGasPriceAlerts) return;

    const percentageChange = ((newPrice - oldPrice) / oldPrice) * 100;
    const isIncrease = newPrice > oldPrice;
    
    let severity: CostChangeNotification['severity'] = 'low';
    if (newPrice >= this.preferences.gasPriceThresholds.criticalThreshold) {
      severity = 'critical';
    } else if (newPrice >= this.preferences.gasPriceThresholds.warningThreshold) {
      severity = 'high';
    } else if (Math.abs(percentageChange) >= 15) {
      severity = 'medium';
    }

    const notification: CostChangeNotification = {
      id: `gas_price_${chainId}_${Date.now()}`,
      type: 'gas_price_change',
      severity,
      title: `Gas Prices ${isIncrease ? 'Increased' : 'Decreased'}`,
      message: `Gas fees ${isIncrease ? 'rose' : 'dropped'} by ${Math.abs(percentageChange).toFixed(1)}% to $${newPrice.toFixed(2)}`,
      details: this.getChainName(chainId),
      oldValue: oldPrice,
      newValue: newPrice,
      percentageChange,
      affectedMethods,
      actionRequired: severity === 'critical' 
        ? 'Consider switching to fiat payment or waiting for lower fees'
        : severity === 'high'
        ? 'Review payment method options'
        : undefined,
      actionButtons: this.getGasPriceActionButtons(severity, affectedMethods),
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      isRead: false,
      isDismissed: false,
      context
    };

    this.addNotification(notification);
  }

  /**
   * Create and display an exchange rate change notification
   */
  notifyExchangeRateChange(
    currency: string,
    oldRate: number,
    newRate: number,
    affectedMethods: PaymentMethod[],
    context?: string
  ): void {
    if (!this.preferences.enableExchangeRateAlerts) return;

    const percentageChange = ((newRate - oldRate) / oldRate) * 100;
    const isIncrease = newRate > oldRate;

    let severity: CostChangeNotification['severity'] = 'low';
    if (Math.abs(percentageChange) >= this.preferences.exchangeRateThresholds.criticalPercentage) {
      severity = 'critical';
    } else if (Math.abs(percentageChange) >= this.preferences.exchangeRateThresholds.warningPercentage) {
      severity = 'medium';
    }

    const notification: CostChangeNotification = {
      id: `exchange_rate_${currency}_${Date.now()}`,
      type: 'exchange_rate_change',
      severity,
      title: `${currency} Price ${isIncrease ? 'Increased' : 'Decreased'}`,
      message: `${currency} ${isIncrease ? 'gained' : 'lost'} ${Math.abs(percentageChange).toFixed(1)}% to $${newRate.toFixed(2)}`,
      oldValue: oldRate,
      newValue: newRate,
      percentageChange,
      affectedMethods,
      actionButtons: this.getExchangeRateActionButtons(currency, affectedMethods),
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      isRead: false,
      isDismissed: false,
      context
    };

    this.addNotification(notification);
  }

  /**
   * Create and display a prioritization update notification
   */
  notifyPrioritizationUpdate(
    updatedMethods: PrioritizedPaymentMethod[],
    reason: string,
    context?: string
  ): void {
    if (!this.preferences.enablePrioritizationUpdates) return;

    const topMethod = updatedMethods[0];
    
    const notification: CostChangeNotification = {
      id: `prioritization_${context || 'global'}_${Date.now()}`,
      type: 'prioritization_update',
      severity: 'medium',
      title: 'Payment Methods Reordered',
      message: `${topMethod?.method.name || 'Payment method'} is now recommended`,
      details: reason,
      affectedMethods: updatedMethods.map(pm => pm.method),
      actionButtons: [
        {
          label: 'View Options',
          action: 'view_alternatives',
          style: 'primary'
        },
        {
          label: 'Dismiss',
          action: 'dismiss',
          style: 'secondary'
        }
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      isRead: false,
      isDismissed: false,
      context
    };

    this.addNotification(notification);
  }

  /**
   * Create and display a cost savings opportunity notification
   */
  notifyCostSavingsOpportunity(
    currentMethod: PaymentMethod,
    recommendedMethod: PaymentMethod,
    savingsAmount: number,
    context?: string
  ): void {
    if (!this.preferences.enableCostSavingsAlerts) return;

    const notification: CostChangeNotification = {
      id: `savings_${context || 'global'}_${Date.now()}`,
      type: 'cost_savings_opportunity',
      severity: 'medium',
      title: 'Cost Savings Available',
      message: `Save $${savingsAmount.toFixed(2)} by switching to ${recommendedMethod.name}`,
      details: `Currently using ${currentMethod.name}`,
      affectedMethods: [currentMethod, recommendedMethod],
      actionButtons: [
        {
          label: `Switch to ${recommendedMethod.name}`,
          action: 'switch_method',
          data: { methodId: recommendedMethod.id },
          style: 'primary'
        },
        {
          label: 'Keep Current',
          action: 'dismiss',
          style: 'secondary'
        }
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      isRead: false,
      isDismissed: false,
      context
    };

    this.addNotification(notification);
  }

  /**
   * Create and display a network congestion notification
   */
  notifyNetworkCongestion(
    chainId: number,
    congestionLevel: 'medium' | 'high',
    estimatedDelay: string,
    affectedMethods: PaymentMethod[],
    context?: string
  ): void {
    const severity = congestionLevel === 'high' ? 'high' : 'medium';
    
    const notification: CostChangeNotification = {
      id: `congestion_${chainId}_${Date.now()}`,
      type: 'network_congestion',
      severity,
      title: `${this.getChainName(chainId)} Network Congested`,
      message: `Expect ${estimatedDelay} confirmation times`,
      details: `Network congestion is ${congestionLevel}`,
      affectedMethods,
      actionRequired: congestionLevel === 'high' 
        ? 'Consider using fiat payment for faster processing'
        : undefined,
      actionButtons: this.getNetworkCongestionActionButtons(affectedMethods),
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
      isRead: false,
      isDismissed: false,
      context
    };

    this.addNotification(notification);
  }

  /**
   * Add notification to the system
   */
  private addNotification(notification: CostChangeNotification): void {
    // Check if we're in quiet hours
    if (this.isInQuietHours()) {
      this.notificationQueue.push(notification);
      return;
    }

    // Remove expired notifications
    this.cleanupExpiredNotifications();

    // Check for duplicate notifications
    const existingNotification = this.findSimilarNotification(notification);
    if (existingNotification) {
      // Update existing notification instead of creating new one
      this.updateNotification(existingNotification.id, notification);
      return;
    }

    // Add new notification
    this.notifications.set(notification.id, notification);

    // Display notification
    this.displayNotification(notification);

    // Emit event
    this.emit('notification_added', notification);

    console.log('Added cost change notification:', notification);
  }

  /**
   * Display notification to user
   */
  private displayNotification(notification: CostChangeNotification): void {
    // In-app notification
    if (this.preferences.notificationMethods.inApp) {
      this.emit('show_notification', notification);
    }

    // Browser notification
    if (this.preferences.notificationMethods.browser && 'Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: this.getNotificationIcon(notification.type),
        tag: notification.id,
        requireInteraction: notification.severity === 'critical'
      });

      browserNotification.onclick = () => {
        this.markAsRead(notification.id);
        this.emit('notification_clicked', notification);
        browserNotification.close();
      };
    }

    // Sound notification
    if (this.preferences.notificationMethods.sound && notification.severity !== 'low') {
      this.playNotificationSound(notification.severity);
    }
  }

  /**
   * Get all notifications
   */
  getAllNotifications(): CostChangeNotification[] {
    this.cleanupExpiredNotifications();
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): CostChangeNotification[] {
    return this.getAllNotifications().filter(n => !n.isRead);
  }

  /**
   * Get notifications by context
   */
  getNotificationsByContext(context: string): CostChangeNotification[] {
    return this.getAllNotifications().filter(n => n.context === context);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.isRead = true;
      this.emit('notification_read', notification);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
      }
    });
    this.emit('all_notifications_read', {});
  }

  /**
   * Dismiss notification
   */
  dismissNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.isDismissed = true;
      this.emit('notification_dismissed', notification);
    }
  }

  /**
   * Remove notification
   */
  removeNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      this.notifications.delete(notificationId);
      this.emit('notification_removed', notification);
    }
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notifications.clear();
    this.emit('all_notifications_cleared', {});
  }

  /**
   * Update notification preferences
   */
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.emit('preferences_updated', this.preferences);
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Helper methods
  private getGasPriceActionButtons(severity: string, affectedMethods: PaymentMethod[]): NotificationAction[] {
    const buttons: NotificationAction[] = [];

    if (severity === 'critical' || severity === 'high') {
      // Find fiat alternative
      const hasFiatOption = affectedMethods.some(method => method.type === PaymentMethodType.FIAT_STRIPE);
      if (hasFiatOption) {
        buttons.push({
          label: 'Use Fiat Payment',
          action: 'switch_method',
          data: { methodType: PaymentMethodType.FIAT_STRIPE },
          style: 'primary'
        });
      }
    }

    buttons.push(
      {
        label: 'View Alternatives',
        action: 'view_alternatives',
        style: 'secondary'
      },
      {
        label: 'Set Alert',
        action: 'set_alert',
        style: 'secondary'
      },
      {
        label: 'Dismiss',
        action: 'dismiss',
        style: 'secondary'
      }
    );

    return buttons;
  }

  private getExchangeRateActionButtons(currency: string, affectedMethods: PaymentMethod[]): NotificationAction[] {
    return [
      {
        label: 'View Impact',
        action: 'view_alternatives',
        style: 'primary'
      },
      {
        label: 'Dismiss',
        action: 'dismiss',
        style: 'secondary'
      }
    ];
  }

  private getNetworkCongestionActionButtons(affectedMethods: PaymentMethod[]): NotificationAction[] {
    const buttons: NotificationAction[] = [];

    // Find fiat alternative
    const hasFiatOption = affectedMethods.some(method => method.type === PaymentMethodType.FIAT_STRIPE);
    if (hasFiatOption) {
      buttons.push({
        label: 'Use Fiat Payment',
        action: 'switch_method',
        data: { methodType: PaymentMethodType.FIAT_STRIPE },
        style: 'primary'
      });
    }

    buttons.push(
      {
        label: 'Wait for Lower Fees',
        action: 'dismiss',
        style: 'secondary'
      }
    );

    return buttons;
  }

  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      42161: 'Arbitrum',
      11155111: 'Sepolia'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }

  private getNotificationIcon(type: CostChangeNotification['type']): string {
    const iconMap: Record<string, string> = {
      gas_price_change: '/icons/gas-icon.png',
      exchange_rate_change: '/icons/exchange-icon.png',
      prioritization_update: '/icons/priority-icon.png',
      network_congestion: '/icons/network-icon.png',
      cost_savings_opportunity: '/icons/savings-icon.png'
    };
    return iconMap[type] || '/icons/notification-icon.png';
  }

  private playNotificationSound(severity: string): void {
    if (typeof Audio === 'undefined') return;

    const soundMap: Record<string, string> = {
      low: '/sounds/notification-low.mp3',
      medium: '/sounds/notification-medium.mp3',
      high: '/sounds/notification-high.mp3',
      critical: '/sounds/notification-critical.mp3'
    };

    const audio = new Audio(soundMap[severity] || soundMap.medium);
    audio.volume = 0.5;
    audio.play().catch(console.error);
  }

  private isInQuietHours(): boolean {
    if (!this.preferences.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = this.preferences.quietHours;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private findSimilarNotification(notification: CostChangeNotification): CostChangeNotification | null {
    for (const existing of this.notifications.values()) {
      if (existing.type === notification.type && 
          existing.context === notification.context &&
          !existing.isDismissed &&
          (Date.now() - existing.timestamp.getTime()) < 5 * 60 * 1000) { // Within 5 minutes
        return existing;
      }
    }
    return null;
  }

  private updateNotification(id: string, newData: CostChangeNotification): void {
    const existing = this.notifications.get(id);
    if (existing) {
      // Update with new data but keep read status
      const updated = {
        ...newData,
        id: existing.id,
        isRead: existing.isRead,
        isDismissed: existing.isDismissed
      };
      this.notifications.set(id, updated);
      this.emit('notification_updated', updated);
    }
  }

  private cleanupExpiredNotifications(): void {
    const now = Date.now();
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.expiresAt && notification.expiresAt.getTime() < now) {
        this.notifications.delete(id);
      }
    }
  }

  private async requestBrowserNotificationPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in notification event callback:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const costChangeNotificationService = new CostChangeNotificationService();

export default CostChangeNotificationService;