import React from 'react';
import { useAccount } from 'wagmi';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { AnalyticsOverview } from './AnalyticsOverview';
import { RevenueTracking } from './RevenueTracking';
import { ProductManagement } from './ProductManagement';
import { OrderManagement } from './OrderManagement';
import { PerformanceInsights } from './PerformanceInsights';
import { ActivityFeed } from './ActivityFeed';

export const SellerDashboard: React.FC = () => {
  const { address } = useAccount();

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-white mb-4">Please connect your wallet to view the dashboard</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-8">Seller Dashboard</h1>
      
      {/* First Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassPanel className="h-full">
            <AnalyticsOverview address={address} />
          </GlassPanel>
        </div>
        <div className="lg:col-span-1">
          <GlassPanel className="h-full">
            <PerformanceInsights address={address} />
          </GlassPanel>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="h-full">
          <RevenueTracking address={address} />
        </GlassPanel>
        <GlassPanel className="h-full">
          <OrderManagement address={address} />
        </GlassPanel>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 gap-6">
        <GlassPanel className="h-full">
          <ProductManagement address={address} />
        </GlassPanel>
      </div>

      {/* Fourth Row */}
      <div className="grid grid-cols-1 gap-6">
        <GlassPanel className="h-full">
          <ActivityFeed address={address} />
        </GlassPanel>
      </div>
    </div>
  );
};
