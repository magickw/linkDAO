import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Search, 
  MessageCircle, 
  Book, 
  Video, 
  Mail, 
  Phone, 
  Clock, 
  CheckCircle, 
  Award, 
  Shield, 
  Users, 
  Zap, 
  ChevronRight,
  HelpCircle,
  TrendingUp,
  FileText,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import SupportDocuments from '@/components/Support/SupportDocuments';
import LDAOSupportCenter from '@/components/Support/LDAOSupportCenter';
import UserGuideCard from '@/components/Support/UserGuideCard';

const SupportPage: NextPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const supportCategories = [
    { id: 'all', name: 'All Topics', icon: HelpCircle },
    { id: 'tokens', name: 'LDAO Tokens', icon: Award },
    { id: 'marketplace', name: 'Marketplace', icon: TrendingUp },
    { id: 'wallet', name: 'Wallet', icon: Shield },
    { id: 'governance', name: 'Governance', icon: Users },
    { id: 'technical', name: 'Technical', icon: Zap },
  ];

  const supportResources = [
    {
      id: 'getting-started',
      title: 'Getting Started with LinkDAO',
      description: 'Complete beginner\'s guide to Web3 social networking',
      category: 'all',
      icon: Lightbulb,
      href: '/docs/getting-started',
      priority: 'high'
    },
    {
      id: 'ldao-guide',
      title: 'LDAO Token Acquisition Guide',
      description: 'Step-by-step guide to acquiring and using LDAO tokens',
      category: 'tokens',
      icon: Award,
      href: '/docs/ldao-token-guide',
      priority: 'high'
    },
    {
      id: 'staking',
      title: 'Staking LDAO Tokens',
      description: 'How to stake your tokens and earn rewards',
      category: 'tokens',
      icon: TrendingUp,
      href: '/docs/staking-guide',
      priority: 'medium'
    },
    {
      id: 'marketplace',
      title: 'Marketplace User Guide',
      description: 'Buying, selling, and navigating the Web3 marketplace',
      category: 'marketplace',
      icon: TrendingUp,
      href: '/docs/marketplace-guide',
      priority: 'high'
    },
    {
      id: 'wallet-security',
      title: 'Wallet Security Best Practices',
      description: 'How to keep your wallet and assets safe',
      category: 'wallet',
      icon: Shield,
      href: '/docs/wallet-security',
      priority: 'high'
    },
    {
      id: 'governance',
      title: 'Participating in Governance',
      description: 'How to create and vote on proposals',
      category: 'governance',
      icon: Users,
      href: '/docs/governance-guide',
      priority: 'medium'
    },
    {
      id: 'troubleshooting',
      title: 'Common Issues & Solutions',
      description: 'Troubleshooting guide for frequent problems',
      category: 'technical',
      icon: AlertCircle,
      href: '/docs/troubleshooting',
      priority: 'high'
    },
    {
      id: 'api-docs',
      title: 'API Documentation',
      description: 'Developer documentation for LinkDAO APIs',
      category: 'technical',
      icon: FileText,
      href: '/docs/api',
      priority: 'low'
    }
  ];

  const filteredResources = supportResources.filter(resource => {
    const matchesCategory = activeCategory === 'all' || resource.category === activeCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const faqItems = [
    {
      question: "How do I acquire LDAO tokens?",
      answer: "You can acquire LDAO tokens through direct purchase, decentralized exchanges, staking rewards, or our Earn-to-Own program. Check our comprehensive guide for detailed steps.",
      category: "tokens"
    },
    {
      question: "Is my wallet secure on LinkDAO?",
      answer: "Yes, LinkDAO uses industry-standard security practices. We never store your private keys, and all transactions require your direct approval through your wallet provider.",
      category: "wallet"
    },
    {
      question: "How do I list items on the marketplace?",
      answer: "Connect your wallet, navigate to the marketplace section, and follow the listing creation wizard. You can list both digital and physical items with various payment options.",
      category: "marketplace"
    },
    {
      question: "How does governance work?",
      answer: "LDAO token holders can create and vote on proposals that shape the platform's future. Each token represents one vote, and proposals are executed automatically through smart contracts.",
      category: "governance"
    }
  ];

  return (
    <>
      <Head>
        <title>Support Center - LinkDAO</title>
        <meta name="description" content="Get help with LDAO tokens, marketplace features, and platform support" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">LinkDAO Support Center</h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8">
                Get help with LDAO tokens, marketplace features, and everything Web3 social
              </p>
              
              <div className="max-w-2xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 md:-mt-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              href="/support/live-chat" 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Live Chat</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Get instant help</p>
              <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                <Zap className="w-3 h-3 mr-1" />
                Available 24/7 • 2 min avg
              </div>
            </Link>

            <Link 
              href="/docs" 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
            >
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Book className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Documentation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Complete guides</p>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                50+ articles
              </div>
            </Link>

            <Link 
              href="/tutorials" 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Video Tutorials</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Step-by-step guides</p>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                20+ videos
              </div>
            </Link>

            <a 
              href="mailto:support@linkdao.io" 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
            >
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Email Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Detailed assistance</p>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                4-hour response
              </div>
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Categories</h2>
                <div className="space-y-2">
                  {supportCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                          activeCategory === category.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        <span className="font-medium">{category.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Contact Support</h3>
                  <div className="space-y-4">
                    <a 
                      href="mailto:support@linkdao.io" 
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Email</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">4-hour response</div>
                      </div>
                    </a>
                    <a 
                      href="tel:+1800WEB3HELP" 
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Phone</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">+1-800-WEB3-HELP</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeCategory === 'all' ? 'All Help Articles' : supportCategories.find(c => c.id === activeCategory)?.name}
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredResources.length} articles
                  </div>
                </div>

                {filteredResources.length === 0 ? (
                  <div className="text-center py-12">
                    <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No articles found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Try a different search or category
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('all');
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredResources.map((resource) => {
                      const Icon = resource.icon;
                      return (
                        <Link
                          key={resource.id}
                          href={resource.href}
                          className="block group border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700"
                        >
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4 flex-shrink-0 group-hover:scale-105 transition-transform">
                              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {resource.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {resource.description}
                              </p>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <span className={`px-2 py-1 rounded-full ${
                                  resource.priority === 'high' 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                    : resource.priority === 'medium' 
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {resource.priority.charAt(0).toUpperCase() + resource.priority.slice(1)} Priority
                                </span>
                                <ChevronRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FAQ Section */}
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                  {faqItems.map((faq, index) => (
                    <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 last:pb-0">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link 
                    href="/support/faq" 
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    View all FAQs
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
              
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Can't find what you're looking for?</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                    Our support team is here to help. Browse our FAQ or contact us directly for personalized assistance.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link
                      href="/support/faq"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <HelpCircle className="w-5 h-5 mr-2" />
                      Browse FAQ
                    </Link>
                    <Link
                      href="/support/contact"
                      className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      Contact Support
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupportPage;