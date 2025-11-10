import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
// import { useReadProfileRegistryGetProfileByAddress, useWriteProfileRegistryCreateProfile, useWriteProfileRegistryUpdateProfile } from '@/generated';
import { useWeb3 } from '@/context/Web3Context';
import { useProfile } from '@/hooks/useProfile';
import { useFollowCount } from '@/hooks/useFollow';
import { useToast } from '@/context/ToastContext';
import { countries } from '@/utils/countries';
import { UpdateUserProfileInput } from '@/models/UserProfile';
import FollowerList from '@/components/FollowerList';
import FollowingList from '@/components/FollowingList';
import TipBar from '@/components/TipBar';
import { PaymentMethodsTab } from '@/components/PaymentMethodsTab';
import { useWalletDataReal } from '@/hooks/useWalletDataReal';
import { useReputationData } from '@/hooks/useReputationData';
import { useTipsData } from '@/hooks/useTipsData';

export default function Profile() {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  // Backend profile loading with error handling
  const { profile: backendProfile, isLoading: isBackendProfileLoading, error: backendProfileError, updateProfile: updateBackendProfile } = useProfile(address);
  const { data: followCount, isLoading: isFollowCountLoading } = useFollowCount(address);

  // Wallet data
  const { portfolio, tokens, isLoading: isWalletLoading } = useWalletDataReal({ address });

  // Reputation data
  const { reputation, events: reputationEvents, isLoading: isReputationLoading } = useReputationData({ userId: address || '' });

  // Tips data
  const { earnings, isLoading: isTipsLoading } = useTipsData({ userId: address || '' });

  // Smart contract profile data - temporarily disabled due to webpack issues
  const contractProfileData: any = null;
  const isContractProfileLoading = false;

  // State for tracking operations
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    handle: '',
    ens: '',
    bio: '',
    avatar: '',
  });
  const [activeTab, setActiveTab] = useState<'posts' | 'activity' | 'wallet' | 'reputation' | 'tips' | 'followers' | 'following' | 'addresses' | 'payments'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [addresses, setAddresses] = useState({
    billing: {
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phone: ''
    },
    shipping: {
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phone: '',
      sameAsBilling: true
    }
  });

  // Load profile data from backend first, fallback to contract data
  useEffect(() => {
    if (backendProfile) {
      setProfile({
        handle: backendProfile.handle,
        ens: backendProfile.ens,
        bio: backendProfile.bioCid, // In a real app, we'd fetch the actual bio content from IPFS
        avatar: backendProfile.avatarCid, // In a real app, we'd fetch the actual avatar from IPFS
      });
      
      // Load addresses from backend profile
      setAddresses({
        billing: {
          firstName: backendProfile.billingFirstName || '',
          lastName: backendProfile.billingLastName || '',
          company: backendProfile.billingCompany || '',
          address1: backendProfile.billingAddress1 || '',
          address2: backendProfile.billingAddress2 || '',
          city: backendProfile.billingCity || '',
          state: backendProfile.billingState || '',
          zipCode: backendProfile.billingZipCode || '',
          country: backendProfile.billingCountry || '',
          phone: backendProfile.billingPhone || ''
        },
        shipping: {
          firstName: backendProfile.shippingFirstName || '',
          lastName: backendProfile.shippingLastName || '',
          company: backendProfile.shippingCompany || '',
          address1: backendProfile.shippingAddress1 || '',
          address2: backendProfile.shippingAddress2 || '',
          city: backendProfile.shippingCity || '',
          state: backendProfile.shippingState || '',
          zipCode: backendProfile.shippingZipCode || '',
          country: backendProfile.shippingCountry || '',
          phone: backendProfile.shippingPhone || '',
          sameAsBilling: true // Default to true, will be updated when we have actual data
        }
      });
    } else if (contractProfileData && contractProfileData.handle) {
      setProfile({
        handle: contractProfileData.handle,
        ens: contractProfileData.ens,
        bio: contractProfileData.bioCid, // In a real app, we'd fetch the actual bio content from IPFS
        avatar: contractProfileData.avatarCid, // In a real app, we'd fetch the actual avatar from IPFS
      });
    }
  }, [backendProfile, contractProfileData]);

  // Check for edit query parameter
  useEffect(() => {
    if (router.query.edit === 'true') {
      setIsEditing(true);
      // Clean up the URL after entering edit mode
      const newQuery = { ...router.query };
      delete newQuery.edit;
      router.replace({
        pathname: router.pathname,
        query: newQuery
      }, undefined, { shallow: true });
    }
  }, [router.query.edit, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const [section, field] = name.split('.');
    
    if (section === 'billing' || section === 'shipping') {
      setAddresses(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: value
        }
      }));
    }
  };

  const handleSameAsBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAddresses(prev => ({
      ...prev,
      shipping: {
        ...prev.shipping,
        sameAsBilling: checked
      }
    }));
    
    if (checked) {
      // Copy billing address to shipping when same as billing is checked
      setAddresses(prev => ({
        ...prev,
        shipping: {
          ...prev.billing,
          sameAsBilling: true
        }
      }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      try {
        // Dynamically import unifiedImageService to avoid SSR issues
        const { unifiedImageService } = await import('@/services/unifiedImageService');
        
        // Show uploading state
        addToast('Uploading avatar...', 'info');
        
        // Upload the image using the unified service
        const uploadResult = await unifiedImageService.uploadImage(file, 'profile');
        
        // Update profile state with the returned URL
        setProfile(prev => ({ ...prev, avatar: uploadResult.cdnUrl }));
        addToast('Avatar uploaded successfully!', 'success');
      } catch (error) {
        console.error('Error uploading avatar:', error);
        addToast(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!profile.handle.trim()) {
      addToast('Please enter a handle', 'error');
      return;
    }

    if (!isConnected || !address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);

      // Save to backend database
      if (backendProfile) {
        // Update existing profile
        const updateData: UpdateUserProfileInput = {
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatar,
          bioCid: profile.bio,
        };
        await updateBackendProfile(updateData);
      } else {
        // Profile doesn't exist, need to create one first
        addToast('Please create your profile first by filling out all required fields.', 'error');
        return;
      }

      addToast('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile. Please try again.';
      setUpdateError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Address copied to clipboard!', 'success');
  };

  // Retry loading profile data
  const retryLoadProfile = () => {
    // This would trigger a refetch in a real implementation
    window.location.reload();
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!isConnected || !address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    // Validate required fields for billing address
    if (!addresses.billing.firstName.trim() || !addresses.billing.lastName.trim() || 
        !addresses.billing.address1.trim() || !addresses.billing.city.trim() || 
        !addresses.billing.state.trim() || !addresses.billing.zipCode.trim() || 
        !addresses.billing.country.trim()) {
      addToast('Please fill in all required billing address fields', 'error');
      return;
    }

    // Validate shipping address if it's different from billing
    if (!addresses.shipping.sameAsBilling) {
      if (!addresses.shipping.firstName.trim() || !addresses.shipping.lastName.trim() || 
          !addresses.shipping.address1.trim() || !addresses.shipping.city.trim() || 
          !addresses.shipping.state.trim() || !addresses.shipping.zipCode.trim() || 
          !addresses.shipping.country.trim()) {
        addToast('Please fill in all required shipping address fields', 'error');
        return;
      }
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);

      // Save addresses to backend database
      if (backendProfile) {
        // Update existing profile with address information
        const updateData: UpdateUserProfileInput = {
          // Billing Address
          billingFirstName: addresses.billing.firstName,
          billingLastName: addresses.billing.lastName,
          billingCompany: addresses.billing.company,
          billingAddress1: addresses.billing.address1,
          billingAddress2: addresses.billing.address2,
          billingCity: addresses.billing.city,
          billingState: addresses.billing.state,
          billingZipCode: addresses.billing.zipCode,
          billingCountry: addresses.billing.country,
          billingPhone: addresses.billing.phone,
          // Shipping Address - use billing address if sameAsBilling is true
          shippingFirstName: addresses.shipping.sameAsBilling ? addresses.billing.firstName : addresses.shipping.firstName,
          shippingLastName: addresses.shipping.sameAsBilling ? addresses.billing.lastName : addresses.shipping.lastName,
          shippingCompany: addresses.shipping.sameAsBilling ? addresses.billing.company : addresses.shipping.company,
          shippingAddress1: addresses.shipping.sameAsBilling ? addresses.billing.address1 : addresses.shipping.address1,
          shippingAddress2: addresses.shipping.sameAsBilling ? addresses.billing.address2 : addresses.shipping.address2,
          shippingCity: addresses.shipping.sameAsBilling ? addresses.billing.city : addresses.shipping.city,
          shippingState: addresses.shipping.sameAsBilling ? addresses.billing.state : addresses.shipping.state,
          shippingZipCode: addresses.shipping.sameAsBilling ? addresses.billing.zipCode : addresses.shipping.zipCode,
          shippingCountry: addresses.shipping.sameAsBilling ? addresses.billing.country : addresses.shipping.country,
          shippingPhone: addresses.shipping.sameAsBilling ? addresses.billing.phone : addresses.shipping.phone,
        };

        await updateBackendProfile(updateData);
        addToast('Addresses saved successfully!', 'success');
      } else {
        addToast('Please create a profile first before saving addresses.', 'error');
      }
    } catch (error) {
      console.error('Error saving addresses:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save addresses. Please try again.';
      setUpdateError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isConnected) {
    return (
      <Layout title="Profile - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>
            <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to view your profile.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const isLoading = isBackendProfileLoading || isContractProfileLoading || isFollowCountLoading;
  const hasError = backendProfileError || updateError;

  // Default avatar component
  const DefaultAvatar = () => (
    <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center">
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
    </div>
  );

  return (
    <Layout title="Profile - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Profile</h1>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6 mb-6 animate-pulse">
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                    <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {hasError && !isLoading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading profile</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>We encountered an issue while loading your profile information.</p>
                    {backendProfileError && <p>Backend Error: {backendProfileError}</p>}
                    {updateError && <p>Update Error: {updateError}</p>}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={retryLoadProfile}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:text-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50"
                    >
                      <svg className="mr-2 -ml-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Header with Glassmorphism Effect */}
          {!isLoading && !hasError && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 p-6 mb-6">
              <div className="flex flex-col lg:flex-row items-center lg:items-start">
                <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
                  <div className="relative">
                    <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white dark:border-gray-700 shadow-xl overflow-hidden">
                      {profile.avatar ? (
                        <img
                          className="h-full w-full object-cover"
                          src={profile.avatar}
                          alt={profile.handle}
                        />
                      ) : (
                        <DefaultAvatar />
                      )}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-primary-500 rounded-full p-2 shadow-lg">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="text-center lg:text-left flex-1 w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.handle || 'Anonymous User'}</h2>
                      {profile.ens && (
                        <p className="text-xl text-gray-600 dark:text-gray-300 mt-1">{profile.ens}</p>
                      )}
                    </div>
                    <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row items-center gap-3">
                      {reputation && reputation.totalScore > 0 && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg transform hover:scale-105 transition-transform">
                          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {reputation.totalScore} Reputation
                        </span>
                      )}
                      {backendProfile && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform hover:scale-105 transition-transform">
                          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Wallet Address with Copy Button */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                    <span className="text-base font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-xl flex items-center shadow-sm">
                      <span className="font-medium">{formatAddress(address || '')}</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(address || '')}
                        className="p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        title="Copy address"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        className="p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        title="Share profile"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* User Stats */}
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{followCount?.followers || 0}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
                    </div>
                    <div className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{followCount?.following || 0}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Following</p>
                    </div>
                    <div className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {earnings ? `${(parseFloat(earnings.totalEarned) / 1e18).toFixed(2)}` : '0.00'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tips Earned (ETH)</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all transform hover:scale-105"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                  </button>
                  <button className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-xl shadow-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-all transform hover:scale-105">
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </button>
                </div>
              </div>

              {profile.bio && !isEditing && (
                <p className="mt-8 text-lg text-gray-700 dark:text-gray-300 text-center lg:text-left">{profile.bio}</p>
              )}

              {/* Tip Creator Section */}
              <div className="mt-8">
                <TipBar postId="user-profile" creatorAddress={address || ''} />
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          {!isLoading && !hasError && (
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'posts'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'activity'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8h.01M12 12h.01M12 16h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Activity
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'wallet'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Wallet
                </button>
                <button
                  onClick={() => setActiveTab('reputation')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'reputation'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Reputation
                </button>
                <button
                  onClick={() => setActiveTab('tips')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'tips'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tips & Rewards
                </button>
                <button
                  onClick={() => setActiveTab('followers')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'followers'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Followers
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'following'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Following
                </button>
                {isEditing && (
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'addresses'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Addresses
                  <svg className="ml-1 h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
                )}
                {isEditing && (
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'payments'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Payment Methods
                  <svg className="ml-1 h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
                )}
              </nav>
            </div>
          )}

          {/* Tab Content */}
          {!isLoading && !hasError && (
            <div>
              {activeTab === 'posts' && (
                <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${isEditing ? '' : 'hidden'}`}>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                      <label htmlFor="handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Handle
                      </label>
                      <input
                        type="text"
                        id="handle"
                        name="handle"
                        value={profile.handle}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="your-handle"
                        disabled={!!(contractProfileData && contractProfileData.handle)}
                      />
                    </div>

                    <div className="mb-6">
                      <label htmlFor="ens" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ENS Name
                      </label>
                      <input
                        type="text"
                        id="ens"
                        name="ens"
                        value={profile.ens}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="yourname.eth"
                      />
                    </div>

                    <div className="mb-6">
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={4}
                        value={profile.bio}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Avatar
                      </label>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                            {profile.avatar ? (
                              <img src={profile.avatar} alt="Avatar" className="h-16 w-16 object-cover" />
                            ) : (
                              <DefaultAvatar />
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label
                              htmlFor="avatar-upload"
                              className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 dark:focus:ring-offset-gray-800"
                            >
                              <span>Upload a file</span>
                              <input
                                id="avatar-upload"
                                name="avatar-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleFileChange}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG up to 10MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all"
                      >
                        {isUpdating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'posts' && !isEditing && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-primary-500 pl-4 py-1">
                      <p className="text-gray-700 dark:text-gray-300">Posted a new update about DeFi strategies</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</p>
                    </div>
                    <div className="border-l-4 border-secondary-500 pl-4 py-1">
                      <p className="text-gray-700 dark:text-gray-300">Voted on governance proposal #42</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">1 day ago</p>
                    </div>
                    <div className="border-l-4 border-accent-500 pl-4 py-1">
                      <p className="text-gray-700 dark:text-gray-300">Completed a marketplace transaction</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">3 days ago</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                      View all activity →
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Activity History</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">You</span> voted on governance proposal #42
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">You</span> received a tip of 50 LDAO
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">1 day ago</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">You</span> joined the DeFi Traders DAO
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reputation' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reputation</h3>
                  {isReputationLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-gray-700 dark:text-gray-300">Reputation Score</p>
                        <p className="text-gray-900 dark:text-white">{reputation?.totalScore || 0}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-700 dark:text-gray-300">Events</p>
                        <p className="text-gray-900 dark:text-white">{reputationEvents.length}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wallet' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Wallet Portfolio</h3>
                  {isWalletLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Total Balance</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {portfolio ? `$${portfolio.totalValueUSD.toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {portfolio ? `$${(portfolio.totalValueUSD * (1 + portfolio.change24hPercent / 100)).toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className={portfolio && portfolio.change24hPercent >= 0 ? "text-green-500" : "text-red-500"}>
                              {portfolio ? `${portfolio.change24hPercent >= 0 ? '+' : ''}${portfolio.change24hPercent.toFixed(2)}%` : '0.00%'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">LDAO Tokens</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {tokens.find(t => t.symbol === 'LDAO') ? tokens.find(t => t.symbol === 'LDAO')?.balanceFormatted.split(' ')[0] : '0'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {tokens.find(t => t.symbol === 'LDAO') ? `$${tokens.find(t => t.symbol === 'LDAO')?.valueUSD.toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className={tokens.find(t => t.symbol === 'LDAO')?.change24h >= 0 ? "text-green-500" : "text-red-500"}>
                              {tokens.find(t => t.symbol === 'LDAO') ? `${tokens.find(t => t.symbol === 'LDAO')?.change24h >= 0 ? '+' : ''}${tokens.find(t => t.symbol === 'LDAO')?.change24h.toFixed(2)}%` : '0.00%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Token Balances</h4>
                        <div className="space-y-3">
                          {tokens.map((token, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                                  <span className="text-xs font-medium">{token.symbol.substring(0, 3)}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{token.symbol}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{token.symbol}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">{token.balanceFormatted.split(' ')[0]}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">${token.valueUSD.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tips & Rewards</h3>
                  {isTipsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Total Balance</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {portfolio ? `$${portfolio.totalValueUSD.toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {portfolio ? `$${(portfolio.totalValueUSD * (1 + portfolio.change24hPercent / 100)).toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className={portfolio && portfolio.change24hPercent >= 0 ? "text-green-500" : "text-red-500"}>
                              {portfolio ? `${portfolio.change24hPercent >= 0 ? '+' : ''}${portfolio.change24hPercent.toFixed(2)}%` : '0.00%'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">LDAO Tokens</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {tokens.find(t => t.symbol === 'LDAO') ? tokens.find(t => t.symbol === 'LDAO')?.balanceFormatted.split(' ')[0] : '0'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {tokens.find(t => t.symbol === 'LDAO') ? `$${tokens.find(t => t.symbol === 'LDAO')?.valueUSD.toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className={tokens.find(t => t.symbol === 'LDAO')?.change24h >= 0 ? "text-green-500" : "text-red-500"}>
                              {tokens.find(t => t.symbol === 'LDAO') ? `${tokens.find(t => t.symbol === 'LDAO')?.change24h >= 0 ? '+' : ''}${tokens.find(t => t.symbol === 'LDAO')?.change24h.toFixed(2)}%` : '0.00%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Token Balances</h4>
                        <div className="space-y-3">
                          {tokens.map((token, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                                  <span className="text-xs font-medium">{token.symbol.substring(0, 3)}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{token.symbol}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{token.symbol}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">{token.balanceFormatted.split(' ')[0]}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">${token.valueUSD.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'addresses' && isEditing && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Address Information</h3>
                  
                  <form onSubmit={handleAddressSubmit} className="space-y-8">
                    {/* Billing Address Section */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Billing Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="billing.firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            id="billing.firstName"
                            name="billing.firstName"
                            value={addresses.billing.firstName}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="billing.lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            id="billing.lastName"
                            name="billing.lastName"
                            value={addresses.billing.lastName}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label htmlFor="billing.company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Company (Optional)
                          </label>
                          <input
                            type="text"
                            id="billing.company"
                            name="billing.company"
                            value={addresses.billing.company}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label htmlFor="billing.address1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address Line 1
                          </label>
                          <input
                            type="text"
                            id="billing.address1"
                            name="billing.address1"
                            value={addresses.billing.address1}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label htmlFor="billing.address2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address Line 2 (Optional)
                          </label>
                          <input
                            type="text"
                            id="billing.address2"
                            name="billing.address2"
                            value={addresses.billing.address2}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="billing.city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            id="billing.city"
                            name="billing.city"
                            value={addresses.billing.city}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="billing.state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            State/Province
                          </label>
                          <input
                            type="text"
                            id="billing.state"
                            name="billing.state"
                            value={addresses.billing.state}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="billing.zipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ZIP/Postal Code
                          </label>
                          <input
                            type="text"
                            id="billing.zipCode"
                            name="billing.zipCode"
                            value={addresses.billing.zipCode}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="billing.country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Country
                          </label>
                          <select
                            id="billing.country"
                            name="billing.country"
                            value={addresses.billing.country}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select a country</option>
                            {countries.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label htmlFor="billing.phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            id="billing.phone"
                            name="billing.phone"
                            value={addresses.billing.phone}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Shipping Address Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <input
                          id="shipping.sameAsBilling"
                          name="shipping.sameAsBilling"
                          type="checkbox"
                          checked={addresses.shipping.sameAsBilling}
                          onChange={handleSameAsBillingChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="shipping.sameAsBilling" className="ml-2 block text-sm text-gray-900 dark:text-white">
                          Shipping address same as billing
                        </label>
                      </div>
                      
                      {!addresses.shipping.sameAsBilling && (
                        <>
                          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Shipping Address</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="shipping.firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                First Name
                              </label>
                              <input
                                type="text"
                                id="shipping.firstName"
                                name="shipping.firstName"
                                value={addresses.shipping.firstName}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="shipping.lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Last Name
                              </label>
                              <input
                                type="text"
                                id="shipping.lastName"
                                name="shipping.lastName"
                                value={addresses.shipping.lastName}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label htmlFor="shipping.company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Company (Optional)
                              </label>
                              <input
                                type="text"
                                id="shipping.company"
                                name="shipping.company"
                                value={addresses.shipping.company}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label htmlFor="shipping.address1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address Line 1
                              </label>
                              <input
                                type="text"
                                id="shipping.address1"
                                name="shipping.address1"
                                value={addresses.shipping.address1}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label htmlFor="shipping.address2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address Line 2 (Optional)
                              </label>
                              <input
                                type="text"
                                id="shipping.address2"
                                name="shipping.address2"
                                value={addresses.shipping.address2}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="shipping.city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                City
                              </label>
                              <input
                                type="text"
                                id="shipping.city"
                                name="shipping.city"
                                value={addresses.shipping.city}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="shipping.state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                State/Province
                              </label>
                              <input
                                type="text"
                                id="shipping.state"
                                name="shipping.state"
                                value={addresses.shipping.state}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="shipping.zipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ZIP/Postal Code
                              </label>
                              <input
                                type="text"
                                id="shipping.zipCode"
                                name="shipping.zipCode"
                                value={addresses.shipping.zipCode}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="shipping.country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Country
                              </label>
                              <select
                                id="shipping.country"
                                name="shipping.country"
                                value={addresses.shipping.country}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Select a country</option>
                                {countries.map((country) => (
                                  <option key={country.code} value={country.code}>
                                    {country.flag} {country.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="md:col-span-2">
                              <label htmlFor="shipping.phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                id="shipping.phone"
                                name="shipping.phone"
                                value={addresses.shipping.phone}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all"
                      >
                        {isUpdating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : 'Save Addresses'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'followers' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Followers</h3>
                  <FollowerList userAddress={address || ''} />
                </div>
              )}

              {activeTab === 'following' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Following</h3>
                  <FollowingList userAddress={address || ''} />
                </div>
              )}

              {activeTab === 'payments' && isEditing && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Methods</h3>
                  <PaymentMethodsTab />
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
