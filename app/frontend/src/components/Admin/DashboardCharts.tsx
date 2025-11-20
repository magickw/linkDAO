import React from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GlassPanel } from '@/design-system';
import { TrendingUp, Users, Shield, ShoppingBag } from 'lucide-react';

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

    // Generate mock data if not provided
    const defaultUserGrowth = userGrowthData.length > 0 ? userGrowthData : generateMockUserGrowth();
    const defaultModerationData = moderationData.length > 0 ? moderationData : generateMockModerationData();
    const defaultSellerData = sellerPerformanceData.length > 0 ? sellerPerformanceData : generateMockSellerData();
    const defaultDisputeData = disputeData.length > 0 ? disputeData : generateMockDisputeData();

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
                    <AreaChart data={defaultUserGrowth}>
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
                    <BarChart data={defaultModerationData}>
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
                    <BarChart data={defaultSellerData} layout="horizontal">
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
                                data={defaultDisputeData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {defaultDisputeData.map((entry, index) => (
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

// Mock data generators
function generateMockUserGrowth() {
    const data = [];
    const baseUsers = 1000;
    const baseSellers = 50;

    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            users: baseUsers + Math.floor(Math.random() * 200) + (29 - i) * 10,
            sellers: baseSellers + Math.floor(Math.random() * 10) + (29 - i) * 2,
        });
    }

    return data;
}

function generateMockModerationData() {
    return [
        { action: 'Approved', count: 145 },
        { action: 'Rejected', count: 32 },
        { action: 'Flagged', count: 18 },
        { action: 'Removed', count: 12 },
        { action: 'Warned', count: 8 },
    ];
}

function generateMockSellerData() {
    return [
        { name: 'Seller A', revenue: 12500, orders: 145 },
        { name: 'Seller B', revenue: 9800, orders: 112 },
        { name: 'Seller C', revenue: 8200, orders: 98 },
        { name: 'Seller D', revenue: 7100, orders: 87 },
        { name: 'Seller E', revenue: 6500, orders: 76 },
    ];
}

function generateMockDisputeData() {
    return [
        { status: 'Open', count: 12 },
        { status: 'In Progress', count: 8 },
        { status: 'Resolved', count: 45 },
        { status: 'Closed', count: 23 },
    ];
}
