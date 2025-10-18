import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { usePermissions } from '@/hooks/useAuth';
import { adminService } from '@/services/adminService';
import { MobileAdminLayout } from './MobileAdminLayout';
import { MobileDashboardGrid } from './MobileDashboardGrid';
import { MobileModerationQueue } from './MobileModerationQueue';
import { MobileUserManagement } from './MobileUserManagement';
import { MobileAnalytics } from './MobileAnalytics';
import { MobileSellerApplications } from './MobileSellerApplications';
import { MobileDisputeResolution } from './MobileDisputeResolution';
import { MobileModerationHistory } from './MobileModerationHistory';

interface AdminStats {
  pendingModerations: number;
  pendingSellerApplications: number;
  openDisputes: number;
  suspendedUsers: number;
  totalUsers: number;
  totalSellers: number;
  recentActions: any[];
}

export const MobileAdminDashboard: React.FC = () => {
  const router = useRouter();
  const { isAdmin, hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/');
      return;
    }
    
    loadStats();
  }, [isAdmin, router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (!isAdmin()) {
    return null;
  }

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'overview': return 'Admin Dashboard';
      case 'moderation': return 'Content Moderation';
      case 'analytics': return 'Analytics';
      case 'users': return 'User Management';
      case 'sellers': return 'Seller Applications';
      case 'disputes': return 'Dispute Resolution';
      case 'history': return 'Moderation History';
      default: return 'Admin Dashboard';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Quick Stats Cards */}
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md rounded-lg p-4 animate-pulse">
                    <div className="h-16 bg-white/10 rounded"></div>
                  </div>
                ))}
              </div>
            ) : stats && (
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  title="Pending Reviews"
                  value={stats.pendingModerations}
                  color="bg-orange-500"
                  onClick={() => setActiveTab('moderation')}
                />
                <StatCard
                  title="Seller Apps"
                  value={stats.pendingSellerApplications}
                  color="bg-blue-500"
                  onClick={() => setActiveTab('sellers')}
                />
                <StatCard
                  title="Open Disputes"
                  value={stats.openDisputes}
                  color="bg-red-500"
                  onClick={() => setActiveTab('disputes')}
                />
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers.toLocaleString()}
                  color="bg-green-500"
                  onClick={() => setActiveTab('users')}
                />
                <StatCard
                  title="Total Sellers"
                  value={stats.totalSellers.toLocaleString()}
                  color="bg-purple-500"
                />
                <StatCard
                  title="Suspended"
                  value={stats.suspendedUsers}
                  color="bg-gray-500"
                />
              </div>
            )}

            {/* Dashboard Grid */}
            <MobileDashboardGrid />

            {/* Recent Actions */}
            {stats?.recentActions && stats.recentActions.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Recent Actions</h3>
                <div className="space-y-2">
                  {stats.recentActions.slice(0, 5).map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                        <div className="min-w-0">
                          <p className="text-white text-sm truncate">
                            <span className="font-medium">{action.adminHandle}</span> {action.action}
                          </p>
                          <p className="text-gray-400 text-xs truncate">{action.reason}</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xs flex-shrink-0 ml-2">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'moderation':
        return hasPermission('content.moderate') ? (
          <MobileModerationQueue onRefresh={handleRefresh} />
        ) : (
          <PermissionDenied />
        );

      case 'analytics':
        return hasPermission('system.analytics') ? (
          <MobileAnalytics />
        ) : (
          <PermissionDenied />
        );

      case 'users':
        return hasPermission('users.view') ? (
          <MobileUserManagement />
        ) : (
          <PermissionDenied />
        );

      case 'sellers':
        return hasPermission('marketplace.seller_review') ? (
          <MobileSellerApplications />
        ) : (
          <PermissionDenied />
        );

      case 'disputes':
        return hasPermission('disputes.view') ? (
          <MobileDisputeResolution />
        ) : (
          <PermissionDenied />
        );

      case 'history':
        return hasPermission('system.audit') ? (
          <MobileModerationHistory />
        ) : (
          <PermissionDenied />
        );

      default:
        return <div className="text-white">Tab not found</div>;
    }
  };

  return (
    <MobileAdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={getTabTitle(activeTab)}
    >
      {renderTabContent()}
    </MobileAdminLayout>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color, onClick }) => (
  <div
    className={`bg-white/10 backdrop-blur-md rounded-lg p-4 ${onClick ? 'cursor-pointer hover:bg-white/15' : ''} transition-colors`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-gray-300 text-xs truncate">{title}</p>
        <p className="text-white text-lg font-bold mt-1">{value}</p>
      </div>
      <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`}></div>
    </div>
  </div>
);

// Permission Denied Component
const PermissionDenied: React.FC = () => (
  <div className="text-center py-12">
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
      <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
      <p className="text-gray-300 text-sm">
        You don't have permission to access this section.
      </p>
    </div>
  </div>
);