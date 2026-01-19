import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUnifiedSellerDashboard, useUnifiedSeller, useSellerTiers, useUnifiedSellerListings } from '../../../hooks/useUnifiedSeller';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';
import { MessagingAnalytics, withSellerErrorBoundary } from '../Seller';
import { UnifiedSellerDashboard, UnifiedSellerProfile, UnifiedSellerListing } from '../../../types/unifiedSeller';
import { TierProvider } from '../../../contexts/TierContext';
import { TierAwareComponent } from '../Seller';
import { TierProgressBar } from '../Seller';
import { TIER_ACTIONS } from '../../../types/sellerTier';
import { UnifiedImageUpload } from '../Seller';
import { useToast } from '../../../context/ToastContext';
import { countries } from '../../../utils/countries';
import { PayoutSetupStep } from '../Seller/onboarding/PayoutSetupStep';
import { paymentMethodService, CreatePaymentMethodInput } from '../../../services/paymentMethodService';
import { OptimizedImage } from '../../Performance/OptimizedImageLoader';
import { PromoCodesManager } from '../PromoCodes/PromoCodesManager';
import { SellerOrdersTab } from './SellerOrdersTab';
import { SellerDashboardLayout } from './SellerDashboardLayout';
import FulfillmentDashboardPage from '../../../pages/seller/fulfillment-dashboard';

interface SellerDashboardProps {
  mockWalletAddress?: string;
}

interface BillingHistoryEntry {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
}

function SellerDashboardComponent({ mockWalletAddress }: SellerDashboardProps) {
  const router = useRouter();
  const sellerData = useUnifiedSeller(mockWalletAddress);
  const profile = sellerData.profile as UnifiedSellerProfile | null | undefined;
  const profileLoading = sellerData.loading;
  const profileError = sellerData.error;
  const { dashboard, stats, notifications, unreadNotifications, loading, error: dashboardError, markNotificationRead, address: dashboardAddress } = useUnifiedSellerDashboard(mockWalletAddress);
  const { getTierById, getNextTier } = useSellerTiers();
  const { listings, loading: listingsLoading, refetch: fetchListings } = useUnifiedSellerListings(dashboardAddress);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryEntry[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentMethodForm, setPaymentMethodForm] = useState<CreatePaymentMethodInput>({
    type: 'card',
    nickname: '',
    cardNumber: '',
    expiryMonth: undefined,
    expiryYear: undefined,
    cvv: '',
  });
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const { addToast } = useToast();

  // Profile editing state
  const [formData, setFormData] = useState({
    // Basic Information
    storeName: '',
    bio: '',
    sellerStory: '',
    storeDescription: '',
    location: '',
    websiteUrl: '',

    // Images
    profileImageCdn: '',
    profileImageIpfs: '',
    coverImageCdn: '',
    coverImageIpfs: '',

    // Business Information
    legalBusinessName: '',
    businessType: 'individual',
    registeredAddressStreet: '',
    registeredAddressCity: '',
    registeredAddressState: '',
    registeredAddressPostalCode: '',
    registeredAddressCountry: '',

    // Social Links
    socialLinks: {
      twitter: '',
      linkedin: '',
      facebook: '',
      discord: '',
      telegram: ''
    },

    // ENS
    ensHandle: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileTab, setProfileTab] = useState<'basic' | 'images' | 'business' | 'social'>('basic');

  // Listen for tab navigation events from other pages
  useEffect(() => {
    const handleNavigateToTab = (event: CustomEvent) => {
      if (event.detail && event.detail.tab) {
        setActiveTab(event.detail.tab);
      }
    };

    window.addEventListener('navigateToTab', handleNavigateToTab as EventListener);
    return () => {
      window.removeEventListener('navigateToTab', handleNavigateToTab as EventListener);
    };
  }, []);

  // Load payment methods and billing history when billing tab is active
  useEffect(() => {
    const loadBillingData = async () => {
      if (activeTab === 'billing' && dashboardAddress) {
        try {
          // Load payment methods
          const paymentMethodsData = await paymentMethodService.getPaymentMethods(dashboardAddress);
          setPaymentMethods(paymentMethodsData);

          // Load billing history - we'll need to implement this based on the available APIs
          // For now, we'll create a mock implementation that will be replaced later
          // In a real implementation, we would fetch actual billing history
          const billingHistoryData: BillingHistoryEntry[] = paymentMethodsData.map((method, index) => ({
            id: method.id,
            date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(), // Mock dates
            description: `Payment Method Setup: ${method.nickname}`,
            amount: '$0.00', // Setup doesn't have a cost, but billing history would have real data
            status: 'Paid' as const
          }));

          // Update state
          setBillingHistory(billingHistoryData);
        } catch (error) {
          console.error('Error loading billing data:', error);
          addToast('Error loading billing data', 'error');
        }
      }
    };

    loadBillingData();
  }, [activeTab, dashboardAddress, addToast]);

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        // Basic Information
        storeName: profile.storeName || '',
        bio: profile.bio || '',
        sellerStory: profile.sellerStory || '',
        storeDescription: profile.storeDescription || '',
        location: profile.location || '',
        websiteUrl: profile.websiteUrl || '',

        // Images - use standardized field names
        profileImageCdn: profile.profileImageCdn || '',
        profileImageIpfs: profile.profileImageIpfs || '',
        coverImageCdn: profile.coverImageCdn || '',
        coverImageIpfs: profile.coverImageIpfs || '',

        // Business Information
        legalBusinessName: profile.legalBusinessName || '',
        businessType: profile.businessType || 'individual',
        registeredAddressStreet: profile.registeredAddressStreet || '',
        registeredAddressCity: profile.registeredAddressCity || '',
        registeredAddressState: profile.registeredAddressState || '',
        registeredAddressPostalCode: profile.registeredAddressPostalCode || '',
        registeredAddressCountry: profile.registeredAddressCountry || '',

        // Social Links
        socialLinks: {
          twitter: profile.socialLinks?.twitter || '',
          linkedin: profile.socialLinks?.linkedin || '',
          facebook: profile.socialLinks?.facebook || '',
          discord: profile.socialLinks?.discord || '',
          telegram: profile.socialLinks?.telegram || ''
        },

        // ENS
        ensHandle: profile.ensHandle || ''
      });
    }
  }, [profile]);

  // Save profile handler
  const handleSaveProfile = async () => {
    if (!dashboardAddress) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const { sellerService } = await import('@/services/sellerService');

      // Transform formData to match backend schema
      const profileUpdates = {
        // Basic Information
        storeName: formData.storeName,
        bio: formData.bio,
        sellerStory: formData.sellerStory,
        storeDescription: formData.storeDescription,
        location: formData.location,
        websiteUrl: formData.websiteUrl,

        // Images
        profileImageCdn: formData.profileImageCdn,
        profileImageIpfs: formData.profileImageIpfs,
        coverImageCdn: formData.coverImageCdn,
        coverImageIpfs: formData.coverImageIpfs,

        // Business Information
        legalBusinessName: formData.legalBusinessName,
        businessType: formData.businessType,
        registeredAddressStreet: formData.registeredAddressStreet,
        registeredAddressCity: formData.registeredAddressCity,
        registeredAddressState: formData.registeredAddressState,
        registeredAddressPostalCode: formData.registeredAddressPostalCode,
        registeredAddressCountry: formData.registeredAddressCountry,

        // Social Links - send as object to match backend schema
        socialLinks: formData.socialLinks,

        // ENS
        ensHandle: formData.ensHandle,
      };

      await sellerService.updateSellerProfile(dashboardAddress, profileUpdates);

      // Trigger profile update event
      window.dispatchEvent(new CustomEvent('sellerProfileUpdated', {
        detail: { walletAddress: dashboardAddress }
      }));

      // Success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle adding a payment method
  const handleAddPaymentMethod = async () => {
    if (!dashboardAddress) {
      addToast('Wallet address not available', 'error');
      return;
    }

    setIsAddingPaymentMethod(true);

    try {
      // Validate required fields
      if (!paymentMethodForm.nickname) {
        addToast('Please provide a nickname for your payment method', 'error');
        return;
      }

      if (paymentMethodForm.type === 'card') {
        if (!paymentMethodForm.cardNumber || !paymentMethodForm.expiryMonth || !paymentMethodForm.expiryYear || !paymentMethodForm.cvv) {
          addToast('Please fill in all card details', 'error');
          return;
        }
      }

      // Add the payment method using the service
      const result = await paymentMethodService.addPaymentMethod(dashboardAddress, paymentMethodForm);

      // Add toast notification
      addToast('Payment method added successfully', 'success');

      // Close the modal
      setShowAddPaymentMethodModal(false);

      // Reset the form
      setPaymentMethodForm({
        type: 'card',
        nickname: '',
        cardNumber: '',
        expiryMonth: undefined,
        expiryYear: undefined,
        cvv: '',
      });
    } catch (error) {
      console.error('Failed to add payment method:', error);
      addToast('Failed to add payment method. Please try again.', 'error');
    } finally {
      setIsAddingPaymentMethod(false);
    }
  };


  // If no wallet address is available, show error
  if (!dashboardAddress && !mockWalletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h1>
            <p className="text-gray-300 mb-6">
              Please connect your wallet to access the seller dashboard.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="primary">
            Connect Wallet
          </Button>
        </GlassPanel>
      </div>
    );
  }

  const walletAddress = dashboardAddress || mockWalletAddress!;

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-32" />
            ))}
          </div>
          <LoadingSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Handle errors from either profile or dashboard
  const activeError = profileError || dashboardError;

  // Show error if there's an API error (different from profile not found)
  if (activeError && !(activeError instanceof Error && activeError.message.includes('not found'))) {
    const errorMessage = activeError instanceof Error ? activeError.message : String(activeError);
    const isServerError = errorMessage.includes('500') || errorMessage.includes('Server error');
    // Check for auth errors
    const isAuthError = errorMessage.includes('sign in') || errorMessage.includes('authenticate') || errorMessage.includes('401') || errorMessage.includes('403');

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className={`w-16 h-16 bg-gradient-to-r ${isServerError ? 'from-orange-500 to-red-500' : 'from-red-500 to-orange-500'} rounded-full mx-auto mb-4 flex items-center justify-center`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {isAuthError ? 'Authentication Required' : isServerError ? 'Server Error' : 'Error Loading Dashboard'}
            </h1>
            <p className="text-gray-300 mb-4">
              {isAuthError
                ? 'Please sign in to access your seller dashboard.'
                : isServerError
                  ? 'Our servers are experiencing issues. Please try again in a few minutes.'
                  : 'There was an error loading your seller dashboard. Please try again.'
              }
            </p>
            {!isAuthError && (
              <div className="text-left bg-red-500/10 rounded-lg p-4 mb-6">
                <p className="text-red-300 text-sm font-mono break-all">
                  {errorMessage}
                </p>
                {isServerError && (
                  <p className="text-red-300 text-xs mt-2">
                    Error Code: 500 - Internal Server Error
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {isAuthError ? (
              <Button
                onClick={() => {
                  // Redirect to login or trigger wallet connect
                  // For now, reload to trigger auth flow
                  window.location.reload();
                }}
                variant="primary"
                className="w-full"
              >
                Sign In
              </Button>
            ) : (
              <Button
                onClick={() => {
                  sellerData.refetch();
                  // We need to refetch dashboard too, but rely on window reload for now as it's cleaner
                  window.location.reload();
                }}
                variant="primary"
                className="w-full"
              >
                Try Again
              </Button>
            )}
            <Button
              onClick={() => router.push('/marketplace')}
              variant="secondary"
              className="w-full"
            >
              Browse Marketplace
            </Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Seller Dashboard</h1>
            <p className="text-gray-300 mb-4">
              To start selling on LinkDAO Marketplace, you'll need to set up your seller profile first.
            </p>
            <div className="text-left bg-white/5 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">What you'll need:</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Store name and description</li>
                <li>• Business information</li>
                <li>• Payment method setup</li>
                <li>• Profile verification</li>
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/marketplace/seller/onboarding')}
              variant="primary"
              className="w-full"
            >
              Complete Seller Setup
            </Button>
            <Button
              onClick={() => router.push('/marketplace')}
              variant="secondary"
              className="w-full"
            >
              Browse Marketplace
            </Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // If stats is null or undefined, show a loading state or message
  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Loading Dashboard</h1>
            <p className="text-gray-300">
              Please wait while we load your seller dashboard data...
            </p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  const currentTier = profile?.tier ? getTierById(profile.tier.id) : undefined;
  const nextTier = profile?.tier ? getNextTier(profile.tier.id) : undefined;

  // Get tier color for sidebar
  const getTierColor = (tierId: string | undefined) => {
    switch (tierId) {
      case 'diamond': return 'from-cyan-500 to-indigo-600';
      case 'platinum': return 'from-slate-400 to-slate-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-300 to-gray-500';
      default: return 'from-orange-400 to-orange-600';
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, color = 'blue' }: any) => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 bg-${color}-500 bg-opacity-20 rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </GlassPanel>
  );

  return (
    <TierProvider walletAddress={walletAddress}>
      <SellerDashboardLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadNotifications={unreadNotifications}
        pendingOrdersCount={dashboard?.orders?.summary?.pending || 0}
        unreadMessagesCount={0}
        storeName={profile?.storeName || 'Seller Store'}
        storeImage={profile?.profileImageCdn || profile?.profileImageUrl}
        tierName={currentTier?.name || 'Bronze'}
        tierColor={getTierColor(currentTier?.id as string)}
      >
        <div className="max-w-7xl mx-auto">
          {/* Desktop Header */}
          <div className="hidden lg:flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              {profile?.profileImageCdn || profile?.profileImageUrl ? (
                <img
                  src={profile.profileImageCdn || profile.profileImageUrl}
                  alt={profile.storeName || 'Seller'}
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 mr-4"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-xl font-bold">
                    {profile?.storeName?.charAt(0) || 'S'}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{profile?.storeName || 'Seller Store'}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getTierColor(currentTier?.id as string)} text-white`}>
                    {currentTier?.name}
                  </span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(profile?.stats?.averageRating || 0) ? 'text-yellow-400' : 'text-gray-600'
                          }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-gray-400 text-sm ml-1">
                      ({profile?.stats?.totalReviews || 0})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  const sellerId = profile?.walletAddress || dashboardAddress;
                  if (sellerId) {
                    router.push(`/marketplace/seller/store/${sellerId}`);
                  } else {
                    console.error('No seller ID available for store navigation');
                  }
                }}
                variant="outline"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Store
              </Button>
              <Button
                onClick={() => router.push('/marketplace/seller/listings/create')}
                variant="primary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Listing
              </Button>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="lg:hidden flex gap-2 mb-6">
            <Button
              onClick={() => {
                const sellerId = profile?.walletAddress || dashboardAddress;
                if (sellerId) {
                  router.push(`/marketplace/seller/store/${sellerId}`);
                }
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              View Store
            </Button>
            <Button
              onClick={() => router.push('/marketplace/seller/listings/create')}
              variant="primary"
              size="sm"
              className="flex-1"
            >
              New Listing
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <StatCard
              title="Total Sales"
              value={formatCurrency(stats?.balance?.totalEarnings || 0)}
              color="green"
              icon={
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              }
            />

            <StatCard
              title="Active Listings"
              value={dashboard?.listings?.summary?.active || 0}
              color="blue"
              icon={
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />

            <StatCard
              title="Pending Orders"
              value={dashboard?.orders?.summary?.pending || 0}
              color="orange"
              icon={
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2H5a2 2 0 002-2v-6a2 2 0 002-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />

            <StatCard
              title="Reputation Score"
              value={profile?.stats?.reputationScore || 0}
              color="purple"
              icon={
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              }
            />
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'promotions' && dashboardAddress && (
              <PromoCodesManager walletAddress={dashboardAddress} />
            )}

            {activeTab === 'orders' && (
              <SellerOrdersTab isActive={activeTab === 'orders'} />
            )}

            {activeTab === 'fulfillment' && (
              <div className="-m-6">
                <FulfillmentDashboardPage />
              </div>
            )}

            {activeTab === 'returns' && (
              <GlassPanel className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Returns & Refunds</h3>
                <p className="text-gray-400 mb-6">
                  Manage return requests and process refunds for your orders.
                </p>

                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-white mb-2">No Return Requests</h4>
                  <p className="text-gray-400">
                    You don't have any pending return requests at the moment.
                  </p>
                </div>
              </GlassPanel>
            )}

            {activeTab === 'overview' && (
              <GlassPanel className="p-6">
                {/* Check if user has listings */}
                {(listings && (listings as UnifiedSellerListing[]).length > 0) || (dashboard?.listings?.summary?.active || 0) > 0 ? (
                  <div className="space-y-6">
                    {/* Quick Stats Overview */}
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Dashboard Overview</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <p className="text-gray-400 text-sm">Active Listings</p>
                          <p className="text-2xl font-bold text-white">{dashboard?.listings?.summary?.active || (listings as UnifiedSellerListing[])?.length || 0}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <p className="text-gray-400 text-sm">Total Listings</p>
                          <p className="text-2xl font-bold text-white">{dashboard?.listings?.summary?.total || (listings as UnifiedSellerListing[])?.length || 0}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <p className="text-gray-400 text-sm">Pending Orders</p>
                          <p className="text-2xl font-bold text-white">{dashboard?.orders?.summary?.pending || 0}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <p className="text-gray-400 text-sm">Total Earnings</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(stats?.balance?.totalEarnings || 0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Listings */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-white">Recent Listings</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('listings')}
                        >
                          View All
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(listings as UnifiedSellerListing[])?.slice(0, 3).map((listing: UnifiedSellerListing) => (
                          <div key={listing.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                {listing.images && listing.images.length > 0 ? (
                                  <OptimizedImage
                                    src={listing.images[0]}
                                    alt={listing.title}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                    useProductDefault={true}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                    <span className="text-xl">📦</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <h5 className="text-white font-medium">{listing.title}</h5>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-green-400 text-sm">
                                    {listing.price?.toFixed(4) || '0'} {listing.currency || 'ETH'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${listing.status === 'active' ? 'bg-green-600 text-white' :
                                    listing.status === 'sold' ? 'bg-blue-600 text-white' :
                                      'bg-gray-600 text-white'
                                    }`}>
                                    {listing.status?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-400">
                              <div>{listing.views || 0} views</div>
                              <div>{listing.favorites || 0} likes</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Quick Actions</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => router.push('/marketplace/seller/listings/create')}
                          className="flex flex-col items-center py-4"
                        >
                          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          New Listing
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('orders')}
                          className="flex flex-col items-center py-4"
                        >
                          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          View Orders
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('analytics')}
                          className="flex flex-col items-center py-4"
                        >
                          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Analytics
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('messaging')}
                          className="flex flex-col items-center py-4"
                        >
                          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Messages
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Welcome to Your Dashboard</h3>
                    <p className="text-gray-300 mb-6">
                      Start by creating your first listing to begin selling on the marketplace
                    </p>
                    <Button
                      onClick={() => router.push('/marketplace/seller/listings/create')}
                      variant="primary"
                    >
                      Create Your First Listing
                    </Button>
                  </div>
                )}
              </GlassPanel>
            )}

            {activeTab === 'notifications' && (
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.map((notification: any) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border-l-4 ${notification.read
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-blue-900 bg-opacity-50 border-blue-500'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{notification.title}</h4>
                            <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
                            <p className="text-gray-400 text-xs mt-2">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <Button
                              onClick={() => markNotificationRead(notification.id)}
                              variant="outline"
                              size="sm"
                            >
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h5m5 0v5" />
                      </svg>
                      <p className="text-gray-400">No notifications yet</p>
                    </div>
                  )}
                </div>
              </GlassPanel>
            )}

            {activeTab === 'messaging' && (
              <GlassPanel className="p-0">
                <MessagingAnalytics />
              </GlassPanel>
            )}

            {activeTab === 'listings' && (
              <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white">My Listings</h3>
                    <p className="text-gray-400 text-sm mt-1">Manage your product listings and edit their details</p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => fetchListings()}
                      variant="outline"
                      size="sm"
                      loading={listingsLoading}
                    >
                      Refresh
                    </Button>
                    <Button
                      onClick={() => router.push('/marketplace/seller/listings/create')}
                      variant="primary"
                      size="sm"
                    >
                      New Listing
                    </Button>
                  </div>
                </div>

                {listingsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <LoadingSkeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (listings as UnifiedSellerListing[]).length > 0 ? (
                  <div className="space-y-4">
                    {(listings as UnifiedSellerListing[]).map((listing: UnifiedSellerListing) => (
                      <div key={listing.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors duration-200 border border-gray-700 hover:border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                              <OptimizedImage
                                src={listing.images?.[0] || ''}
                                alt={listing.title}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                priority="medium"
                                placeholder="skeleton"
                                useProductDefault={true}
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-medium mb-1">{listing.title}</h4>
                              <p className="text-gray-300 text-sm mb-2 line-clamp-2">{listing.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-green-400 font-medium">
                                  {listing.price ? (typeof listing.price === 'string' ? listing.price : listing.price.toString()) : 'N/A'} {listing.currency || 'ETH'}
                                </span>
                                <span className="text-gray-400">
                                  Inventory: {listing.inventory}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${listing.status === 'active' ? 'bg-green-600 text-white' :
                                  listing.status === 'sold' ? 'bg-blue-600 text-white' :
                                    'bg-gray-600 text-white'
                                  }`}>
                                  {listing.status?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-sm text-gray-400 mr-2">
                              <div>Views: {listing.views || 0}</div>
                              <div>Likes: {listing.favorites || 0}</div>
                            </div>
                            <Button
                              onClick={() => router.push(`/marketplace/seller/listings/edit/${listing.id}`)}
                              variant="primary"
                              size="sm"
                              className="font-semibold px-3 py-2"
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              onClick={() => router.push(`/marketplace/listing/${listing.id}`)}
                              variant="outline"
                              size="sm"
                              className="px-3 py-2"
                            >
                              👁️ View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No listings yet</h3>
                    <p className="text-gray-400 mb-6">Create your first listing to start selling</p>
                    <Button
                      onClick={() => router.push('/marketplace/seller/listings/create')}
                      variant="primary"
                    >
                      Create First Listing
                    </Button>
                  </div>
                )}
              </GlassPanel>
            )}

            {/* Analytics Tab with Tier Gating */}
            {activeTab === 'analytics' && (
              <TierAwareComponent
                requiredAction={TIER_ACTIONS.ACCESS_ANALYTICS}
                showUpgradePrompt={true}
                fallbackComponent={({ tier, validation }: { tier: any; validation: any }) => (
                  <GlassPanel className="p-6 text-center">
                    <div className="py-8">
                      <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Analytics Locked</h3>
                      <p className="text-gray-400 mb-4">
                        {validation?.reason || 'Analytics access requires a higher tier'}
                      </p>
                      <p className="text-sm text-blue-400">
                        {validation?.alternativeAction || 'Upgrade your tier to access detailed analytics'}
                      </p>
                    </div>
                  </GlassPanel>
                )}
              >
                <GlassPanel className="p-6 text-center">
                  <p className="text-gray-400">
                    Analytics dashboard coming soon...
                  </p>
                </GlassPanel>
              </TierAwareComponent>
            )}

            {/* Add profile editing tab directly in the dashboard */}
            {activeTab === 'profile' && profile && (
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Edit Seller Profile</h3>

                {/* Success/Error Messages */}
                {saveSuccess && (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                    <p className="text-green-400 font-medium">Profile updated successfully!</p>
                  </div>
                )}
                {saveError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                    <p className="text-red-400 font-medium">Error: {saveError}</p>
                  </div>
                )}

                {/* Tabbed Profile Form */}
                <div className="space-y-6">
                  {/* Tab Navigation */}
                  <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-4">
                    <button
                      onClick={() => setProfileTab('basic')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${profileTab === 'basic'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                      📝 Basic Info
                    </button>
                    <button
                      onClick={() => setProfileTab('images')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${profileTab === 'images'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                      🖼️ Images
                    </button>
                    <button
                      onClick={() => setProfileTab('business')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${profileTab === 'business'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                      🏢 Business Info
                    </button>
                    <button
                      onClick={() => setProfileTab('social')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${profileTab === 'social'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                      🔗 Social & Contact
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[400px]">
                    {/* Basic Information Tab */}
                    {profileTab === 'basic' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-gray-400 text-sm mb-1">
                            Store Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.storeName}
                            onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Your store name"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Location</label>
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="City, Country"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-gray-400 text-sm mb-1">Bio</label>
                          <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Brief description about you"
                          />
                          <p className="text-gray-500 text-xs mt-1">{formData.bio?.length || 0}/500 characters</p>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-gray-400 text-sm mb-1">Store Description</label>
                          <textarea
                            value={formData.storeDescription}
                            onChange={(e) => setFormData({ ...formData, storeDescription: e.target.value })}
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="What makes your store unique?"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-gray-400 text-sm mb-1">Seller Story</label>
                          <textarea
                            value={formData.sellerStory}
                            onChange={(e) => setFormData({ ...formData, sellerStory: e.target.value })}
                            rows={5}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Tell your story..."
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-gray-400 text-sm mb-1">Website URL</label>
                          <input
                            type="url"
                            value={formData.websiteUrl}
                            onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                      </div>
                    )}

                    {/* Images Tab */}
                    {profileTab === 'images' && (
                      <div className="space-y-8">
                        <div>
                          <label className="block text-gray-400 text-sm mb-3">Profile Avatar</label>
                          <div className="flex items-start space-x-6">
                            {formData.profileImageCdn ? (
                              <img
                                src={formData.profileImageCdn}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover border-2 border-purple-500"
                              />
                            ) : (
                              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                                <span className="text-white text-4xl font-bold">
                                  {formData.storeName?.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <UnifiedImageUpload
                                context="profile"
                                label="Profile Avatar"
                                description="Upload a profile picture for your seller profile (recommended: square format, at least 400x400px)"
                                onUploadSuccess={(results) => {
                                  if (results.length > 0) {
                                    setFormData({ ...formData, profileImageCdn: results[0].cdnUrl });
                                  }
                                }}
                                onUploadError={(error) => {
                                  console.error('Profile avatar upload error:', error);
                                  addToast('Failed to upload profile avatar. Please try again.', 'error');
                                }}
                                initialImages={formData.profileImageCdn ? [{
                                  originalUrl: formData.profileImageCdn,
                                  cdnUrl: formData.profileImageCdn,
                                  thumbnails: { small: formData.profileImageCdn, medium: formData.profileImageCdn, large: formData.profileImageCdn },
                                  metadata: { width: 400, height: 400, size: 0, format: 'jpeg' }
                                }] : []}
                                onRemoveImage={() => setFormData({ ...formData, profileImageCdn: '' })}
                                variant="compact"
                                maxFiles={1}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-3">Cover Image</label>
                          <UnifiedImageUpload
                            context="cover"
                            label="Cover Image"
                            description="Upload a cover image for your seller profile (recommended: wide format, at least 1200x400px)"
                            onUploadSuccess={(results) => {
                              if (results.length > 0) {
                                setFormData({ ...formData, coverImageCdn: results[0].cdnUrl });
                              }
                            }}
                            onUploadError={(error) => {
                              console.error('Cover image upload error:', error);
                              addToast('Failed to upload cover image. Please try again.', 'error');
                            }}
                            initialImages={formData.coverImageCdn ? [{
                              originalUrl: formData.coverImageCdn,
                              cdnUrl: formData.coverImageCdn,
                              thumbnails: { small: formData.coverImageCdn, medium: formData.coverImageCdn, large: formData.coverImageCdn },
                              metadata: { width: 1200, height: 400, size: 0, format: 'jpeg' }
                            }] : []}
                            onRemoveImage={() => setFormData({ ...formData, coverImageCdn: '' })}
                            variant="compact"
                            maxFiles={1}
                          />
                        </div>
                      </div>
                    )}

                    {/* Business Information Tab */}
                    {profileTab === 'business' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-gray-400 text-sm mb-1">Legal Business Name</label>
                          <input
                            type="text"
                            value={formData.legalBusinessName}
                            onChange={(e) => setFormData({ ...formData, legalBusinessName: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Official registered business name"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Business Type</label>
                          <select
                            value={formData.businessType}
                            onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="individual">Individual</option>
                            <option value="llc">LLC</option>
                            <option value="corporation">Corporation</option>
                            <option value="partnership">Partnership</option>
                            <option value="nonprofit">Non-Profit</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <h4 className="text-white font-medium mb-3 mt-4">Registered Address</h4>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-gray-400 text-sm mb-1">Street Address</label>
                          <input
                            type="text"
                            value={formData.registeredAddressStreet}
                            onChange={(e) => setFormData({ ...formData, registeredAddressStreet: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="123 Main Street"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">City</label>
                          <input
                            type="text"
                            value={formData.registeredAddressCity}
                            onChange={(e) => setFormData({ ...formData, registeredAddressCity: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="City"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">State/Province</label>
                          <input
                            type="text"
                            value={formData.registeredAddressState}
                            onChange={(e) => setFormData({ ...formData, registeredAddressState: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="State/Province"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Postal Code</label>
                          <input
                            type="text"
                            value={formData.registeredAddressPostalCode}
                            onChange={(e) => setFormData({ ...formData, registeredAddressPostalCode: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Postal Code"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Country</label>
                          <select
                            value={formData.registeredAddressCountry}
                            onChange={(e) => setFormData({ ...formData, registeredAddressCountry: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                            required
                          >
                            <option value="">Select Country</option>
                            {countries.map((country) => (
                              <option key={country.code} value={country.name}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Social & Contact Tab */}
                    {profileTab === 'social' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <h4 className="text-white font-medium mb-3">Social Media Handles</h4>
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Twitter</label>
                          <input
                            type="text"
                            value={formData.socialLinks.twitter}
                            onChange={(e) => setFormData({
                              ...formData,
                              socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                            })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="@username"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">LinkedIn</label>
                          <input
                            type="text"
                            value={formData.socialLinks.linkedin}
                            onChange={(e) => setFormData({
                              ...formData,
                              socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                            })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="linkedin.com/in/username"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Facebook</label>
                          <input
                            type="text"
                            value={formData.socialLinks.facebook}
                            onChange={(e) => setFormData({
                              ...formData,
                              socialLinks: { ...formData.socialLinks, facebook: e.target.value }
                            })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="facebook.com/username"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Discord</label>
                          <input
                            type="text"
                            value={formData.socialLinks.discord}
                            onChange={(e) => setFormData({
                              ...formData,
                              socialLinks: { ...formData.socialLinks, discord: e.target.value }
                            })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="username#1234"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-1">Telegram</label>
                          <input
                            type="text"
                            value={formData.socialLinks.telegram}
                            onChange={(e) => setFormData({
                              ...formData,
                              socialLinks: { ...formData.socialLinks, telegram: e.target.value }
                            })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="@username"
                          />
                        </div>

                        <div className="md:col-span-2 mt-6">
                          <h4 className="text-white font-medium mb-3">ENS Identity</h4>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-gray-400 text-sm mb-1">ENS Handle</label>
                          <input
                            type="text"
                            value={formData.ensHandle}
                            onChange={(e) => setFormData({ ...formData, ensHandle: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="yourname.eth"
                          />
                          <p className="text-gray-500 text-xs mt-1">Your Ethereum Name Service handle (optional)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset form to original profile data
                      if (profile) {
                        setFormData({
                          // Basic Information
                          storeName: profile.storeName || '',
                          bio: profile.bio || '',
                          sellerStory: profile.sellerStory || '',
                          storeDescription: profile.storeDescription || '',
                          location: profile.location || '',
                          websiteUrl: profile.websiteUrl || '',

                          // Images
                          profileImageCdn: profile.profileImageCdn || profile.profilePicture || '',
                          profileImageIpfs: profile.profileImageIpfs || '',
                          coverImageCdn: profile.coverImageCdn || profile.coverImage || '',
                          coverImageIpfs: profile.coverImageIpfs || '',

                          // Business Information
                          legalBusinessName: profile.legalBusinessName || '',
                          businessType: profile.businessType || 'individual',
                          registeredAddressStreet: profile.registeredAddressStreet || '',
                          registeredAddressCity: profile.registeredAddressCity || '',
                          registeredAddressState: profile.registeredAddressState || '',
                          registeredAddressPostalCode: profile.registeredAddressPostalCode || '',
                          registeredAddressCountry: profile.registeredAddressCountry || '',

                          // Social Links
                          socialLinks: {
                            twitter: profile.socialLinks?.twitter || '',
                            linkedin: profile.socialLinks?.linkedin || '',
                            facebook: profile.socialLinks?.facebook || '',
                            discord: profile.socialLinks?.discord || '',
                            telegram: profile.socialLinks?.telegram || ''
                          },

                          // ENS
                          ensHandle: profile.ensHandle || ''
                        });
                      }
                      setSaveError(null);
                      setSaveSuccess(false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    loading={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </GlassPanel>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">💰 Payout Settings</h3>
                <p className="text-gray-400 mb-6">
                  Configure how you receive payments from your sales
                </p>

                <div className="space-y-6">
                  {/* Use the PayoutSetupStep component directly */}
                  <PayoutSetupStep
                    onComplete={(data: any) => {
                      console.log('Payout settings saved:', data);
                      addToast('Payout settings saved successfully!', 'success');
                    }}
                    data={{
                      // Use default values for now - payout settings integration will be added later
                      defaultCrypto: 'USDC',
                      cryptoAddresses: {},
                      fiatEnabled: true,
                      offRampProvider: '',
                      bankAccount: {}
                    }}
                  />
                </div>
              </GlassPanel>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">💳 Billing & Payment Methods</h3>
                <p className="text-gray-400 mb-6">
                  Manage payment methods for listing fees and marketplace charges
                </p>

                <div className="space-y-8">
                  {/* Listing Fee Information */}
                  <div className="bg-blue-900 bg-opacity-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-blue-300 font-semibold">Marketplace Fees</h4>
                        <p className="text-blue-200 text-sm">Transparent pricing for your listings</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-400 text-sm">Listing Fee</span>
                          <span className="text-white font-semibold">$0.10/month</span>
                        </div>
                        <p className="text-gray-500 text-xs">Per active listing</p>
                      </div>

                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-400 text-sm">Transaction Fee</span>
                          <span className="text-white font-semibold">2.5%</span>
                        </div>
                        <p className="text-gray-500 text-xs">Per successful sale</p>
                      </div>
                    </div>

                    {/* Current Monthly Bill Estimate */}
                    <div className="border-t border-blue-700 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-300 font-medium">Est. Monthly Bill</span>
                        <span className="text-white font-bold text-lg">
                          ${((listings?.length || 0) * 0.1).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-blue-200 text-sm mt-1">
                        Based on {listings?.length || 0} active listings
                      </p>
                    </div>
                  </div>

                  {/* Payment Methods Section */}
                  <div>
                    <h4 className="text-white font-semibold mb-4">Payment Methods</h4>

                    {/* Add Payment Method */}
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <h5 className="text-white font-medium mb-2">Add Payment Method</h5>
                        <p className="text-gray-400 text-sm mb-4">
                          Add a credit card or bank account to pay for listing fees
                        </p>
                        <Button
                          variant="primary"
                          onClick={() => setShowAddPaymentMethodModal(true)}
                        >
                          Add Payment Method
                        </Button>
                      </div>

                      {/* List existing payment methods */}
                      {paymentMethods && paymentMethods.length > 0 ? (
                        <div className="space-y-3">
                          {paymentMethods.map((method) => (
                            <div key={method.id} className="bg-gray-800 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded mr-3"></div>
                                  <div>
                                    <p className="text-white font-medium">
                                      {method.nickname || `${method.type} ending in ${method.lastFour}`}
                                    </p>
                                    {method.expiryMonth && method.expiryYear && (
                                      <p className="text-gray-400 text-sm">Expires {method.expiryMonth}/{method.expiryYear}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {method.isDefault && (
                                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">Default</span>
                                  )}
                                  <Button variant="outline" size="sm">Edit</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Billing History */}
                  <div>
                    <h4 className="text-white font-semibold mb-4">Billing History</h4>

                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-700">
                        <div className="grid grid-cols-4 text-sm font-medium text-gray-400">
                          <span>Date</span>
                          <span>Description</span>
                          <span>Amount</span>
                          <span>Status</span>
                        </div>
                      </div>

                      {/* Billing history will be loaded dynamically */}
                      {billingHistory && billingHistory.length > 0 ? (
                        billingHistory.map((entry, index) => (
                          <div key={entry.id || index} className="px-6 py-4 border-b border-gray-700 last:border-b-0">
                            <div className="grid grid-cols-4 text-sm">
                              <span className="text-gray-300">{new Date(entry.date).toLocaleDateString()}</span>
                              <span className="text-white">{entry.description}</span>
                              <span className="text-white font-medium">{entry.amount}</span>
                              <span className={`font-medium ${entry.status === 'Paid' ? 'text-green-400' : entry.status === 'Pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {entry.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-6 py-8 text-center text-gray-400">
                          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm">No billing history yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassPanel>
            )}

            {/* Help tab */}
            {activeTab === 'help' && (
              <GlassPanel className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Help & Support</h3>
                <p className="text-gray-400 mb-6">
                  Get help with your seller account and find answers to common questions.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h4 className="text-white font-medium">Seller Guide</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Learn how to optimize your listings and increase sales.</p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-white font-medium">FAQs</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Find answers to frequently asked questions.</p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="text-white font-medium">Contact Support</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Reach out to our support team for assistance.</p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h4 className="text-white font-medium">Policies</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Review seller policies and guidelines.</p>
                  </div>
                </div>
              </GlassPanel>
            )}

            {/* Add Payment Method Modal */}
            {showAddPaymentMethodModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Add Payment Method</h3>
                    <button
                      onClick={() => setShowAddPaymentMethodModal(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Payment Method Type</label>
                      <select
                        value={paymentMethodForm.type}
                        onChange={(e) => setPaymentMethodForm({
                          ...paymentMethodForm,
                          type: e.target.value as 'card' | 'bank' | 'crypto'
                        })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="card">Credit/Debit Card</option>
                        <option value="bank">Bank Account</option>
                        <option value="crypto">Crypto Wallet</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Nickname</label>
                      <input
                        type="text"
                        name="payment-nickname"
                        autoComplete="off"
                        value={paymentMethodForm.nickname}
                        onChange={(e) => setPaymentMethodForm({
                          ...paymentMethodForm,
                          nickname: e.target.value
                        })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Business Card, Personal Account"
                      />
                    </div>

                    {paymentMethodForm.type === 'card' && (
                      <>
                        <div>
                          <label className="block text-gray-300 text-sm mb-1">Card Number</label>
                          <input
                            type="text"
                            value={paymentMethodForm.cardNumber}
                            onChange={(e) => setPaymentMethodForm({
                              ...paymentMethodForm,
                              cardNumber: e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
                            })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-300 text-sm mb-1">Expiry (MM/YY)</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={paymentMethodForm.expiryMonth || ''}
                                onChange={(e) => setPaymentMethodForm({
                                  ...paymentMethodForm,
                                  expiryMonth: e.target.value ? parseInt(e.target.value, 10) : undefined
                                })}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="MM"
                                min="1"
                                max="12"
                                maxLength={2}
                              />
                              <input
                                type="number"
                                value={paymentMethodForm.expiryYear || ''}
                                onChange={(e) => setPaymentMethodForm({
                                  ...paymentMethodForm,
                                  expiryYear: e.target.value ? parseInt(e.target.value, 10) : undefined
                                })}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="YY"
                                min="24"
                                max="99"
                                maxLength={2}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-gray-300 text-sm mb-1">CVV</label>
                            <input
                              type="password"
                              value={paymentMethodForm.cvv}
                              onChange={(e) => setPaymentMethodForm({
                                ...paymentMethodForm,
                                cvv: e.target.value
                              })}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="123"
                              maxLength={4}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {paymentMethodForm.type === 'bank' && (
                      <>
                        <div>
                          <label className="block text-gray-300 text-sm mb-1">Account Number</label>
                          <input
                            type="text"
                            value={paymentMethodForm.accountNumber}
                            onChange={(e) => setPaymentMethodForm({
                              ...paymentMethodForm,
                              accountNumber: e.target.value
                            })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Account number"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-300 text-sm mb-1">Routing Number</label>
                          <input
                            type="text"
                            value={paymentMethodForm.routingNumber}
                            onChange={(e) => setPaymentMethodForm({
                              ...paymentMethodForm,
                              routingNumber: e.target.value
                            })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Routing number"
                          />
                        </div>
                      </>
                    )}

                    {paymentMethodForm.type === 'crypto' && (
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">Wallet Address</label>
                        <input
                          type="text"
                          value={paymentMethodForm.walletAddress}
                          onChange={(e) => setPaymentMethodForm({
                            ...paymentMethodForm,
                            walletAddress: e.target.value
                          })}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0x..."
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddPaymentMethodModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleAddPaymentMethod}
                      loading={isAddingPaymentMethod}
                      disabled={isAddingPaymentMethod}
                    >
                      {isAddingPaymentMethod ? 'Adding...' : 'Add Payment Method'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SellerDashboardLayout>
    </TierProvider>
  );
}

// Wrap with error boundary
export const SellerDashboard = withSellerErrorBoundary(SellerDashboardComponent, {
  context: 'SellerDashboard',
  enableRecovery: true,
});
