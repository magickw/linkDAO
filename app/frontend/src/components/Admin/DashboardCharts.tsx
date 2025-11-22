import React, { useState, useEffect } from 'react';
import { LineChart, BarChart, AreaChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GlassPanel } from '@/design-system';
import { TrendingUp, Users, Shield, ShoppingBag } from 'lucide-react';
import { adminService } from '@/services/adminService';

interface DashboardChartsProps {
  userGrowthData?: Array<{ date: string; users: number; sellers: number }>;
  moderationData?: Array<{ action: string; count: number }>;
  sellerPerformanceData?: Array<{ name: string; revenue: number; orders: number }>;
  disputeData?: Array<{ status: string; count: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function DashboardCharts({
  userGrowthData = [],
  moderationData = [],
  sellerPerformanceData = [],
  disputeData = []
}: DashboardChartsProps) {
  const [chartData, setChartData] = useState({
    userGrowth: userGrowthData,
    moderation: moderationData,
    sellerPerformance: sellerPerformanceData,
    disputeStatus: disputeData
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        // Load all chart data from real API endpoints
        const [userGrowthResponse, moderationResponse, sellerResponse, disputeResponse] = await Promise.all([
          // These would be real API calls - implementing placeholders for now
          Promise.resolve({ data: userGrowthData }),
          Promise.resolve({ data: moderationData }),
          Promise.resolve({ data: sellerPerformanceData }),
          Promise.resolve({ data: disputeData })
        ]);

        setChartData({
          userGrowth: userGrowthResponse.data || userGrowthData,
          moderation: moderationResponse.data || moderationData,
          sellerPerformance: sellerResponse.data || sellerPerformanceData,
          disputeStatus: disputeResponse.data || disputeData
        });
      } catch (error) {
        console.error('Failed to load chart data:', error);
        // Fallback to provided props if API fails
        setChartData({
          userGrowth: userGrowthData,
          moderation: moderationData,
          sellerPerformance: sellerPerformanceData,
          disputeStatus: disputeData
        });
      } finally {
        setLoading(false);
      }
    };

    // Only load from API if no data is provided
    if (userGrowthData.length === 0 && 
        moderationData.length === 0 && 
        sellerPerformanceData.length === 0 && 
        disputeData.length === 0) {
      loadChartData();
    } else {
      setChartData({
        userGrowth: userGrowthData,
        moderation: moderationData,
        sellerPerformance: sellerPerformanceData,
        disputeStatus: disputeData
      });
      setLoading(false);
    }
  }, [userGrowthData, moderationData, sellerPerformanceData, disputeData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <GlassPanel key={i} className="p-6">
            <div className="h-80 bg-white/10 rounded animate-pulse"></div>
          </GlassPanel>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* User Growth Chart */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Growth (30 Days)
          </h3>
          <span className="text-gray-400 text-sm">Last updated: just now</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData.userGrowth}>
            <defs>
              <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sellersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#usersGradient)"
              name="Total Users"
            />
            <Area
              type="monotone"
              dataKey="sellers"
              stroke="#10B981"
              fillOpacity={1}
              fill="url(#sellersGradient)"
              name="Sellers"
            />
          </AreaChart>
        </ResponsiveContainer>
      </GlassPanel>

      {/* Moderation Activity Chart */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Moderation Activity (7 Days)
          </h3>
          <span className="text-gray-400 text-sm">Last 7 days</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.moderation}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="action" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Bar dataKey="count" fill="#8B5CF6" name="Actions" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassPanel>

      {/* Seller Performance Chart */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Top Seller Performance
          </h3>
          <span className="text-gray-400 text-sm">This month</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.sellerPerformance} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" />
            <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#10B981" name="Revenue ($)" radius={[0, 8, 8, 0]} />
            <Bar dataKey="orders" fill="#3B82F6" name="Orders" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassPanel>

      {/* Dispute Status Distribution */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Dispute Status Distribution
          </h3>
          <span className="text-gray-400 text-sm">Current</span>
        </div>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.disputeStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.disputeStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    </div>
  );
}
