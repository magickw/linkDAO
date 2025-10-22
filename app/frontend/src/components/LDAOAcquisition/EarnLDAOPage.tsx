import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  StarIcon, 
  GiftIcon,
  TrophyIcon,
  FireIcon,
  BoltIcon,
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { ldaoAcquisitionService, EarnOpportunity } from '../../services/ldaoAcquisitionService';
import { toast } from 'react-hot-toast';

interface EarnLDAOPageProps {
  userAddress?: string;
}

interface UserProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  streak: number;
  totalEarned: string;
  completedTasks: string[];
  achievements: Achievement[];
  rank: number;
  weeklyEarnings: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName?: string;
  totalEarned: string;
  weeklyEarned: string;
  level: number;
}

export default function EarnLDAOPage({ userAddress }: EarnLDAOPageProps) {
  const [opportunities, setOpportunities] = useState<EarnOpportunity[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [claimingTasks, setClaimingTasks] = useState<Set<string>>(new Set());
  const [userProgress, setUserProgress] = useState<UserProgress>({
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    streak: 0,
    totalEarned: '0',
    completedTasks: [],
    achievements: [],
    rank: 0,
    weeklyEarnings: 0
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'achievements' | 'leaderboard'>('tasks');
  const [loading, setLoading] = useState(true);
  const [celebratingAchievement, setCelebratingAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    loadOpportunities();
    if (userAddress) {
      loadUserProgress();
      loadLeaderboard();
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
      const response = await fetch(`/api/ldao/user-progress/${userAddress}`);
      const data = await response.json();
      
      setUserProgress({
        level: data.level || 1,
        xp: data.xp || 0,
        xpToNextLevel: data.xpToNextLevel || 100,
        streak: data.streak || 0,
        totalEarned: data.totalEarned || '0',
        completedTasks: data.completedTasks || [],
        achievements: data.achievements || [],
        rank: data.rank || 0,
        weeklyEarnings: data.weeklyEarnings || 0
      });
      
      setCompletedTasks(new Set(data.completedTasks || []));
    } catch (error) {
      console.error('Failed to load user progress:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/ldao/leaderboard');
      const data = await response.json();
      setLeaderboard(data.slice(0, 10)); // Top 10
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
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
        
        // Update user progress
        const newProgress = {
          ...userProgress,
          totalEarned: (parseFloat(userProgress.totalEarned) + parseFloat(result.ldaoAmount || '0')).toString(),
          xp: userProgress.xp + 10, // Add XP for completing task
          completedTasks: [...userProgress.completedTasks, opportunityId]
        };
        
        // Check for level up
        if (newProgress.xp >= userProgress.xpToNextLevel) {
          newProgress.level += 1;
          newProgress.xp = newProgress.xp - userProgress.xpToNextLevel;
          newProgress.xpToNextLevel = Math.floor(userProgress.xpToNextLevel * 1.5);
          toast.success(`🎉 Level up! You're now level ${newProgress.level}!`);
        }
        
        setUserProgress(newProgress);
        
        // Check for new achievements
        checkForNewAchievements(newProgress);
        
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

  const checkForNewAchievements = (progress: UserProgress) => {
    const newAchievements: Achievement[] = [];
    
    // First Task Achievement
    if (progress.completedTasks.length === 1 && !progress.achievements.find(a => a.id === 'first_task')) {
      newAchievements.push({
        id: 'first_task',
        title: 'Getting Started',
        description: 'Complete your first earning task',
        icon: '🎯',
        unlockedAt: new Date()
      });
    }
    
    // Level 5 Achievement
    if (progress.level >= 5 && !progress.achievements.find(a => a.id === 'level_5')) {
      newAchievements.push({
        id: 'level_5',
        title: 'Rising Star',
        description: 'Reach level 5',
        icon: '⭐',
        unlockedAt: new Date()
      });
    }
    
    // 100 LDAO Achievement
    if (parseFloat(progress.totalEarned) >= 100 && !progress.achievements.find(a => a.id === 'earned_100')) {
      newAchievements.push({
        id: 'earned_100',
        title: 'Century Club',
        description: 'Earn 100 LDAO tokens',
        icon: '💯',
        unlockedAt: new Date()
      });
    }
    
    if (newAchievements.length > 0) {
      setUserProgress(prev => ({
        ...prev,
        achievements: [...prev.achievements, ...newAchievements]
      }));
      
      // Show celebration for first new achievement
      setCelebratingAchievement(newAchievements[0]);
      setTimeout(() => setCelebratingAchievement(null), 3000);
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

  const ProgressBar = ({ current, max, className = "" }: { current: number; max: number; className?: string }) => (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div 
        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min((current / max) * 100, 100)}%` }}
      />
    </div>
  );

  const LevelBadge = ({ level }: { level: number }) => (
    <div className="relative">
      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-lg">{level}</span>
      </div>
      <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
        <StarIcon className="w-4 h-4 text-white" />
      </div>
    </div>
  );

  const AchievementCard = ({ achievement }: { achievement: Achievement }) => (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{achievement.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
          <p className="text-sm text-gray-600">{achievement.description}</p>
          {achievement.unlockedAt && (
            <p className="text-xs text-purple-600 mt-1">
              Unlocked {achievement.unlockedAt.toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const LeaderboardCard = ({ entry }: { entry: LeaderboardEntry }) => (
    <div className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
      entry.address === userAddress 
        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
        : 'bg-white border-gray-200 hover:bg-gray-50'
    }`}>
      <div className="flex items-center space-x-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          entry.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
          entry.rank === 2 ? 'bg-gray-100 text-gray-800' :
          entry.rank === 3 ? 'bg-orange-100 text-orange-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {entry.rank <= 3 ? (
            entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'
          ) : (
            entry.rank
          )}
        </div>
        <div>
          <div className="font-medium text-gray-900">
            {entry.displayName || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
          </div>
          <div className="text-sm text-gray-500">Level {entry.level}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-gray-900">{entry.totalEarned} LDAO</div>
        <div className="text-sm text-green-600">+{entry.weeklyEarned} this week</div>
      </div>
    </div>
  );

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Achievement Celebration Modal */}
        {celebratingAchievement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-4 transform animate-bounce">
              <div className="text-6xl mb-4">{celebratingAchievement.icon}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Achievement Unlocked!</h2>
              <h3 className="text-xl font-semibold text-purple-600 mb-2">{celebratingAchievement.title}</h3>
              <p className="text-gray-600">{celebratingAchievement.description}</p>
            </div>
          </div>
        )}

        {/* Header with User Progress */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Earn LDAO Tokens
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Complete activities and earn free LDAO tokens to unlock platform benefits
          </p>
          
          {/* User Progress Card */}
          {userAddress && (
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 max-w-4xl mx-auto mb-8">
              <div className="flex items-center justify-center space-x-8 mb-6">
                <LevelBadge level={userProgress.level} />
                <div className="flex-1 max-w-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Level {userProgress.level}</span>
                    <span className="text-sm text-gray-500">{userProgress.xp}/{userProgress.xpToNextLevel} XP</span>
                  </div>
                  <ProgressBar current={userProgress.xp} max={userProgress.xpToNextLevel} />
                </div>
                <div className="text-center">
                  <div className="flex items-center text-orange-500 mb-1">
                    <FireIcon className="w-5 h-5 mr-1" />
                    <span className="font-bold text-lg">{userProgress.streak}</span>
                  </div>
                  <div className="text-sm text-gray-600">Day Streak</div>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{userProgress.totalEarned}</div>
                  <div className="text-gray-600 text-sm">Total LDAO Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">{userProgress.completedTasks.length}</div>
                  <div className="text-gray-600 text-sm">Tasks Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">#{userProgress.rank || 'N/A'}</div>
                  <div className="text-gray-600 text-sm">Global Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">{userProgress.weeklyEarnings}</div>
                  <div className="text-gray-600 text-sm">This Week</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Stats for non-connected users */}
          {!userAddress && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl font-bold text-blue-600 mb-2">1000+</div>
                <div className="text-gray-600">Active Earners</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl font-bold text-green-600 mb-2">{opportunities.length}</div>
                <div className="text-gray-600">Available Tasks</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl font-bold text-purple-600 mb-2">50K+</div>
                <div className="text-gray-600">LDAO Distributed</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BoltIcon className="w-5 h-5 inline mr-2" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'achievements'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrophyIcon className="w-5 h-5 inline mr-2" />
              Achievements
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'leaderboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ChartBarIcon className="w-5 h-5 inline mr-2" />
              Leaderboard
            </button>
          </div>
        </div>

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            {Object.entries(groupedOpportunities).map(([category, categoryOpportunities]) => (
              <div key={category} className="mb-12">
                <div className="flex items-center mb-6">
                  <span className="text-2xl mr-3">{getCategoryIcon(category)}</span>
                  <h2 className="text-2xl font-bold text-gray-900 capitalize">
                    {category} Rewards
                  </h2>
                  <div className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {categoryOpportunities.length} tasks
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryOpportunities.map((opportunity) => {
                    const isCompleted = completedTasks.has(opportunity.id);
                    const isClaiming = claimingTasks.has(opportunity.id);
                    
                    return (
                      <div
                        key={opportunity.id}
                        className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all hover:shadow-lg ${
                          isCompleted 
                            ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {opportunity.title}
                              </h3>
                              {isCompleted && (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mb-3">
                              {opportunity.description}
                            </p>
                          </div>
                        </div>

                        {/* Reward and Difficulty */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="bg-blue-100 p-2 rounded-lg mr-3">
                              <GiftIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-blue-600">
                                {opportunity.reward}
                              </div>
                              <div className="text-xs text-gray-500">+10 XP</div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(opportunity.difficulty)}`}>
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
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                            isCompleted
                              ? 'bg-green-100 text-green-700 cursor-not-allowed'
                              : isClaiming
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed animate-pulse'
                              : !userAddress
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
                          }`}
                        >
                          {isCompleted 
                            ? '✓ Completed' 
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
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Achievements</h2>
              <p className="text-gray-600">Unlock badges by completing tasks and reaching milestones</p>
            </div>
            
            {userAddress ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userProgress.achievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
                
                {/* Locked Achievements Preview */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 opacity-60">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🔒</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-700">Task Master</h3>
                      <p className="text-sm text-gray-500">Complete 10 tasks</p>
                      <div className="mt-2">
                        <ProgressBar 
                          current={userProgress.completedTasks.length} 
                          max={10} 
                          className="h-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {userProgress.completedTasks.length}/10 tasks completed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 opacity-60">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🔒</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-700">LDAO Millionaire</h3>
                      <p className="text-sm text-gray-500">Earn 1,000 LDAO tokens</p>
                      <div className="mt-2">
                        <ProgressBar 
                          current={parseFloat(userProgress.totalEarned)} 
                          max={1000} 
                          className="h-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {userProgress.totalEarned}/1,000 LDAO earned
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
                <p className="text-gray-600 mb-6">Connect your wallet to view and unlock achievements</p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Top Earners</h2>
              <p className="text-gray-600">See how you rank against other LDAO earners</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <TrophyIcon className="w-8 h-8" />
                    <div>
                      <h3 className="text-xl font-bold">Global Leaderboard</h3>
                      <p className="text-blue-100">Updated in real-time</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{leaderboard.length}</div>
                    <div className="text-blue-100 text-sm">Active Earners</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {leaderboard.map((entry) => (
                  <LeaderboardCard key={entry.address} entry={entry} />
                ))}
                
                {leaderboard.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ChartBarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Leaderboard will appear once users start earning</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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