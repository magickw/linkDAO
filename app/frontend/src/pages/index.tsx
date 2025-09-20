import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DashboardRightSidebar from '@/components/DashboardRightSidebar';
import FeedView from '@/components/FeedView';
import CommunityView from '@/components/CommunityView';
import NavigationSidebar from '@/components/NavigationSidebar';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import PostCreationModal from '@/components/PostCreationModal';
import BottomSheet from '@/components/BottomSheet';
import Link from 'next/link';
import { Plus, Send, Vote, TrendingUp, Users, MessageCircle, Heart } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Mock profile data - only used as fallback
const mockProfiles: Record<string, any> = {
  '0x1234567890123456789012345678901234567890': {
    handle: 'alexj',
    ens: 'alex.eth',
    avatarCid: 'https://placehold.co/40',
    reputationScore: 750,
    reputationTier: 'Expert',
    verified: true
  },
  '0x2345678901234567890123456789012345678901': {
    handle: 'samc',
    ens: 'sam.eth',
    avatarCid: 'https://placehold.co/40',
    reputationScore: 420,
    reputationTier: 'Contributor',
    verified: false
  },
  '0x3456789012345678901234567890123456789012': {
    handle: 'taylorr',
    ens: 'taylor.eth',
    avatarCid: 'https://placehold.co/40',
    reputationScore: 890,
    reputationTier: 'Expert',
    verified: true
  },
};

// Mock posts data for the feed
const mockPosts = [
  {
    id: '1',
    author: '0x1234567890123456789012345678901234567890',
    dao: 'ethereum-builders',
    title: 'New Yield Farming Strategy on Arbitrum',
    contentCid: 'Just deployed a new yield farming strategy on Arbitrum. Got 15% APY so far! What do you think about the risk profile?',
    mediaCids: [],
    tags: ['defi', 'yield', 'arbitrum'],
    createdAt: new Date(Date.now() - 3600000),
    onchainRef: '0x1234...5678',
    reputationScore: 750,
    commentCount: 24,
    stakedValue: 120
  },
  {
    id: '2',
    author: '0x2345678901234567890123456789012345678901',
    dao: 'nft-collectors',
    title: 'My Latest NFT Collection Drop',
    contentCid: 'Check out my latest NFT collection drop! Each piece represents a different DeFi protocol. Feedback welcome.',
    mediaCids: ['https://placehold.co/300'],
    tags: ['nft', 'art', 'defi'],
    createdAt: new Date(Date.now() - 7200000),
    onchainRef: '0x2345...6789',
    reputationScore: 420,
    commentCount: 18,
    stakedValue: 85
  },
  {
    id: '3',
    author: '0x3456789012345678901234567890123456789012',
    dao: 'dao-governance',
    title: 'Proposal: Quadratic Voting Implementation',
    contentCid: 'Proposal for implementing quadratic voting for smaller governance proposals to increase participation. Thoughts?',
    mediaCids: [],
    tags: ['governance', 'proposal', 'dao'],
    createdAt: new Date(Date.now() - 10800000),
    onchainRef: '0x3456...7890',
    reputationScore: 890,
    commentCount: 56,
    stakedValue: 210
  }
];

export default function Home() {
  const { address, isConnected, balance } = useWeb3();
  const { addToast } = useToast();
  const { feed, isLoading: isFeedLoading } = useFeed(address);
  const { createPost, isLoading: isCreatingPost } = useCreatePost();
  const { data: profile } = useProfile(address);
  const { navigationState } = useNavigation();
  
  const [mounted, setMounted] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>(mockProfiles);
  const [posts, setPosts] = useState(mockPosts);
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use real feed data if available, otherwise fall back to mock data
  const displayPosts = feed && feed.length > 0 ? feed : posts;

  // Handle tipping
  const handleTip = async (postId: string, amount: string, token: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }
    
    try {
      console.log(`Tipping ${amount} ${token} on post ${postId}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      addToast(`Successfully tipped ${amount} ${token}!`, 'success');
    } catch (error) {
      console.error('Error tipping:', error);
      addToast('Failed to send tip. Please try again.', 'error');
    }
  };

  // Handle voting
  const handleVote = async (postId: string, voteType: 'up' | 'down', amount: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    try {
      console.log(`Voting ${voteType} on post ${postId} with ${amount} tokens`);
      await new Promise(resolve => setTimeout(resolve, 500));
      addToast(`${voteType === 'up' ? 'Upvoted' : 'Downvoted'} successfully!`, 'success');
    } catch (error) {
      console.error('Error voting:', error);
      addToast(`Failed to ${voteType} vote. Please try again.`, 'error');
    }
  };

  // If not connected, show enhanced landing page
  if (!mounted || !isConnected) {
    const scrollToFeatures = () => {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
      <Layout title="LinkDAO - The Web3 Social Network">
        {/* Hero Section */}
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background with glassmorphism shapes */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
            <div className="absolute inset-0 bg-black/20"></div>
            {/* Floating glassmorphism shapes */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 backdrop-blur-lg rounded-full animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 backdrop-blur-lg rounded-full animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/15 backdrop-blur-lg rounded-full animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10 text-center py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
              LinkDAO — The Web3 Social Network where Identity, Money, and Governance are Yours.
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto">
              Join the future of social networking. Own your data, earn from your content, and shape the platform through decentralized governance.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <ConnectButton.Custom>
                {({ openConnectModal, authenticationStatus, mounted: rainbowMounted }) => {
                  const ready = rainbowMounted && authenticationStatus !== 'loading';
                  return (
                    <button
                      onClick={openConnectModal}
                      disabled={!ready}
                      className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-white/20 backdrop-blur-lg border border-white/30 hover:bg-white/30 transition-all duration-300 disabled:opacity-50"
                    >
                      🚀 Get Started
                    </button>
                  );
                }}
              </ConnectButton.Custom>
              
              <button
                onClick={scrollToFeatures}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-transparent border-2 border-white/50 hover:bg-white/10 transition-all duration-300"
              >
                📖 Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Key Features Grid */}
        <div id="features" className="py-24 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose LinkDAO?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Experience the next generation of social networking with true ownership and decentralized governance.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="group p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Social</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Post, follow, and build your own Web3-native community without ads or censorship. Your content, your rules.
                </p>
              </div>
              
              <div className="group p-8 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Wallet</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Send and receive payments in ETH and stablecoins directly inside the platform. Seamless crypto transactions.
                </p>
              </div>
              
              <div className="group p-8 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Vote className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Governance</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Create and vote on proposals that shape the community and treasury. True democratic participation.
                </p>
              </div>
              
              <div className="group p-8 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Marketplace</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Buy & sell digital + physical goods with crypto and NFT-based trust certificates. Secure transactions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why LinkDAO Section */}
        <div className="py-24 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Own Your Digital Life
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Break free from traditional social media limitations and embrace true digital ownership.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🔐</span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Own Your Identity</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  No email logins, just your wallet. Your identity is truly yours, portable across the entire Web3 ecosystem.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🌍</span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Global Payments</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Crypto-native, borderless, and instant. Send value to anyone, anywhere, without traditional banking limitations.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🗳️</span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Community-Driven</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  You decide how the platform evolves. Participate in governance and shape the future of social networking.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="py-24 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Get Started in Minutes
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Join LinkDAO in four simple steps and start experiencing the future of social networking.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Connect Wallet</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Use MetaMask, WalletConnect, or any Web3 wallet to get started instantly.
                </p>
              </div>
              
              <div className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-purple-500 to-pink-600"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Create Profile</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Set up your decentralized profile with ENS domains and IPFS storage.
                </p>
              </div>
              
              <div className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-pink-500 to-orange-600"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Join Communities</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Discover DAOs, list products, and connect with like-minded individuals.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">4</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Participate in DAO</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Vote on proposals, earn rewards, and help shape the platform's future.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Transparency Section */}
        <div className="py-24 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Built for Trust & Transparency
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Our Web3 marketplace ensures secure, transparent transactions with cutting-edge blockchain technology.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-6">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">On-chain Escrow</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Smart contract escrow ensures safe payments. Funds are only released when both parties are satisfied.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-6">
                  <span className="text-2xl">🎫</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">NFT Receipts</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Every purchase generates an NFT receipt for digital ownership and proof of authenticity.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-6">
                  <span className="text-2xl">🏛️</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Transparent DAO</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  All governance decisions are recorded on-chain. Complete transparency in platform evolution.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Community & Growth Section */}
        <div className="py-24 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Join Our Growing Community
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Be part of the Web3 social revolution. Connect with innovators, creators, and builders.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">1,200+</div>
                <div className="text-gray-600 dark:text-gray-300">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">300+</div>
                <div className="text-gray-600 dark:text-gray-300">Marketplace Listings</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">50+</div>
                <div className="text-gray-600 dark:text-gray-300">Active DAOs</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">$2M+</div>
                <div className="text-gray-600 dark:text-gray-300">Volume Traded</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex flex-col sm:flex-row justify-center gap-6 mb-8">
                <a
                  href="https://discord.gg/linkdao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Join our Discord
                </a>
                <a
                  href="https://twitter.com/linkdao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Follow us on X
                </a>
              </div>
              
              <ConnectButton.Custom>
                {({ openConnectModal, authenticationStatus, mounted: rainbowMounted }) => {
                  const ready = rainbowMounted && authenticationStatus !== 'loading';
                  return (
                    <button
                      onClick={openConnectModal}
                      disabled={!ready}
                      className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
                    >
                      🚀 Start Your Web3 Journey
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Connected user experience - Main Social Dashboard/Feed
  return (
    <Layout title="LinkDAO - Home">
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Left Sidebar - Navigation */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <NavigationSidebar className="h-full" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top User Overview Section */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="max-w-4xl mx-auto">
              {/* User Profile Summary */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                      {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Welcome back, {(profile as any)?.handle || (profile as any)?.ens || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      {balance} ETH • Reputation: {(profile as any)?.reputationScore || 0}
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex space-x-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">42</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">128</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Following</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">89</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Followers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">NFTs</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </button>
                <button
                  onClick={() => setIsWalletSheetOpen(true)}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Tokens
                </button>
                <Link
                  href="/governance"
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Vote className="w-4 h-4 mr-2" />
                  Create Proposal
                </Link>
              </div>
            </div>
          </div>

          {/* Main Feed Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Center Feed */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto py-6 px-4">
                {/* Post Composer */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
                    </div>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex-1 text-left px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      What's on your mind?
                    </button>
                  </div>
                </div>

                {/* Feed Tabs */}
                <div className="flex space-x-1 mb-6 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
                  {(['hot', 'new', 'top', 'rising'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Feed Content */}
                {navigationState.activeView === 'community' && navigationState.activeCommunity ? (
                  <CommunityView communityId={navigationState.activeCommunity} />
                ) : (
                  <div className="space-y-6">
                    {isFeedLoading ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-gray-600 dark:text-gray-300">Loading feed...</p>
                      </div>
                    ) : displayPosts.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                        <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Be the first to share something with the community!
                        </p>
                      </div>
                    ) : (
                      displayPosts.map((post) => {
                        const authorProfile = profiles[post.author] || { 
                          handle: 'Unknown', 
                          ens: '', 
                          avatarCid: 'https://placehold.co/40' 
                        };
                        
                        return (
                          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                            <div className="p-6">
                              {/* Post Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {authorProfile.handle.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {authorProfile.handle}
                                      </span>
                                      {authorProfile.verified && (
                                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                      <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {authorProfile.ens}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                      <span>{(post as any).dao || 'general'}</span>
                                      <span>•</span>
                                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Rep: {authorProfile.reputationScore}
                                  </span>
                                </div>
                              </div>

                              {/* Post Content */}
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                  {(post as any).title || 'Untitled Post'}
                                </h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                  {post.contentCid}
                                </p>
                                
                                {/* Media */}
                                {post.mediaCids && post.mediaCids.length > 0 && (
                                  <div className="mt-4">
                                    <img 
                                      src={post.mediaCids[0]} 
                                      alt="Post media" 
                                      className="rounded-lg max-w-full h-auto"
                                    />
                                  </div>
                                )}

                                {/* Tags */}
                                {post.tags && post.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {post.tags.map((tag, index) => (
                                      <span 
                                        key={index}
                                        className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 text-xs rounded-full"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Post Actions */}
                              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-6">
                                  <button 
                                    onClick={() => handleVote(post.id, 'up', 1)}
                                    className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors"
                                  >
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-sm">Upvote</span>
                                  </button>
                                  <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="text-sm">{(post as any).commentCount || 0}</span>
                                  </button>
                                  <button 
                                    onClick={() => handleTip(post.id, '0.01', 'ETH')}
                                    className="flex items-center space-x-2 text-gray-500 hover:text-yellow-600 transition-colors"
                                  >
                                    <Heart className="w-4 h-4" />
                                    <span className="text-sm">Tip</span>
                                  </button>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {(post as any).stakedValue || 0} tokens staked
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Activity & Notifications */}
            <div className="hidden xl:flex xl:flex-shrink-0">
              <div className="flex flex-col w-80">
                <DashboardRightSidebar />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PostCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (postData: CreatePostInput) => {
          try {
            await createPost(postData);
            setIsModalOpen(false);
            addToast('Post created successfully!', 'success');
          } catch (error) {
            console.error('Error creating post:', error);
            addToast('Failed to create post', 'error');
          }
        }}
        isLoading={isCreatingPost}
      />

      <BottomSheet
        isOpen={isWalletSheetOpen}
        onClose={() => setIsWalletSheetOpen(false)}
        title="Send Tokens"
      >
        <div className="p-4">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Wallet-to-wallet token sending feature coming soon!
          </p>
          <button
            onClick={() => setIsWalletSheetOpen(false)}
            className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </BottomSheet>
    </Layout>
  );
}