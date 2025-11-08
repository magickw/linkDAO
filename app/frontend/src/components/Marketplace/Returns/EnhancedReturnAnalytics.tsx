import React from 'react';
import { TrendingUp, AlertTriangle, Clock, DollarSign, Package } from 'lucide-react';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface EnhancedReturnAnalyticsProps {
  analytics: {
    totalReturns: number;
    returnRate: number;
    averageRefundAmount: number;
    averageProcessingTime: number;
    fraudAlerts: number;
    customerSatisfaction: number;
    topReturnReasons: Array<{ reason: string; count: number; percentage: number }>;
  };
}

export const EnhancedReturnAnalytics: React.FC<EnhancedReturnAnalyticsProps> = ({ analytics }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassPanel variant="secondary" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-white/70 text-sm">Return Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.returnRate}%</p>
        </GlassPanel>

        <GlassPanel variant="secondary" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-white/70 text-sm">Avg Refund</span>
          </div>
          <p className="text-2xl font-bold text-white">${analytics.averageRefundAmount}</p>
        </GlassPanel>

        <GlassPanel variant="secondary" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-white/70 text-sm">Avg Processing</span>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.averageProcessingTime}d</p>
        </GlassPanel>

        <GlassPanel variant="secondary" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-white/70 text-sm">Fraud Alerts</span>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.fraudAlerts}</p>
        </GlassPanel>

        <GlassPanel variant="secondary" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-yellow-400" />
            <span className="text-white/70 text-sm">Satisfaction</span>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.customerSatisfaction}/5</p>
        </GlassPanel>
      </div>

      <GlassPanel variant="secondary" className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Return Reasons</h3>
        <div className="space-y-3">
          {analytics.topReturnReasons.map((reason, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white capitalize">{reason.reason.replace('_', ' ')}</span>
                <span className="text-white/70">{reason.count} ({reason.percentage}%)</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${reason.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};
