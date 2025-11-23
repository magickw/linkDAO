import React, { useState, useEffect } from 'react';
import {
    Activity,
    AlertTriangle,
    Search,
    Shield,
    Users,
    DollarSign,
    Clock,
    Filter,
    Download,
    RefreshCw
} from 'lucide-react';
import { GlassPanel, Button } from '@/design-system';
import { useAuth } from '@/hooks/useAuth';
import { ENV_CONFIG } from '@/config/environment';

interface MonitoringStats {
    totalEvents: number;
    totalTransactions: number;
    totalRiskFlags: number;
    highRiskUsers: number;
}

interface ActivityLog {
    id: number;
    userId: string;
    eventType: string;
    metadata: string;
    ipAddress: string;
    timestamp: string;
}

interface RiskFlag {
    id: number;
    userId: string;
    flagType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    createdAt: string;
}

export const UserMonitoringDashboard: React.FC = () => {
    const { accessToken } = useAuth();
    const [stats, setStats] = useState<MonitoringStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
    const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const response = await fetch(`${ENV_CONFIG.BACKEND_URL || 'http://localhost:10000'}/api/track/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setStats(data.data.stats);
                    setRecentActivity(data.data.recentActivity);
                    setRiskFlags(data.data.riskFlags);
                }
            }
        } catch (error) {
            console.error('Error fetching monitoring data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (accessToken) {
            fetchData();
        }
    }, [accessToken]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    if (loading && !stats) {
        return (
            <div className="p-6 flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">User Monitoring</h2>
                    <p className="text-gray-400">Real-time user behavior and risk analysis</p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchData}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassPanel className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Total Events</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats?.totalEvents.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Activity className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Transactions</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats?.totalTransactions.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Risk Flags</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats?.totalRiskFlags.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-orange-500/20 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-orange-400" />
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">High Risk Users</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats?.highRiskUsers.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-red-500/20 rounded-lg">
                            <Shield className="w-6 h-6 text-red-400" />
                        </div>
                    </div>
                </GlassPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <GlassPanel className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-400" />
                            Recent Activity
                        </h3>
                        <Button variant="ghost" size="small">View All</Button>
                    </div>
                    <div className="space-y-4">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="p-2 bg-purple-500/20 rounded-full mt-1">
                                        <Activity className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-white font-medium truncate">{activity.eventType}</p>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(activity.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 truncate">
                                            User: {activity.userId || 'Anonymous'}
                                        </p>
                                        {activity.metadata && (
                                            <p className="text-xs text-gray-500 mt-1 truncate font-mono">
                                                {activity.metadata}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-center py-8">No recent activity found</p>
                        )}
                    </div>
                </GlassPanel>

                {/* Risk Flags */}
                <GlassPanel className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                            Active Risk Flags
                        </h3>
                        <Button variant="ghost" size="small">View All</Button>
                    </div>
                    <div className="space-y-4">
                        {riskFlags.length > 0 ? (
                            riskFlags.map((flag) => (
                                <div key={flag.id} className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${getSeverityColor(flag.severity)}`}>
                                    <div className="mt-1">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium truncate">{flag.flagType}</p>
                                            <span className="text-xs opacity-75 whitespace-nowrap uppercase font-bold tracking-wider">
                                                {flag.severity}
                                            </span>
                                        </div>
                                        <p className="text-sm opacity-90 mt-1">
                                            {flag.description}
                                        </p>
                                        <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                                            <span>User: {flag.userId}</span>
                                            <span>{new Date(flag.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-center py-8">No active risk flags</p>
                        )}
                    </div>
                </GlassPanel>
            </div>
        </div>
    );
};
