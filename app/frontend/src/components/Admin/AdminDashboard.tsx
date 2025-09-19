import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  ShoppingBag, 
  BarChart3, 
  Settings,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { usePermissions } from '@/hooks/useAuth';
import { adminService } from '@/services/adminService';
import { Button, GlassPanel } from '@/design-system';
import { ModerationQueue } from './ModerationQueue';
import { SellerApplications } from './SellerApplications';
import { DisputeResolution } from './DisputeResolution';
import { UserManagement } from './UserManagement';
import { AdminAnalytics } from './AdminAnalytics';

interface AdminStats {
  pendingModerations: number;
  pendingSellerApplications: number;
  openDisputes: number;
  suspendedUsers: number;
  totalUsers: number;
  totalSellers: number;
  recentActions: any[];
}

export function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/');
      return;
    }
    
    loadStats();
  }, [isAdmin, router]);

  const loadStats = async () => {
    try {
      const data = await adminService.getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin()) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, permission: null },
    { id: 'moderation', label: 'Moderation', icon: Shield, permission: 'content.moderate' },
    { id: 'sellers', label: 'Seller Applications', icon: ShoppingBag, permission: 'marketplace.seller_review' },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, permission: 'disputes.view' },
    { id: 'users', label: 'User Management', icon: Users, permission: 'users.view' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, permission: 'system.analytics' },
  ].filter(tab => !tab.permission || hasPermission(tab.permission));

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '+' : ''}{trend}% from last week
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </GlassPanel>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-2">Manage platform operations and user activities</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(6)].map((_, i) => (
                  <GlassPanel key={i} className="p-6 animate-pulse">
                    <div className="h-16 bg-white/10 rounded"></div>
                  </GlassPanel>
                ))}
              </div>
            ) : stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Pending Moderations"
                  value={stats.pendingModerations}
                  icon={Shield}
                  color="bg-orange-500"
                />
                <StatCard
                  title="Seller Applications"
                  value={stats.pendingSellerApplications}
                  icon={ShoppingBag}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Open Disputes"
                  value={stats.openDisputes}
                  icon={AlertTriangle}
                  color="bg-red-500"
                />
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers.toLocaleString()}
                  icon={Users}
                  color="bg-green-500"
                />
                <StatCard
                  title="Total Sellers"
                  value={stats.totalSellers.toLocaleString()}
                  icon={ShoppingBag}
                  color="bg-purple-500"
                />
                <StatCard
                  title="Suspended Users"
                  value={stats.suspendedUsers}
                  icon={XCircle}
                  color="bg-gray-500"
                />
              </div>
            )}

            {/* Recent Actions */}
            <GlassPanel className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Admin Actions</h2>
              {stats?.recentActions && stats.recentActions.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActions.slice(0, 10).map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <div>
                          <p className="text-white text-sm">
                            <span className="font-medium">{action.adminHandle}</span> {action.action}
                          </p>
                          <p className="text-gray-400 text-xs">{action.reason}</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No recent actions</p>
              )}
            </GlassPanel>

            {/* Quick Actions */}
            <GlassPanel className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hasPermission('content.moderate') && (
                  <Button
                    onClick={() => setActiveTab('moderation')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Review Content
                  </Button>
                )}
                {hasPermission('marketplace.seller_review') && (
                  <Button
                    onClick={() => setActiveTab('sellers')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Review Sellers
                  </Button>
                )}
                {hasPermission('disputes.resolve') && (
                  <Button
                    onClick={() => setActiveTab('disputes')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Resolve Disputes
                  </Button>
                )}
              </div>
            </GlassPanel>
          </div>
        )}

        {activeTab === 'moderation' && hasPermission('content.moderate') && (
          <ModerationQueue />
        )}

        {activeTab === 'sellers' && hasPermission('marketplace.seller_review') && (
          <SellerApplications />
        )}

        {activeTab === 'disputes' && hasPermission('disputes.view') && (
          <DisputeResolution />
        )}

        {activeTab === 'users' && hasPermission('users.view') && (
          <UserManagement />
        )}

        {activeTab === 'analytics' && hasPermission('system.analytics') && (
          <AdminAnalytics />
        )}
      </div>
    </div>
  );
}