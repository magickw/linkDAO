import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { OnChainVerificationBadge } from './OnChainVerification/OnChainVerificationBadge';
import ExplorerLinkButton from './OnChainVerification/ExplorerLinkButton';
import { TransactionHashDisplay } from './OnChainVerification/TransactionHashDisplay';
import { GovernanceVotingButton } from './SmartContractInteraction/GovernanceVotingButton';
import { SmartContractInteractionButton } from './SmartContractInteraction/SmartContractInteractionButton';
import { BlockchainDataProvider } from './SmartContractInteraction/BlockchainDataProvider';
import { OnChainProfileDisplay } from './OnChainProfile/OnChainProfileDisplay';
import { OnChainAchievementBadge } from './OnChainProfile/OnChainAchievementBadge';
import { OnChainReputationDisplay } from './OnChainProfile/OnChainReputationDisplay';
import { OnChainProof, OnChainAchievement } from '../types/onChainVerification';
import { Proposal } from '../types/governance';

// Mock data for demonstration
const mockProof: OnChainProof = {
  id: 'proof_1',
  transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  blockNumber: 18500000,
  contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  verified: true,
  proofType: 'governance_vote',
  status: 'verified',
  verificationSource: 'blockchain-rpc',
  confirmations: 25,
  requiredConfirmations: 12,
  timestamp: new Date(),
  fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
  gasFee: 0.0021
};

const mockProposal: Proposal = {
  id: 'prop_1',
  title: 'Increase Community Treasury Allocation',
  description: 'Proposal to increase the community treasury allocation from 10% to 15% of all platform fees.',
  proposer: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
  status: 'active',
  type: 'general',
  forVotes: '15420',
  againstVotes: '3280',
  abstainVotes: '890',
  quorum: '10000',
  participationRate: 78.7,
  votingPower: {
    for: 15420,
    against: 3280,
    abstain: 890,
    total: 19590,
    participationRate: 78.7
  },
  startTime: new Date(Date.now() - 86400000), // 1 day ago
  endTime: new Date(Date.now() + 86400000 * 6), // 6 days from now
  onChainId: '42',
  contractAddress: '0xabcdef1234567890abcdef1234567890abcdef12'
};

const mockAchievement: OnChainAchievement = {
  id: 'ach_1',
  title: 'DeFi Pioneer',
  description: 'Participated in 10+ different DeFi protocols',
  icon: '🏦',
  rarity: 'epic',
  proofRequired: ['token_transfer', 'contract_interaction'],
  verificationCriteria: {
    minimumTransactions: 50,
    minimumValue: 10,
    specificContracts: ['0x...', '0x...'],
    timeframe: { duration: 365 }
  },
  verified: true,
  verifiedAt: new Date(),
  displayOrder: 1,
  showInProfile: true
};

const contractMethod = {
  name: 'stake',
  inputs: [
    {
      name: 'amount',
      type: 'uint256',
      description: 'Amount to stake',
      placeholder: '100'
    },
    {
      name: 'duration',
      type: 'uint256',
      description: 'Staking duration in days',
      placeholder: '30'
    }
  ],
  stateMutability: 'nonpayable' as const,
  description: 'Stake tokens for rewards'
};

export const OnChainIntegrationDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'verification' | 'contracts' | 'profile'>('verification');

  const demoSections = [
    { id: 'verification', label: 'On-Chain Verification', icon: '✅' },
    { id: 'contracts', label: 'Smart Contracts', icon: '⚡' },
    { id: 'profile', label: 'Profile Integration', icon: '👤' }
  ];

  return (
    <BlockchainDataProvider>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            On-Chain Integration Demo
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Explore the comprehensive on-chain verification and integration features 
            that bring Web3 functionality directly into the community experience.
          </p>
        </div>

        {/* Demo Navigation */}
        <div className="flex justify-center space-x-2 mb-8">
          {demoSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveDemo(section.id as any)}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all duration-200
                flex items-center space-x-2
                ${activeDemo === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        {/* Demo Content */}
        <motion.div
          key={activeDemo}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeDemo === 'verification' && (
            <div className="space-y-8">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-2xl font-semibold text-white mb-6">
                  On-Chain Verification Components
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Verification Badges */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Verification Badges</h3>
                    <div className="space-y-3">
                      <OnChainVerificationBadge
                        proof={mockProof}
                        size="md"
                        showLabel={true}
                      />
                      <OnChainVerificationBadge
                        proof={{...mockProof, proofType: 'token_transfer', status: 'pending'}}
                        size="sm"
                        showLabel={true}
                      />
                      <OnChainVerificationBadge
                        proof={{...mockProof, proofType: 'nft_mint', status: 'verified'}}
                        size="lg"
                        showLabel={true}
                      />
                    </div>
                  </div>

                  {/* Explorer Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Explorer Links</h3>
                    <div className="space-y-3">
                      <ExplorerLinkButton
                        transactionHash={mockProof.transactionHash}
                        size="md"
                      />
                    </div>
                  </div>
                </div>

                {/* Transaction Hash Display */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-white mb-4">Transaction Hash Display</h3>
                  <div className="space-y-4">
                    <TransactionHashDisplay
                      transactionHash={mockProof.transactionHash}
                      showVerification={true}
                      format="short"
                      size="md"
                    />
                    <TransactionHashDisplay
                      transactionHash="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
                      showVerification={false}
                      format="full"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDemo === 'contracts' && (
            <div className="space-y-8">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h2 className="text-2xl font-semibold text-white mb-6">
                  Smart Contract Interactions
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Governance Voting */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Governance Voting</h3>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">{mockProposal.title}</h4>
                      <p className="text-gray-300 text-sm mb-4">{mockProposal.description}</p>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                          <span>Voting Progress</span>
                          <span>19,590 total votes</span>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full flex">
                            <div className="bg-green-500" style={{ width: '78.7%' }}></div>
                            <div className="bg-red-500" style={{ width: '16.7%' }}></div>
                            <div className="bg-gray-500" style={{ width: '4.6%' }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <GovernanceVotingButton
                        proposal={mockProposal}
                        userVotingPower={1250}
                        size="md"
                        variant="detailed"
                      />
                    </div>
                  </div>

                  {/* Contract Interaction */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Contract Methods</h3>
                    <div className="space-y-3">
                      <SmartContractInteractionButton
                        contractAddress={mockProof.contractAddress}
                        method={contractMethod}
                        size="md"
                        variant="primary"
                      />
                      <SmartContractInteractionButton
                        contractAddress={mockProof.contractAddress}
                        method={{
                          name: 'balanceOf',
                          inputs: [{ name: 'account', type: 'address', description: 'Account address' }],
                          stateMutability: 'view',
                          description: 'Get token balance'
                        }}
                        size="md"
                        variant="secondary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDemo === 'profile' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Display */}
                <div className="lg:col-span-2">
                  <OnChainProfileDisplay
                    address={mockProof.fromAddress}
                    showAchievements={true}
                    showNFTs={true}
                    showReputation={true}
                    size="detailed"
                  />
                </div>

                {/* Reputation Display */}
                <div>
                  <OnChainReputationDisplay
                    address={mockProof.fromAddress}
                    totalReputation={742}
                    trustScore={0.87}
                    verificationLevel="advanced"
                    showBreakdown={true}
                    size="detailed"
                  />
                </div>
              </div>

              {/* Achievement Badges */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">Achievement Badges</h3>
                <div className="flex flex-wrap gap-4">
                  <OnChainAchievementBadge
                    achievement={mockAchievement}
                    size="lg"
                    showDetails={true}
                  />
                  <OnChainAchievementBadge
                    achievement={{
                      ...mockAchievement,
                      id: 'ach_2',
                      title: 'NFT Collector',
                      icon: '🎨',
                      rarity: 'rare',
                      verified: true
                    }}
                    size="md"
                  />
                  <OnChainAchievementBadge
                    achievement={{
                      ...mockAchievement,
                      id: 'ach_3',
                      title: 'Governance Guru',
                      icon: '🗳️',
                      rarity: 'legendary',
                      verified: true
                    }}
                    size="md"
                  />
                  <OnChainAchievementBadge
                    achievement={{
                      ...mockAchievement,
                      id: 'ach_4',
                      title: 'Early Adopter',
                      icon: '🚀',
                      rarity: 'common',
                      verified: false
                    }}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Integration Notes */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <h3 className="text-blue-400 font-medium mb-3">🔗 Integration Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="text-white font-medium mb-2">Verification System</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Real-time transaction verification</li>
                <li>• Multiple blockchain explorer support</li>
                <li>• Proof type categorization</li>
                <li>• Confirmation tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Smart Contracts</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Direct governance voting</li>
                <li>• Gas estimation</li>
                <li>• Transaction monitoring</li>
                <li>• Error handling</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Profile Integration</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• On-chain achievements</li>
                <li>• NFT collection display</li>
                <li>• Reputation scoring</li>
                <li>• Activity tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BlockchainDataProvider>
  );
};