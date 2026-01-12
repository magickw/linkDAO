/**
 * Beta Warning Banner Component
 * Displays a prominent warning for beta release
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

interface BetaWarningBannerProps {
  className?: string;
  dismissible?: boolean;
  persistDismissal?: boolean;
}

const BETA_CONFIG = {
  maxTransactionEth: 1, // Maximum 1 ETH per transaction during beta
  maxDailyEth: 5, // Maximum 5 ETH total per day during beta
  warningThresholdEth: 0.5, // Show extra warning above 0.5 ETH
  version: '0.1.0-beta',
  feedbackUrl: 'https://github.com/linkdao/wallet/issues',
  docsUrl: 'https://docs.linkdao.io/wallet/beta',
};

export const BETA_LIMITS = BETA_CONFIG;

const STORAGE_KEY = 'linkdao_beta_banner_dismissed';

export const BetaWarningBanner: React.FC<BetaWarningBannerProps> = ({
  className = '',
  dismissible = true,
  persistDismissal = true,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (persistDismissal) {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [persistDismissal]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      if (persistDismissal) {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    }, 300);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={`
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        transition-all duration-300 ease-in-out
        ${className}
      `}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Main Warning */}
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">
                  Beta Version - Not for Large Amounts
                </p>
                <p className="text-sm text-amber-100">
                  This wallet is in beta testing. Transaction limits apply: max {BETA_CONFIG.maxTransactionEth} ETH per transaction, {BETA_CONFIG.maxDailyEth} ETH per day.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <a
                href={BETA_CONFIG.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-white hover:text-amber-200 flex items-center space-x-1 underline"
              >
                <span>Learn More</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={BETA_CONFIG.feedbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
              >
                Report Issue
              </a>
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Dismiss beta warning"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compact reminder bar (shows after dismissal on subsequent visits) */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
        <div className="max-w-7xl mx-auto px-4 py-1">
          <p className="text-xs text-amber-800 dark:text-amber-200 text-center">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Beta v{BETA_CONFIG.version} - Max {BETA_CONFIG.maxTransactionEth} ETH/tx | {BETA_CONFIG.maxDailyEth} ETH/day
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact beta badge for headers/sidebars
 */
export const BetaBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
        bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200
        border border-amber-300 dark:border-amber-700
        ${className}
      `}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      BETA
    </span>
  );
};

/**
 * Transaction limit warning for send forms
 */
export const BetaTransactionWarning: React.FC<{
  amountEth: number;
  className?: string;
}> = ({ amountEth, className = '' }) => {
  if (amountEth <= 0) return null;

  const isOverLimit = amountEth > BETA_CONFIG.maxTransactionEth;
  const isWarning = amountEth > BETA_CONFIG.warningThresholdEth && !isOverLimit;

  if (!isOverLimit && !isWarning) return null;

  return (
    <div
      className={`
        p-3 rounded-lg border
        ${isOverLimit
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
        }
        ${className}
      `}
    >
      <div className="flex items-start space-x-2">
        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${isOverLimit ? 'text-red-500' : 'text-amber-500'}`} />
        <div>
          {isOverLimit ? (
            <>
              <p className="font-medium">Transaction Exceeds Beta Limit</p>
              <p className="text-sm mt-1">
                Maximum transaction amount during beta is {BETA_CONFIG.maxTransactionEth} ETH.
                Your transaction of {amountEth.toFixed(4)} ETH cannot proceed.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Large Transaction Warning</p>
              <p className="text-sm mt-1">
                You're sending {amountEth.toFixed(4)} ETH. During beta, we recommend keeping
                transactions under {BETA_CONFIG.warningThresholdEth} ETH.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetaWarningBanner;
