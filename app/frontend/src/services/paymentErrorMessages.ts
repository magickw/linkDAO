/**
 * User-friendly payment error messages with actionable next steps
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  actionable: string[];
  icon: 'warning' | 'error' | 'info';
  retryable: boolean;
}

export class PaymentErrorMessages {
  /**
   * Convert technical error to user-friendly message
   */
  static getUserFriendlyError(error: Error | string): UserFriendlyError {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerError = errorMessage.toLowerCase();

    // Wallet connection errors
    if (lowerError.includes('wallet not connected') || lowerError.includes('no wallet')) {
      return {
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to continue with the payment.',
        actionable: [
          'Click the "Connect Wallet" button in the top right',
          'Select your preferred wallet (MetaMask, WalletConnect, etc.)',
          'Approve the connection request'
        ],
        icon: 'warning',
        retryable: true
      };
    }

    // Insufficient balance errors
    if (lowerError.includes('insufficient') && lowerError.includes('balance')) {
      const tokenMatch = errorMessage.match(/Insufficient (\w+) balance/);
      const token = tokenMatch ? tokenMatch[1] : 'token';

      return {
        title: 'Insufficient Balance',
        message: `You don't have enough ${token} to complete this payment.`,
        actionable: [
          `Add more ${token} to your wallet`,
          `Try using a different payment method`,
          `Reduce the purchase amount if possible`
        ],
        icon: 'error',
        retryable: false
      };
    }

    // Network/chain errors
    if (lowerError.includes('unsupported network') || lowerError.includes('switch') || lowerError.includes('chain')) {
      return {
        title: 'Wrong Network',
        message: 'You\'re connected to an unsupported network. Please switch to a supported network.',
        actionable: [
          'Open your wallet',
          'Switch to Ethereum, Polygon, Arbitrum, or Base',
          'Refresh the page after switching'
        ],
        icon: 'warning',
        retryable: true
      };
    }

    // Token approval errors
    if (lowerError.includes('approval') || lowerError.includes('allowance')) {
      return {
        title: 'Token Approval Required',
        message: 'You need to approve the contract to spend your tokens before payment can proceed.',
        actionable: [
          'Click "Approve" in your wallet when prompted',
          'Wait for the approval transaction to confirm',
          'The payment will proceed automatically after approval'
        ],
        icon: 'info',
        retryable: true
      };
    }

    // User rejected transaction
    if (lowerError.includes('user rejected') || lowerError.includes('user denied')) {
      return {
        title: 'Transaction Cancelled',
        message: 'You cancelled the transaction in your wallet.',
        actionable: [
          'Click "Retry" to try the payment again',
          'Make sure to approve the transaction in your wallet',
          'Contact support if you\'re experiencing issues'
        ],
        icon: 'info',
        retryable: true
      };
    }

    // Gas-related errors
    if (lowerError.includes('gas') || lowerError.includes('fee')) {
      return {
        title: 'Gas Fee Issue',
        message: 'There was a problem with the gas fees for this transaction.',
        actionable: [
          'Make sure you have enough ETH for gas fees',
          'Try again when network fees are lower',
          'Increase the gas limit if your wallet allows it'
        ],
        icon: 'warning',
        retryable: true
      };
    }

    // Transaction timeout
    if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
      return {
        title: 'Transaction Timeout',
        message: 'The transaction is taking longer than expected to process.',
        actionable: [
          'Check your transaction status on a block explorer',
          'Wait a few more minutes for confirmation',
          'Contact support if the issue persists'
        ],
        icon: 'warning',
        retryable: true
      };
    }

    // Transaction failed on-chain
    if (lowerError.includes('reverted') || lowerError.includes('failed')) {
      return {
        title: 'Transaction Failed',
        message: 'The transaction failed on the blockchain. This could be due to various reasons.',
        actionable: [
          'Check if you have sufficient token balance and gas',
          'Verify the transaction details are correct',
          'Try again with a higher gas limit',
          'Contact support if the problem continues'
        ],
        icon: 'error',
        retryable: true
      };
    }

    // Escrow contract errors
    if (lowerError.includes('escrow') && (lowerError.includes('not deployed') || lowerError.includes('not available'))) {
      return {
        title: 'Escrow Not Available',
        message: 'The escrow contract is not available on this network yet.',
        actionable: [
          'Try using a different network (Sepolia testnet is supported)',
          'Use direct payment instead of escrow',
          'Contact support for more information'
        ],
        icon: 'error',
        retryable: false
      };
    }

    // Contract interaction errors
    if (lowerError.includes('contract') || lowerError.includes('execution')) {
      return {
        title: 'Smart Contract Error',
        message: 'There was an error interacting with the smart contract.',
        actionable: [
          'Make sure you\'re using the correct network',
          'Check that the contract address is valid',
          'Try refreshing the page and attempting again',
          'Contact support if the issue persists'
        ],
        icon: 'error',
        retryable: true
      };
    }

    // Payment deadline errors
    if (lowerError.includes('deadline')) {
      return {
        title: 'Payment Deadline Passed',
        message: 'The payment window for this order has expired.',
        actionable: [
          'Create a new order to purchase this item',
          'Contact the seller to extend the deadline',
          'Complete payments more quickly in the future'
        ],
        icon: 'error',
        retryable: false
      };
    }

    // Network connectivity errors
    if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('rpc')) {
      return {
        title: 'Network Connection Issue',
        message: 'Unable to connect to the blockchain network.',
        actionable: [
          'Check your internet connection',
          'Try switching to a different RPC endpoint in your wallet',
          'Refresh the page and try again',
          'Contact support if the issue persists'
        ],
        icon: 'warning',
        retryable: true
      };
    }

    // Stripe errors (for fiat payments)
    if (lowerError.includes('stripe')) {
      return {
        title: 'Payment Processing Error',
        message: 'There was an error processing your payment through our payment provider.',
        actionable: [
          'Verify your payment method details are correct',
          'Try using a different payment method',
          'Contact your bank to ensure the transaction isn\'t blocked',
          'Contact support for assistance'
        ],
        icon: 'error',
        retryable: true
      };
    }

    // Generic/unknown error
    return {
      title: 'Payment Error',
      message: 'An unexpected error occurred while processing your payment.',
      actionable: [
        'Try refreshing the page and attempting again',
        'Make sure your wallet is connected and unlocked',
        'Check that you have sufficient balance for the payment',
        'Contact support with error details: ' + errorMessage.substring(0, 100)
      ],
      icon: 'error',
      retryable: true
    };
  }

  /**
   * Get a brief error summary for inline display
   */
  static getBriefError(error: Error | string): string {
    const friendly = this.getUserFriendlyError(error);
    return friendly.message;
  }

  /**
   * Get retry recommendation
   */
  static shouldShowRetry(error: Error | string): boolean {
    const friendly = this.getUserFriendlyError(error);
    return friendly.retryable;
  }

  /**
   * Get error icon type
   */
  static getErrorIcon(error: Error | string): 'warning' | 'error' | 'info' {
    const friendly = this.getUserFriendlyError(error);
    return friendly.icon;
  }
}
