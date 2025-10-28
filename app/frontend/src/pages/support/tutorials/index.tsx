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
  ChevronRight,
  Play,
  Video,
  FileText,
  Zap,
  TrendingUp,
  Wallet,
  Shield
} from 'lucide-react';
import UserGuideCard from '@/components/Support/UserGuideCard';

const TutorialsIndexPage: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  const tutorials = [
    {
      title: 'Complete Beginner\'s Guide to LinkDAO',
      description: 'Everything you need to know to get started with LinkDAO, from wallet setup to your first post.',
      readTime: '15 min',
      difficulty: 'Beginner' as const,
      rating: 4.8,
      views: 12500,
      href: '/support/tutorials/first-ldao-purchase',
      category: 'Getting Started',
      type: 'guide'
    },
    {
      title: 'Your First LDAO Purchase',
      description: 'Step-by-step tutorial to buy your first LDAO tokens in under 5 minutes.',
      readTime: '5 min',
      difficulty: 'Beginner' as const,
      rating: 4.9,
      views: 15600,
      href: '/support/tutorials/first-ldao-purchase',
      category: 'LDAO Tokens',
      type: 'tutorial'
    },
    {
      title: 'Wallet Setup Tutorial',
      description: 'Complete guide to setting up your Web3 wallet for LDAO tokens.',
      readTime: '12 min',
      difficulty: 'Beginner' as const,
      rating: 4.7,
      views: 9800,
      href: '/support/tutorials/wallet-setup',
      category: 'Wallet',
      type: 'tutorial'
    },
    {
      title: 'LDAO Token Acquisition Guide',
      description: 'Step-by-step guide to acquiring LDAO tokens through direct purchase, DEX trading, and staking rewards.',
      readTime: '20 min',
      difficulty: 'Beginner' as const,
      rating: 4.7,
      views: 9800,
      href: '/support/guides/ldao-acquisition',
      category: 'LDAO Tokens',
      type: 'guide'
    },
    {
      title: 'Advanced Staking Strategies',
      description: 'Maximize your LDAO token rewards with advanced staking techniques and best practices.',
      readTime: '25 min',
      difficulty: 'Advanced' as const,
      rating: 4.9,
      views: 5600,
      href: '/support/guides/advanced-staking',
      category: 'LDAO Tokens',
      type: 'guide'
    },
    {
      title: 'Marketplace Seller Guide',
      description: 'Complete guide to selling digital and physical items on the LinkDAO marketplace with crypto payments.',
      readTime: '18 min',
      difficulty: 'Intermediate' as const,
      rating: 4.6,
      views: 7200,
      href: '/support/guides/marketplace-seller',
      category: 'Marketplace',
      type: 'guide'
    },
    {
      title: 'Wallet Security Best Practices',
      description: 'Comprehensive guide to keeping your wallet and LDAO tokens secure from scams and threats.',
      readTime: '12 min',
      difficulty: 'Beginner' as const,
      rating: 4.9,
      views: 11200,
      href: '/support/guides/wallet-security',
      category: 'Security',
      type: 'guide'
    },
    {
      title: 'Governance Participation Guide',
      description: 'Learn how to create and vote on proposals that shape the future of the LinkDAO platform.',
      readTime: '22 min',
      difficulty: 'Intermediate' as const,
      rating: 4.5,
      views: 4300,
      href: '/support/guides/governance',
      category: 'Governance',
      type: 'guide'
    },
    {
      title: 'Cross-Chain Bridge Tutorial',
      description: 'How to safely move LDAO tokens between different blockchain networks using cross-chain bridges.',
      readTime: '16 min',
      difficulty: 'Intermediate' as const,
      rating: 4.4,
      views: 3800,
      href: '/support/guides/cross-chain',
      category: 'LDAO Tokens',
      type: 'tutorial'
    },
    {
      title: 'Troubleshooting Common Issues',
      description: 'Quick solutions to common problems with transactions, wallet connections, and platform features.',
      readTime: '10 min',
      difficulty: 'Beginner' as const,
      rating: 4.7,
      views: 15600,
      href: '/support/guides/troubleshooting',
      category: 'Technical',
      type: 'guide'
    },
    {
      title: 'Creating Your First Post',
      description: 'Learn how to create and share your first post on the LinkDAO platform.',
      readTime: '8 min',
      difficulty: 'Beginner' as const,
      rating: 4.6,
      views: 8900,
      href: '/support/tutorials/first-post',
      category: 'Getting Started',
      type: 'tutorial'
    },
    {
      title: 'Understanding Tokenomics',
      description: 'Deep dive into the LDAO token economy, distribution, and utility.',
      readTime: '20 min',
      difficulty: 'Intermediate' as const,
      rating: 4.8,
      views: 6700,
      href: '/support/guides/tokenomics',
      category: 'LDAO Tokens',
      type: 'guide'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'Getting Started', label: 'Getting Started' },
    { id: 'LDAO Tokens', label: 'LDAO Tokens' },
    { id: 'Wallet', label: 'Wallet' },
    { id: 'Marketplace', label: 'Marketplace' },
    { id: 'Security', label: 'Security' },
    { id: 'Governance', label: 'Governance' },
    { id: 'Technical', label: 'Technical' }
  ];

  const difficulties = [
    { id: 'all', label: 'All Levels' },
    { id: 'Beginner', label: 'Beginner' },
    { id: 'Intermediate', label: 'Intermediate' },
    { id: 'Advanced', label: 'Advanced' }
  ];

  const types = [
    { id: 'all', label: 'All Types' },
    { id: 'guide', label: 'Guides' },
    { id: 'tutorial', label: 'Tutorials' }
  ];

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || tutorial.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || tutorial.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <>
      <Head>
        <title>Tutorials & Guides - LinkDAO Support</title>
        <meta name="description" content="Step-by-step tutorials and guides for LDAO tokens, marketplace, wallet setup, and more" />
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tutorials & Guides</h1>
              </div>
              <div></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tutorials & Guides</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Step-by-step tutorials to help you master LinkDAO features and capabilities
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tutorials and guides..."
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
                    <option key={category.id} value={category.id}>
                      {category.label}
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
                    <option key={difficulty.id} value={difficulty.id}>
                      {difficulty.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Showing {filteredTutorials.length} of {tutorials.length} tutorials
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

          {/* Tutorial Cards */}
          {filteredTutorials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTutorials.map((tutorial, index) => (
                <UserGuideCard key={index} {...tutorial} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No tutorials found
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

          {/* Learning Paths */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Learning Paths</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Beginner Path */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 dark:text-green-400 font-bold">1</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Beginner Path</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Start your journey with LinkDAO from the basics
                </p>
                <div className="space-y-4">
                  {tutorials
                    .filter(t => t.difficulty === 'Beginner')
                    .slice(0, 3)
                    .map((tutorial, index) => (
                      <Link 
                        key={index} 
                        href={tutorial.href}
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {tutorial.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tutorial.readTime}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </Link>
                    ))
                  }
                </div>
                <Link 
                  href="/support/tutorials/beginner-path" 
                  className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View full path
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {/* Intermediate Path */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mr-3">
                    <span className="text-yellow-600 dark:text-yellow-400 font-bold">2</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Intermediate Path</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Take your skills to the next level with advanced features
                </p>
                <div className="space-y-4">
                  {tutorials
                    .filter(t => t.difficulty === 'Intermediate')
                    .slice(0, 3)
                    .map((tutorial, index) => (
                      <Link 
                        key={index} 
                        href={tutorial.href}
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {tutorial.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tutorial.readTime}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </Link>
                    ))
                  }
                </div>
                <Link 
                  href="/support/tutorials/intermediate-path" 
                  className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View full path
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {/* Advanced Path */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3">
                    <span className="text-red-600 dark:text-red-400 font-bold">3</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Advanced Path</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Master the platform with expert-level knowledge
                </p>
                <div className="space-y-4">
                  {tutorials
                    .filter(t => t.difficulty === 'Advanced')
                    .slice(0, 3)
                    .map((tutorial, index) => (
                      <Link 
                        key={index} 
                        href={tutorial.href}
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {tutorial.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tutorial.readTime}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </Link>
                    ))
                  }
                </div>
                <Link 
                  href="/support/tutorials/advanced-path" 
                  className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View full path
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>

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

export default TutorialsIndexPage;