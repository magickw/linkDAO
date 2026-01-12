import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Book, 
  Search, 
  Filter, 
  ArrowLeft,
  Clock,
  Users,
  Star,
  ChevronRight
} from 'lucide-react';
import UserGuideCard from '@/components/Support/UserGuideCard';

const UserGuides: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  const userGuides = [
    {
      title: 'Complete Beginner\'s Guide to LinkDAO',
      description: 'Everything you need to know to get started with LinkDAO, from wallet setup to your first post.',
      readTime: '15 min',
      difficulty: 'Beginner' as const,
      rating: 4.8,
      views: 12500,
      href: '/docs/getting-started',
      category: 'Getting Started'
    },
    {
      title: 'Wallet Connection Guide',
      description: 'Step-by-step illustrated guide to safely connecting your Web3 wallet to LinkDAO.',
      readTime: '12 min',
      difficulty: 'Beginner' as const,
      rating: 4.9,
      views: 15200,
      href: '/support/guides/wallet-connection',
      category: 'Wallet'
    },
    {
      title: 'Marketplace Complete Guide',
      description: 'Comprehensive guide to buying, selling, and navigating the LinkDAO marketplace safely.',
      readTime: '20 min',
      difficulty: 'Beginner' as const,
      rating: 4.8,
      views: 18400,
      href: '/support/guides/marketplace',
      category: 'Marketplace'
    },
    {
      title: 'LDAO Token Acquisition Guide',
      description: 'Step-by-step guide to acquiring LDAO tokens through direct purchase, DEX trading, and staking rewards.',
      readTime: '20 min',
      difficulty: 'Beginner' as const,
      rating: 4.7,
      views: 9800,
      href: '/support/guides/ldao-acquisition',
      category: 'LDAO'
    },
    {
      title: 'Advanced Staking Strategies',
      description: 'Maximize your LDAO token rewards with advanced staking techniques and best practices.',
      readTime: '25 min',
      difficulty: 'Advanced' as const,
      rating: 4.9,
      views: 5600,
      href: '/support/guides/advanced-staking',
      category: 'LDAO'
    },
    {
      title: 'Wallet Security Best Practices',
      description: 'Comprehensive guide to keeping your wallet and LDAO tokens secure from scams and threats.',
      readTime: '12 min',
      difficulty: 'Beginner' as const,
      rating: 4.9,
      views: 11200,
      href: '/support/guides/wallet-security',
      category: 'Wallet'
    },
    {
      title: 'Governance Participation Guide',
      description: 'Learn how to create and vote on proposals that shape the future of the LinkDAO platform.',
      readTime: '22 min',
      difficulty: 'Intermediate' as const,
      rating: 4.5,
      views: 4300,
      href: '/support/guides/governance',
      category: 'LDAO'
    },
    {
      title: 'Cross-Chain Bridge Tutorial',
      description: 'How to safely move LDAO tokens between different blockchain networks using cross-chain bridges.',
      readTime: '16 min',
      difficulty: 'Intermediate' as const,
      rating: 4.4,
      views: 3800,
      href: '/support/guides/cross-chain',
      category: 'LDAO'
    },
    {
      title: 'Troubleshooting Common Issues',
      description: 'Quick solutions to common problems with transactions, wallet connections, and platform features.',
      readTime: '10 min',
      difficulty: 'Beginner' as const,
      rating: 4.7,
      views: 15600,
      href: '/support/guides/troubleshooting',
      category: 'Technical'
    }
  ];

  const categories = ['all', 'Getting Started', 'Wallet', 'Marketplace', 'LDAO', 'Technical'];
  const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredGuides = userGuides.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || guide.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <>
      <Head>
        <title>User Guides - LinkDAO Support</title>
        <meta name="description" content="Step-by-step user guides for LDAO tokens, marketplace, wallet setup, and more" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/support" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Support
                </Link>
              </div>
              <div className="flex items-center">
                <Book className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">User Guides</h1>
              </div>
              <div></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">User Guides & Tutorials</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Step-by-step guides to help you master LinkDAO features and capabilities
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search guides and tutorials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {difficulties.map(difficulty => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty === 'all' ? 'All Levels' : difficulty}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Showing {filteredGuides.length} of {userGuides.length} guides
            </p>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Sort by:</span>
              <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700">
                <option>Most Popular</option>
                <option>Highest Rated</option>
                <option>Newest</option>
                <option>Alphabetical</option>
              </select>
            </div>
          </div>

          {/* User Guide Cards */}
          {filteredGuides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGuides.map((guide, index) => (
                <UserGuideCard key={index} {...guide} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No guides found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Try adjusting your search terms or filters
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Popular Topics */}
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Popular Topics</h2>
            <div className="flex flex-wrap gap-2">
              {['LDAO tokens', 'Staking', 'Marketplace', 'Wallet setup', 'Governance', 'Security', 'Troubleshooting', 'Cross-chain'].map((topic, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(topic)}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserGuides;