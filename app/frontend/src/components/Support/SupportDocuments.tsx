import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Video, 
  FileText, 
  Download, 
  ExternalLink,
  MessageCircle,
  Users,
  HelpCircle,
  Clock,
  Star,
  Shield,
  Zap,
  X
} from 'lucide-react';
import useDocumentNavigation from '../../hooks/useDocumentNavigation';
import ScrollProgressIndicator from './ScrollProgressIndicator';
import DocumentNavigation from './DocumentNavigation';
import RelatedDocumentsSuggestions from './RelatedDocumentsSuggestions';

interface SupportDocument {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'security' | 'troubleshooting' | 'advanced' | 'ldao' | 'trading' | 'wallet' | 'marketplace';
  type: 'guide' | 'video' | 'faq' | 'tutorial';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: string;
  popularity: number;
  views: number;
  lastUpdated: string;
  href?: string;
  path?: string;
  tags: string[];
  icon?: React.ReactNode;
}

const SupportDocuments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [showScrollProgress, setShowScrollProgress] = useState(false);

  // Document navigation hook
  const {
    currentDocument,
    previousDocument,
    nextDocument,
    relatedDocuments,
    scrollProgress,
    navigateToDocument,
    goBack,
    canGoBack
  } = useDocumentNavigation(supportDocuments, selectedDocument, selectedCategory);

  // Enhanced document structure aligned with spec requirements
  const supportDocuments: SupportDocument[] = [
    {
      id: 'beginners-guide',
      title: 'Complete Beginner\'s Guide',
      description: 'Everything you need to know to get started with LDAO tokens, from wallet setup to your first purchase.',
      category: 'getting-started',
      type: 'guide',
      difficulty: 'beginner',
      readTime: '15 min',
      popularity: 95,
      views: 12500,
      lastUpdated: '2025-10-06',
      path: '/docs/support/beginners-guide.md',
      icon: <BookOpen className="w-5 h-5" />,
      tags: ['wallet', 'setup', 'purchase', 'basics']
    },
    {
      id: 'troubleshooting-guide',
      title: 'Troubleshooting Guide',
      description: 'Quick solutions to common issues with transactions, wallet connections, and platform features.',
      category: 'troubleshooting',
      type: 'guide',
      difficulty: 'beginner',
      readTime: '10 min',
      popularity: 88,
      views: 8900,
      lastUpdated: '2025-10-07',
      path: '/docs/support/troubleshooting-guide.md',
      icon: <HelpCircle className="w-5 h-5" />,
      tags: ['problems', 'solutions', 'help', 'issues']
    },
    {
      id: 'security-guide',
      title: 'Security Best Practices',
      description: 'Comprehensive guide to keeping your LDAO tokens and account secure from scams and threats.',
      category: 'security',
      type: 'guide',
      difficulty: 'intermediate',
      readTime: '20 min',
      popularity: 92,
      views: 5600,
      lastUpdated: '2025-10-07',
      path: '/docs/support/security-guide.md',
      icon: <Shield className="w-5 h-5" />,
      tags: ['security', 'safety', 'scams', 'protection']
    },
    {
      id: 'quick-faq',
      title: 'Quick FAQ',
      description: 'Fast answers to the most frequently asked questions about LDAO tokens and platform features.',
      category: 'getting-started',
      type: 'faq',
      difficulty: 'beginner',
      readTime: '5 min',
      popularity: 90,
      views: 7200,
      lastUpdated: '2025-10-08',
      path: '/docs/support/quick-faq.md',
      icon: <Zap className="w-5 h-5" />,
      tags: ['faq', 'questions', 'answers', 'quick']
    },
    {
      id: 'dex-trading',
      title: 'DEX Trading Guide',
      description: 'Advanced guide to trading LDAO tokens on decentralized exchanges with best practices.',
      category: 'advanced',
      type: 'guide',
      difficulty: 'advanced',
      readTime: '25 min',
      popularity: 75,
      views: 15600,
      lastUpdated: '2025-10-09',
      href: '/support/guides/dex-trading',
      tags: ['dex', 'trading', 'uniswap', 'advanced']
    },
    {
      id: 'wallet-setup',
      title: 'Wallet Setup Tutorial',
      description: 'Step-by-step guide to setting up your Web3 wallet for LDAO tokens.',
      category: 'wallet',
      type: 'tutorial',
      difficulty: 'beginner',
      readTime: '12 min',
      popularity: 85,
      views: 9800,
      lastUpdated: '2025-10-09',
      href: '/support/tutorials/wallet-setup',
      tags: ['wallet', 'metamask', 'setup', 'tutorial']
    },
    {
      id: 'earn-ldao',
      title: 'Earn LDAO Tokens',
      description: 'Learn multiple ways to earn LDAO tokens through platform activities and community participation.',
      category: 'ldao',
      type: 'guide',
      difficulty: 'beginner',
      readTime: '18 min',
      popularity: 80,
      views: 11200,
      lastUpdated: '2025-10-09',
      href: '/support/guides/earn-ldao',
      tags: ['earn', 'rewards', 'community', 'tokens']
    },
    {
      id: 'bridge-tutorial',
      title: 'Cross-Chain Bridge',
      description: 'How to move LDAO tokens between different blockchain networks safely.',
      category: 'advanced',
      type: 'tutorial',
      difficulty: 'intermediate',
      readTime: '20 min',
      popularity: 70,
      views: 4300,
      lastUpdated: '2025-10-09',
      href: '/support/tutorials/bridge',
      tags: ['bridge', 'cross-chain', 'networks', 'transfer']
    }
  ];

  // Enhanced categories aligned with spec
  const categories = [
    { id: 'all', label: 'All Documents', count: supportDocuments.length },
    { id: 'getting-started', label: 'Getting Started', count: supportDocuments.filter(doc => doc.category === 'getting-started').length },
    { id: 'security', label: 'Security', count: supportDocuments.filter(doc => doc.category === 'security').length },
    { id: 'troubleshooting', label: 'Troubleshooting', count: supportDocuments.filter(doc => doc.category === 'troubleshooting').length },
    { id: 'advanced', label: 'Advanced', count: supportDocuments.filter(doc => doc.category === 'advanced').length },
    { id: 'ldao', label: 'LDAO Tokens', count: supportDocuments.filter(doc => doc.category === 'ldao').length },
    { id: 'wallet', label: 'Wallet', count: supportDocuments.filter(doc => doc.category === 'wallet').length }
  ];
  
  const types = ['all', 'guide', 'tutorial', 'faq', 'video'];

  // Document loading function (spec requirement 1.2)
  const loadDocument = async (documentPath: string) => {
    try {
      const response = await fetch(documentPath);
      const content = await response.text();
      setDocumentContent(content);
    } catch (error) {
      console.error('Failed to load document:', error);
      setDocumentContent('Failed to load document content. Please try again later.');
    }
  };

  // Handle document selection with navigation tracking
  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocument(documentId);
    navigateToDocument(documentId);
    setShowScrollProgress(true);
    
    const doc = supportDocuments.find(d => d.id === documentId);
    if (doc && doc.path) {
      loadDocument(doc.path);
    }
  };

  // Handle navigation back
  const handleGoBack = () => {
    const previousId = goBack();
    if (previousId) {
      setSelectedDocument(previousId);
      const doc = supportDocuments.find(d => d.id === previousId);
      if (doc && doc.path) {
        loadDocument(doc.path);
      }
    }
  };

  // Close document viewer
  const closeDocumentViewer = () => {
    setSelectedDocument(null);
    setDocumentContent('');
    setShowScrollProgress(false);
  };

  // Enhanced filtering with popularity weighting (spec requirement 2.1, 2.4)
  const filteredDocuments = supportDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  }).sort((a, b) => {
    // Sort by popularity and relevance (spec requirement 2.4)
    if (searchQuery) {
      const aRelevance = calculateRelevance(a, searchQuery);
      const bRelevance = calculateRelevance(b, searchQuery);
      return bRelevance - aRelevance;
    }
    return b.popularity - a.popularity;
  });

  // Relevance calculation for search results
  const calculateRelevance = (doc: SupportDocument, query: string): number => {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Title match gets highest score
    if (doc.title.toLowerCase().includes(queryLower)) score += 10;
    
    // Description match gets medium score
    if (doc.description.toLowerCase().includes(queryLower)) score += 5;
    
    // Tag match gets lower score
    doc.tags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower)) score += 2;
    });
    
    // Boost popular documents
    score += doc.popularity * 0.1;
    
    return score;
  };

  // Utility functions for styling (spec requirement 2.3)
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'getting-started': return 'text-blue-600 bg-blue-100';
      case 'security': return 'text-red-600 bg-red-100';
      case 'troubleshooting': return 'text-orange-600 bg-orange-100';
      case 'advanced': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <BookOpen className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'tutorial': return <FileText className="w-4 h-4" />;
      case 'faq': return <FileText className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Support Documentation
        </h1>
        <p className="text-gray-600">
          Comprehensive guides and resources to help you succeed with LDAO tokens
        </p>
      </div>

      {/* Quick Actions - Multi-channel support integration (spec requirement 5.1, 5.2) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setIsLiveChatOpen(true)}
          className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <MessageCircle className="w-6 h-6 text-blue-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-blue-900">Live Chat</div>
            <div className="text-sm text-blue-600">Available 24/7</div>
          </div>
        </button>

        <button
          onClick={() => setSelectedDocument('beginners-guide')}
          className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <FileText className="w-6 h-6 text-green-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-green-900">Documentation</div>
            <div className="text-sm text-green-600">Guides & tutorials</div>
          </div>
        </button>

        <a
          href="https://discord.gg/web3marketplace"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <Users className="w-6 h-6 text-purple-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-purple-900">Community</div>
            <div className="text-sm text-purple-600">Join Discord</div>
          </div>
        </a>

        <a
          href="mailto:ldao-support@web3marketplace.com"
          className="flex items-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <HelpCircle className="w-6 h-6 text-orange-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-orange-900">Email Support</div>
            <div className="text-sm text-orange-600">4-hour response</div>
          </div>
        </a>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search guides, tutorials, and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter - Enhanced with counts (spec requirement 2.2) */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.label} ({category.count})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {types.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>



      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">
          Showing {filteredDocuments.length} of {supportDocuments.length} documents
        </p>
        
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Sort by:</span>
          <select className="border border-gray-300 rounded px-2 py-1">
            <option>Most Popular</option>
            <option>Newest</option>
            <option>Highest Rated</option>
            <option>Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Enhanced Document Grid (spec requirement 2.3, 3.1) */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map(doc => (
            <div
              key={doc.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleDocumentSelect(doc.id)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg mr-3">
                      {doc.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {doc.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(doc.difficulty)}`}>
                          {doc.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                          {doc.category.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {doc.description}
                </p>
                
                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {doc.readTime}
                    </div>
                    <div className="flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      {doc.popularity}%
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No documents found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search terms or filters
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedType('all');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Scroll Progress Indicator */}
      {showScrollProgress && currentDocument && (
        <ScrollProgressIndicator
          progress={scrollProgress}
          readTime={currentDocument.readTime}
          views={currentDocument.views}
          popularity={currentDocument.popularity}
        />
      )}

      {/* Enhanced Document Modal with Navigation */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex z-50">
          <div className="flex w-full h-full">
            {/* Main Document Content */}
            <div className="flex-1 bg-white flex flex-col">
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-6 border-b ${showScrollProgress ? 'mt-16' : ''}`}>
                <div className="flex items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentDocument?.title}
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (currentDocument) {
                        const blob = new Blob([documentContent], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${currentDocument.title.replace(/\s+/g, '-').toLowerCase()}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={closeDocumentViewer}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-blue max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {documentContent}
                  </pre>
                </div>
              </div>
              
              {/* Modal Footer with Navigation */}
              <div className="border-t p-6">
                <DocumentNavigation
                  currentDocument={currentDocument}
                  previousDocument={previousDocument}
                  nextDocument={nextDocument}
                  relatedDocuments={relatedDocuments}
                  canGoBack={canGoBack}
                  onNavigate={handleDocumentSelect}
                  onGoBack={handleGoBack}
                />
                
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Last updated: {currentDocument?.lastUpdated}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={closeDocumentViewer}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        if (currentDocument && currentDocument.href) {
                          window.open(currentDocument.href, '_blank');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Full Guide
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar with Related Documents */}
            <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
              <div className="p-6">
                <RelatedDocumentsSuggestions
                  currentDocument={currentDocument}
                  allDocuments={supportDocuments}
                  onDocumentSelect={handleDocumentSelect}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popular Tags */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Topics</h3>
        <div className="flex flex-wrap gap-2">
          {['LDAO tokens', 'Staking', 'DEX trading', 'Wallet setup', 'Earn rewards', 'Cross-chain', 'Security', 'Troubleshooting'].map(tag => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag)}
              className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-channel Support Links (spec requirement 5.2, 5.3) */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Need More Help?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/support"
            className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <Users className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <div className="font-medium text-gray-900">Live Chat Support</div>
              <div className="text-sm text-gray-600">Get instant help 24/7</div>
            </div>
          </a>
          
          <a
            href="https://discord.gg/web3marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <Users className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <div className="font-medium text-gray-900">Community Discord</div>
              <div className="text-sm text-gray-600">Join the community</div>
            </div>
          </a>
          
          <a
            href="mailto:ldao-support@web3marketplace.com"
            className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <HelpCircle className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <div className="font-medium text-gray-900">Email Support</div>
              <div className="text-sm text-gray-600">Detailed assistance</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default SupportDocuments;