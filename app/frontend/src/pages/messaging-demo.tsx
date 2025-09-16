/**
 * Messaging Demo Page - Showcase of wallet-to-wallet messaging features
 * Standalone page to demonstrate the comprehensive messaging system
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Shield, 
  Zap, 
  Globe, 
  Coins,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  User,
  Search
} from 'lucide-react';
import { GlassPanel, Button } from '@/design-system';
import { MessagingWidget } from '@/components/Messaging';

export default function MessagingDemoPage() {
  const { isConnected } = useAccount();

  const features = [
    {
      icon: <Shield size={24} className="text-green-400" />,
      title: 'End-to-End Encryption',
      description: 'Messages are encrypted with AES-GCM for maximum security',
      status: 'active'
    },
    {
      icon: <Globe size={24} className="text-blue-400" />,
      title: 'Multichain Support',
      description: 'Message any EVM or SVM address, including ENS names',
      status: 'active'
    },
    {
      icon: <Zap size={24} className="text-yellow-400" />,
      title: 'Real-time Messaging',
      description: 'Instant delivery with read receipts and typing indicators',
      status: 'active'
    },
    {
      icon: <Coins size={24} className="text-purple-400" />,
      title: 'NFT Negotiation Bot',
      description: 'AI-powered bot for seamless NFT trading conversations',
      status: 'active'
    },
    {
      icon: <User size={24} className="text-indigo-400" />,
      title: 'Address Blocking',
      description: 'Control who can message you with advanced filtering',
      status: 'active'
    },
    {
      icon: <MessageCircle size={24} className="text-pink-400" />,
      title: 'Multi-device Sync',
      description: 'Access your conversations from any device',
      status: 'active'
    }
  ];

  return (
    <>
      <Head>
        <title>Wallet-to-Wallet Messaging Demo - LinkDAO</title>
        <meta name="description" content="Experience secure, encrypted Web3 messaging on LinkDAO" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        {/* Hero Section */}
        <div className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                  Wallet-to-Wallet
                  <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Messaging
                  </span>
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                  Secure, encrypted messaging between Web3 addresses. Message any EVM or SVM wallet,
                  trade NFTs with AI assistance, and maintain privacy with end-to-end encryption.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link href="/messaging">
                  <Button 
                    variant="primary"
                    className="px-8 py-3 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <MessageCircle size={20} className="mr-2" />
                    Open Messages
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
                </Link>
                
                <Link href="/social">
                  <Button variant="outline" className="px-8 py-3 text-lg border-white/20 text-white hover:bg-white/10">
                    Explore LinkDAO
                    <ExternalLink size={20} className="ml-2" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Comprehensive Web3 Messaging
            </h2>
            <p className="text-gray-300 text-lg">
              Everything you need for secure communication in the decentralized web
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <GlassPanel className="p-6 h-full">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        {feature.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {feature.title}
                        </h3>
                        <CheckCircle size={16} className="text-green-400" />
                      </div>
                      <p className="text-gray-300 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Demo Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Try It Now
            </h2>
            <p className="text-gray-300 text-lg">
              {isConnected 
                ? "Click the floating message button or navigate to the dedicated messaging page"
                : "Connect your wallet to start messaging other Web3 users instantly"
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">
                Multiple Access Points
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-400 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Floating Widget</h4>
                    <p className="text-gray-300 text-sm">
                      The floating message button is available on every page when you're connected
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-purple-400 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Navigation Menu</h4>
                    <p className="text-gray-300 text-sm">
                      Access messages through the main navigation or sidebar
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-400 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Dedicated Page</h4>
                    <p className="text-gray-300 text-sm">
                      Full-screen messaging experience at /messaging
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/messaging">
                  <Button 
                    variant="primary"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <MessageCircle size={20} className="mr-2" />
                    Open Full Messaging Interface
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gray-800/50 rounded-lg p-8 backdrop-blur-xl">
                <h4 className="text-lg font-semibold text-white mb-4">
                  Supported Address Types
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">⟁</span>
                    <div>
                      <div className="text-white font-medium">EVM Addresses</div>
                      <div className="text-gray-400 text-sm">Ethereum, Polygon, BSC, etc.</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">◎</span>
                    <div>
                      <div className="text-white font-medium">SVM Addresses</div>
                      <div className="text-gray-400 text-sm">Solana ecosystem</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <div className="text-white font-medium">ENS Names</div>
                      <div className="text-gray-400 text-sm">vitalik.eth, etc.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Start Messaging?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Join the future of Web3 communication with secure, encrypted messaging
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button 
                  variant="primary"
                  className="px-8 py-3 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Get Started with LinkDAO
                </Button>
              </Link>
              
              <Link href="/dao">
                <Button variant="outline" className="px-8 py-3 text-lg border-white/20 text-white hover:bg-white/10">
                  Explore Communities
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Show MessagingWidget if connected */}
      {isConnected && <MessagingWidget />}
    </>
  );
}