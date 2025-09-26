/**
 * Advanced Features Hub
 * Central hub for all cutting-edge Web3 features
 */

import React, { useState } from 'react';
import { 
  Zap, Shield, Trophy, BarChart3, Languages, Brain,
  ArrowLeftRight, Target, Users, Globe, Settings,
  ChevronRight, Star, Crown, Gem, Flame
} from 'lucide-react';
import CrossChainBridge from '../Messaging/CrossChainBridge';
import AIScamDetection from '../Messaging/AIScamDetection';
import AchievementSystem from '../GameFi/AchievementSystem';
import AdvancedAnalyticsDashboard from '../Analytics/AdvancedAnalyticsDashboard';
import SmartContractAssistant from '../AI/SmartContractAssistant';
import Web3TranslationAssistant from '../AI/Web3TranslationAssistant';

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'bridge' | 'ai' | 'gamefi' | 'analytics' | 'security';
  status: 'active' | 'beta' | 'coming-soon';
  component: React.ComponentType<any>;
  benefits: string[];
  usage: number;
  rating: number;
}

const AdvancedFeaturesHub: React.FC<{
  className?: string;
  onFeatureActivated?: (featureId: string) => void;
}> = ({ className = '', onFeatureActivated }) => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [activeFeatures, setActiveFeatures] = useState<string[]>(['cross-chain-bridge', 'ai-scam-detection']);

  const features: FeatureCard[] = [
    {
      id: 'cross-chain-bridge',
      title: 'Cross-Chain Channel Bridge',
      description: 'Sync messages across blockchain networks for multi-chain communities',
      icon: <ArrowLeftRight size={24} className="text-blue-500" />,
      category: 'bridge',
      status: 'active',
      component: CrossChainBridge,
      benefits: [
        'Multi-chain community sync',
        'Real-time message bridging',
        'Gas optimization',
        'Chain-agnostic messaging'
      ],
      usage: 1247,
      rating: 4.8
    },
    {
      id: 'ai-scam-detection',
      title: 'AI Scam Detection',
      description: 'Automatically detect and warn about suspicious links, contracts, and content',
      icon: <Shield size={24} className="text-red-500" />,
      category: 'security',
      status: 'active',
      component: AIScamDetection,
      benefits: [
        'Real-time threat detection',
        'Contract analysis',
        'URL safety checking',
        'Community protection'
      ],
      usage: 2103,
      rating: 4.9
    },
    {
      id: 'gamefi-achievements',
      title: 'GameFi Achievement System',
      description: 'Track on-chain activity and award achievement badges with rewards',
      icon: <Trophy size={24} className="text-yellow-500" />,
      category: 'gamefi',
      status: 'active',
      component: AchievementSystem,
      benefits: [
        'On-chain activity tracking',
        'Achievement badges',
        'Leaderboards',
        'Quest systems'
      ],
      usage: 892,
      rating: 4.7
    },
    {
      id: 'analytics-dashboard',
      title: 'Advanced Analytics Dashboard',
      description: 'Comprehensive analytics for channel engagement and member activity',
      icon: <BarChart3 size={24} className="text-green-500" />,
      category: 'analytics',
      status: 'active',
      component: AdvancedAnalyticsDashboard,
      benefits: [
        'Channel engagement metrics',
        'Member activity insights',
        'Token flow tracking',
        'Performance analytics'
      ],
      usage: 654,
      rating: 4.6
    },
    {
      id: 'smart-contract-assistant',
      title: 'AI Smart Contract Assistant',
      description: 'AI-powered suggestions for smart contract interactions and optimizations',
      icon: <Brain size={24} className="text-purple-500" />,
      category: 'ai',
      status: 'beta',
      component: SmartContractAssistant,
      benefits: [
        'Gas optimization',
        'Security analysis',
        'Alternative suggestions',
        'Risk assessment'
      ],
      usage: 423,
      rating: 4.5
    },
    {
      id: 'web3-translation',
      title: 'Web3 Translation Assistant',
      description: 'Translate Web3 terminologies and explain complex concepts across languages',
      icon: <Languages size={24} className="text-indigo-500" />,
      category: 'ai',
      status: 'beta',
      component: Web3TranslationAssistant,
      benefits: [
        'Multi-language support',
        'Context-aware translation',
        'Term explanations',
        'Cultural adaptation'
      ],
      usage: 567,
      rating: 4.4
    }
  ];

  const toggleFeature = (featureId: string) => {
    setActiveFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
    onFeatureActivated?.(featureId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'beta': return 'text-yellow-400';
      case 'coming-soon': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900';
      case 'beta': return 'bg-yellow-900';
      case 'coming-soon': return 'bg-gray-900';
      default: return 'bg-gray-900';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bridge': return <ArrowLeftRight size={16} className="text-blue-500" />;
      case 'ai': return <Brain size={16} className="text-purple-500" />;
      case 'gamefi': return <Trophy size={16} className="text-yellow-500" />;
      case 'analytics': return <BarChart3 size={16} className="text-green-500" />;
      case 'security': return <Shield size={16} className="text-red-500" />;
      default: return <Zap size={16} className="text-gray-500" />;
    }
  };

  const selectedFeatureData = features.find(f => f.id === selectedFeature);
  const SelectedComponent = selectedFeatureData?.component;

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Zap size={24} className="text-yellow-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">Advanced Features Hub</h2>
            <p className="text-sm text-gray-400">Cutting-edge Web3 features for your community</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center px-3 py-1 bg-yellow-900 text-yellow-300 rounded-full text-sm">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
            {activeFeatures.length} Active
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {features.map(feature => (
          <div 
            key={feature.id}
            className={`bg-gray-800 rounded-lg p-4 border cursor-pointer transition-all ${
              selectedFeature === feature.id 
                ? 'border-blue-500 bg-blue-900/20' 
                : 'border-gray-700 hover:border-gray-600'
            } ${activeFeatures.includes(feature.id) ? 'ring-2 ring-green-500/20' : ''}`}
            onClick={() => setSelectedFeature(feature.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                {feature.icon}
                <div className="ml-3">
                  <div className="font-medium text-white">{feature.title}</div>
                  <div className="text-sm text-gray-400">{feature.description}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`px-2 py-1 rounded text-xs ${getStatusBg(feature.status)} ${getStatusColor(feature.status)}`}>
                  {feature.status.toUpperCase()}
                </div>
                {activeFeatures.includes(feature.id) && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center text-sm text-gray-400 mb-1">
                {getCategoryIcon(feature.category)}
                <span className="ml-1 capitalize">{feature.category}</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <Star size={14} className="mr-1 text-yellow-400" />
                <span className="mr-3">{feature.rating}</span>
                <Users size={14} className="mr-1" />
                <span>{feature.usage.toLocaleString()} users</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {feature.benefits.slice(0, 2).map((benefit, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                    {benefit}
                  </span>
                ))}
                {feature.benefits.length > 2 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                    +{feature.benefits.length - 2} more
                  </span>
                )}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFeature(feature.id);
                }}
                className={`px-3 py-1 rounded text-sm ${
                  activeFeatures.includes(feature.id)
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {activeFeatures.includes(feature.id) ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Details */}
      {selectedFeatureData && (
        <div className="border-t border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {selectedFeatureData.icon}
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-white">{selectedFeatureData.title}</h3>
                <p className="text-sm text-gray-400">{selectedFeatureData.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedFeature(null)}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          
          {/* Feature Component */}
          <div className="bg-gray-800 rounded-lg p-4">
            {SelectedComponent && (
              <SelectedComponent 
                className="h-96 overflow-y-auto"
                onBridgeMessage={(message: any) => console.log('Bridge message:', message)}
                onChannelSync={(channelId: string, chains: number[]) => console.log('Channel sync:', channelId, chains)}
                onDetectionResult={(result: any) => console.log('Detection result:', result)}
                onBlockContent={(content: string, reason: string) => console.log('Block content:', content, reason)}
                onAchievementUnlocked={(achievement: any) => console.log('Achievement unlocked:', achievement)}
                onQuestCompleted={(quest: any) => console.log('Quest completed:', quest)}
                onSuggestionApplied={(suggestion: any) => console.log('Suggestion applied:', suggestion)}
                onInteractionOptimized={(optimization: any) => console.log('Interaction optimized:', optimization)}
                onTranslationComplete={(result: any) => console.log('Translation complete:', result)}
                onTermExplained={(term: any) => console.log('Term explained:', term)}
                onExportData={(data: any) => console.log('Export data:', data)}
              />
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t border-gray-700 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <button className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors">
            <div className="flex items-center mb-2">
              <Settings size={20} className="text-blue-500 mr-2" />
              <span className="font-medium text-white">Configure Features</span>
            </div>
            <p className="text-sm text-gray-400">Customize feature settings and preferences</p>
          </button>
          
          <button className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors">
            <div className="flex items-center mb-2">
              <BarChart3 size={20} className="text-green-500 mr-2" />
              <span className="font-medium text-white">View Analytics</span>
            </div>
            <p className="text-sm text-gray-400">See feature usage and performance metrics</p>
          </button>
          
          <button className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors">
            <div className="flex items-center mb-2">
              <Crown size={20} className="text-yellow-500 mr-2" />
              <span className="font-medium text-white">Upgrade Plan</span>
            </div>
            <p className="text-sm text-gray-400">Unlock premium features and higher limits</p>
          </button>
        </div>
      </div>

      {/* Feature Status Summary */}
      <div className="border-t border-gray-700 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Feature Status</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{features.filter(f => f.status === 'active').length}</div>
            <div className="text-sm text-gray-400">Active Features</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{features.filter(f => f.status === 'beta').length}</div>
            <div className="text-sm text-gray-400">Beta Features</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">{features.filter(f => f.status === 'coming-soon').length}</div>
            <div className="text-sm text-gray-400">Coming Soon</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFeaturesHub;