import { x402PaymentService } from './x402PaymentService';

export class X402PaymentMonitor {
  private static instance: X402PaymentMonitor;
  private monitoredTransactions: Map<string, {
    orderId: string;
    onStatusChange: (status: 'pending' | 'completed' | 'failed') => void;
    pollInterval: NodeJS.Timeout;
    startTime: number;
    maxPollTime: number;
  }> = new Map();

  private constructor() {}

  static getInstance(): X402PaymentMonitor {
    if (!X402PaymentMonitor.instance) {
      X402PaymentMonitor.instance = new X402PaymentMonitor();
    }
    return X402PaymentMonitor.instance;
  }

  /**
   * Start monitoring a payment transaction
   */
  startMonitoring(
    transactionId: string, 
    orderId: string,
    onStatusChange: (status: 'pending' | 'completed' | 'failed') => void,
    maxPollTime: number = 15 * 60 * 1000 // 15 minutes default
  ): void {
    // Clear any existing monitoring for this transaction
    this.stopMonitoring(transactionId);

    const pollInterval = setInterval(async () => {
      try {
        const result = await x402PaymentService.checkPaymentStatus(transactionId);
        
        if (result.success && result.status) {
          onStatusChange(result.status);
          
          // Stop monitoring if payment is completed or failed
          if (result.status === 'completed' || result.status === 'failed') {
            this.stopMonitoring(transactionId);
            
            // Clean up localStorage
            localStorage.removeItem(`x402_${transactionId}`);
          }
        }
      } catch (error) {
        console.error('Error checking x402 payment status:', error);
      }
    }, 3000); // Poll every 3 seconds

    this.monitoredTransactions.set(transactionId, {
      orderId,
      onStatusChange,
      pollInterval,
      startTime: Date.now(),
      maxPollTime
    });

    // Set timeout to stop monitoring after maxPollTime
    setTimeout(() => {
      const transaction = this.monitoredTransactions.get(transactionId);
      if (transaction && Date.now() - transaction.startTime > transaction.maxPollTime) {
        onStatusChange('failed');
        this.stopMonitoring(transactionId);
      }
    }, maxPollTime);
  }

  /**
   * Stop monitoring a transaction
   */
  stopMonitoring(transactionId: string): void {
    const transaction = this.monitoredTransactions.get(transactionId);
    if (transaction) {
      clearInterval(transaction.pollInterval);
      this.monitoredTransactions.delete(transactionId);
    }
  }

  /**
   * Get all currently monitored transactions
   */
  getMonitoredTransactions(): string[] {
    return Array.from(this.monitoredTransactions.keys());
  }

  /**
   * Check if a transaction is being monitored
   */
  isMonitoring(transactionId: string): boolean {
    return this.monitoredTransactions.has(transactionId);
  }

  /**
   * Clean up all monitoring (useful for page unload)
   */
  cleanup(): void {
    this.monitoredTransactions.forEach((transaction, transactionId) => {
      clearInterval(transaction.pollInterval);
    });
    this.monitoredTransactions.clear();
  }
}

// Export singleton instance
export const x402PaymentMonitor = X402PaymentMonitor.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    x402PaymentMonitor.cleanup();
  });
}