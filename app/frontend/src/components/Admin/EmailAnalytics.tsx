import React, { useState, useEffect } from 'react';
import { Mail, TrendingUp, MousePointerClick, Eye, Users, Calendar, Download, Loader2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EmailStats {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
    byType: Array<{
        emailType: string;
        sent: number;
        opened: number;
        clicked: number;
    }>;
    byDate: Array<{
        date: string;
        sent: number;
        opened: number;
        clicked: number;
    }>;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function EmailAnalytics() {
    const [stats, setStats] = useState<EmailStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/email-analytics?range=${dateRange}`);
            if (!response.ok) throw new Error('Failed to load analytics');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportData = () => {
        if (!stats) return;

        const csv = [
            ['Email Type', 'Sent', 'Opened', 'Clicked', 'Open Rate', 'Click Rate'],
            ...stats.byType.map(item => [
                item.emailType,
                item.sent,
                item.opened,
                item.clicked,
                `${((item.opened / item.sent) * 100).toFixed(2)}%`,
                `${((item.clicked / item.sent) * 100).toFixed(2)}%`
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `email-analytics-${dateRange}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary-600" />
                        Email Analytics
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Track email performance and user engagement
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date Range Selector */}
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>

                    {/* Export Button */}
                    <button
                        onClick={exportData}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sent</span>
                        <Mail className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSent.toLocaleString()}</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Rate</span>
                        <Eye className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.openRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {stats.totalOpened.toLocaleString()} opened
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Click Rate</span>
                        <MousePointerClick className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.clickRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {stats.totalClicked.toLocaleString()} clicked
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Engagement</span>
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {((stats.totalOpened + stats.totalClicked) / (stats.totalSent * 2) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Combined metric
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email Performance by Type */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance by Email Type</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.byType}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="emailType" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#f3f4f6' }}
                            />
                            <Legend />
                            <Bar dataKey="sent" fill="#6366f1" name="Sent" />
                            <Bar dataKey="opened" fill="#10b981" name="Opened" />
                            <Bar dataKey="clicked" fill="#3b82f6" name="Clicked" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Email Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={stats.byType}
                                dataKey="sent"
                                nameKey="emailType"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => `${entry.emailType}: ${entry.sent}`}
                            >
                                {stats.byType.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Trends Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.byDate}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#f3f4f6' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={2} name="Sent" />
                        <Line type="monotone" dataKey="opened" stroke="#10b981" strokeWidth={2} name="Opened" />
                        <Line type="monotone" dataKey="clicked" stroke="#3b82f6" strokeWidth={2} name="Clicked" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Statistics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Email Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Sent
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Opened
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Clicked
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Open Rate
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Click Rate
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {stats.byType.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {item.emailType}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                        {item.sent.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                        {item.opened.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                        {item.clicked.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${(item.opened / item.sent) * 100 > 40
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                            }`}>
                                            {((item.opened / item.sent) * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${(item.clicked / item.sent) * 100 > 10
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                            }`}>
                                            {((item.clicked / item.sent) * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
