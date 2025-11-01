/**
 * Token Approval UX - Enhanced user experience for token approval flow
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { PaymentMethodIcon } from './PaymentMethodIcons';
import { TokenApprovalLoading } from './LoadingStates';

export interface TokenApprovalStep {
  status: 'pending' | 'in_progress' | 'success' | 'error';
  message: string;
  transactionHash?: string;
}

interface TokenApprovalFlowProps {
  tokenSymbol: string;
  amount: string;
  spenderName: string;
  onApprove: () => Promise<void>;
  onSkip?: () => void;
  currentAllowance?: string;
  approvalStatus?: 'checking' | 'needed' | 'sufficient' | 'approving' | 'approved' | 'failed';
  error?: string;
  blockExplorerUrl?: string;
}

export const TokenApprovalFlow: React.FC<TokenApprovalFlowProps> = ({
  tokenSymbol,
  amount,
  spenderName,
  onApprove,
  onSkip,
  currentAllowance = '0',
  approvalStatus = 'needed',
  error,
  blockExplorerUrl
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    switch (approvalStatus) {
      case 'approved':
        return <CheckCircle className="text-green-400" size={48} />;
      case 'failed':
        return <XCircle className="text-red-400" size={48} />;
      case 'checking':
      case 'approving':
        return null; // Show loading animation instead
      default:
        return <AlertCircle className="text-blue-400" size={48} />;
    }
  };

  const getStatusMessage = () => {
    switch (approvalStatus) {
      case 'checking':
        return 'Checking current allowance...';
      case 'needed':
        return 'Token approval required';
      case 'sufficient':
        return 'Sufficient allowance already approved';
      case 'approving':
        return `Approving ${tokenSymbol}...`;
      case 'approved':
        return 'Token approved successfully!';
      case 'failed':
        return 'Approval failed';
      default:
        return 'Token approval required';
    }
  };

  if (approvalStatus === 'approving') {
    return <TokenApprovalLoading tokenSymbol={tokenSymbol} />;
  }

  if (approvalStatus === 'sufficient') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <CheckCircle className="text-green-400" size={32} />
          <div>
            <h3 className="text-lg font-semibold text-white">
              Already Approved
            </h3>
            <p className="text-sm text-white/60">
              You have sufficient {tokenSymbol} allowance for this transaction
            </p>
          </div>
        </div>
        {onSkip && (
          <Button variant="primary" onClick={onSkip} className="w-full">
            Continue to Payment
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {approvalStatus !== 'checking' && getStatusIcon()}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">
            {getStatusMessage()}
          </h3>
          {approvalStatus === 'needed' && (
            <p className="text-sm text-white/60">
              One-time approval needed to spend your {tokenSymbol}
            </p>
          )}
        </div>
        <PaymentMethodIcon method={tokenSymbol.toLowerCase() as any} size={40} />
      </div>

      {/* Approval Details */}
      <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/70">Token:</span>
          <span className="text-sm font-semibold text-white">{tokenSymbol}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/70">Amount to approve:</span>
          <span className="text-sm font-semibold text-white">{amount} {tokenSymbol}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/70">Spender:</span>
          <span className="text-sm font-semibold text-white">{spenderName}</span>
        </div>
        {currentAllowance !== '0' && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/70">Current allowance:</span>
            <span className="text-sm font-semibold text-white">{currentAllowance} {tokenSymbol}</span>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-1">
              What is token approval?
            </h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Token approval allows the {spenderName} smart contract to spend your {tokenSymbol} on your behalf.
              This is a one-time security step required before making payments with ERC-20 tokens.
              You'll only need to do this once, unless you revoke the approval.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && approvalStatus === 'failed' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <XCircle className="text-red-400 flex-shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-1">
                Approval Failed
              </h4>
              <p className="text-xs text-white/70">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Technical Details */}
      <details className="mb-6">
        <summary className="text-sm text-white/70 cursor-pointer hover:text-white transition-colors mb-3">
          {showDetails ? 'Hide' : 'Show'} technical details
        </summary>
        <div className="bg-white/5 rounded-lg p-4 space-y-2 text-xs text-white/60">
          <p><strong>Function:</strong> approve(spender, amount)</p>
          <p><strong>Standard:</strong> ERC-20</p>
          <p><strong>Gas estimate:</strong> ~46,000 gas</p>
          <p><strong>Security:</strong> Approving exact amount (safer than infinite)</p>
          {blockExplorerUrl && (
            <a
              href={`${blockExplorerUrl}/token/${tokenSymbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View token contract <ExternalLink size={12} />
            </a>
          )}
        </div>
      </details>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          variant="primary"
          onClick={onApprove}
          disabled={approvalStatus === 'checking'}
          className="w-full"
        >
          {approvalStatus === 'checking'
            ? 'Checking...'
            : approvalStatus === 'failed'
            ? 'Retry Approval'
            : `Approve ${tokenSymbol}`
          }
        </Button>

        {/* Information about wallet interaction */}
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-yellow-300">
            You'll need to approve this transaction in your wallet. Make sure to check the details before confirming.
          </p>
        </div>
      </div>

      {/* Help Link */}
      <div className="mt-6 text-center">
        <a
          href="/help/token-approval"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
        >
          Learn more about token approvals <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

/**
 * Compact Token Approval Status - For showing approval status inline
 */
interface TokenApprovalStatusProps {
  tokenSymbol: string;
  status: 'checking' | 'needed' | 'approving' | 'approved' | 'failed';
}

export const TokenApprovalStatus: React.FC<TokenApprovalStatusProps> = ({
  tokenSymbol,
  status
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'approving':
        return 'text-blue-400 animate-pulse';
      default:
        return 'text-yellow-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking allowance...';
      case 'needed':
        return 'Approval needed';
      case 'approving':
        return 'Approving...';
      case 'approved':
        return 'Approved ✓';
      case 'failed':
        return 'Failed ✗';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <PaymentMethodIcon method={tokenSymbol.toLowerCase() as any} size={20} />
      <span className="text-white/70">{tokenSymbol}:</span>
      <span className={`font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
    </div>
  );
};
