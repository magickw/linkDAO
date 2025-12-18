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
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex items-start mb-4">
                <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 mr-3" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Staking Tiers</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Choose from five staking tiers with increasing benefits based on lock period.
                  </p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-900 dark:text-white font-semibold">Tier</th>
                      <th className="text-left py-3 px-4 text-gray-900 dark:text-white font-semibold">Lock Period</th>
                      <th className="text-left py-3 px-4 text-gray-900 dark:text-white font-semibold">Base APR</th>
                      <th className="text-left py-3 px-4 text-gray-900 dark:text-white font-semibold">Voting Multiplier</th>
                      <th className="text-left py-3 px-4 text-gray-900 dark:text-white font-semibold">Fee Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                          Bronze
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">30 days</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">3%</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">1.2x</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">10%</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          Silver
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">90 days</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">5%</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">1.5x</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">20%</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                          Gold
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">180 days</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">7%</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">1.8x</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">35%</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          Platinum
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">365 days</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">9%</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">2.0x</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">50%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200">
                          Diamond
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">730 days (2 years)</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">11%</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">2.5x</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">60%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

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
                  <p className="text-gray-900 dark:text-white font-medium mt-2">Select Tier & Stake</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">Choose your tier and stake your LDAO tokens</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</div>
                  <p className="text-gray-900 dark:text-white font-medium mt-2">Earn Rewards</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">Start earning staking rewards immediately</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-yellow-800 dark:text-yellow-200">
                  <span className="font-bold">Note:</span> Staked tokens are locked for the selected tier period. Longer lock periods provide higher APR and enhanced benefits.
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
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Tier-Based Fee Discounts</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mr-2"></div>
                      <span>Bronze Tier</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">10% off</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full mr-2"></div>
                      <span>Silver Tier</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">20% off</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-600 dark:bg-yellow-400 rounded-full mr-2"></div>
                      <span>Gold Tier</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">35% off</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-slate-600 dark:bg-slate-400 rounded-full mr-2"></div>
                      <span>Platinum Tier</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">50% off</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-cyan-600 dark:bg-cyan-400 rounded-full mr-2"></div>
                      <span>Diamond Tier</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">60% off</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-6 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Additional Benefits</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                    Enhanced voting power (up to 2.5x)
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                    Staking rewards (3%-11% APR)
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                    Governance participation rewards
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                    Exclusive community access
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full mr-2"></div>
                    Priority customer support
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