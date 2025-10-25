import React from 'react';
import { AlertTriangle, Shield, Eye, Clock } from 'lucide-react';

interface ModerationWarningProps {
  status?: 'active' | 'limited' | 'pending_review' | 'blocked';
  warning?: string | null;
  riskScore?: number;
  className?: string;
}

/**
 * ModerationWarning Component
 *
 * Displays moderation status and warnings for content
 * Shows appropriate styling and icons based on moderation level
 */
export const ModerationWarning: React.FC<ModerationWarningProps> = ({
  status = 'active',
  warning,
  riskScore,
  className = ''
}) => {
  // Don't render anything for active content without warnings
  if (status === 'active' && !warning) {
    return null;
  }

  // Don't render for blocked content (shouldn't be visible anyway)
  if (status === 'blocked') {
    return null;
  }

  const getWarningConfig = () => {
    switch (status) {
      case 'pending_review':
        return {
          icon: Clock,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-l-blue-400',
          iconColor: 'text-blue-600 dark:text-blue-400',
          textColor: 'text-blue-800 dark:text-blue-200',
          defaultMessage: 'This content is under review by moderators'
        };
      case 'limited':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-l-yellow-400',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          defaultMessage: 'This content may contain sensitive material'
        };
      default:
        return {
          icon: Eye,
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          borderColor: 'border-l-gray-400',
          iconColor: 'text-gray-600 dark:text-gray-400',
          textColor: 'text-gray-800 dark:text-gray-200',
          defaultMessage: 'Content notice'
        };
    }
  };

  const config = getWarningConfig();
  const Icon = config.icon;
  const displayMessage = warning || config.defaultMessage;

  return (
    <div className={`${config.bgColor} border-l-4 ${config.borderColor} p-3 rounded-r-lg ${className}`}>
      <div className="flex items-start space-x-3">
        <Icon className={`${config.iconColor} w-5 h-5 mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${config.textColor} font-medium`}>
            {displayMessage}
          </p>
          {riskScore !== undefined && riskScore > 0.3 && (
            <div className="mt-1 flex items-center space-x-2">
              <Shield className={`${config.iconColor} w-4 h-4`} />
              <span className={`text-xs ${config.textColor} opacity-75`}>
                Risk Level: {(riskScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModerationWarning;
