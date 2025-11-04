import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Clock, Users, Star, Download, Share2, Bookmark } from 'lucide-react';

const LDAOCompleteGuidePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>LDAO Token Complete Guide - Support Center</title>
        <meta name="description" content="Complete guide to LDAO tokens - acquisition, staking, trading, and more" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {/* Navigation */}
          <div className="mb-6">
            <Link href="/support" className="flex items-center text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Support Center
            </Link>
          </div>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    LDAO Guide
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Beginner
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  LDAO Token Complete Guide
                </h1>
                
                <p className="text-gray-600 text-lg mb-4">
                  Everything you need to know about acquiring, staking, and using LDAO tokens. 
                  This comprehensive guide covers all acquisition methods and best practices.
                </p>

                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>15 min read</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>12,500 views</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span>4.8 rating</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-6">
                <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg">
                  <Bookmark className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg">
                  <Share2 className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Navigation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <a href="#what-is-ldao" className="text-blue-600 hover:text-blue-800">What is LDAO?</a>
                <a href="#acquisition-methods" className="text-blue-600 hover:text-blue-800">Acquisition Methods</a>
                <a href="#staking-guide" className="text-blue-600 hover:text-blue-800">Staking Guide</a>
                <a href="#security-tips" className="text-blue-600 hover:text-blue-800">Security Tips</a>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="prose prose-lg max-w-none">
              <h2 id="what-is-ldao">What are LDAO Tokens?</h2>
              
              <p>
                LDAO tokens are the native utility tokens of the LinkDAO platform with a total supply of 1 billion tokens. 
                They serve multiple purposes within the ecosystem and provide holders with various benefits and opportunities.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Key Benefits:</strong> Governance rights, staking rewards (5%-18% APR), 
                      premium features access, transaction discounts, and marketplace rewards.
                    </p>
                  </div>
                </div>
              </div>

              <h3>Token Utility</h3>
              <ul>
                <li><strong>Governance Rights:</strong> Vote on platform decisions and proposals</li>
                <li><strong>Staking Rewards:</strong> Earn APR from 5%-18% based on lock periods</li>
                <li><strong>Premium Benefits:</strong> Access exclusive features and enhanced rewards</li>
                <li><strong>Transaction Discounts:</strong> Reduced fees when using LDAO for payments</li>
                <li><strong>Marketplace Rewards:</strong> Earn tokens through platform activities</li>
              </ul>

              <h2 id="acquisition-methods">Token Acquisition Methods</h2>

              <h3>1. Direct Purchase (Treasury)</h3>
              <p>The simplest way to acquire LDAO tokens is through direct purchase from the treasury.</p>
              
              <div className="bg-gray-50 rounded-lg p-4 my-4">
                <h4>Key Details:</h4>
                <ul className="mb-0">
                  <li><strong>Starting Price:</strong> $0.01 per LDAO token</li>
                  <li><strong>Payment Methods:</strong> ETH, USDC, credit cards, bank transfers</li>
                  <li><strong>Volume Discounts:</strong> 5%-15% for bulk purchases</li>
                  <li><strong>KYC Benefits:</strong> Higher purchase limits for verified users</li>
                </ul>
              </div>

              <h4>Step-by-Step Purchase Process:</h4>
              <ol>
                <li>Navigate to the LDAO section in your dashboard</li>
                <li>Click "Buy LDAO Tokens"</li>
                <li>Select your purchase amount (minimum 10 LDAO)</li>
                <li>Choose payment method (crypto or fiat)</li>
                <li>Review pricing and any applicable discounts</li>
                <li>Complete the transaction</li>
              </ol>

              <h3>2. DEX Trading</h3>
              <p>Trade LDAO tokens on decentralized exchanges for potentially better rates.</p>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Pro Tip:</strong> Use Polygon network for 99% lower gas fees compared to Ethereum mainnet!
                    </p>
                  </div>
                </div>
              </div>

              <h4>Supported DEXs:</h4>
              <ul>
                <li><strong>Uniswap V3:</strong> Best liquidity and rates</li>
                <li><strong>SushiSwap:</strong> Community-driven exchange</li>
                <li><strong>1inch:</strong> Aggregated best prices</li>
                <li><strong>Curve:</strong> Optimized for stablecoin pairs</li>
              </ul>

              <h3>3. Earn-to-Own System</h3>
              <p>Earn LDAO tokens for free through platform participation and community engagement.</p>

              <h4>Earning Opportunities:</h4>
              <ul>
                <li><strong>Content Creation:</strong> 10-50 LDAO per quality post</li>
                <li><strong>Community Engagement:</strong> 1-10 LDAO per helpful comment</li>
                <li><strong>Referral Program:</strong> 10% of referee's first purchase</li>
                <li><strong>Marketplace Activity:</strong> 0.1% of transaction value in LDAO</li>
              </ul>

              <h2 id="staking-guide">Staking Guide</h2>

              <p>Staking your LDAO tokens allows you to earn passive income while supporting the network.</p>

              <h3>Staking Options</h3>

              <div className="overflow-x-auto my-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Staking Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        APR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lock Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Benefits
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Flexible
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        5%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        None
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Withdraw anytime
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        30 Days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        8%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        30 days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Higher rewards
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        365 Days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        18%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        365 days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Maximum rewards
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>Premium Member Benefits</h3>
              <p>Premium members receive additional benefits:</p>
              <ul>
                <li><strong>Bonus APR:</strong> Additional 2% on all staking tiers</li>
                <li><strong>Exclusive Pools:</strong> Access to premium-only staking events</li>
                <li><strong>Priority Unstaking:</strong> Faster withdrawal processing</li>
              </ul>

              <h2 id="security-tips">Security Best Practices</h2>

              <div className="bg-red-50 border-l-4 border-red-400 p-4 my-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      <strong>Security Warning:</strong> Never share your seed phrase with anyone. 
                      Store it securely offline in multiple locations.
                    </p>
                  </div>
                </div>
              </div>

              <h3>Wallet Security</h3>
              <ul>
                <li><strong>Hardware Wallets:</strong> Use Ledger or Trezor for large amounts</li>
                <li><strong>Seed Phrase:</strong> Store securely offline</li>
                <li><strong>Regular Backups:</strong> Multiple secure locations</li>
                <li><strong>Software Updates:</strong> Keep wallet software current</li>
              </ul>

              <h3>Transaction Security</h3>
              <ul>
                <li><strong>Verify Addresses:</strong> Double-check all addresses</li>
                <li><strong>Test Transactions:</strong> Send small amounts first</li>
                <li><strong>Gas Limits:</strong> Set appropriate limits</li>
                <li><strong>Slippage:</strong> Use reasonable slippage settings</li>
              </ul>

              <h2>Getting Help</h2>
              <p>If you need assistance with LDAO tokens:</p>
              <ul>
                <li><strong>Live Chat:</strong> Available 24/7 in the platform</li>
                <li><strong>Email Support:</strong> ldao-support@linkdao.io</li>
                <li><strong>Community Discord:</strong> Real-time community help</li>
                <li><strong>Knowledge Base:</strong> Comprehensive FAQ section</li>
              </ul>
            </div>
          </div>

          {/* Related Articles */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/support/tutorials/first-ldao-purchase" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">Quick Start: Your First LDAO Purchase</h4>
                <p className="text-sm text-gray-600">5-minute tutorial for beginners</p>
              </Link>
              <Link href="/support/guides/staking-calculator" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <h4 className="font-medium text-gray-900 mb-2">Staking Rewards Calculator</h4>
                <p className="text-sm text-gray-600">Calculate your potential earnings</p>
              </Link>
            </div>
          </div>

          {/* Feedback */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Was this helpful?</h3>
            <div className="flex items-center space-x-4">
              <button className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors">
                <span className="mr-2">👍</span>
                Yes, helpful
              </button>
              <button className="flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors">
                <span className="mr-2">👎</span>
                Needs improvement
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LDAOCompleteGuidePage;