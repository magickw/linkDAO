import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';

interface RealTimeStats {
  activeUsers: number;
  currentTransactions: number;
  systemLoad: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  lastUpdated?: string;
}

interface RealTimeMetricsProps {
  stats: RealTimeStats | null;
  refreshInterval?: number;
}

export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({
  stats,
  refreshInterval = 5000
}) => {
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (stats?.lastUpdated) {
      setLastUpdate(new Date(stats.lastUpdated));
    }
  }, [stats]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdate.getTime();
      setIsLive(timeDiff < refreshInterval * 2); // Consider stale if no update in 2x refresh interval
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate, refreshInterval]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-400';
    if (value <= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSystemHealthStatus = () => {
    if (!stats) return { status: 'Unknown', color: 'text-gray-400' };

    const { systemLoad, responseTime, errorRate } = stats;
    
    if (systemLoad > 80 || responseTime > 1000 || errorRate > 5) {
      return { status: 'Critical', color: 'text-red-400' };
    } else if (systemLoad > 60 || responseTime > 500 || errorRate > 2) {
      return { status: 'Warning', color: 'text-yellow-400' };
    } else {
      return { status: 'Healthy', color: 'text-green-400' };
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const systemHealth = getSystemHealthStatus();

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Real-Time Metrics</h3>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: isLive ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 1, repeat: isLive ? Infinity : 0 }}
              className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400' : 'bg-red-400'}`}
            />
            <span className={`text-sm ${isLive ? 'text-green-400' : 'text-red-400'}`}>
              {isLive ? 'Live' : 'Stale'}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-sm font-medium ${systemHealth.color}`}>
            {systemHealth.status}
          </div>
          <div className="text-xs text-gray-400">
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Active Users */}
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {stats ? formatNumber(stats.activeUsers) : '--'}
          </div>
          <div className="text-xs text-gray-300 uppercase tracking-wide">
            Active Users
          </div>
          <div className="text-xs text-blue-400 mt-1">
            👥 Online Now
          </div>
        </div>

        {/* Current Transactions */}
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {stats ? formatNumber(stats.currentTransactions) : '--'}
          </div>
          <div className="text-xs text-gray-300 uppercase tracking-wide">
            Transactions
          </div>
          <div className="text-xs text-green-400 mt-1">
            💳 Processing
          </div>
        </div>

        {/* System Load */}
        <div className="text-center">
          <div className={`text-2xl font-bold mb-1 ${
            stats ? getStatusColor(stats.systemLoad, { good: 50, warning: 75 }) : 'text-white'
          }`}>
            {stats ? `${stats.systemLoad}%` : '--'}
          </div>
          <div className="text-xs text-gray-300 uppercase tracking-wide">
            System Load
          </div>
          <div className="text-xs text-purple-400 mt-1">
            🖥️ CPU Usage
          </div>
        </div>

        {/* Response Time */}
        <div className="text-center">
          <div className={`text-2xl font-bold mb-1 ${
            stats ? getStatusColor(stats.responseTime, { good: 200, warning: 500 }) : 'text-white'
          }`}>
            {stats ? `${stats.responseTime}ms` : '--'}
          </div>
          <div className="text-xs text-gray-300 uppercase tracking-wide">
            Response Time
          </div>
          <div className="text-xs text-cyan-400 mt-1">
            ⚡ Latency
          </div>
        </div>

        {/* Error Rate */}
        <div className="text-center">
          <div className={`text-2xl font-bold mb-1 ${
            stats ? getStatusColor(stats.errorRate, { good: 1, warning: 3 }) : 'text-white'
          }`}>
            {stats ? `${stats.errorRate.toFixed(2)}%` : '--'}
          </div>
          <div className="text-xs text-gray-300 uppercase tracking-wide">
            Error Rate
          </div>
          <div className="text-xs text-orange-400 mt-1">
            ⚠️ Failures
          </div>
        </div>

        {/* Throughput */}
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {stats ? `${stats.throughput.toFixed(1)}/s` : '--'}
          </div>
          <div className="text-xs text-gray-300 uppercase tracking-wide">
            Throughput
          </div>
          <div className="text-xs text-pink-400 mt-1">
            📊 Requests
          </div>
        </div>
      </div>

      {/* System Health Bar */}
      <div className="mt-6 pt-4 border-t border-gray-600/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">System Health</span>
          <span className={systemHealth.color}>{systemHealth.status}</span>
        </div>
        
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              systemHealth.status === 'Healthy' ? 'bg-green-400' :
              systemHealth.status === 'Warning' ? 'bg-yellow-400' : 'bg-red-400'
            }`}
            initial={{ width: 0 }}
            animate={{ 
              width: stats ? 
                systemHealth.status === 'Healthy' ? '100%' :
                systemHealth.status === 'Warning' ? '60%' : '30%'
                : '0%'
            }}
            transition={{ duration: 1, ease: 'easeOut' as any }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex justify-center gap-2">
        <button className="px-3 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors">
          View Details
        </button>
        <button className="px-3 py-1 text-xs bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/30 transition-colors">
          Export Data
        </button>
      </div>
    </GlassPanel>
  );
};

export default RealTimeMetrics;