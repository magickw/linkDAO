import React, { useState } from 'react';
import Head from 'next/head';
import { Users, TrendingUp, Heart, Filter, RefreshCw } from 'lucide-react';
import UserRecommendationService, { RecommendationScore } from '@/services/userRecommendationService';
import UserRecommendationCard from '@/components/Recommendations/UserRecommendationCard';
import RecommendationFeed from '@/components/Recommendations/RecommendationFeed';
import { useWeb3 } from '@/context/Web3Context';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { EmptyState } from '@/components/FallbackStates';

export default function RecommendationsPage() {
  const { address, isConnected } = useWeb3();
  const [activeTab, setActiveTab] = useState<'users' | 'communities'>('users');
  const [algorithm, setAlgorithm] = useState<'collaborative' | 'content' | 'hybrid'>('hybrid');
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadRecommendations = async () => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await UserRecommendationService.getUserRecommendations({
        limit: 20,
        algorithm
      });

      const activeRecommendations = response.data.recommendations.filter(
        rec => !dismissed.has(rec.userId)
      );

      setRecommendations(activeRecommendations);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (userId: string) => {
    setDismissed(prev => new Set([...prev, userId]));
    setRecommendations(prev => prev.filter(rec => rec.userId !== userId));
  };

  const handleFeedback = (userId: string, action: 'view' | 'follow' | 'dismiss' | 'report') => {
    UserRecommendationService.recordFeedback({
      recommendedUserId: userId,
      action
    }).catch(console.error);
  };

  const handleFollow = async (userId: string) => {
    console.log('Following user:', userId);
    // Integrate with your existing follow service
  };

  React.useEffect(() => {
    loadRecommendations();
  }, [isConnected, address, algorithm]);

  return (
    <>
      <Head>
        <title>Recommendations - LinkDAO</title>
        <meta name="description" content="Discover new people and communities to connect with" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Recommendations
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Discover new people and communities tailored to your interests
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Recommendations */}
            <div className="lg:col-span-2">
              {/* Tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'users'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Users size={20} />
                    <span>People</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('communities')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'communities'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <TrendingUp size={20} />
                    <span>Communities</span>
                  </button>
                </div>

                {/* Algorithm Selector */}
                {activeTab === 'users' && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <Filter size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Algorithm:</span>
                    </div>
                    <div className="flex space-x-2">
                      {(['collaborative', 'content', 'hybrid'] as const).map((algo) => (
                        <button
                          key={algo}
                          onClick={() => setAlgorithm(algo)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            algorithm === algo
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {algo.charAt(0).toUpperCase() + algo.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations List */}
              {loading ? (
                <LoadingSkeletons count={5} type="card" />
              ) : error ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                  <button
                    onClick={loadRecommendations}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : !isConnected ? (
                <EmptyState
                  message="Connect your wallet to see personalized recommendations"
                  type="auth"
                />
              ) : recommendations.length === 0 ? (
                <EmptyState
                  message="No recommendations available at the moment. Check back later!"
                  type="empty"
                />
              ) : (
                <div className="space-y-4">
                  {recommendations.map((recommendation) => (
                    <UserRecommendationCard
                      key={recommendation.userId}
                      recommendation={recommendation}
                      onFollow={handleFollow}
                      onDismiss={handleDismiss}
                      onFeedback={handleFeedback}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Quick Picks
                  </h2>
                  <button
                    onClick={loadRecommendations}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                  >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {isConnected ? (
                  <RecommendationFeed
                    limit={3}
                    algorithm={algorithm}
                    showHeader={false}
                    showRefresh={false}
                    showViewAll={false}
                    className="space-y-4"
                  />
                ) : (
                  <EmptyState
                    message="Connect wallet for personalized picks"
                    type="auth"
                  />
                )}

                {/* Tips */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 mb-3">
                    <Heart size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Tips
                    </span>
                  </div>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li>• Follow users you interact with</li>
                    <li>• Join communities matching your interests</li>
                    <li>• Engage with posts to improve recommendations</li>
                    <li>• Give feedback on recommendations</li>
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