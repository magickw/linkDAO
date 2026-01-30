import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Layout from '@/components/Layout';
import NotificationPreferences from '@/components/NotificationPreferences';
import Link from 'next/link';
import { ProfileService } from '@/services/profileService';
import { UserProfile } from '@/models/UserProfile';
import { EnhancedSecuritySettings } from '@/components/Settings/EnhancedSecuritySettings';
import EmailPreferences from '@/components/Settings/EmailPreferences';
import SocialConnectionsTab from '@/components/SocialMedia/SocialConnectionsTab';
import DocumentHub from '@/components/User/DocumentHub';

export default function Settings() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('profile');
  const [showNotificationPreferences, setShowNotificationPreferences] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch user profile when component mounts or address changes
  useEffect(() => {
    if (address) {
      fetchUserProfile();
    }
  }, [address]);

  const fetchUserProfile = async () => {
    if (!address) return;
    try {
      const profile = await ProfileService.getProfileByAddress(address);
      setUserProfile(profile);
      setEmail(profile?.email || '');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^
\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailUpdate = async () => {
    setEmailError('');
    setEmailSuccess('');

    // Validate email format
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!userProfile) {
      setEmailError('Profile not found. Please try again.');
      return;
    }

    setIsUpdatingEmail(true);

    try {
      await ProfileService.updateProfile(userProfile.id, { email });
      setEmailSuccess('Email updated successfully!');
      setTimeout(() => setEmailSuccess(''), 3000);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'wallet', name: 'Wallet', icon: '💰' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'preferences', name: 'Preferences', icon: '⚙️' },
    { id: 'social', name: 'Social Connections', icon: '🔗' },
    { id: 'security', name: 'Security & Notifications', icon: '🔒' },
  ];

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!isConnected) {
    return (
      <Layout title="Settings - LinkDAO" fullWidth={true}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please connect your wallet to access settings and manage your profile.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                💡 Connect your wallet using the button in the top navigation to access your personal settings, profile management, and wallet information.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings - LinkDAO" fullWidth={true}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your profile, wallet, and account preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {activeTab === 'profile' && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <span className="text-2xl mr-3">👤</span>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-blue-500 text-xl">ℹ️</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Profile Management
                          </h3>
                          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                            Your profile is linked to your wallet address: <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded text-xs">{address}</code>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Link
                        href="/profile"
                        className="block bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-3">📋</span>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">View Profile</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">See your public profile</p>
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/profile?edit=true"
                        className="block bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-3">✏️</span>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Edit Profile</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Update your information</p>
                          </div>
                        </div>
                      </Link>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Stats</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">0</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Posts</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">0</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Comments</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">0</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Following</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">0</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'wallet' && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <span className="text-2xl mr-3">💰</span>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Wallet Settings</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-green-500 text-xl">✅</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                            Wallet Connected
                          </h3>
                          <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                            Address: <code className="bg-green-100 dark:bg-green-800 px-1 py-0.5 rounded text-xs">{address}</code>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Link
                        href="/wallet"
                        className="block bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-3">👛</span>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">View Wallet</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Check your balance and transactions</p>
                          </div>
                        </div>
                      </Link>

                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">📊</span>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Portfolio</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Track your assets and NFTs</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button className="text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                          <div className="text-lg mb-1">🔄</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Refresh Balance</div>
                        </button>
                        <button className="text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                          <div className="text-lg mb-1">📋</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Copy Address</div>
                        </button>
                        <button className="text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                          <div className="text-lg mb-1">🔗</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">View on Explorer</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="p-6">
                  <DocumentHub />
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <span className="text-2xl mr-3">⚙️</span>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Communication</h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Email Address
                          </label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Provide your email so the platform can communicate with you about important updates, notifications, and announcements.
                          </p>
                          <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          {emailError && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                              {emailError}
                            </p>
                          )}
                          {emailSuccess && (
                            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                              {emailSuccess}
                            </p>
                          )}
                          <button
                            onClick={handleEmailUpdate}
                            disabled={isUpdatingEmail}
                            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                          >
                            {isUpdatingEmail ? 'Saving...' : 'Save Email'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Appearance</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Theme</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Choose your preferred theme</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">System</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notifications</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Notification Preferences</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Manage your notification settings</p>
                          </div>
                          <button
                            onClick={() => setShowNotificationPreferences(true)}
                            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/50 dark:hover:bg-primary-900/70 rounded-lg transition-colors"
                          >
                            Configure
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Privacy</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Public Profile</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Make your profile visible to others</p>
                          </div>
                          <input type="checkbox" className="rounded" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Show Wallet Balance</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Display your wallet balance on profile</p>
                          </div>
                          <input type="checkbox" className="rounded" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Hide Transaction History</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Make your transaction history private</p>
                          </div>
                          <input type="checkbox" className="rounded" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Anonymous Mode</label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Hide your wallet address from public view</p>
                          </div>
                          <input type="checkbox" className="rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="p-6">
                  <SocialConnectionsTab onToast={showToast} />
                </div>
              )}

              {activeTab === 'security' && (
                <EnhancedSecuritySettings />
              )}


            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences Modal */}
      {showNotificationPreferences && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowNotificationPreferences(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <NotificationPreferences onClose={() => setShowNotificationPreferences(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : toast.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </Layout>
  );
}