import React, { useState } from 'react';
import { NextPage } from 'next';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  ShoppingBag, 
  BarChart3,
  Settings,
  FileText,
  MessageSquare
} from 'lucide-react';
import { AdminDashboard } from '@/components/Admin/AdminDashboard';
import { ModerationQueue } from '@/components/Admin/ModerationQueue';
import { SellerApplications } from '@/components/Admin/SellerApplications';
import { DisputeResolution } from '@/components/Admin/DisputeResolution';
import { UserManagement } from '@/components/Admin/UserManagement';
import { AdminAnalytics } from '@/components/Admin/AdminAnalytics';
import { RoleGuard } from '@/components/Auth/RoleGuard';
import { useAuth } from '@/hooks/useAuth';
import { Button, GlassPanel } from '@/design-system';

type AdminTab = 'dashboard' | 'moderation' | 'sellers' | 'disputes' | 'users' | 'analytics';

const AdminPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const { user } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, requiredRole: 'moderator' as const },
    { id: 'moderation', label: 'Moderation', icon: Shield, requiredRole: 'moderator' as const },
    { id: 'sellers', label: 'Seller Applications', icon: ShoppingBag, requiredRole: 'moderator' as const },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, requiredRole: 'moderator' as const },
    { id: 'users', label: 'User Management', icon: Users, requiredRole: 'admin' as const },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, requiredRole: 'admin' as const },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'moderation':
        return <ModerationQueue />;
      case 'sellers':
        return <SellerApplications />;
      case 'disputes':
        return <DisputeResolution />;
      case 'users':
        return (
          <RoleGuard requiredRole="admin" fallback={
            <GlassPanel className="p-8 text-center">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
              <p className="text-gray-400">You need admin privileges to access user management.</p>
            </GlassPanel>
          }>
            <UserManagement />
          </RoleGuard>
        );
      case 'analytics':
        return (
          <RoleGuard requiredRole="admin" fallback={
            <GlassPanel className="p-8 text-center">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
              <p className="text-gray-400">You need admin privileges to access analytics.</p>
            </GlassPanel>
          }>
            <AdminAnalytics />
          </RoleGuard>
        );
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <RoleGuard 
      requiredRole="moderator" 
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
          <GlassPanel className="p-8 text-center max-w-md">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">
              You need moderator or admin privileges to access the admin panel.
            </p>
            <Button 
              onClick={() => window.history.back()} 
              variant="primary"
            >
              Go Back
            </Button>
          </GlassPanel>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            </div>
            <p className="text-gray-400">
              Welcome back, {user?.handle}. You have {user?.role.replace('_', ' ')} privileges.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <GlassPanel className="p-2">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <RoleGuard key={tab.id} requiredRole={tab.requiredRole}>
                    <Button
                      variant={activeTab === tab.id ? 'primary' : 'outline'}
                      onClick={() => setActiveTab(tab.id as AdminTab)}
                      className="flex items-center gap-2"
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </Button>
                  </RoleGuard>
                ))}
              </div>
            </GlassPanel>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default AdminPage;