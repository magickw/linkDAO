import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';

interface ComparisonData {
  feature: string;
  web2: string;
  web3: string;
  advantage: string;
}

const comparisonData: ComparisonData[] = [
  {
    feature: 'Platform Fees',
    web2: '10% - 30%',
    web3: '0% - 2%',
    advantage: 'Save up to 28% on every transaction'
  },
  {
    feature: 'Payment Settlement',
    web2: '3-7 business days',
    web3: 'Instant',
    advantage: 'Get paid immediately upon delivery'
  },
  {
    feature: 'Global Access',
    web2: 'Limited by banks & borders',
    web3: 'Truly borderless',
    advantage: 'Reach customers worldwide without restrictions'
  },
  {
    feature: 'Transaction Trust',
    web2: 'Platform-dependent',
    web3: 'Blockchain-guaranteed',
    advantage: 'Cryptographic proof of every transaction'
  },
  {
    feature: 'Data Ownership',
    web2: 'Platform controls your data',
    web3: 'You own your data',
    advantage: 'Complete control over your information'
  }
];

export const Web3ExplainerSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'benefits'>('overview');
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Why Web3 Marketplace?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experience the future of commerce with blockchain-powered transparency, 
            lower fees, and true ownership of your digital assets.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <GlassPanel className="p-1 flex space-x-1">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'comparison', label: 'Fee Comparison' },
              { key: 'benefits', label: 'Key Benefits' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 rounded-lg transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </GlassPanel>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <GlassPanel className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Lower Fees</h3>
                <p className="text-gray-300">
                  Pay only 0-2% in fees compared to 10-30% on traditional platforms
                </p>
              </GlassPanel>

              <GlassPanel className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🌍</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Global Access</h3>
                <p className="text-gray-300">
                  No borders, no banks needed. Trade with anyone, anywhere in the world
                </p>
              </GlassPanel>

              <GlassPanel className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Instant Settlement</h3>
                <p className="text-gray-300">
                  Get paid instantly with cryptocurrency, no waiting for bank transfers
                </p>
              </GlassPanel>
            </motion.div>
          )}

          {activeTab === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <GlassPanel className="overflow-hidden">
                <div className="p-6">
                  <h3 className="text-2xl font-semibold text-white mb-6 text-center">
                    Platform Fee Comparison
                  </h3>
                  
                  <div className="space-y-4">
                    {comparisonData.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="cursor-pointer"
                        onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
                      >
                        <div className="grid grid-cols-4 gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
                          <div className="text-white font-medium">{item.feature}</div>
                          <div className="text-red-400 text-center">{item.web2}</div>
                          <div className="text-green-400 text-center font-semibold">{item.web3}</div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400">Click for details</span>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedFeature === index && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg mt-2 border border-indigo-500/20">
                                <p className="text-gray-300">{item.advantage}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-8 p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                    <h4 className="text-lg font-semibold text-green-400 mb-2">
                      💡 Example Savings
                    </h4>
                    <p className="text-gray-300">
                      On a $1,000 sale: Traditional platforms charge $100-300 in fees. 
                      Web3 Marketplace charges only $0-20. <span className="text-green-400 font-semibold">
                      Save $80-280 per transaction!</span>
                    </p>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {activeTab === 'benefits' && (
            <motion.div
              key="benefits"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <GlassPanel className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">🔒</span>
                  Enhanced Security
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Smart contract escrow protection</li>
                  <li>• Immutable transaction records</li>
                  <li>• Cryptographic proof of authenticity</li>
                  <li>• Decentralized dispute resolution</li>
                </ul>
              </GlassPanel>

              <GlassPanel className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">🌐</span>
                  True Ownership
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Own your digital assets as NFTs</li>
                  <li>• Control your data and privacy</li>
                  <li>• Portable reputation across platforms</li>
                  <li>• No platform lock-in</li>
                </ul>
              </GlassPanel>

              <GlassPanel className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">⚡</span>
                  Instant Transactions
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• 24/7 global payments</li>
                  <li>• No banking hours or holidays</li>
                  <li>• Cross-border without friction</li>
                  <li>• Multiple cryptocurrency options</li>
                </ul>
              </GlassPanel>

              <GlassPanel className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">🏛️</span>
                  Community Governance
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Vote on platform policies</li>
                  <li>• Earn rewards for participation</li>
                  <li>• Transparent decision making</li>
                  <li>• Community-driven moderation</li>
                </ul>
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};