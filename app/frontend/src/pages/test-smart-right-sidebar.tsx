import React, { useState } from 'react';
import Head from 'next/head';
import { SmartRightSidebar } from '../components/SmartRightSidebar';

export default function TestSmartRightSidebar() {
  const [context, setContext] = useState<'feed' | 'community'>('feed');
  const [communityId, setCommunityId] = useState<string>('');

  return (
    <>
      <Head>
        <title>Smart Right Sidebar Test - LinkDAO</title>
        <meta name="description" content="Test page for the smart right sidebar with wallet integration" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Smart Right Sidebar with Wallet Integration
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Testing wallet dashboard, transaction feed, quick actions, portfolio modal, and trending content
              </p>
            </div>

            {/* Context Controls */}
            <div className="mb-8 flex justify-center">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Context:
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setContext('feed')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        context === 'feed'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Feed
                    </button>
                    <button
                      onClick={() => setContext('community')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        context === 'community'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Community
                    </button>
                  </div>
                  
                  {context === 'community' && (
                    <input
                      type="text"
                      placeholder="Community ID"
                      value={communityId}
                      onChange={(e) => setCommunityId(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Content - Mock Feed */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    📊 Smart Right Sidebar Features
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">💰 Wallet Dashboard</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Portfolio overview with real-time updates</li>
                        <li>• Top holdings with percentage allocation</li>
                        <li>• 24h change indicators with animations</li>
                        <li>• Wallet address display</li>
                        <li>• Real-time status indicator</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📋 Transaction Mini Feed</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Recent blockchain transactions</li>
                        <li>• Transaction type icons and status</li>
                        <li>• Gas usage and USD values</li>
                        <li>• Pending transaction animations</li>
                        <li>• Clickable transaction details</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">⚡ Quick Action Buttons</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• One-click send ETH/USDC operations</li>
                        <li>• Receive QR code generation</li>
                        <li>• Token swap interface</li>
                        <li>• Staking and DeFi actions</li>
                        <li>• Network status and gas prices</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📈 Portfolio Modal</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Detailed portfolio analytics</li>
                        <li>• Asset allocation charts</li>
                        <li>• Performance metrics and history</li>
                        <li>• Token holdings breakdown</li>
                        <li>• Risk analysis and insights</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔥 Trending Content Widget</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Context-aware recommendations</li>
                        <li>• Filterable content types</li>
                        <li>• Growth indicators and metrics</li>
                        <li>• Real-time trending updates</li>
                        <li>• Community-specific content</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎯 Smart Features</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Real-time price updates</li>
                        <li>• Contextual content switching</li>
                        <li>• Responsive design patterns</li>
                        <li>• Loading states and animations</li>
                        <li>• Error handling and fallbacks</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Mock Posts */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
                        U{i}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">User {i}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">@user{i}.eth</p>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      This is a mock post to demonstrate the layout with the smart right sidebar. 
                      The sidebar shows wallet information, recent transactions, and trending content.
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <button className="hover:text-primary-600 dark:hover:text-primary-400">💬 12</button>
                      <button className="hover:text-primary-600 dark:hover:text-primary-400">🔄 5</button>
                      <button className="hover:text-primary-600 dark:hover:text-primary-400">❤️ 23</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-1">
                <SmartRightSidebar 
                  context={context}
                  communityId={communityId || undefined}
                />
              </div>
            </div>

            {/* Implementation Notes */}
            <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                ✅ Implementation Notes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔧 Technical Features</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Real-time wallet data updates every 30 seconds</li>
                    <li>• Animated portfolio value changes</li>
                    <li>• Context-aware content switching</li>
                    <li>• Responsive design with mobile optimization</li>
                    <li>• TypeScript interfaces for type safety</li>
                    <li>• Loading states and error handling</li>
                    <li>• Modal system with keyboard navigation</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎨 UI/UX Enhancements</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Glassmorphism effects with backdrop blur</li>
                    <li>• Smooth hover animations and transitions</li>
                    <li>• Color-coded transaction types</li>
                    <li>• Progress indicators and status badges</li>
                    <li>• Contextual tooltips and help text</li>
                    <li>• Dark mode support throughout</li>
                    <li>• Accessibility-compliant interactions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}