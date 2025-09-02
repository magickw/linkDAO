import React from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  loading?: boolean;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  icon,
  trend = 'neutral',
  subtitle,
  loading = false
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  if (loading) {
    return (
      <GlassPanel className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-3"></div>
          <div className="h-8 bg-gray-600 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-600 rounded w-1/3"></div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <GlassPanel className="p-6 hover:bg-white/5 transition-colors duration-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {icon && (
                <span className="text-2xl" role="img" aria-label={title}>
                  {icon}
                </span>
              )}
              <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                {title}
              </h3>
            </div>
            
            <div className="mb-2">
              <span className="text-3xl font-bold text-white">
                {value}
              </span>
            </div>
            
            {subtitle && (
              <p className="text-xs text-gray-400 mb-2">
                {subtitle}
              </p>
            )}
            
            {change !== undefined && (
              <div className="flex items-center gap-1">
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {getTrendIcon()} {Math.abs(change)}%
                </span>
                <span className="text-xs text-gray-400">
                  vs last period
                </span>
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
};

export default MetricsCard;