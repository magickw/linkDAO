import React, { useState } from 'react';
import { useMobileOptimization } from '../../../../hooks/useMobileOptimization';
import { MobileSellerDashboard } from './index';
import { MobileSellerNavigation } from './index';
import { SwipeableSellerCard } from './index';
import { MobileOptimizedForm } from './index';
import { TouchOptimizedButton } from './index';

const MobileSellerDemo: React.FC = () => {
  const { isMobile, isTablet, orientation, screenSize, touchSupported } = useMobileOptimization();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);

  // Mock data
  const mockWalletAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const mockListings = [
    {
      id: '1',
      title: 'Vintage Camera',
      price: '0.5 ETH',
      images: ['https://via.placeholder.com/300x200'],
      status: 'active',
    },
    {
      id: '2',
      title: 'Digital Art NFT',
      price: '1.2 ETH',
      images: ['https://via.placeholder.com/300x200'],
      status: 'sold',
    },
    {
      id: '3',
      title: 'Gaming Headset',
      price: '0.3 ETH',
      images: ['https://via.placeholder.com/300x200'],
      status: 'draft',
    },
  ];

  const formFields = [
    {
      id: 'title',
      type: 'text' as const,
      label: 'Product Title',
      placeholder: 'Enter product title',
      required: true,
      autoComplete: 'off',
    },
    {
      id: 'description',
      type: 'textarea' as const,
      label: 'Description',
      placeholder: 'Describe your product',
      required: true,
    },
    {
      id: 'price',
      type: 'number' as const,
      label: 'Price (ETH)',
      placeholder: '0.00',
      required: true,
      inputMode: 'decimal' as const,
      validation: (value: string) => {
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a valid price';
        }
        return null;
      },
    },
    {
      id: 'category',
      type: 'select' as const,
      label: 'Category',
      required: true,
      options: [
        { value: 'electronics', label: 'Electronics' },
        { value: 'art', label: 'Art & Collectibles' },
        { value: 'fashion', label: 'Fashion' },
        { value: 'home', label: 'Home & Garden' },
      ],
    },
    {
      id: 'images',
      type: 'file' as const,
      label: 'Product Images',
      required: true,
    },
    {
      id: 'featured',
      type: 'toggle' as const,
      label: 'Featured Listing',
      required: false,
    },
  ];

  const handleFormSubmit = (data: Record<string, any>) => {
    console.log('Form submitted:', data);
    alert('Listing created successfully!');
    setShowForm(false);
  };

  if (!isMobile && !isTablet) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Mobile Seller Demo</h2>
        <p>This demo is optimized for mobile devices. Please view on a mobile device or resize your browser window to see the mobile experience.</p>
        <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Current Device Info:</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>Mobile: {isMobile ? 'Yes' : 'No'}</li>
            <li>Tablet: {isTablet ? 'Yes' : 'No'}</li>
            <li>Orientation: {orientation}</li>
            <li>Screen Size: {screenSize}</li>
            <li>Touch Supported: {touchSupported ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-seller-demo">
      {/* Navigation */}
      <MobileSellerNavigation
        currentPage={currentView}
        onNavigate={setCurrentView}
        walletAddress={mockWalletAddress}
      />

      {/* Main Content */}
      <div className="demo-content">
        {currentView === 'dashboard' && (
          <MobileSellerDashboard walletAddress={mockWalletAddress} />
        )}

        {currentView === 'listings' && (
          <div className="listings-view">
            <div className="view-header">
              <h2>Your Listings</h2>
              <TouchOptimizedButton
                variant="primary"
                size="medium"
                onClick={() => setShowForm(true)}
              >
                + Add Listing
              </TouchOptimizedButton>
            </div>

            <div className="listings-list">
              {mockListings.map((listing) => (
                <SwipeableSellerCard
                  key={listing.id}
                  listing={listing}
                  onEdit={() => alert(`Edit ${listing.title}`)}
                  onDelete={() => alert(`Delete ${listing.title}`)}
                  onView={() => alert(`View ${listing.title}`)}
                  onShare={() => alert(`Share ${listing.title}`)}
                />
              ))}
            </div>
          </div>
        )}

        {currentView === 'create-listing' || showForm ? (
          <div className="form-view">
            <div className="view-header">
              <h2>Create New Listing</h2>
              <TouchOptimizedButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setCurrentView('listings');
                }}
              >
                ✕
              </TouchOptimizedButton>
            </div>

            <MobileOptimizedForm
              fields={formFields}
              onSubmit={handleFormSubmit}
              submitLabel="Create Listing"
            />
          </div>
        ) : null}

        {/* Demo Features Section */}
        {currentView === 'dashboard' && (
          <div className="demo-features">
            <h3>Mobile Optimizations Demo</h3>
            
            <div className="feature-section">
              <h4>Touch-Optimized Buttons</h4>
              <div className="button-demo">
                <TouchOptimizedButton
                  variant="primary"
                  size="sm"
                  onClick={() => alert('Small button clicked')}
                >
                  Small
                </TouchOptimizedButton>
                <TouchOptimizedButton
                  variant="secondary"
                  size="medium"
                  onClick={() => alert('Medium button clicked')}
                >
                  Medium
                </TouchOptimizedButton>
                <TouchOptimizedButton
                  variant="outline"
                  size="large"
                  onClick={() => alert('Large button clicked')}
                >
                  Large
                </TouchOptimizedButton>
              </div>
            </div>

            <div className="feature-section">
              <h4>Swipeable Cards</h4>
              <p>Swipe left on listings to reveal actions</p>
              <SwipeableSellerCard
                listing={mockListings[0]}
                onEdit={() => alert('Edit action')}
                onDelete={() => alert('Delete action')}
                onView={() => alert('View action')}
                onShare={() => alert('Share action')}
              />
            </div>

            <div className="feature-section">
              <h4>Device Information</h4>
              <div className="device-info">
                <p><strong>Screen Size:</strong> {screenSize}</p>
                <p><strong>Orientation:</strong> {orientation}</p>
                <p><strong>Touch Support:</strong> {touchSupported ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .mobile-seller-demo {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .demo-content {
          padding-bottom: 80px; /* Space for bottom navigation */
        }

        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: white;
          border-bottom: 1px solid #e9ecef;
        }

        .view-header h2 {
          margin: 0;
          font-size: 20px;
          color: #212529;
        }

        .listings-view {
          background: white;
        }

        .listings-list {
          padding: 16px;
        }

        .form-view {
          background: white;
          min-height: 100vh;
        }

        .demo-features {
          padding: 20px;
          background: white;
          margin: 16px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .demo-features h3 {
          margin: 0 0 20px 0;
          color: #212529;
          font-size: 18px;
        }

        .feature-section {
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e9ecef;
        }

        .feature-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .feature-section h4 {
          margin: 0 0 12px 0;
          color: #495057;
          font-size: 16px;
        }

        .button-demo {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .device-info {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
        }

        .device-info p {
          margin: 4px 0;
          font-size: 14px;
          color: #495057;
        }

        @media (max-width: 480px) {
          .demo-features {
            margin: 12px;
            padding: 16px;
          }
          
          .button-demo {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileSellerDemo;