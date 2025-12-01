import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface StatusDistributionChartProps {
    data: Record<string, number>;
    isLoading: boolean;
}

const COLORS = {
    requested: '#fbbf24', // yellow
    approved: '#3b82f6',  // blue
    rejected: '#ef4444',  // red
    completed: '#10b981', // green
    cancelled: '#6b7280', // gray
    in_transit: '#8b5cf6', // purple
    received: '#ec4899',  // pink
    refund_processing: '#f59e0b', // orange
};

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 h-80 animate-pulse flex items-center justify-center">
                <p className="text-gray-500">Loading distribution...</p>
            </div>
        );
    }

    const chartData = Object.entries(data).map(([name, value]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
        key: name
    })).filter(item => item.value > 0);

    if (chartData.length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 h-80 flex items-center justify-center border border-gray-700/50">
                <p className="text-gray-400">No status data available</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Status Distribution</h3>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[entry.key as keyof typeof COLORS] || '#9ca3af'}
                                    stroke="rgba(0,0,0,0)"
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '0.5rem',
                                color: '#f3f4f6',
                            }}
                            itemStyle={{ color: '#e5e7eb' }}
                        />
                        <Legend
                            verticalAlign="middle"
                            align="right"
                            layout="vertical"
                            iconType="circle"
                            formatter={(value) => <span className="text-gray-300 text-sm ml-1">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
