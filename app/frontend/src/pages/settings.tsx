import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Layout from '@/components/Layout';
import NotificationPreferences from '@/components/NotificationPreferences';
import Link from 'next/link';

export default function Settings() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('profile');
  const [showNotificationPreferences, setShowNotificationPreferences] = useState(false);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'wallet', name: 'Wallet', icon: '💰' },
    { id: 'preferences', name: 'Preferences', icon: '⚙️' },
    { id: 'security', name: 'Security', icon: '🔒' },
  ];

  if (!isConnected) {
    return (
      <Layout title="Settings - LinkDAO">
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
    <Layout title="Settings - LinkDAO">
      <div className="max-w-6xl mx-auto">
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
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
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

                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">✏️</span>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Edit Profile</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Update your information</p>
                          </div>
                        </div>
                      </div>
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

              {activeTab === 'preferences' && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <span className="text-2xl mr-3">⚙️</span>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
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
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <span className="text-2xl mr-3">🔒</span>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-yellow-500 text-xl">⚠️</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Security Notice
                          </h3>
                          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                            Your security is managed through your connected wallet. Never share your private keys or seed phrase.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Connection Status</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">Wallet Connection</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Connected via RainbowKit</div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Security Actions</h3>
                      <div className="space-y-3">
                        <button className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">🔄</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">Disconnect Wallet</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Safely disconnect your wallet</div>
                            </div>
                          </div>
                        </button>
                        <button className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">📋</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">View Transactions</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Review your transaction history</div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
    </Layout>
  );
}