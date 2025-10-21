/**
 * Payment Method Analytics Component
 * Displays user's payment method preferences and cost savings
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Wallet,
  BarChart3,
  PieChart,
  Info
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { orderService } from '@/services/orderService';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

interface PaymentMethodAnalyticsProps {
  timeframe?: 'week' | 'month' | 'year';
  className?: string;
}

interface PaymentMethodAnalytics {
  preferredMethods: Array<{
    methodId: string;
    methodName: string;
    usageCount: number;
    successRate: number;
    averageCost: number;
    lastUsed: string;
  }>;
  costSavings: {
    totalSaved: number;
    averageSavingsPerTransaction: number;
    bestAlternativeUsed: string;
  };
  methodPerformance: Record<string, {
    count: number;
    successRate: number;
    averageTime: number;
    averageCost: number;
  }>;
}

export const PaymentMethodAnalytics: React.FC<PaymentMethodAnalyticsProps> = ({
  timeframe = 'month',
  className = ''
}) => {
  const { address } = useAccount();
  const [analytics, setAnalytics] = useState<PaymentMethodAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>(timeframe);

  useEffect(() => {
    if (address) {
      loadAnalytics();
    }
  }, [address, selectedTimeframe]);

  const loadAnalytics = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const data = await orderService.getPaymentMethodAnalytics(address, selectedTimeframe);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load payment method analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodName: string) => {
    if (methodName.toLowerCase().includes('card') || methodName.toLowerCase().includes('stripe')) {
      return <CreditCard className="w-4 h-4" />;
    }
    return <Wallet className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (!address) {
    return (
      <GlassPanel variant="secondary" className={`p-6 text-center ${className}`}>
        <Wallet className="w-12 h-12 text-white/60 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Connect Wallet</h3>
        <p className="text-white/70">
          Connect your wallet to view payment method analytics and preferences.
        </p>
      </GlassPanel>
    );
  }

  if (loading) {
    return (
      <GlassPanel variant="secondary" className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/20 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-white/20 rounded"></div>
            <div className="h-3 bg-white/20 rounded w-5/6"></div>
          </div>
        </div>
      </GlassPanel>
    );
  }

  if (!analytics || analytics.preferredMethods.length === 0) {
    return (
      <GlassPanel variant="secondary" className={`p-6 text-center ${className}`}>
        <BarChart3 className="w-12 h-12 text-white/60 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Payment Data</h3>
        <p className="text-white/70">
          Complete some transactions to see your payment method analytics and preferences.
        </p>
      </GlassPanel>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PieChart className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Payment Analytics</h2>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedTimeframe === period ? 'primary' : 'outline'}
              size="small"
              onClick={() => setSelectedTimeframe(period)}
              className="capitalize"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Cost Savings Summary */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Cost Savings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(analytics.costSavings.totalSaved)}
            </div>
            <div className="text-white/70 text-sm">Total Saved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(analytics.costSavings.averageSavingsPerTransaction)}
            </div>
            <div className="text-white/70 text-sm">Avg. per Transaction</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {analytics.costSavings.bestAlternativeUsed}
            </div>
            <div className="text-white/70 text-sm">Best Alternative</div>
          </div>
        </div>
      </GlassPanel>

      {/* Preferred Payment Methods */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Preferred Methods</h3>
        </div>
        
        <div className="space-y-3">
          {analytics.preferredMethods.map((method, index) => (
            <div key={method.methodId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getMethodIcon(method.methodName)}
                  <span className="font-medium text-white">{method.methodName}</span>
                </div>
                <div className="text-sm text-white/70">
                  {method.usageCount} uses
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="text-white font-medium">
                    {formatPercentage(method.successRate)}
                  </div>
                  <div className="text-white/60">Success</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">
                    {formatCurrency(method.averageCost)}
                  </div>
                  <div className="text-white/60">Avg. Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">#{index + 1}</div>
                  <div className="text-white/60">Rank</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Method Performance */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
        </div>
        
        <div className="space-y-3">
          {Object.entries(analytics.methodPerformance).map(([methodName, performance]) => (
            <div key={methodName} className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getMethodIcon(methodName)}
                  <span className="font-medium text-white">{methodName}</span>
                </div>
                <div className="text-sm text-white/70">
                  {performance.count} transactions
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-white/60">Success Rate</div>
                  <div className="text-white font-medium">
                    {formatPercentage(performance.successRate)}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Avg. Time</div>
                  <div className="text-white font-medium">
                    {performance.averageTime.toFixed(1)}min
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Avg. Cost</div>
                  <div className="text-white font-medium">
                    {formatCurrency(performance.averageCost)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Info Panel */}
      <GlassPanel variant="secondary" className="p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-white/70">
            <p className="mb-2">
              <strong className="text-white">How it works:</strong> Our system tracks your payment method 
              usage and calculates cost savings based on the prioritization recommendations you follow.
            </p>
            <p>
              Cost savings are calculated by comparing the actual cost of your selected method 
              versus the most expensive alternative available at the time of transaction.
            </p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default PaymentMethodAnalytics;