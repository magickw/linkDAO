import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMarketplace } from '@/hooks/useMarketplace';

interface RevenueTrackingProps {
  address: string;
}

const COLORS = ['#9F7AEA', '#4FD1C5', '#F6AD55', '#FC8181', '#68D391'];

export const RevenueTracking: React.FC<RevenueTrackingProps> = ({ address }) => {
  const { getSellerRevenue } = useMarketplace();

  // Define transaction type
  interface Transaction {
    id: string;
    description: string;
    timestamp: string;
    amount: string; // Stored as string to match API
  }

  // Define the expected revenue data type
  interface RevenueData {
    totalRevenue: string;
    availableForWithdrawal: string;
    recentTransactions: Transaction[];
  }

  const { data: revenueData, isLoading } = useQuery<RevenueData>({
    queryKey: ['sellerRevenue', address],
    queryFn: () => getSellerRevenue(address),
    enabled: !!address,
    refetchInterval: 30000, // 30 seconds
  });

  // Mock data for the chart (replace with real data from your API)
  const monthlyRevenue = [
    { name: 'Jan', revenue: 1.2 },
    { name: 'Feb', revenue: 0.8 },
    { name: 'Mar', revenue: 1.8 },
    { name: 'Apr', revenue: 2.4 },
    { name: 'May', revenue: 1.5 },
    { name: 'Jun', revenue: 3.2 },
  ];

  if (isLoading) {
    return <div className="p-6">Loading revenue data...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Revenue Tracking</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/5 p-4 rounded-lg">
          <p className="text-white/60 text-sm">Total Revenue (ETH)</p>
          <p className="text-3xl font-bold text-white">
            {revenueData ? `${revenueData.totalRevenue} ETH` : '--'}
          </p>
          <p className="text-green-400 text-sm mt-1">+18% from last month</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-lg">
          <p className="text-white/60 text-sm">Available for Withdrawal</p>
          <p className="text-3xl font-bold text-white">
            {revenueData ? `${revenueData.availableForWithdrawal} ETH` : '--'}
          </p>
          <button className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
            Withdraw Funds
          </button>
        </div>
      </div>

      <div className="h-64">
        <h3 className="text-white/80 mb-4">Monthly Revenue (ETH)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyRevenue}>
            <XAxis 
              dataKey="name" 
              stroke="#A0AEC0" 
              tick={{ fill: '#A0AEC0' }}
            />
            <YAxis 
              stroke="#A0AEC0"
              tick={{ fill: '#A0AEC0' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1A202C', 
                border: '1px solid #2D3748',
                borderRadius: '0.5rem',
                color: '#E2E8F0'
              }}
              formatter={(value: number) => [`${value} ETH`, 'Revenue']}
            />
            <Bar dataKey="revenue" name="Revenue">
              {monthlyRevenue.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6">
        <h3 className="text-white/80 mb-3">Recent Transactions</h3>
        <div className="space-y-3">
          {revenueData?.recentTransactions?.length ? (
            revenueData.recentTransactions.map((tx) => {
              const amount = BigInt(tx.amount || '0');
              const isPositive = amount > 0n;
              return (
                <div key={tx.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{tx.description}</p>
                    <p className="text-white/60 text-sm">{new Date(tx.timestamp).toLocaleDateString()}</p>
                  </div>
                  <p className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{formatEther(amount)} ETH
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-white/60 text-center py-4">No recent transactions</p>
          )}
        </div>
      </div>
    </div>
  );
};
