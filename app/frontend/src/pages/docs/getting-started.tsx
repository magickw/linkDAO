import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Wallet, 
  MessageCircle, 
  ShoppingCart,
  Play,
  BookOpen,
  HelpCircle,
  Book,
  ChevronRight,
  CheckCircle,
  ExternalLink,
  Video,
  FileText,
  Users
} from 'lucide-react';

const GettingStartedPage: NextPage = () => {
  const [activeSection, setActiveSection] = useState('overview');
  
  const sections = [
    { id: 'overview', title: 'Welcome to LinkDAO', icon: BookOpen },
    { id: 'wallet', title: 'Connect Your Wallet', icon: Wallet },
    { id: 'profile', title: 'Set Up Your Profile', icon: Users },
    { id: 'marketplace', title: 'Explore Marketplace', icon: ShoppingCart },
    { id: 'governance', title: 'Participate in Governance', icon: MessageCircle },
    { id: 'vaults', title: 'Deposit into Vaults', icon: Book },
  ];

  const InteractiveGuide = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Play className="w-6 h-6 text-blue-600 mr-3" />
        Interactive Learning Path
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`p-4 rounded-lg text-left transition-all duration-200 flex items-center ${
                activeSection === section.id 
                  ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 text-blue-700 dark:text-blue-300' 
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{section.title}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
          {sections.find(s => s.id === activeSection)?.title}
        </h3>
        <div className="prose prose-blue max-w-none dark:prose-invert">
          {activeSection === 'overview' && (
            <div>
              <p className="mb-4">Welcome to LinkDAO! This guide will walk you through everything you need to know to get started with our Web3 social platform.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>No traditional account required - just connect your wallet</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Earn rewards through participation and staking</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Own your data and identity on the blockchain</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Participate in platform governance with LDAO tokens</span>
                </div>
              </div>
            </div>
          )}
          
          {activeSection === 'wallet' && (
            <div>
              <h4 className="font-semibold mb-3">Step-by-Step Wallet Connection</h4>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>Install MetaMask, Coinbase Wallet, or another Web3 wallet</li>
                <li>Create or import your wallet using the recovery phrase</li>
                <li>Click the "Connect Wallet" button on LinkDAO</li>
                <li>Approve the connection request in your wallet</li>
                <li>You're now connected and ready to explore!</li>
              </ol>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Security Tip:</strong> Always verify you're on the official LinkDAO website (https://linkdao.io) before connecting your wallet.
                </p>
              </div>
            </div>
          )}
          
          {activeSection === 'profile' && (
            <div>
              <h4 className="font-semibold mb-3">Building Your Profile</h4>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Upload a profile picture (recommended size: 400x400px)</li>
                <li>Write a compelling bio (160 characters max)</li>
                <li>Choose a display name that represents you</li>
                <li>Connect your social media accounts for verification</li>
                <li>Set up your notification preferences</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Your profile is stored on the blockchain and can't be censored or deleted by anyone except you.
              </p>
            </div>
          )}
          
          {activeSection === 'marketplace' && (
            <div>
              <h4 className="font-semibold mb-3">Navigating the Marketplace</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Buying Items</h5>
                  <ul className="list-disc list-inside text-sm ml-4 space-y-1">
                    <li>Browse categories or use the search function</li>
                    <li>Click on items to view details and seller information</li>
                    <li>Choose payment method (ETH, USDC, or other supported tokens)</li>
                    <li>Complete purchase through secure smart contract</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Selling Items</h5>
                  <ul className="list-disc list-inside text-sm ml-4 space-y-1">
                    <li>Click "Create Listing" in the marketplace</li>
                    <li>Upload photos and detailed description</li>
                    <li>Set price and choose payment methods</li>
                    <li>Optionally enable escrow protection</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {activeSection === 'governance' && (
            <div>
              <h4 className="font-semibold mb-3">Platform Governance</h4>
              <p className="mb-3">As a token holder, you have a voice in LinkDAO's future:</p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Earn LDAO tokens through participation and staking</li>
                <li>Vote on proposals that shape platform features</li>
                <li>Submit your own proposals for community consideration</li>
                <li>Delegate voting power to trusted community members</li>
              </ul>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Did you know?</strong> Every LDAO token equals one vote in platform decisions.
                </p>
              </div>
            </div>
          )}
          
          {activeSection === 'vaults' && (
            <div>
              <h4 className="font-semibold mb-3">Earning Through Vaults</h4>
              <p className="mb-3">Stake your tokens to earn passive income:</p>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>Navigate to the Vaults section in your dashboard</li>
                <li>Choose a vault that matches your risk tolerance</li>
                <li>Connect your wallet and approve the transaction</li>
                <li>Deposit tokens and start earning yield</li>
                <li>Monitor your earnings in real-time</li>
              </ol>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Vaults automatically compound your earnings and can be withdrawn at any time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const VideoTutorials = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Video className="w-6 h-6 text-red-500 mr-3" />
        Video Tutorials
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gray-200 dark:bg-gray-700 h-48 flex items-center justify-center relative cursor-pointer group">
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-40 transition-all">
              <Play className="w-12 h-12 text-white opacity-80 group-hover:opacity-100" />
            </div>
            <span className="text-gray-500 dark:text-gray-400">Tutorial Preview</span>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Connecting Your Wallet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Learn how to safely connect your Web3 wallet to LinkDAO</p>
            <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center">
              Watch Tutorial <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gray-200 dark:bg-gray-700 h-48 flex items-center justify-center relative cursor-pointer group">
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-40 transition-all">
              <Play className="w-12 h-12 text-white opacity-80 group-hover:opacity-100" />
            </div>
            <span className="text-gray-500 dark:text-gray-400">Tutorial Preview</span>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Using the Marketplace</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Complete guide to buying and selling on LinkDAO's marketplace</p>
            <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center">
              Watch Tutorial <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gray-200 dark:bg-gray-700 h-48 flex items-center justify-center relative cursor-pointer group">
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-40 transition-all">
              <Play className="w-12 h-12 text-white opacity-80 group-hover:opacity-100" />
            </div>
            <span className="text-gray-500 dark:text-gray-400">Tutorial Preview</span>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Governance Participation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">How to vote on proposals and influence platform development</p>
            <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center">
              Watch Tutorial <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="bg-gray-200 dark:bg-gray-700 h-48 flex items-center justify-center relative cursor-pointer group">
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-40 transition-all">
              <Play className="w-12 h-12 text-white opacity-80 group-hover:opacity-100" />
            </div>
            <span className="text-gray-500 dark:text-gray-400">Tutorial Preview</span>
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-2">Vault Deposits & Earnings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Maximize your earnings through strategic vault investments</p>
            <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center">
              Watch Tutorial <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const IllustratedGuides = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <FileText className="w-6 h-6 text-green-500 mr-3" />
        Illustrated Guides
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-l-4 border-blue-500 pl-4 py-2">
          <h3 className="font-semibold mb-2">Wallet Connection Guide</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Step-by-step screenshots showing the wallet connection process</p>
          <Link href="/support/guides/wallet-connection" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center">
            View Guide <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="border-l-4 border-purple-500 pl-4 py-2">
          <h3 className="font-semibold mb-2">Marketplace Walkthrough</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Complete visual guide to buying and selling items</p>
          <Link href="/support/guides/marketplace" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center">
            View Guide <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="border-l-4 border-green-500 pl-4 py-2">
          <h3 className="font-semibold mb-2">Governance Participation</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Visual guide to voting and proposal creation</p>
          <Link href="/support/guides/governance" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center">
            View Guide <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="border-l-4 border-yellow-500 pl-4 py-2">
          <h3 className="font-semibold mb-2">Vault Investment Guide</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Screenshots and explanations for vault deposits</p>
          <Link href="/support/guides/vaults" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center">
            View Guide <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );

  const QuickLinks = () => (
    <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl shadow-lg p-8 text-white">
      <h2 className="text-2xl font-bold mb-6">Quick Resources</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/support/faq" className="bg-white/10 hover:bg-white/20 rounded-lg p-6 transition-all block">
          <HelpCircle className="w-8 h-8 mb-3" />
          <h3 className="font-semibold mb-2">FAQ</h3>
          <p className="text-sm opacity-90">Answers to common questions</p>
        </Link>
        
        <Link href="/support/glossary" className="bg-white/10 hover:bg-white/20 rounded-lg p-6 transition-all block">
          <Book className="w-8 h-8 mb-3" />
          <h3 className="font-semibold mb-2">Glossary</h3>
          <p className="text-sm opacity-90">DeFi and Web3 terms explained</p>
        </Link>
        
        <Link href="/support/live-chat" className="bg-white/10 hover:bg-white/20 rounded-lg p-6 transition-all block">
          <MessageCircle className="w-8 h-8 mb-3" />
          <h3 className="font-semibold mb-2">Live Chat</h3>
          <p className="text-sm opacity-90">Get help from our support team</p>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Getting Started - LinkDAO</title>
        <meta name="description" content="Complete beginner's guide to LinkDAO - connect wallet, set up profile, explore marketplace, and participate in governance" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/support" className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-6 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Support Center
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to LinkDAO
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Your complete guide to getting started with Web3 social networking, marketplace trading, and decentralized governance
            </p>
          </div>

          <InteractiveGuide />
          <VideoTutorials />
          <IllustratedGuides />
          <QuickLinks />

          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Still have questions?</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/support/live-chat" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Live Chat Support
              </Link>
              <Link href="/support/contact" className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GettingStartedPage;
