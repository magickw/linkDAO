import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { ReturnAnalytics } from '../../services/returnAnalyticsService';

interface ReturnTrendsChartProps {
    data: ReturnAnalytics['returnsByDay'];
    isLoading: boolean;
}

export const ReturnTrendsChart: React.FC<ReturnTrendsChartProps> = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 h-80 animate-pulse flex items-center justify-center">
                <p className="text-gray-500">Loading chart data...</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 h-80 flex items-center justify-center border border-gray-700/50">
                <p className="text-gray-400">No trend data available for this period</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Return Volume Trends</h3>
                <div className="flex space-x-2">
                    <select className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '0.5rem',
                                color: '#f3f4f6',
                            }}
                            itemStyle={{ color: '#e5e7eb' }}
                            labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#8b5cf6"
                            fillOpacity={1}
                            fill="url(#colorReturns)"
                            name="Returns"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
