import React, { useState, useEffect } from 'react';
import { useMobileOptimization } from '../../../../hooks/useMobileOptimization';
import { TouchOptimizedButton } from './TouchOptimizedButton';

interface MobileSellerNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  walletAddress: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  path: string;
}

export const MobileSellerNavigation: React.FC<MobileSellerNavigationProps> = ({
  currentPage,
  onNavigate,
  walletAddress,
}) => {
  const { isMobile, shouldUseCompactLayout } = useMobileOptimization();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);

  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/marketplace' },
    { id: 'listings', label: 'Listings', icon: '📝', path: '/marketplace/seller/listings' },
    { id: 'orders', label: 'Orders', icon: '📦', badge: notifications, path: '/marketplace/seller/orders' },
    { id: 'analytics', label: 'Analytics', icon: '📈', path: '/marketplace/seller/analytics' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/marketplace/seller/profile' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/marketplace/seller/settings' },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('.mobile-seller-navigation')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile Header with Hamburger Menu */}
      <div className="mobile-seller-header">
        <TouchOptimizedButton
          variant="ghost"
          size="medium"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="menu-toggle"
        >
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </TouchOptimizedButton>

        <div className="header-title">
          <h1>Seller Portal</h1>
        </div>

        <div className="header-actions">
          <TouchOptimizedButton
            variant="ghost"
            size="small"
            onClick={() => {/* Handle notifications */}}
          >
            🔔
            {notifications > 0 && (
              <span className="notification-badge">{notifications}</span>
            )}
          </TouchOptimizedButton>
        </div>
      </div>

      {/* Slide-out Navigation Menu */}
      <div className={`mobile-nav-overlay ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-menu">
          {/* Menu Header */}
          <div className="nav-menu-header">
            <div className="seller-info">
              <div className="seller-avatar">
                <span>👤</span>
              </div>
              <div className="seller-details">
                <h3>Seller Account</h3>
                <p>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
              </div>
            </div>
            
            <TouchOptimizedButton
              variant="ghost"
              size="small"
              onClick={() => setIsMenuOpen(false)}
              className="close-button"
            >
              ✕
            </TouchOptimizedButton>
          </div>

          {/* Navigation Items */}
          <div className="nav-menu-items">
            {navigationItems.map((item) => (
              <TouchOptimizedButton
                key={item.id}
                variant="ghost"
                size="large"
                onClick={() => {
                  onNavigate(item.id);
                  setIsMenuOpen(false);
                }}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </TouchOptimizedButton>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="nav-quick-actions">
            <TouchOptimizedButton
              variant="primary"
              size="medium"
              onClick={() => {
                onNavigate('create-listing');
                setIsMenuOpen(false);
              }}
              className="create-listing-btn"
            >
              + Create Listing
            </TouchOptimizedButton>
          </div>
        </div>
      </div>

      {/* Bottom Tab Bar (Alternative Navigation) */}
      {shouldUseCompactLayout() && (
        <div className="mobile-bottom-tabs">
          {navigationItems.slice(0, 5).map((item) => (
            <TouchOptimizedButton
              key={item.id}
              variant="ghost"
              size="small"
              onClick={() => onNavigate(item.id)}
              className={`bottom-tab ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{item.icon}</span>
              <span className="tab-label">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="tab-badge">{item.badge}</span>
              )}
            </TouchOptimizedButton>
          ))}
        </div>
      )}

      <style jsx>{`
        .mobile-seller-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: white;
          border-bottom: 1px solid #e9ecef;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-title h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #212529;
        }

        .header-actions {
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #dc3545;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          width: 20px;
          height: 16px;
          justify-content: space-between;
        }

        .hamburger span {
          display: block;
          height: 2px;
          width: 100%;
          background: #212529;
          border-radius: 1px;
          transition: all 0.3s ease;
        }

        .hamburger.open span:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.open span:nth-child(3) {
          transform: rotate(-45deg) translate(7px, -6px);
        }

        .mobile-nav-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        .mobile-nav-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .mobile-nav-menu {
          position: absolute;
          left: 0;
          top: 0;
          width: 280px;
          height: 100%;
          background: white;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .mobile-nav-overlay.open .mobile-nav-menu {
          transform: translateX(0);
        }

        .nav-menu-header {
          padding: 20px 16px;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .seller-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .seller-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .seller-details h3 {
          margin: 0;
          font-size: 16px;
          color: #212529;
        }

        .seller-details p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #6c757d;
        }

        .nav-menu-items {
          flex: 1;
          padding: 16px 0;
          overflow-y: auto;
        }

        .nav-item {
          width: 100%;
          justify-content: flex-start;
          padding: 16px 20px;
          border-radius: 0;
          gap: 16px;
        }

        .nav-item.active {
          background: #e3f2fd;
          color: #007bff;
        }

        .nav-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }

        .nav-label {
          font-size: 16px;
          font-weight: 500;
        }

        .nav-badge {
          margin-left: auto;
          background: #dc3545;
          color: white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 12px;
          min-width: 20px;
          text-align: center;
        }

        .nav-quick-actions {
          padding: 16px;
          border-top: 1px solid #e9ecef;
        }

        .create-listing-btn {
          width: 100%;
        }

        .mobile-bottom-tabs {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e9ecef;
          display: flex;
          padding: 8px 0;
          z-index: 100;
        }

        .bottom-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 4px;
          position: relative;
        }

        .bottom-tab.active {
          color: #007bff;
        }

        .tab-icon {
          font-size: 18px;
        }

        .tab-label {
          font-size: 10px;
          font-weight: 500;
        }

        .tab-badge {
          position: absolute;
          top: 4px;
          right: 8px;
          background: #dc3545;
          color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 480px) {
          .mobile-nav-menu {
            width: 100%;
          }
          
          .tab-label {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default MobileSellerNavigation;