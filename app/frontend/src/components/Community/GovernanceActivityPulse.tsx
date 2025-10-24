import React from 'react';
import { Vote, AlertCircle } from 'lucide-react';

interface GovernanceActivityPulseProps {
  activeProposals: number;
  urgentProposals?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showCount?: boolean;
  className?: string;
}

const GovernanceActivityPulse: React.FC<GovernanceActivityPulseProps> = ({
  activeProposals,
  urgentProposals = 0,
  size = 'md',
  showLabel = false,
  showCount = true,
  className = ''
}) => {
  if (activeProposals === 0) {
    return null;
  }

  const isUrgent = urgentProposals > 0;

  const sizeClasses = {
    sm: {
      container: 'w-6 h-6',
      icon: 'w-3 h-3',
      pulse: 'w-6 h-6',
      text: 'text-xs',
      badge: 'w-3 h-3 text-[8px]'
    },
    md: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4',
      pulse: 'w-8 h-8',
      text: 'text-sm',
      badge: 'w-4 h-4 text-[10px]'
    },
    lg: {
      container: 'w-10 h-10',
      icon: 'w-5 h-5',
      pulse: 'w-10 h-10',
      text: 'text-base',
      badge: 'w-5 h-5 text-xs'
    }
  };

  const sizes = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Pulse Animation Container */}
      <div className="relative">
        {/* Animated Pulse Rings */}
        <div className={`absolute inset-0 ${sizes.pulse}`}>
          <div
            className={`absolute inset-0 rounded-full ${
              isUrgent 
                ? 'bg-red-500 dark:bg-red-400' 
                : 'bg-purple-500 dark:bg-purple-400'
            } animate-ping opacity-75`}
            style={{ animationDuration: isUrgent ? '1s' : '2s' }}
          />
          <div
            className={`absolute inset-0 rounded-full ${
              isUrgent 
                ? 'bg-red-500 dark:bg-red-400' 
                : 'bg-purple-500 dark:bg-purple-400'
            } animate-pulse opacity-50`}
          />
        </div>

        {/* Icon Container */}
        <div
          className={`relative ${sizes.container} rounded-full flex items-center justify-center ${
            isUrgent
              ? 'bg-red-500 dark:bg-red-600'
              : 'bg-purple-500 dark:bg-purple-600'
          } shadow-lg`}
        >
          {isUrgent ? (
            <AlertCircle className={`${sizes.icon} text-white`} />
          ) : (
            <Vote className={`${sizes.icon} text-white`} />
          )}
          
          {/* Count Badge */}
          {showCount && activeProposals > 0 && (
            <div
              className={`absolute -top-1 -right-1 ${sizes.badge} rounded-full ${
                isUrgent
                  ? 'bg-red-700 dark:bg-red-800'
                  : 'bg-purple-700 dark:bg-purple-800'
              } text-white font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-900`}
            >
              {activeProposals > 9 ? '9+' : activeProposals}
            </div>
          )}
        </div>
      </div>

      {/* Optional Label */}
      {showLabel && (
        <div className="flex flex-col">
          <span className={`${sizes.text} font-medium ${
            isUrgent 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-purple-600 dark:text-purple-400'
          }`}>
            {isUrgent ? 'Urgent Vote' : 'Active Voting'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activeProposals} {activeProposals === 1 ? 'proposal' : 'proposals'}
          </span>
        </div>
      )}
    </div>
  );
};

export default GovernanceActivityPulse;

// Variant with detailed info on hover
export const GovernanceActivityPulseWithTooltip: React.FC<GovernanceActivityPulseProps & {
  proposals?: Array<{ id: string; title: string; endTime: Date }>;
}> = ({ proposals = [], ...props }) => {
  return (
    <div className="relative group">
      <GovernanceActivityPulse {...props} />
      
      {/* Hover Tooltip */}
      {proposals.length > 0 && (
        <div className="absolute z-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
              Active Proposals
            </div>
            <div className="space-y-2">
              {proposals.slice(0, 3).map((proposal) => {
                const timeLeft = Math.max(0, proposal.endTime.getTime() - Date.now());
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                
                return (
                  <div key={proposal.id} className="text-xs">
                    <div className="font-medium text-gray-700 dark:text-gray-300 line-clamp-1">
                      {proposal.title}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {hoursLeft > 24 
                        ? `${Math.floor(hoursLeft / 24)}d left`
                        : `${hoursLeft}h left`
                      }
                    </div>
                  </div>
                );
              })}
              {proposals.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                  +{proposals.length - 3} more
                </div>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-8 border-transparent border-t-white dark:border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
};
