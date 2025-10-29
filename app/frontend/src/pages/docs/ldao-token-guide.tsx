import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Coins, Wallet, TrendingUp, Lock, HelpCircle } from 'lucide-react';

const LDAOTokenGuidePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>LDAO Token Guide - LinkDAO</title>
        <meta name="description" content="Complete guide to LDAO tokens - acquisition, staking, governance and usage" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link href="/support" className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-8 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Support
          </Link>

          <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">LDAO Token Guide</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Everything you need to know about LDAO tokens - acquisition, staking, governance, and platform benefits.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <Coins className="w-10 h-10 text-yellow-500 mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Token Overview</h3>
              <p className="text-gray-600 dark:text-gray-300">
                LDAO is the native utility and governance token of LinkDAO. It powers the ecosystem by enabling governance participation, staking rewards, and access to premium features.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <TrendingUp className="w-10 h-10 text-green-500 mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Staking Rewards</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Stake your LDAO tokens to earn passive income. Annual Percentage Yields (APY) vary based on the total staked amount and platform performance.
              </p>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">How to Acquire LDAO Tokens</h2>
            
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">1. Purchase on Decentralized Exchanges</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  LDAO tokens are available on major DEXes. Connect your wallet and swap ETH or stablecoins for LDAO.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200 font-medium">
                    Supported DEXes: Uniswap, SushiSwap, andBalancer
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">2. Participate in Governance</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Active governance participants receive LDAO token rewards for their contributions to the ecosystem.
                </p>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                  <p className="text-purple-800 dark:text-purple-200 font-medium">
                    Earn rewards by creating proposals, voting, and participating in DAO activities.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">3. Marketplace Rewards</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Earn LDAO tokens through marketplace activities including selling products, completing transactions, and maintaining high seller ratings.
                </p>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    Top sellers and active community members receive monthly LDAO rewards.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Staking Your LDAO Tokens</h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start mb-4">
                <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 mr-3" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Secure Staking Process</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Stake your LDAO tokens directly from your wallet through our secure staking interface.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</div>
                  <p className="text-gray-900 dark:text-white font-medium mt-2">Connect Wallet</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">Connect your Web3 wallet to the staking interface</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">2</div>
                  <p className="text-gray-900 dark:text-white font-medium mt-2">Approve & Stake</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">Approve the token transfer and stake your LDAO</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</div>
                  <p className="text-gray-900 dark:text-white font-medium mt-2">Earn Rewards</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">Start earning staking rewards immediately</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-yellow-800 dark:text-yellow-200">
                  <span className="font-bold">Note:</span> Staked tokens are locked for a minimum of 7 days. Early unstaking incurs a 5% penalty.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Governance Participation</h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Using LDAO for Governance</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                LDAO token holders can participate in platform governance by creating and voting on proposals.
              </p>
              
              <ul className="space-y-3 mb-4">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                  <span className="text-gray-900 dark:text-white">Create proposals to suggest platform improvements</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                  <span className="text-gray-900 dark:text-white">Vote on existing proposals with your LDAO balance</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                  <span className="text-gray-900 dark:text-white">Delegate voting power to trusted community members</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                  <span className="text-gray-900 dark:text-white">Earn rewards for active governance participation</span>
                </li>
              </ul>
              
              <Link href="/governance" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Visit Governance Center
              </Link>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Platform Benefits</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Premium Features</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2"></div>
                    Reduced marketplace fees
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2"></div>
                    Exclusive community access
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2"></div>
                    Priority customer support
                  </li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Earning Opportunities</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                    Staking rewards
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                    Governance rewards
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                    Marketplace bonuses
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Need More Help?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/support/live-chat" className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-gray-900 dark:text-white font-medium">Live Chat</span>
              </Link>
              
              <Link href="/support/faq" className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-gray-900 dark:text-white font-medium">FAQ</span>
              </Link>
              
              <Link href="/support/tickets" className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-gray-900 dark:text-white font-medium">Support Tickets</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default LDAOTokenGuidePage;