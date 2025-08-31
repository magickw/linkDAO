import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMarketplace } from '@/hooks/useMarketplace';

interface AnalyticsOverviewProps {
  address: string;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ address }) => {
  const { getSellerAnalytics } = useMarketplace();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['sellerAnalytics', address],
    queryFn: () => getSellerAnalytics(address),
    enabled: !!address,
    refetchInterval: 30000 // 30 seconds
  });

  // Mock data for the chart (replace with real data from your API)
  const salesData = [
    { name: 'Jan', sales: 400 },
    { name: 'Feb', sales: 300 },
    { name: 'Mar', sales: 600 },
    { name: 'Apr', sales: 800 },
    { name: 'May', sales: 500 },
    { name: 'Jun', sales: 900 },
  ];

  if (isLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Analytics Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 p-4 rounded-lg">
          <p className="text-white/60 text-sm">Total Sales</p>
          <p className="text-2xl font-bold text-white">
            {analytics ? `${analytics.totalSales} ETH` : '--'}
          </p>
          <p className="text-green-400 text-sm mt-1">+12% from last month</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-lg">
          <p className="text-white/60 text-sm">Total Orders</p>
          <p className="text-2xl font-bold text-white">
            {analytics?.totalOrders || '--'}
          </p>
          <p className="text-green-400 text-sm mt-1">+5% from last month</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-lg">
          <p className="text-white/60 text-sm">Conversion Rate</p>
          <p className="text-2xl font-bold text-white">
            {analytics?.conversionRate ? `${analytics.conversionRate}%` : '--'}
          </p>
          <p className="text-green-400 text-sm mt-1">+2.5% from last month</p>
        </div>
      </div>

      <div className="h-64">
        <h3 className="text-white/80 mb-4">Sales Overview</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
            <XAxis 
              dataKey="name" 
              stroke="#A0AEC0" 
              tick={{ fill: '#A0AEC0' }}
            />
            <YAxis 
              stroke="#A0AEC0"
              tick={{ fill: '#A0AEC0' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1A202C', 
                border: '1px solid #2D3748',
                borderRadius: '0.5rem',
                color: '#E2E8F0'
              }}
              formatter={(value: number) => [`$${value}`, 'Sales']}
            />
            <Line 
              type="monotone" 
              dataKey="sales" 
              stroke="#9F7AEA" 
              strokeWidth={2}
              dot={{ fill: '#9F7AEA', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#9F7AEA', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
