import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from '@/types/navigation';

interface ActivityIndicatorsProps {
  indicators: ActivityIndicator[];
  onIndicatorClick?: (indicator: ActivityIndicator) => void;
  className?: string;
}

export default function ActivityIndicators({ 
  indicators, 
  onIndicatorClick,
  className = '' 
}: ActivityIndicatorsProps) {
  const [animatingIndicators, setAnimatingIndicators] = useState<Set<string>>(new Set());

  // Trigger animation for new or updated indicators
  useEffect(() => {
    const newAnimating = new Set<string>();
    indicators.forEach(indicator => {
      if (indicator.isAnimated || indicator.count > 0) {
        newAnimating.add(indicator.id);
      }
    });
    setAnimatingIndicators(newAnimating);

    // Clear animations after a delay
    const timer = setTimeout(() => {
      setAnimatingIndicators(new Set());
    }, 3000);

    return () => clearTimeout(timer);
  }, [indicators]);

  const getIndicatorIcon = (type: string) => {
    switch (type) {
      case 'notification': return '🔔';
      case 'transaction': return '💰';
      case 'community': return '👥';
      case 'governance': return '🗳️';
      default: return '📢';
    }
  };

  const getIndicatorColor = (type: string, priority: string) => {
    const baseColors = {
      notification: 'bg-blue-500',
      transaction: 'bg-green-500',
      community: 'bg-purple-500',
      governance: 'bg-orange-500'
    };

    const priorityColors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: baseColors[type as keyof typeof baseColors] || 'bg-gray-500'
    };

    return priority === 'high' || priority === 'medium' 
      ? priorityColors[priority as keyof typeof priorityColors]
      : baseColors[type as keyof typeof baseColors] || 'bg-gray-500';
  };

  const getPulseClass = (priority: string, isAnimating: boolean) => {
    if (!isAnimating) return '';
    
    switch (priority) {
      case 'high': return 'animate-pulse';
      case 'medium': return 'animate-bounce';
      default: return 'animate-pulse';
    }
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Filter out indicators with zero count unless they're high priority
  const visibleIndicators = indicators.filter(
    indicator => indicator.count > 0 || indicator.priority === 'high'
  );

  if (visibleIndicators.length === 0) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {visibleIndicators.map((indicator) => {
        const isAnimating = animatingIndicators.has(indicator.id);
        
        return (
          <button
            key={indicator.id}
            onClick={() => onIndicatorClick?.(indicator)}
            className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-110 ${
              getIndicatorColor(indicator.type, indicator.priority)
            } ${getPulseClass(indicator.priority, isAnimating)}`}
            title={`${indicator.type} - ${indicator.count} items - ${formatLastUpdate(indicator.lastUpdate)}`}
          >
            {/* Icon */}
            <span className="text-white text-sm" role="img" aria-label={indicator.type}>
              {getIndicatorIcon(indicator.type)}
            </span>

            {/* Count Badge */}
            {indicator.count > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-gray-800 ${
                isAnimating ? 'animate-bounce' : ''
              }`}>
                {indicator.count > 99 ? '99+' : indicator.count}
              </span>
            )}

            {/* Priority Indicator Ring */}
            {indicator.priority === 'high' && (
              <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping"></div>
            )}
          </button>
        );
      })}

      {/* Summary Indicator for Multiple High Priority */}
      {visibleIndicators.filter(i => i.priority === 'high').length > 1 && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 dark:bg-red-900 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-red-700 dark:text-red-300">
            {visibleIndicators.filter(i => i.priority === 'high').length} urgent
          </span>
        </div>
      )}
    </div>
  );
}

// Helper function to create activity indicators
export const createActivityIndicator = (
  id: string,
  type: 'notification' | 'transaction' | 'community' | 'governance',
  count: number,
  priority: 'low' | 'medium' | 'high' = 'low'
): ActivityIndicator => ({
  id,
  type,
  count,
  priority,
  lastUpdate: new Date(),
  isAnimated: count > 0 || priority === 'high'
});

// Mock data for development
export const mockActivityIndicators: ActivityIndicator[] = [
  createActivityIndicator('notifications', 'notification', 5, 'medium'),
  createActivityIndicator('transactions', 'transaction', 2, 'low'),
  createActivityIndicator('community', 'community', 8, 'low'),
  createActivityIndicator('governance', 'governance', 1, 'high')
];