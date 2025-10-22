import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ClockIcon, StarIcon, GiftIcon } from '@heroicons/react/24/outline';
import { ldaoAcquisitionService, EarnOpportunity } from '../../services/ldaoAcquisitionService';
import { toast } from 'react-hot-toast';

interface EarnLDAOPageProps {
  userAddress?: string;
}

export default function EarnLDAOPage({ userAddress }: EarnLDAOPageProps) {
  const [opportunities, setOpportunities] = useState<EarnOpportunity[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [claimingTasks, setClaimingTasks] = useState<Set<string>>(new Set());
  const [totalEarned, setTotalEarned] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpportunities();
    if (userAddress) {
      loadUserProgress();
    }
  }, [userAddress]);

  const loadOpportunities = async () => {
    try {
      const data = await ldaoAcquisitionService.getEarnOpportunities();
      setOpportunities(data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
      toast.error('Failed to load earning opportunities');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      // Load user's completed tasks and total earned from backend
      const response = await fetch(`/api/ldao/user-progress/${userAddress}`);
      const data = await response.json();
      
      setCompletedTasks(new Set(data.completedTasks || []));
      setTotalEarned(data.totalEarned || '0');
    } catch (error) {
      console.error('Failed to load user progress:', error);
    }
  };

  const handleClaimReward = async (opportunityId: string) => {
    if (!userAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setClaimingTasks(prev => new Set(prev).add(opportunityId));
      
      const result = await ldaoAcquisitionService.claimEarnedTokens(opportunityId);
      
      if (result.success) {
        setCompletedTasks(prev => new Set(prev).add(opportunityId));
        setTotalEarned(prev => (parseFloat(prev) + parseFloat(result.ldaoAmount || '0')).toString());
        toast.success(`Claimed ${result.ldaoAmount} LDAO tokens!`);
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
      toast.error('Failed to claim reward. Please try again.');
    } finally {
      setClaimingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(opportunityId);
        return newSet;
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'social': return '👥';
      case 'marketplace': return '🛒';
      case 'governance': return '🗳️';
      case 'referral': return '🎁';
      default: return '⭐';
    }
  };

  const groupedOpportunities = opportunities.reduce((acc, opportunity) => {
    if (!acc[opportunity.category]) {
      acc[opportunity.category] = [];
    }
    acc[opportunity.category].push(opportunity);
    return acc;
  }, {} as Record<string, EarnOpportunity[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Earn LDAO Tokens
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Complete activities and earn free LDAO tokens to unlock platform benefits
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-2">{totalEarned}</div>
              <div className="text-gray-600">Total LDAO Earned</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-2">{completedTasks.size}</div>
              <div className="text-gray-600">Tasks Completed</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-2">{opportunities.length}</div>
              <div className="text-gray-600">Available Tasks</div>
            </div>
          </div>
        </div>

        {/* Opportunities by Category */}
        {Object.entries(groupedOpportunities).map(([category, categoryOpportunities]) => (
          <div key={category} className="mb-12">
            <div className="flex items-center mb-6">
              <span className="text-2xl mr-3">{getCategoryIcon(category)}</span>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {category} Rewards
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryOpportunities.map((opportunity) => {
                const isCompleted = completedTasks.has(opportunity.id);
                const isClaiming = claimingTasks.has(opportunity.id);
                
                return (
                  <div
                    key={opportunity.id}
                    className={`bg-white rounded-lg p-6 shadow-sm border-2 transition-all ${
                      isCompleted 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {opportunity.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">
                          {opportunity.description}
                        </p>
                      </div>
                      {isCompleted && (
                        <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 ml-2" />
                      )}
                    </div>

                    {/* Reward and Difficulty */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <GiftIcon className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="font-semibold text-blue-600">
                          {opportunity.reward}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(opportunity.difficulty)}`}>
                        {opportunity.difficulty}
                      </span>
                    </div>

                    {/* Time Estimate */}
                    <div className="flex items-center mb-4 text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      <span>{opportunity.timeEstimate}</span>
                    </div>

                    {/* Requirements */}
                    {opportunity.requirements && opportunity.requirements.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Requirements:</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {opportunity.requirements.map((req, index) => (
                            <li key={index} className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => handleClaimReward(opportunity.id)}
                      disabled={isCompleted || isClaiming || !userAddress}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        isCompleted
                          ? 'bg-green-100 text-green-700 cursor-not-allowed'
                          : isClaiming
                          ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                          : !userAddress
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isCompleted 
                        ? 'Completed ✓' 
                        : isClaiming 
                        ? 'Claiming...' 
                        : !userAddress
                        ? 'Connect Wallet'
                        : 'Start Task'
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Benefits Section */}
        <div className="bg-white rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What You Can Do With LDAO Tokens
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Tip Creators</h3>
              <p className="text-sm text-gray-600">
                Support your favorite content creators with LDAO tips
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Stake for Rewards</h3>
              <p className="text-sm text-gray-600">
                Stake tokens to earn up to 18% APR and unlock premium features
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗳️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Governance Voting</h3>
              <p className="text-sm text-gray-600">
                Participate in platform governance and shape the future
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛒</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Marketplace Discounts</h3>
              <p className="text-sm text-gray-600">
                Get up to 15% discount on marketplace purchases
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        {!userAddress && (
          <div className="text-center mt-12">
            <div className="bg-blue-50 rounded-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Ready to Start Earning?
              </h3>
              <p className="text-gray-600 mb-6">
                Connect your wallet to start completing tasks and earning LDAO tokens
              </p>
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Connect Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}