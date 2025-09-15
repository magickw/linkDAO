/**
 * Notification Service for Wallet-to-Wallet Messaging
 * Handles browser notifications and block explorer integration
 */

export interface NotificationSettings {
  browserNotifications: boolean;
  messageNotifications: boolean;
  nftOfferNotifications: boolean;
  blockExplorerNotifications: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface MessageNotificationData {
  id: string;
  fromAddress: string;
  toAddress: string;
  content: string;
  messageType: 'text' | 'nft_offer' | 'nft_counter' | 'system' | 'file';
  timestamp: Date;
  conversationId: string;
}

export interface BlockExplorerNotification {
  id: string;
  address: string;
  transactionHash?: string;
  blockNumber?: number;
  type: 'message_received' | 'message_sent' | 'nft_offer' | 'reward_received';
  message: string;
  timestamp: Date;
  explorerUrl: string;
}

class NotificationService {
  private settings: NotificationSettings;
  private isInitialized = false;
  private notificationQueue: MessageNotificationData[] = [];
  private blockExplorerQueue: BlockExplorerNotification[] = [];

  constructor() {
    this.settings = this.getDefaultSettings();
    // Initialize settings after constructor in browser
    if (typeof window !== 'undefined') {
      this.settings = this.loadSettings();
      this.initializeService();
    }
  }

  /**
   * Initialize the notification service
   */
  async initializeService(): Promise<void> {
    try {
      // Only initialize in browser environment
      if (typeof window === 'undefined') {
        return;
      }

      // Request notification permission
      if ('Notification' in window) {
        await this.requestNotificationPermission();
      }

      // Initialize service worker for background notifications
      if ('serviceWorker' in navigator) {
        await this.initializeServiceWorker();
      }

      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Initialize service worker for background notifications
   */
  private async initializeServiceWorker(): Promise<void> {
    try {
      // Register service worker if not already registered
      if ('serviceWorker' in navigator) {
        // In a real implementation, you'd register an actual service worker file
        console.log('Service worker support detected');
      }
    } catch (error) {
      console.error('Service worker initialization failed:', error);
    }
  }

  /**
   * Show message notification
   */
  async showMessageNotification(data: MessageNotificationData): Promise<void> {
    if (!this.settings.messageNotifications) {
      return;
    }

    try {
      // Queue notification if service not ready
      if (!this.isInitialized) {
        this.notificationQueue.push(data);
        return;
      }

      const title = this.getNotificationTitle(data);
      const body = this.getNotificationBody(data);
      const icon = this.getNotificationIcon(data);

      // Show browser notification
      if (this.settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon,
          badge: '/icons/message-badge.png',
          tag: `message-${data.id}`,
          // timestamp: data.timestamp.getTime(), // Not supported in all browsers
          data: {
            conversationId: data.conversationId,
            messageId: data.id,
            fromAddress: data.fromAddress
          }
          // actions: [ // Not supported in all browsers
          //   {
          //     action: 'reply',
          //     title: 'Reply',
          //     icon: '/icons/reply.png'
          //   },
          //   {
          //     action: 'view',
          //     title: 'View',
          //     icon: '/icons/view.png'
          //   }
          // ]
        });

        // Handle notification click
        notification.onclick = () => {
          this.handleNotificationClick(data);
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Play sound if enabled
      if (this.settings.sound) {
        this.playNotificationSound(data.messageType);
      }

      // Vibrate if enabled and supported
      if (this.settings.vibration && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // Create block explorer notification
      if (this.settings.blockExplorerNotifications) {
        await this.createBlockExplorerNotification(data);
      }

    } catch (error) {
      console.error('Failed to show message notification:', error);
    }
  }

  /**
   * Show NFT offer notification
   */
  async showNFTOfferNotification(data: MessageNotificationData): Promise<void> {
    if (!this.settings.nftOfferNotifications) {
      return;
    }

    const title = '🎨 NFT Offer Received';
    const body = `New NFT offer from ${this.formatAddress(data.fromAddress)}`;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icons/nft-icon.png',
        badge: '/icons/nft-badge.png',
        tag: `nft-offer-${data.id}`,
        data: data
        // actions: [ // Not supported in all browsers
        //   {
        //     action: 'view_offer',
        //     title: 'View Offer',
        //     icon: '/icons/view.png'
        //   },
        //   {
        //     action: 'decline',
        //     title: 'Decline',
        //     icon: '/icons/decline.png'
        //   }
        // ]
      });

      notification.onclick = () => {
        this.handleNFTOfferClick(data);
        notification.close();
      };
    }

    // Special sound for NFT offers
    if (this.settings.sound) {
      this.playNotificationSound('nft_offer');
    }
  }

  /**
   * Create block explorer notification
   */
  private async createBlockExplorerNotification(data: MessageNotificationData): Promise<void> {
    try {
      // In a real implementation, this would integrate with actual block explorers
      // and potentially create on-chain notifications or use services like Push Protocol

      const explorerNotification: BlockExplorerNotification = {
        id: `explorer-${data.id}`,
        address: data.toAddress,
        type: 'message_received',
        message: `New message from ${this.formatAddress(data.fromAddress)}`,
        timestamp: data.timestamp,
        explorerUrl: this.getExplorerUrl(data.toAddress)
      };

      this.blockExplorerQueue.push(explorerNotification);

      // Simulate block explorer integration
      console.log('Block explorer notification created:', explorerNotification);

      // In a real implementation, you might:
      // 1. Use Push Protocol or similar for decentralized notifications
      // 2. Create a transaction with notification data
      // 3. Use IPFS to store notification metadata
      // 4. Integrate with specific explorer APIs

    } catch (error) {
      console.error('Failed to create block explorer notification:', error);
    }
  }

  /**
   * Handle notification interactions
   */
  private handleNotificationClick(data: MessageNotificationData): void {
    // Focus window and navigate to conversation
    window.focus();
    
    // Emit event for the main app to handle
    const event = new CustomEvent('notification-click', {
      detail: {
        type: 'message',
        conversationId: data.conversationId,
        messageId: data.id
      }
    });
    window.dispatchEvent(event);
  }

  private handleNFTOfferClick(data: MessageNotificationData): void {
    window.focus();
    
    const event = new CustomEvent('notification-click', {
      detail: {
        type: 'nft_offer',
        conversationId: data.conversationId,
        messageId: data.id
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Play notification sounds
   */
  private playNotificationSound(messageType: string): void {
    try {
      let soundFile = '/sounds/message.mp3';
      
      switch (messageType) {
        case 'nft_offer':
          soundFile = '/sounds/nft-offer.mp3';
          break;
        case 'nft_counter':
          soundFile = '/sounds/nft-counter.mp3';
          break;
        case 'system':
          soundFile = '/sounds/system.mp3';
          break;
        case 'file':
          soundFile = '/sounds/file.mp3';
          break;
        default:
          soundFile = '/sounds/message.mp3';
      }

      const audio = new Audio(soundFile);
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }

  /**
   * Utility methods
   */
  private getNotificationTitle(data: MessageNotificationData): string {
    switch (data.messageType) {
      case 'nft_offer':
        return '🎨 NFT Offer';
      case 'nft_counter':
        return '🔄 NFT Counter Offer';
      case 'system':
        return '🔔 System Message';
      case 'file':
        return '📎 File Shared';
      default:
        return '💬 New Message';
    }
  }

  private getNotificationBody(data: MessageNotificationData): string {
    const fromFormatted = this.formatAddress(data.fromAddress);
    
    switch (data.messageType) {
      case 'nft_offer':
        return `NFT offer from ${fromFormatted}`;
      case 'nft_counter':
        return `Counter offer from ${fromFormatted}`;
      case 'system':
        return data.content;
      case 'file':
        return `File shared by ${fromFormatted}`;
      default:
        return `Message from ${fromFormatted}: ${data.content.slice(0, 50)}${data.content.length > 50 ? '...' : ''}`;
    }
  }

  private getNotificationIcon(data: MessageNotificationData): string {
    switch (data.messageType) {
      case 'nft_offer':
      case 'nft_counter':
        return '/icons/nft-icon.png';
      case 'system':
        return '/icons/system-icon.png';
      case 'file':
        return '/icons/file-icon.png';
      default:
        return '/icons/message-icon.png';
    }
  }

  private formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private getExplorerUrl(address: string): string {
    // Default to Etherscan for now
    return `https://etherscan.io/address/${address}`;
  }

  /**
   * Settings management
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  private loadSettings(): NotificationSettings {
    try {
      // Only access localStorage in browser
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return this.getDefaultSettings();
      }
      
      const stored = localStorage.getItem('messaging-notification-settings');
      if (stored) {
        return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
    
    return this.getDefaultSettings();
  }

  private saveSettings(): void {
    try {
      // Only access localStorage in browser
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      localStorage.setItem('messaging-notification-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      browserNotifications: true,
      messageNotifications: true,
      nftOfferNotifications: true,
      blockExplorerNotifications: false, // Disabled by default (requires integration)
      sound: true,
      vibration: true
    };
  }

  /**
   * Process queued notifications
   */
  private async processNotificationQueue(): Promise<void> {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        await this.showMessageNotification(notification);
      }
    }
  }

  /**
   * Get block explorer notifications
   */
  getBlockExplorerNotifications(): BlockExplorerNotification[] {
    return [...this.blockExplorerQueue];
  }

  /**
   * Clear notifications
   */
  clearNotifications(): void {
    this.notificationQueue = [];
    this.blockExplorerQueue = [];
  }

  /**
   * Test notification
   */
  async testNotification(): Promise<void> {
    const testData: MessageNotificationData = {
      id: 'test-' + Date.now(),
      fromAddress: '0x742d35Cc6634C0532925a3b8D91B062fd8AfD34a',
      toAddress: '0x123456789abcdef123456789abcdef1234567890',
      content: 'This is a test notification',
      messageType: 'text',
      timestamp: new Date(),
      conversationId: 'test-conversation'
    };

    await this.showMessageNotification(testData);
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.clearNotifications();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;