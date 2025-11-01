/**
 * Loading State Component - Shows progress during payment processing
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message: string;
  submessage?: string;
  progress?: number; // 0-100
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  submessage,
  progress
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Spinner */}
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        <Loader2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-400" size={24} />
      </div>

      {/* Message */}
      <h3 className="text-lg font-semibold text-white text-center mb-2">
        {message}
      </h3>

      {/* Submessage */}
      {submessage && (
        <p className="text-sm text-white/60 text-center mb-4 max-w-sm">
          {submessage}
        </p>
      )}

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white/50 text-center mt-2">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}

      {/* Animation dots */}
      <div className="flex gap-2 mt-4">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

/**
 * Payment Step Loading Indicator
 */
interface PaymentStepLoadingProps {
  step: string;
  total: number;
  current: number;
}

export const PaymentStepLoading: React.FC<PaymentStepLoadingProps> = ({
  step,
  total,
  current
}) => {
  const progress = (current / total) * 100;

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <Loader2 className="text-blue-400 animate-spin" size={20} />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{step}</p>
          <p className="text-xs text-white/50">Step {current} of {total}</p>
        </div>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Token Approval Loading State
 */
interface TokenApprovalLoadingProps {
  tokenSymbol: string;
}

export const TokenApprovalLoading: React.FC<TokenApprovalLoadingProps> = ({
  tokenSymbol
}) => {
  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-purple-500/30 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-3 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white mb-1">
            Approving {tokenSymbol}
          </h3>
          <p className="text-sm text-white/60">
            Waiting for wallet approval...
          </p>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-3">
        <p className="text-xs text-white/70 leading-relaxed">
          <span className="font-semibold text-purple-400">What's happening:</span>
          <br />
          You need to approve the contract to spend your {tokenSymbol} tokens.
          This is a one-time security step. Please confirm the transaction in your wallet.
        </p>
      </div>

      {/* Animated progress indicator */}
      <div className="mt-4 flex justify-center gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-8 bg-purple-400/30 rounded-full"
            style={{
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Transaction Confirming Loading State
 */
interface TransactionConfirmingProps {
  transactionHash?: string;
  confirmations: number;
  requiredConfirmations: number;
  blockExplorerUrl?: string;
}

export const TransactionConfirming: React.FC<TransactionConfirmingProps> = ({
  transactionHash,
  confirmations,
  requiredConfirmations,
  blockExplorerUrl
}) => {
  const progress = (confirmations / requiredConfirmations) * 100;

  return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
          <Loader2 className="text-green-400 animate-spin" size={24} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white mb-1">
            Confirming Transaction
          </h3>
          <p className="text-sm text-white/60">
            {confirmations} of {requiredConfirmations} confirmations
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/50">
          <span>{confirmations} blocks</span>
          <span>{requiredConfirmations} blocks needed</span>
        </div>
      </div>

      {/* Transaction hash link */}
      {transactionHash && blockExplorerUrl && (
        <a
          href={`${blockExplorerUrl}/tx/${transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
        >
          View on block explorer →
        </a>
      )}

      <p className="text-xs text-white/50 mt-3">
        This usually takes 1-5 minutes depending on network congestion
      </p>
    </div>
  );
};
