import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useWeb3 } from '@/context/Web3Context';
import DashboardLayout from '@/components/DashboardLayout';
import RecommendationSystem from '@/components/RecommendationSystem';

export default function RecommendationsPage() {
  const router = useRouter();
  const { isConnected } = useWeb3();

  return (
    <>
      <Head>
        <title>Recommendations - Web3 Social Platform</title>
        <meta name="description" content="Get personalized recommendations for communities and users based on your interests and activity" />
      </Head>

      <DashboardLayout activeView="feed">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              💡 Recommendations
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Discover communities and users tailored to your interests
            </p>
          </div>

          {isConnected ? (
            <div className="space-y-8">
              {/* Main recommendations */}
              <RecommendationSystem
                type="both"
                basedOn="activity"
                limit={12}
              />
              
              {/* Additional recommendation sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    🔥 Trending Communities
                  </h2>
                  <RecommendationSystem
                    type="communities"
                    basedOn="trending"
                    limit={6}
                    showHeaders={false}
                  />
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    🌐 From Your Network
                  </h2>
                  <RecommendationSystem
                    type="users"
                    basedOn="network"
                    limit={6}
                    showHeaders={false}
                  />
                </div>
              </div>

              {/* Interest-based recommendations */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🎯 Based on Your Interests
                </h2>
                <RecommendationSystem
                  type="communities"
                  basedOn="interests"
                  limit={8}
                  showHeaders={false}
                />
              </div>
            </div>
          ) : (
            /* Not connected state */
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Connect your wallet to get personalized recommendations based on your activity, 
                  interests, and network connections.
                </p>
                <button
                  onClick={() => {
                    // This would trigger wallet connection
                    // The actual implementation depends on your Web3Context
                    router.push('/');
                  }}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}