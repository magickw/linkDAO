/**
 * Tier System Demo Component
 * Demonstrates tier-based feature gating across seller components
 */

import React, { useState } from 'react';
import { TierProvider } from '../../../contexts/TierContext';
import { 
  TierAwareComponent, 
  TierProgressBar, 
  TierUpgradePrompt, 
  TierInfoCard, 
  TierUpgradeWorkflow,
  TIER_ACTIONS 
} from './index';
import { Button, GlassPanel } from '../../../design-system';

interface TierSystemDemoProps {
  walletAddress: string;
}

const TierSystemDemo: React.FC<TierSystemDemoProps> = ({ walletAddress }) => {
  const [activeDemo, setActiveDemo] = useState<string>('overview');

  const demoSections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'feature-gating', label: 'Feature Gating', icon: '🔒' },
    { id: 'progress', label: 'Progress Tracking', icon: '📈' },
    { id: 'upgrade-workflow', label: 'Upgrade Workflow', icon: '⬆️' },
  ];

  const renderFeatureGatingDemo = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">Tier-Based Feature Gating</h3>
      
      {/* Create Listing Action */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Create Listing (Bronze+ Required)</h4>
        <TierAwareComponent 
          requiredAction={TIER_ACTIONS.CREATE_LISTING}
          showUpgradePrompt={true}
          fallbackComponent={({ tier, validation }) => (
            <div className="p-4 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg">
              <p className="text-red-400">{validation?.reason}</p>
            </div>
          )}
        >
          <Button variant="primary" className="w-full">
            ✅ Create New Listing (Available)
          </Button>
        </TierAwareComponent>
      </div>

      {/* Analytics Access */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Analytics Access (Silver+ Required)</h4>
        <TierAwareComponent 
          requiredAction={TIER_ACTIONS.ACCESS_ANALYTICS}
          showUpgradePrompt={true}
          fallbackComponent={({ tier, validation }) => (
            <div className="p-4 bg-yellow-900 bg-opacity-50 border border-yellow-500 rounded-lg">
              <p className="text-yellow-400">{validation?.reason}</p>
              <p className="text-yellow-300 text-sm mt-1">{validation?.alternativeAction}</p>
            </div>
          )}
        >
          <Button variant="primary" className="w-full">
            ✅ View Analytics Dashboard (Available)
          </Button>
        </TierAwareComponent>
      </div>

      {/* Priority Support */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Priority Support (Gold+ Required)</h4>
        <TierAwareComponent 
          requiredAction={TIER_ACTIONS.PRIORITY_SUPPORT}
          showUpgradePrompt={true}
          fallbackComponent={({ tier, validation }) => (
            <div className="p-4 bg-orange-900 bg-opacity-50 border border-orange-500 rounded-lg">
              <p className="text-orange-400">{validation?.reason}</p>
              <p className="text-orange-300 text-sm mt-1">{validation?.alternativeAction}</p>
            </div>
          )}
        >
          <Button variant="primary" className="w-full">
            ✅ Contact Priority Support (Available)
          </Button>
        </TierAwareComponent>
      </div>

      {/* Custom Branding */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Custom Branding (Gold+ Required)</h4>
        <TierAwareComponent 
          requiredAction={TIER_ACTIONS.CUSTOM_BRANDING}
          showUpgradePrompt={true}
          fallbackComponent={({ tier, validation }) => (
            <div className="p-4 bg-purple-900 bg-opacity-50 border border-purple-500 rounded-lg">
              <p className="text-purple-400">{validation?.reason}</p>
              <p className="text-purple-300 text-sm mt-1">{validation?.alternativeAction}</p>
            </div>
          )}
        >
          <Button variant="primary" className="w-full">
            ✅ Customize Store Branding (Available)
          </Button>
        </TierAwareComponent>
      </div>
    </div>
  );

  const renderProgressDemo = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">Tier Progress Tracking</h3>
      
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Compact Progress Bar</h4>
        <TierProgressBar 
          progress={{
            currentTier: {
              id: 'bronze',
              name: 'Bronze',
              level: 1,
              color: '#CD7F32',
              icon: '🥉',
              requirements: [],
              benefits: [],
              limitations: [],
              upgradeThreshold: 80,
              isActive: true,
            },
            nextTier: {
              id: 'silver',
              name: 'Silver',
              level: 2,
              color: '#C0C0C0',
              icon: '🥈',
              requirements: [],
              benefits: [],
              limitations: [],
              upgradeThreshold: 80,
              isActive: true,
            },
            progressPercentage: 65,
            requirementsMet: 2,
            totalRequirements: 3,
            estimatedUpgradeTime: '2 weeks',
          }}
          compact={true}
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Detailed Progress Bar</h4>
        <TierProgressBar 
          progress={{
            currentTier: {
              id: 'bronze',
              name: 'Bronze',
              level: 1,
              color: '#CD7F32',
              icon: '🥉',
              requirements: [],
              benefits: [],
              limitations: [],
              upgradeThreshold: 80,
              isActive: true,
            },
            nextTier: {
              id: 'silver',
              name: 'Silver',
              level: 2,
              color: '#C0C0C0',
              icon: '🥈',
              requirements: [
                {
                  type: 'sales_volume',
                  value: 1000,
                  current: 650,
                  met: false,
                  description: 'Complete $1,000 in sales',
                },
                {
                  type: 'rating',
                  value: 4.0,
                  current: 4.2,
                  met: true,
                  description: 'Maintain 4.0+ star rating',
                },
                {
                  type: 'reviews',
                  value: 10,
                  current: 7,
                  met: false,
                  description: 'Receive 10+ reviews',
                },
              ],
              benefits: [],
              limitations: [],
              upgradeThreshold: 80,
              isActive: true,
            },
            progressPercentage: 65,
            requirementsMet: 1,
            totalRequirements: 3,
            estimatedUpgradeTime: '2 weeks',
          }}
          showDetails={true}
        />
      </div>
    </div>
  );

  const renderUpgradeWorkflowDemo = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">Tier Upgrade Workflow</h3>
      
      <TierUpgradeWorkflow 
        walletAddress={walletAddress}
        currentAction={TIER_ACTIONS.ACCESS_ANALYTICS}
        onUpgradeComplete={() => console.log('Upgrade completed!')}
      />
    </div>
  );

  return (
    <TierProvider walletAddress={walletAddress}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Tier System Demo</h1>
            <p className="text-gray-300">
              Comprehensive demonstration of tier-based feature gating across seller components
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
              {demoSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveDemo(section.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeDemo === section.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tier Info Sidebar */}
            <div className="lg:col-span-1">
              <TierInfoCard />
            </div>

            {/* Main Demo Content */}
            <div className="lg:col-span-2">
              <GlassPanel className="p-6">
                {activeDemo === 'overview' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Tier System Overview</h3>
                    <div className="prose prose-invert">
                      <p className="text-gray-300 mb-4">
                        The tier system provides comprehensive feature gating across all seller components, 
                        ensuring that features are unlocked based on seller performance and engagement.
                      </p>
                      
                      <h4 className="text-white font-medium mb-2">Key Features:</h4>
                      <ul className="text-gray-300 space-y-1">
                        <li>• Automatic tier progression based on performance metrics</li>
                        <li>• Feature gating with graceful degradation</li>
                        <li>• Progress tracking and upgrade workflows</li>
                        <li>• Consistent integration across all seller components</li>
                        <li>• Real-time tier validation and caching</li>
                      </ul>

                      <h4 className="text-white font-medium mb-2 mt-4">Available Tiers:</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <span className="text-2xl">🥉</span>
                          <div>
                            <h5 className="text-white font-medium">Bronze</h5>
                            <p className="text-gray-400 text-sm">Basic seller features</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <span className="text-2xl">🥈</span>
                          <div>
                            <h5 className="text-white font-medium">Silver</h5>
                            <p className="text-gray-400 text-sm">Enhanced features + analytics</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <span className="text-2xl">🥇</span>
                          <div>
                            <h5 className="text-white font-medium">Gold</h5>
                            <p className="text-gray-400 text-sm">Premium features + priority support</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDemo === 'feature-gating' && renderFeatureGatingDemo()}
                {activeDemo === 'progress' && renderProgressDemo()}
                {activeDemo === 'upgrade-workflow' && renderUpgradeWorkflowDemo()}
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>
    </TierProvider>
  );
};

export default TierSystemDemo;