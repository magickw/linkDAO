import React, { useState } from 'react';
import { useMobileOptimization } from '../../../../hooks/useMobileOptimization';
import { useSellerState } from '../../../../hooks/useSellerState';
import { TouchOptimizedButton } from './TouchOptimizedButton';

interface MobileSellerDashboardProps {
  walletAddress: string;
}

interface DashboardTab {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType<any>;
}

const MobileSellerDashboard: React.FC<MobileSellerDashboardProps> = ({ walletAddress }) => {
  const { isMobile, shouldUseCompactLayout, getOptimalFontSize } = useMobileOptimization();
  const { profile, listings, dashboardStats, isLoading } = useSellerState(walletAddress);
  const [activeTab, setActiveTab] = useState('overview');

  // Mobile-specific tabs
  const tabs: DashboardTab[] = [
    { id: 'overview', label: 'Overview', icon: '📊', component: MobileOverviewTab },
    { id: 'listings', label: 'Listings', icon: '📝', component: MobileListingsTab },
    { id: 'orders', label: 'Orders', icon: '📦', component: MobileOrdersTab },
    { id: 'analytics', label: 'Analytics', icon: '📈', component: MobileAnalyticsTab },
    { id: 'profile', label: 'Profile', icon: '👤', component: MobileProfileTab },
  ];

  if (!isMobile) {
    // Fallback to desktop version
    return null;
  }

  if (isLoading) {
    return <MobileDashboardSkeleton />;
  }

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component || MobileOverviewTab;

  return (
    <div className="mobile-seller-dashboard">
      {/* Mobile Header */}
      <div className="mobile-dashboard-header">
        <div className="seller-info-compact">
          <div className="seller-avatar">
            {profile?.profileImageCdn ? (
              <img 
                src={profile.profileImageCdn} 
                alt={profile.storeName || 'Seller'}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                {profile?.storeName?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className="seller-details">
            <h2 style={{ fontSize: getOptimalFontSize(18) }}>
              {profile?.storeName || 'Seller Dashboard'}
            </h2>
            <p className="tier-badge">
              {profile?.tier || 'Bronze'} Tier
            </p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="quick-actions">
          <TouchOptimizedButton
            variant="primary"
            size="sm"
            onClick={() => {/* Navigate to create listing */}}
          >
            + List Item
          </TouchOptimizedButton>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="mobile-tab-navigation">
        <div className="tab-scroll-container">
          {tabs.map((tab) => (
            <TouchOptimizedButton
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </TouchOptimizedButton>
          ))}
        </div>
      </div>

      {/* Mobile Content Area */}
      <div className="mobile-content-area">
        <ActiveTabComponent 
          profile={profile}
          listings={listings}
          dashboard={dashboardStats}
          walletAddress={walletAddress}
        />
      </div>

      <style jsx>{`
        .mobile-seller-dashboard {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f8f9fa;
        }

        .mobile-dashboard-header {
          background: white;
          padding: 16px;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .seller-info-compact {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .seller-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: #6c757d;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
        }

        .seller-details h2 {
          margin: 0;
          color: #212529;
          font-weight: 600;
        }

        .tier-badge {
          margin: 4px 0 0 0;
          color: #6c757d;
          font-size: 14px;
        }

        .mobile-tab-navigation {
          background: white;
          border-bottom: 1px solid #e9ecef;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .tab-scroll-container {
          display: flex;
          padding: 8px 16px;
          gap: 8px;
          min-width: max-content;
        }

        .tab-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 60px;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: #f8f9fa;
          color: #6c757d;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .tab-button.active {
          background: #007bff;
          color: white;
        }

        .tab-button:hover {
          background: #e9ecef;
        }

        .tab-button.active:hover {
          background: #0056b3;
        }

        .tab-icon {
          font-size: 16px;
        }

        .mobile-content-area {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px;
        }

        @media (max-width: 480px) {
          .mobile-dashboard-header {
            padding: 12px;
          }
          
          .seller-details h2 {
            font-size: 16px;
          }
          
          .mobile-content-area {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

// Mobile Tab Components
const MobileOverviewTab: React.FC<any> = ({ dashboardStats, profile }) => {
  const { getOptimalFontSize } = useMobileOptimization();
  
  return (
    <div className="mobile-overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <h3 style={{ fontSize: getOptimalFontSize(16) }}>Active Listings</h3>
          <p className="stat-value">{dashboardStats?.listings?.active || 0}</p>
        </div>
        <div className="stat-card">
          <h3 style={{ fontSize: getOptimalFontSize(16) }}>Total Orders</h3>
          <p className="stat-value">{dashboardStats?.orders?.pending || 0}</p>
        </div>
        <div className="stat-card">
          <h3 style={{ fontSize: getOptimalFontSize(16) }}>Rating</h3>
          <p className="stat-value">{profile?.stats?.rating || 'N/A'}</p>
        </div>
        <div className="stat-card">
          <h3 style={{ fontSize: getOptimalFontSize(16) }}>Tier Progress</h3>
          <p className="stat-value">{profile?.tierProgress?.percentage || 0}%</p>
        </div>
      </div>

      <style jsx>{`
        .mobile-overview-tab {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .stat-card {
          background: white;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          text-align: center;
        }

        .stat-card h3 {
          margin: 0 0 8px 0;
          color: #6c757d;
          font-weight: 500;
        }

        .stat-value {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          color: #212529;
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

const MobileListingsTab: React.FC<any> = ({ listings }) => {
  return (
    <div className="mobile-listings-tab">
      <div className="listings-list">
        {listings?.map((listing: any) => (
          <div key={listing.id} className="mobile-listing-card">
            <div className="listing-image">
              {listing.images?.[0] ? (
                <img src={listing.images[0]} alt={listing.title} />
              ) : (
                <div className="image-placeholder">📷</div>
              )}
            </div>
            <div className="listing-details">
              <h4>{listing.title}</h4>
              <p className="listing-price">{listing.displayPrice}</p>
              <p className="listing-status">{listing.status}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .mobile-listings-tab {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mobile-listing-card {
          background: white;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          padding: 12px;
          display: flex;
          gap: 12px;
        }

        .listing-image {
          width: 60px;
          height: 60px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .listing-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          width: 100%;
          height: 100%;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .listing-details {
          flex: 1;
        }

        .listing-details h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: #212529;
        }

        .listing-price {
          margin: 0 0 4px 0;
          font-weight: bold;
          color: #007bff;
        }

        .listing-status {
          margin: 0;
          font-size: 12px;
          color: #6c757d;
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
};

const MobileOrdersTab: React.FC<any> = ({ dashboardStats }) => {
  return (
    <div className="mobile-orders-tab">
      <p>Orders functionality coming soon...</p>
    </div>
  );
};

const MobileAnalyticsTab: React.FC<any> = ({ dashboardStats }) => {
  return (
    <div className="mobile-analytics-tab">
      <p>Analytics functionality coming soon...</p>
    </div>
  );
};

const MobileProfileTab: React.FC<any> = ({ profile }) => {
  return (
    <div className="mobile-profile-tab">
      <p>Profile editing functionality coming soon...</p>
    </div>
  );
};

const MobileDashboardSkeleton: React.FC = () => {
  return (
    <div className="mobile-dashboard-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-text"></div>
      </div>
      <div className="skeleton-tabs">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-tab"></div>
        ))}
      </div>
      <div className="skeleton-content">
        <div className="skeleton-card"></div>
        <div className="skeleton-card"></div>
      </div>

      <style jsx>{`
        .mobile-dashboard-skeleton {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .skeleton-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #e9ecef;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-text {
          width: 120px;
          height: 20px;
          background: #e9ecef;
          border-radius: 4px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-tabs {
          display: flex;
          gap: 8px;
        }

        .skeleton-tab {
          width: 60px;
          height: 40px;
          background: #e9ecef;
          border-radius: 8px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-card {
          height: 80px;
          background: #e9ecef;
          border-radius: 8px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default MobileSellerDashboard;