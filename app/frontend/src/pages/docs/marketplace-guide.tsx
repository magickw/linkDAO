import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Store, ShoppingCart, Shield, Award, TrendingUp, MessageCircle, HelpCircle } from 'lucide-react';

const MarketplaceGuidePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Marketplace Guide - LinkDAO</title>
        <meta name="description" content="Complete guide to buying and selling on the LinkDAO marketplace" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link href="/support" className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-8 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Support
          </Link>

          <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Marketplace Guide</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Everything you need to know about buying and selling on the LinkDAO marketplace - secure transactions, trust systems, and maximizing your success.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <Store className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Buying</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Discover products and services from trusted sellers in our decentralized marketplace.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <ShoppingCart className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Selling</h3>
              <p className="text-gray-600 dark:text-gray-300">
                List your products and services to reach a global audience of Web3 users.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <Shield className="w-10 h-10 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Security</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our escrow system and trust certificates ensure safe transactions for all users.
              </p>
            </div>
          </div>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Getting Started as a Buyer</h2>
            
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">1. Browse Products</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Explore thousands of products and services across various categories. Use filters to narrow down your search.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm">Digital Goods</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm">Physical Products</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm">Services</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm">NFTs</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">2. Verify Seller Trust</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Check the seller's trust score, reviews, and trust certificates before making a purchase.
                </p>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Award className="w-4 h-4 mr-1" />
                  <span>Look for sellers with high trust ratings and verified certificates</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">3. Make Secure Purchases</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  All purchases are protected by our smart contract escrow system. Funds are only released when you confirm receipt.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-green-800 dark:text-green-200">
                    <span className="font-bold">Tip:</span> Always communicate with sellers through our messaging system for dispute protection.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Selling on LinkDAO</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Create Your Seller Profile</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                    <span>Complete your profile with detailed information</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                    <span>Obtain trust certificates to build credibility</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                    <span>Set up secure payment methods</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">List Your Products</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                    <span>Create detailed product descriptions</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                    <span>Upload high-quality images</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 mr-3"></div>
                    <span>Set competitive prices with clear terms</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Maximize Your Sales</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Optimize Listings</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Use relevant keywords and tags</p>
                </div>
                <div className="text-center">
                  <MessageCircle className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Engage Buyers</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Respond quickly to inquiries</p>
                </div>
                <div className="text-center">
                  <Award className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Build Reputation</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Maintain high ratings and reviews</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Trust & Security System</h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">How Our Security Works</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 mr-3" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Smart Contract Escrow</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      All payments are held in secure smart contracts until both parties confirm satisfaction.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Award className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 mr-3" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Trust Certificates</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Sellers can obtain trust certificates that verify their identity and business credentials.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1 mr-3" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Reputation System</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Transparent rating system helps buyers make informed decisions.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-yellow-800 dark:text-yellow-200">
                  <span className="font-bold">Important:</span> Never conduct transactions outside the LinkDAO platform. You will lose all protection and dispute resolution capabilities.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Dispute Resolution</h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">If Problems Occur</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Our dispute resolution system ensures fair outcomes for both buyers and sellers.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">1. Open Dispute</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Initiate a dispute through your order page</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">2. Provide Evidence</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Upload relevant messages and documentation</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">3. Resolution</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Mediators review and make final decision</p>
                </div>
              </div>
              
              <Link href="/support/disputes" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Learn About Disputes
              </Link>
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

export default MarketplaceGuidePage;