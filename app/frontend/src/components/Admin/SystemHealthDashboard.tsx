import React, { useState, useEffect } from 'react';
import { Activity, Database, Zap, AlertTriangle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { GlassPanel, Button } from '@/design-system';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ConnectionPoolMetrics {
    timestamp: number;
    activeConnections: number;
    idleConnections: number;
    waitingClients: number;
    totalConnections: number;
    maxConnections: number;
    connectionErrors: number;
    queryCount: number;
    avgQueryDuration: number;
    poolUtilization: number;
}

interface MetricsSummary {
    period: number;
    avgUtilization: number;
    maxUtilization: number;
    avgQueryDuration: number;
    totalQueries: number;
    totalErrors: number;
}

export function SystemHealthDashboard() {
    const [metrics, setMetrics] = useState<ConnectionPoolMetrics | null>(null);
    const [history, setHistory] = useState<ConnectionPoolMetrics[]>([]);
    const [summary, setSummary] = useState<MetricsSummary | null>(null);
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');

    useEffect(() => {
        fetchMetrics();
        fetchHistory();
        fetchSummary();

        // Refresh every 5 seconds
        const interval = setInterval(() => {
            fetchMetrics();
            fetchHistory();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchMetrics = async () => {
        try {
            const response = await fetch('/api/metrics/db/pool');
            const data = await response.json();
            if (data.success) {
                setMetrics(data.metrics);
                determineHealthStatus(data.metrics);
            }
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await fetch('/api/metrics/db/pool/history?limit=50');
            const data = await response.json();
            if (data.success) {
                setHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await fetch('/api/metrics/db/pool/summary?period=300000');
            const data = await response.json();
            if (data.success) {
                setSummary(data.summary);
                setRecommendations(data.recommendations || []);
            }
        } catch (error) {
            console.error('Failed to fetch summary:', error);
        }
    };

    const determineHealthStatus = (m: ConnectionPoolMetrics) => {
        if (m.poolUtilization >= 95 || m.connectionErrors > 10) {
            setHealthStatus('unhealthy');
        } else if (m.poolUtilization >= 80 || m.connectionErrors > 5) {
            setHealthStatus('degraded');
        } else {
            setHealthStatus('healthy');
        }
    };

    const formatChartData = () => {
        return history.map(h => ({
            time: new Date(h.timestamp).toLocaleTimeString(),
            utilization: h.poolUtilization,
            active: h.activeConnections,
            idle: h.idleConnections,
            queryDuration: h.avgQueryDuration,
        }));
    };

    const getStatusColor = () => {
        switch (healthStatus) {
            case 'healthy': return 'bg-green-500';
            case 'degraded': return 'bg-yellow-500';
            case 'unhealthy': return 'bg-red-500';
        }
    };

    const getStatusText = () => {
        switch (healthStatus) {
            case 'healthy': return 'Healthy';
            case 'degraded': return 'Degraded';
            case 'unhealthy': return 'Unhealthy';
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <GlassPanel className="p-6 animate-pulse">
                    <div className="h-32 bg-white/10 rounded"></div>
                </GlassPanel>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6" />
                        System Health
                    </h2>
                    <p className="text-gray-400 mt-1">Real-time database and system monitoring</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${healthStatus === 'healthy' ? 'bg-green-900/30 border border-green-700' :
                            healthStatus === 'degraded' ? 'bg-yellow-900/30 border border-yellow-700' :
                                'bg-red-900/30 border border-red-700'
                        }`}>
                        <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
                        <span className="text-white font-medium">{getStatusText()}</span>
                    </div>
                    <Button variant="outline" size="small" onClick={fetchMetrics}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <GlassPanel className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Pool Utilization</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {metrics.poolUtilization.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {metrics.totalConnections}/{metrics.maxConnections} connections
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg ${metrics.poolUtilization >= 95 ? 'bg-red-500' :
                                    metrics.poolUtilization >= 80 ? 'bg-yellow-500' :
                                        'bg-green-500'
                                }`}>
                                <Database className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Active Connections</p>
                                <p className="text-2xl font-bold text-white mt-1">{metrics.activeConnections}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {metrics.idleConnections} idle
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-500">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Avg Query Duration</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {metrics.avgQueryDuration.toFixed(0)}ms
                                </p>
                                {summary && (
                                    <p className={`text-xs mt-1 ${metrics.avgQueryDuration > summary.avgQueryDuration ? 'text-red-400' : 'text-green-400'
                                        }`}>
                                        Avg: {summary.avgQueryDuration.toFixed(0)}ms
                                    </p>
                                )}
                            </div>
                            <div className="p-3 rounded-lg bg-purple-500">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Connection Errors</p>
                                <p className="text-2xl font-bold text-white mt-1">{metrics.connectionErrors}</p>
                                {summary && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {summary.totalErrors} in last 5min
                                    </p>
                                )}
                            </div>
                            <div className={`p-3 rounded-lg ${metrics.connectionErrors > 10 ? 'bg-red-500' :
                                    metrics.connectionErrors > 5 ? 'bg-yellow-500' :
                                        'bg-gray-500'
                                }`}>
                                <AlertTriangle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </GlassPanel>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pool Utilization Chart */}
                <GlassPanel className="p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Pool Utilization Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={formatChartData()}>
                            <defs>
                                <linearGradient id="utilizationGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="time" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#F3F4F6' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="utilization"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#utilizationGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </GlassPanel>

                {/* Connection Distribution */}
                <GlassPanel className="p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Connection Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={formatChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="time" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#F3F4F6' }}
                            />
                            <Legend />
                            <Bar dataKey="active" fill="#3B82F6" name="Active" />
                            <Bar dataKey="idle" fill="#10B981" name="Idle" />
                        </BarChart>
                    </ResponsiveContainer>
                </GlassPanel>

                {/* Query Duration Trend */}
                <GlassPanel className="p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Query Duration Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={formatChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="time" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                labelStyle={{ color: '#F3F4F6' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="queryDuration"
                                stroke="#A855F7"
                                strokeWidth={2}
                                dot={{ fill: '#A855F7' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </GlassPanel>

                {/* Summary Stats */}
                {summary && (
                    <GlassPanel className="p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            5-Minute Summary
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Avg Utilization</span>
                                <span className="text-white font-medium">{summary.avgUtilization.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Max Utilization</span>
                                <span className="text-white font-medium">{summary.maxUtilization.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Total Queries</span>
                                <span className="text-white font-medium">{summary.totalQueries.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <span className="text-gray-400">Total Errors</span>
                                <span className={`font-medium ${summary.totalErrors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {summary.totalErrors}
                                </span>
                            </div>
                        </div>
                    </GlassPanel>
                )}
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
                <GlassPanel className="p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        Performance Recommendations
                    </h3>
                    <div className="space-y-2">
                        {recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-300 text-sm">{rec}</p>
                            </div>
                        ))}
                    </div>
                </GlassPanel>
            )}
        </div>
    );
}
