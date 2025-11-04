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
  X,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  Globe
} from 'lucide-react';

interface SupportDocument {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'security' | 'troubleshooting' | 'advanced' | 'ldao' | 'trading' | 'wallet' | 'marketplace' | 'governance' | 'technical';
  type: 'guide' | 'video' | 'faq' | 'tutorial' | 'api' | 'whitepaper';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: string;
  popularity: number;
  views: number;
  lastUpdated: string;
  href?: string;
  path?: string;
  tags: string[];
  icon?: React.ReactNode;
  languages: string[];
  translations: Record<string, string>;
}

const EnhancedSupportDocuments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [showScrollProgress, setShowScrollProgress] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<string[]>([]);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'popularity' | 'date' | 'title'>('popularity');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Enhanced document structure with more comprehensive content
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
      tags: ['wallet', 'setup', 'purchase', 'basics'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Guía completa para principiantes',
        'fr': 'Guide complet du débutant',
        'de': 'Vollständiger Leitfaden für Anfänger',
        'zh': '完整新手指南'
      }
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
      tags: ['problems', 'solutions', 'help', 'issues'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Guía de solución de problemas',
        'fr': 'Guide de dépannage',
        'de': 'Fehlerbehebungsanleitung',
        'zh': '故障排除指南'
      }
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
      tags: ['security', 'safety', 'scams', 'protection'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Mejores prácticas de seguridad',
        'fr': 'Meilleures pratiques de sécurité',
        'de': 'Sicherheit bewährte Verfahren',
        'zh': '安全最佳实践'
      }
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
      tags: ['faq', 'questions', 'answers', 'quick'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Preguntas frecuentes rápidas',
        'fr': 'FAQ rapide',
        'de': 'Schnelle FAQ',
        'zh': '快速常见问题解答'
      }
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
      tags: ['dex', 'trading', 'uniswap', 'advanced'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Guía de trading en DEX',
        'fr': 'Guide de trading DEX',
        'de': 'DEX Trading-Anleitung',
        'zh': '去中心化交易所交易指南'
      }
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
      tags: ['wallet', 'metamask', 'setup', 'tutorial'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Tutorial de configuración de billetera',
        'fr': 'Tutoriel de configuration du portefeuille',
        'de': 'Wallet-Einrichtungsanleitung',
        'zh': '钱包设置教程'
      }
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
      tags: ['earn', 'rewards', 'community', 'tokens'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Gana tokens LDAO',
        'fr': 'Gagnez des jetons LDAO',
        'de': 'Verdienen Sie LDAO-Token',
        'zh': '赚取LDAO代币'
      }
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
      tags: ['bridge', 'cross-chain', 'networks', 'transfer'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Puente entre cadenas',
        'fr': 'Pont inter-chaînes',
        'de': 'Cross-Chain-Brücke',
        'zh': '跨链桥接'
      }
    },
    {
      id: 'governance-participation',
      title: 'Governance Participation Guide',
      description: 'Learn how to create and vote on proposals that shape the future of the LinkDAO platform.',
      category: 'governance',
      type: 'guide',
      difficulty: 'intermediate',
      readTime: '22 min',
      popularity: 65,
      views: 3800,
      lastUpdated: '2025-10-10',
      href: '/support/guides/governance',
      tags: ['governance', 'proposals', 'voting', 'dao'],
      languages: ['en', 'es', 'fr', 'de', 'zh'],
      translations: {
        'es': 'Guía de participación en gobernanza',
        'fr': 'Guide de participation à la gouvernance',
        'de': 'Leitfaden zur Governance-Teilnahme',
        'zh': '治理参与指南'
      }
    },
    {
      id: 'api-documentation',
      title: 'API Documentation',
      description: 'Complete API reference for developers building on the LinkDAO platform.',
      category: 'technical',
      type: 'api',
      difficulty: 'advanced',
      readTime: '30 min',
      popularity: 60,
      views: 2900,
      lastUpdated: '2025-10-10',
      href: '/docs/api',
      tags: ['api', 'developers', 'integration', 'sdk'],
      languages: ['en'],
      translations: {}
    }
  ];

  // Document navigation hook
  // const {
  //   currentDocument,
  //   previousDocument,
  //   nextDocument,
  //   relatedDocuments,
  //   scrollProgress,
  //   navigateToDocument,
  //   goBack,
  //   canGoBack
  // } = useDocumentNavigation(supportDocuments, selectedDocument, selectedCategory);

  // For now, use mock data
  const currentDocument = null;
  const previousDocument = null;
  const nextDocument = null;
  const relatedDocuments = [];
  const scrollProgress = 0;
  const navigateToDocument = () => {};
  const goBack = () => {};
  const canGoBack = false;

  // Enhanced categories with counts
  const categories = [
    { id: 'all', label: 'All Documents', count: supportDocuments.length },
    { id: 'getting-started', label: 'Getting Started', count: supportDocuments.filter(doc => doc.category === 'getting-started').length },
    { id: 'security', label: 'Security', count: supportDocuments.filter(doc => doc.category === 'security').length },
    { id: 'troubleshooting', label: 'Troubleshooting', count: supportDocuments.filter(doc => doc.category === 'troubleshooting').length },
    { id: 'advanced', label: 'Advanced', count: supportDocuments.filter(doc => doc.category === 'advanced').length },
    { id: 'ldao', label: 'LDAO Tokens', count: supportDocuments.filter(doc => doc.category === 'ldao').length },
    { id: 'wallet', label: 'Wallet', count: supportDocuments.filter(doc => doc.category === 'wallet').length },
    { id: 'marketplace', label: 'Marketplace', count: supportDocuments.filter(doc => doc.category === 'marketplace').length },
    { id: 'governance', label: 'Governance', count: supportDocuments.filter(doc => doc.category === 'governance').length },
    { id: 'technical', label: 'Technical', count: supportDocuments.filter(doc => doc.category === 'technical').length }
  ];
  
  const types = [
    { id: 'all', label: 'All Types' },
    { id: 'guide', label: 'Guides' },
    { id: 'tutorial', label: 'Tutorials' },
    { id: 'faq', label: 'FAQs' },
    { id: 'video', label: 'Videos' },
    { id: 'api', label: 'API Docs' },
    { id: 'whitepaper', label: 'Whitepapers' }
  ];

  const difficulties = [
    { id: 'all', label: 'All Levels' },
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'advanced', label: 'Advanced' }
  ];

  // Document loading function
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
    // navigateToDocument(documentId); // Comment out since we're using mock function
    setShowScrollProgress(true);
    
    const doc = supportDocuments.find(d => d.id === documentId);
    if (doc && doc.path) {
      loadDocument(doc.path);
    }
  };

  // Handle navigation back
  const handleGoBack = () => {
    // const previousId = goBack(); // Comment out since we're using mock function
    // if (previousId) {
    //   setSelectedDocument(previousId);
    //   const doc = supportDocuments.find(d => d.id === previousId);
    //   if (doc && doc.path) {
    //     loadDocument(doc.path);
    //   }
    // }
  };

  // Close document viewer
  const closeDocumentViewer = () => {
    setSelectedDocument(null);
    setDocumentContent('');
    setShowScrollProgress(false);
  };

  // Enhanced filtering with multiple criteria
  const filteredDocuments = supportDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    const matchesDifficulty = selectedDifficulty === 'all' || doc.difficulty === selectedDifficulty;
    const matchesLanguage = doc.languages.includes(selectedLanguage);
    
    return matchesSearch && matchesCategory && matchesType && matchesDifficulty && matchesLanguage;
  }).sort((a, b) => {
    // Sort by selected criteria
    switch (sortBy) {
      case 'popularity':
        return b.popularity - a.popularity;
      case 'date':
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return b.popularity - a.popularity;
    }
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

  // Utility functions for styling
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'getting-started': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'security': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'troubleshooting': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'advanced': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
      case 'ldao': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30';
      case 'wallet': return 'text-teal-600 bg-teal-100 dark:bg-teal-900/30';
      case 'marketplace': return 'text-pink-600 bg-pink-100 dark:bg-pink-900/30';
      case 'governance': return 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30';
      case 'technical': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <BookOpen className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'tutorial': return <FileText className="w-4 h-4" />;
      case 'faq': return <HelpCircle className="w-4 h-4" />;
      case 'api': return <Globe className="w-4 h-4" />;
      case 'whitepaper': return <FileText className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  // Toggle saved document
  const toggleSavedDocument = (documentId: string) => {
    setSavedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Support Documentation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive guides and resources to help you succeed with LDAO tokens
        </p>
      </div>

      {/* Multi-channel support integration */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setIsLiveChatOpen(true)}
          className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-blue-900 dark:text-blue-200">Live Chat</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Available 24/7</div>
          </div>
        </button>

        <button
          onClick={() => setSelectedDocument('beginners-guide')}
          className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <FileText className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-green-900 dark:text-green-200">Documentation</div>
            <div className="text-sm text-green-600 dark:text-green-400">Guides & tutorials</div>
          </div>
        </button>

        <a
          href="https://discord.gg/web3marketplace"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-purple-900 dark:text-purple-200">Community</div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Join Discord</div>
          </div>
        </a>

        <a
          href="mailto:ldao-support@linkdao.io"
          className="flex items-center p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
        >
          <HelpCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-orange-900 dark:text-orange-200">Email Support</div>
            <div className="text-sm text-orange-600 dark:text-orange-400">4-hour response</div>
          </div>
        </a>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search guides, tutorials, and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-gray-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="popularity">Most Popular</option>
              <option value="date">Newest</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={() => setExpandedFilters(!expandedFilters)}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
          >
            {expandedFilters ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Hide Filters
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show More Filters
              </>
            )}
          </button>

          {expandedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.label} ({category.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {types.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {difficulties.map(difficulty => (
                    <option key={difficulty.id} value={difficulty.id}>
                      {difficulty.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Showing {filteredDocuments.length} of {supportDocuments.length} documents
        </p>
        
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            <option value="popularity">Most Popular</option>
            <option value="date">Newest</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map(doc => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleDocumentSelect(doc.id)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg mr-3">
                      {doc.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {doc.translations[selectedLanguage] || doc.title}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSavedDocument(doc.id);
                    }}
                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {savedDocuments.includes(doc.id) ? (
                      <BookmarkCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                  {doc.description}
                </p>
                
                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {doc.tags.slice(0, 3).map((tag, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {doc.tags.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      +{doc.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No documents found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your search terms or filters
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedType('all');
              setSelectedDifficulty('all');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Scroll Progress Indicator */}
      {/* {showScrollProgress && currentDocument && (
        <ScrollProgressIndicator
          progress={scrollProgress}
          readTime={currentDocument.readTime}
          views={currentDocument.views}
          popularity={currentDocument.popularity}
        />
      )} */}

      {/* Document Modal with Navigation */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex z-50">
          <div className="flex w-full h-full">
            {/* Main Document Content */}
            <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col">
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-6 border-b dark:border-gray-700 ${showScrollProgress ? 'mt-16' : ''}`}>
                <div className="flex items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentDocument?.translations[selectedLanguage] || currentDocument?.title}
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
                        a.download = `${(currentDocument.translations[selectedLanguage] || currentDocument.title).replace(/\s+/g, '-').toLowerCase()}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={closeDocumentViewer}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-blue max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {documentContent}
                  </pre>
                </div>
              </div>
              
              {/* Modal Footer with Navigation */}
              <div className="border-t dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Last updated: {currentDocument?.lastUpdated}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={closeDocumentViewer}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
            <div className="w-80 bg-gray-50 dark:bg-gray-800 border-l dark:border-gray-700 overflow-y-auto">
              <div className="p-6">
                {/* <RelatedDocumentsSuggestions
                  currentDocument={currentDocument}
                  allDocuments={supportDocuments}
                  onDocumentSelect={handleDocumentSelect}
                /> */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popular Tags */}
      <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Popular Topics</h3>
        <div className="flex flex-wrap gap-2">
          {['LDAO tokens', 'Staking', 'DEX trading', 'Wallet setup', 'Earn rewards', 'Cross-chain', 'Security', 'Troubleshooting'].map(tag => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag)}
              className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-channel Support Links */}
      <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Need More Help?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/support"
            className="flex items-center p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
          >
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Live Chat Support</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Get instant help 24/7</div>
            </div>
          </a>
          
          <a
            href="https://discord.gg/web3marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
          >
            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Community Discord</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Join the community</div>
            </div>
          </a>
          
          <a
            href="mailto:ldao-support@linkdao.io"
            className="flex items-center p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
          >
            <HelpCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Email Support</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Detailed assistance</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSupportDocuments;