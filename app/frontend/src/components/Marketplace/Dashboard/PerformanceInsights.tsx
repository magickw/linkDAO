import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { useMarketplace } from '@/hooks/useMarketplace';

const COLORS = ['#9F7AEA', '#4FD1C5', '#F6AD55', '#FC8181', '#68D391'];

interface PerformanceInsightsProps {
  address: string;
}

export const PerformanceInsights: React.FC<PerformanceInsightsProps> = ({ address }) => {
  const { getSellerPerformance } = useMarketplace();

  const { data: performance, isLoading } = useQuery({
    queryKey: ['sellerPerformance', address],
    queryFn: () => getSellerPerformance(address),
    enabled: !!address,
    refetchInterval: 30000 // 30 seconds
  });

  // Mock data for the chart
  const salesData = [
    { name: 'Jan', sales: 400 },
    { name: 'Feb', sales: 300 },
    { name: 'Mar', sales: 600 },
    { name: 'Apr', sales: 800 },
    { name: 'May', sales: 500 },
    { name: 'Jun', sales: 900 },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-1/3"></div>
          <div className="h-4 bg-white/5 rounded w-1/2"></div>
          <div className="h-64 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Performance Insights</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/5 p-4 rounded-lg">
          <h3 className="text-white/60 text-sm mb-1">Conversion Rate</h3>
          <p className="text-3xl font-bold text-white">
            {performance?.conversionRate?.toFixed(1) || '0.0'}%
          </p>
          <p className="text-green-400 text-sm mt-1">+2.5% from last period</p>
        </div>
        
        <div className="bg-white/5 p-4 rounded-lg">
          <h3 className="text-white/60 text-sm mb-1">Average Order Value</h3>
          <p className="text-3xl font-bold text-white">
            {performance?.avgOrderValue ? `${formatEther(BigInt(performance.avgOrderValue))} ETH` : '--'}
          </p>
          <p className="text-green-400 text-sm mt-1">+5.2% from last period</p>
        </div>
      </div>
      
      <div className="h-64 mb-8">
        <h3 className="text-white/80 mb-4">Sales Trends</h3>
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
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1A202C', 
                border: '1px solid #2D3748',
                borderRadius: '0.5rem',
                color: '#E2E8F0'
              }}
              formatter={(value: number) => [`${value} sales`, 'Sales']}
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-64">
          <h3 className="text-white/80 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Electronics', value: 40 },
                  { name: 'Clothing', value: 30 },
                  { name: 'Home', value: 20 },
                  { name: 'Other', value: 10 },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent = 0 }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
              >
                {[
                  { name: 'Electronics', value: 40 },
                  { name: 'Clothing', value: 30 },
                  { name: 'Home', value: 20 },
                  { name: 'Other', value: 10 },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value}%`, 'Sales']}
                contentStyle={{
                  backgroundColor: '#1A202C',
                  border: '1px solid #2D3748',
                  borderRadius: '0.5rem',
                  color: '#E2E8F0'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="h-64">
          <h3 className="text-white/80 mb-4">Top Performing Products</h3>
          <div className="space-y-4">
            {[
              { id: 1, name: 'Wireless Headphones', sales: 124, revenue: '1000000000000000000', image: '' },
              { id: 2, name: 'Smart Watch', sales: 98, revenue: '2000000000000000000', image: '' },
              { id: 3, name: 'Bluetooth Speaker', sales: 75, revenue: '500000000000000000', image: '' },
            ].map((product) => (
              <div key={product.id} className="flex items-center">
                <div className="h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-white/5">
                  {product.image && (
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{product.name}</p>
                  <p className="text-xs text-white/60">{product.sales} sales • {formatEther(BigInt(product.revenue))} ETH</p>
                </div>
                <div className="text-sm text-white/60">
                  {((product.sales / 300) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-white/5 rounded-lg">
        <h3 className="text-white/80 mb-3">Performance Tips</h3>
        <ul className="space-y-2 text-sm text-white/60">
          <li className="flex items-start">
            <span className="text-green-400 mr-2">✓</span>
            <span>Your conversion rate is above average for your category. Consider running a promotion to capitalize on this.</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-400 mr-2">✓</span>
            <span>Your top product accounts for 41.3% of your sales. Consider cross-selling related items.</span>
          </li>
          <li className="flex items-start">
            <span className="text-yellow-400 mr-2">•</span>
            <span>Consider running a weekend flash sale to boost mid-week sales.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
