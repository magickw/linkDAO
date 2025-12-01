import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { EnhancedAdminDashboard } from '@/components/Admin/EnhancedAdminDashboard';
import { GlassPanel } from '@/design-system';
import {
    returnAnalyticsService,
    RealtimeMetrics,
    ReturnAnalytics
} from '@/services/returnAnalyticsService';
import { ReturnMetricsCards } from '@/components/Admin/returns/ReturnMetricsCards';
import { ReturnTrendsChart } from '@/components/Admin/returns/ReturnTrendsChart';
import { StatusDistributionChart } from '@/components/Admin/returns/StatusDistributionChart';
import { RecentReturnsTable } from '@/components/Admin/returns/RecentReturnsTable';
import { useAuth } from '@/hooks/useAuth';
import { io } from 'socket.io-client';

const ReturnDashboardPage: NextPage = () => {
    const { user, isAuthenticated } = useAuth();
    const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
    const [analytics, setAnalytics] = useState<ReturnAnalytics | null>(null);
    const [recentEvents, setRecentEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

                const [metrics, analyticsData, distribution] = await Promise.all([
                    returnAnalyticsService.getRealtimeMetrics(),
                    returnAnalyticsService.getAnalytics({
                        start: thirtyDaysAgo.toISOString(),
                        end: now.toISOString()
                    }),
                    returnAnalyticsService.getStatusDistribution({
                        start: thirtyDaysAgo.toISOString(),
                        end: now.toISOString()
                    })
                ]);

                setRealtimeMetrics(metrics);
                setAnalytics(analyticsData);
                // Note: distribution is part of analytics.metrics.statusDistribution usually, 
                // but if we fetched it separately we could use it.
                // For now we'll use analytics.metrics.statusDistribution

                // Mock recent events for now since we don't have a direct endpoint for "all recent events"
                // In a real app, we'd add an endpoint for this or fetch from specific returns
                setRecentEvents([
                    { id: '1', returnId: 'RET-123456', eventType: 'return_requested', timestamp: new Date().toISOString(), actorRole: 'customer', automated: false },
                    { id: '2', returnId: 'RET-789012', eventType: 'return_approved', timestamp: new Date(Date.now() - 3600000).toISOString(), actorRole: 'admin', automated: false },
                    { id: '3', returnId: 'RET-345678', eventType: 'label_generated', timestamp: new Date(Date.now() - 7200000).toISOString(), actorRole: 'system', automated: true },
                ]);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    // WebSocket connection
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
            path: '/socket.io',
            withCredentials: true,
        });

        socket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to WebSocket');

            // Subscribe to return metrics
            socket.emit('subscribe', 'metrics:returns');
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from WebSocket');
        });

        socket.on('return_metrics_update', (data: any) => {
            console.log('Received metrics update:', data);
            if (data.data) {
                setRealtimeMetrics(data.data);
            }
            if (data.event) {
                // Add new event to recent events list
                setRecentEvents(prev => [{
                    id: Date.now().toString(),
                    returnId: data.event.returnId,
                    eventType: data.event.type,
                    timestamp: new Date().toISOString(),
                    actorRole: 'system', // Default or from event
                    automated: true
                }, ...prev].slice(0, 10));
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [isAuthenticated, user]);

    return (
        <>
            <Head>
                <title>Return Monitoring | LinkDAO Admin</title>
            </Head>

            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                                Return Monitoring
                            </h1>
                            <p className="text-gray-400 mt-1">Real-time overview of return processing and analytics</p>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'
                                }`}>
                                <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
                                {isConnected ? 'Live System' : 'Disconnected'}
                            </div>

                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Export Report
                            </button>
                        </div>
                    </div>

                    <ReturnMetricsCards metrics={realtimeMetrics} isLoading={isLoading} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2">
                            <ReturnTrendsChart
                                data={analytics?.returnsByDay || []}
                                isLoading={isLoading}
                            />
                        </div>
                        <div>
                            <StatusDistributionChart
                                data={analytics?.metrics?.statusDistribution || {}}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <RecentReturnsTable events={recentEvents} isLoading={isLoading} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ReturnDashboardPage;
