import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  BookOpen, 
  ArrowLeft,
  Home,
  Code,
  GraduationCap,
  HelpCircle,
  Database,
  Shield,
  Users,
  GitBranch,
  FileText,
  Search,
  Clock,
  Download,
  Star,
  Zap,
  Globe,
  Lock,
  BarChart3,
  Settings,
  Wrench,
  Server,
  Network,
  Cpu,
  Wallet,
  ShoppingCart,
  Trophy,
  Coins,
  Building,
  Lightbulb,
  Target,
  TrendingUp
} from 'lucide-react';
import DocSidebar from '@/components/Documentation/DocSidebar';
import DocViewer from '@/components/Documentation/DocViewer';

const DocsPage: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [toc, setToc] = useState<{id: string, title: string, level: number}[]>([]);
  const [activeSection, setActiveSection] = useState('');

  // Documentation structure with enhanced categorization
  const documentationCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Home className="w-5 h-5" />,
      documents: [
        {
          id: 'introduction',
          title: 'Introduction to LinkDAO',
          description: 'Overview of the LinkDAO platform and its core features',
          path: '/docs/introduction.md',
          readTime: '5 min',
          lastUpdated: '2025-10-28',
          tags: ['beginner', 'overview']
        },
        {
          id: 'quick-start',
          title: 'Quick Start Guide',
          description: 'Get up and running with LinkDAO in minutes',
          path: '/docs/quick-start.md',
          readTime: '5 min',
          lastUpdated: '2025-10-28',
          tags: ['beginner', 'setup']
        },
        {
          id: 'installation',
          title: 'Installation',
          description: 'Step-by-step installation instructions',
          path: '/docs/installation.md',
          readTime: '10 min',
          lastUpdated: '2025-10-28',
          tags: ['setup', 'technical']
        }
      ]
    },
    {
      id: 'user-guides',
      title: 'User Guides',
      icon: <GraduationCap className="w-5 h-5" />,
      documents: [
        {
          id: 'wallet-setup',
          title: 'Wallet Setup',
          description: 'How to set up your wallet for LinkDAO',
          path: '/docs/wallet-setup.md',
          readTime: '12 min',
          lastUpdated: '2025-10-28',
          tags: ['wallet', 'setup']
        },
        {
          id: 'marketplace-guide',
          title: 'Marketplace Guide',
          description: 'Buying and selling on the LinkDAO marketplace',
          path: '/docs/marketplace-guide.md',
          readTime: '15 min',
          lastUpdated: '2025-10-28',
          tags: ['marketplace', 'trading']
        },
        {
          id: 'governance-guide',
          title: 'Governance Guide',
          description: 'Participating in LinkDAO governance and voting',
          path: '/docs/governance-guide.md',
          readTime: '18 min',
          lastUpdated: '2025-10-28',
          tags: ['governance', 'voting']
        },
        {
          id: 'ldao-token-guide',
          title: 'LDAO Token Guide',
          description: 'Understanding and using the LDAO token',
          path: '/docs/ldao-token-guide.md',
          readTime: '14 min',
          lastUpdated: '2025-10-28',
          tags: ['token', 'staking']
        },
        {
          id: 'communities',
          title: 'Communities',
          description: 'Creating and participating in LinkDAO communities',
          path: '/docs/communities.md',
          readTime: '16 min',
          lastUpdated: '2025-10-28',
          tags: ['social', 'communities']
        },
        {
          id: 'reputation-system',
          title: 'Reputation System',
          description: 'Understanding the reputation scoring mechanism',
          path: '/docs/reputation-system.md',
          readTime: '13 min',
          lastUpdated: '2025-10-28',
          tags: ['reputation', 'trust']
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Documentation',
      icon: <Code className="w-5 h-5" />,
      documents: [
        {
          id: 'technical-whitepaper',
          title: 'Technical Whitepaper',
          description: 'Comprehensive overview of the LinkDAO architecture',
          path: '/api/docs/technical-whitepaper',
          readTime: '45 min',
          lastUpdated: '2025-12-01',
          tags: ['architecture', 'whitepaper', 'core']
        },
        {
          id: 'api-reference',
          title: 'API Reference',
          description: 'Complete API documentation for developers',
          path: '/docs/api-reference.md',
          readTime: '30 min',
          lastUpdated: '2025-10-28',
          tags: ['api', 'reference', 'development']
        },
        {
          id: 'smart-contracts',
          title: 'Smart Contracts',
          description: 'Detailed documentation of all smart contracts',
          path: '/docs/smart-contracts.md',
          readTime: '35 min',
          lastUpdated: '2025-10-28',
          tags: ['smart-contracts', 'blockchain', 'ethereum']
        },
        {
          id: 'security',
          title: 'Security Framework',
          description: 'Security measures and best practices',
          path: '/docs/security.md',
          readTime: '25 min',
          lastUpdated: '2025-10-28',
          tags: ['security', 'audits', 'best-practices']
        },
        {
          id: 'architecture',
          title: 'System Architecture',
          description: 'Detailed system architecture and components',
          path: '/docs/architecture.md',
          readTime: '28 min',
          lastUpdated: '2025-10-28',
          tags: ['architecture', 'design', 'components']
        }
      ]
    },
    {
      id: 'developer',
      title: 'Developer Resources',
      icon: <Code className="w-5 h-5" />,
      documents: [
        {
          id: 'contributing',
          title: 'Contributing Guide',
          description: 'How to contribute to the LinkDAO project',
          path: '/docs/contributing.md',
          readTime: '20 min',
          lastUpdated: '2025-10-28',
          tags: ['contribution', 'development']
        },
        {
          id: 'deployment',
          title: 'Deployment Guide',
          description: 'Deploying LinkDAO on your own infrastructure',
          path: '/docs/deployment.md',
          readTime: '25 min',
          lastUpdated: '2025-10-28',
          tags: ['deployment', 'infrastructure']
        },
        {
          id: 'sdk',
          title: 'SDK Documentation',
          description: 'Using the LinkDAO Software Development Kit',
          path: '/docs/sdk.md',
          readTime: '22 min',
          lastUpdated: '2025-10-28',
          tags: ['sdk', 'development']
        },
        {
          id: 'integrations',
          title: 'Integration Guide',
          description: 'Integrating LinkDAO with external services',
          path: '/docs/integrations.md',
          readTime: '18 min',
          lastUpdated: '2025-10-28',
          tags: ['integration', 'api']
        }
      ]
    },
    {
      id: 'advanced-topics',
      title: 'Advanced Topics',
      icon: <TrendingUp className="w-5 h-5" />,
      documents: [
        {
          id: 'governance-mechanisms',
          title: 'Advanced Governance',
          description: 'Deep dive into governance mechanisms and voting systems',
          path: '/docs/governance-mechanisms.md',
          readTime: '32 min',
          lastUpdated: '2025-10-28',
          tags: ['governance', 'voting', 'advanced']
        },
        {
          id: 'token-economics',
          title: 'Token Economics',
          description: 'In-depth analysis of the LDAO token economy',
          path: '/docs/token-economics.md',
          readTime: '28 min',
          lastUpdated: '2025-10-28',
          tags: ['token', 'economics', 'staking']
        },
        {
          id: 'performance-optimization',
          title: 'Performance Optimization',
          description: 'Optimizing performance and scalability',
          path: '/docs/performance-optimization.md',
          readTime: '24 min',
          lastUpdated: '2025-10-28',
          tags: ['performance', 'optimization', 'scalability']
        },
        {
          id: 'monitoring-maintenance',
          title: 'Monitoring & Maintenance',
          description: 'System monitoring and maintenance procedures',
          path: '/docs/monitoring-maintenance.md',
          readTime: '26 min',
          lastUpdated: '2025-10-28',
          tags: ['monitoring', 'maintenance', 'operations']
        }
      ]
    }
  ];

  // Flatten documents for search
  const allDocuments = documentationCategories.flatMap(category => 
    category.documents.map(doc => ({ ...doc, category: category.id, categoryTitle: category.title }))
  );

  // Filter documents based on search and category with improved search
  const filteredDocuments = allDocuments.filter(doc => {
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
    
    // If no search terms, show all documents in category
    if (searchTerms.length === 0) {
      return selectedCategory === 'all' || doc.category === selectedCategory;
    }
    
    // Check if document matches all search terms
    const matchesAllTerms = searchTerms.every(term => 
      doc.title.toLowerCase().includes(term) ||
      doc.description.toLowerCase().includes(term) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(term)))
    );
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    
    return matchesAllTerms && matchesCategory;
  });

  // Load document content
  const loadDocument = async (documentPath: string) => {
    setIsLoading(true);
    try {
      // Extract document slug from path
      let slug = '';

      if (documentPath === '/api/docs/technical-whitepaper') {
        slug = 'technical-whitepaper';
      } else {
        // Convert /docs/filename.md to filename
        slug = documentPath.replace('/docs/', '').replace('.md', '');
      }

      // Fetch document from API
      const response = await fetch(`/api/docs/${slug}`);

      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`);
      }

      const data = await response.json();
      setDocumentContent(data.content);
      generateToc(data.content);
    } catch (error) {
      console.error('Failed to load document:', error);
      setDocumentContent(`# Error Loading Document

We encountered an error while loading this document. Please try again later or contact support if the issue persists.

**Error**: ${error instanceof Error ? error.message : 'Unknown error'}

[Back to Documentation](/docs)`);
      setToc([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate table of contents from markdown content with better ID generation
  const generateToc = (content: string) => {
    // Reset header counter for each document
    let headerCounter = 0;
    
    const headers = content.match(/^(#{1,4})\s+(.+)$/gm);
    if (headers) {
      const tocItems = headers.map((header) => {
        const match = header.match(/^(#{1,4})\s+(.+)$/);
        if (match) {
          headerCounter++;
          const level = match[1].length;
          const title = match[2];
          // Create a more unique ID by including the counter to prevent duplicates
          const id = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${headerCounter}`;
          return { id, title, level };
        }
        return null;
      }).filter(Boolean) as {id: string, title: string, level: number}[];
      setToc(tocItems);
    } else {
      setToc([]);
    }
  };

  // Handle document selection
  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocument(documentId);
    const doc = allDocuments.find(d => d.id === documentId);
    if (doc && doc.path) {
      loadDocument(doc.path);
    }
  };

  // Handle TOC item click
  const handleTocItemClick = (id: string) => {
    setActiveSection(id);
    // Scroll to the section in the DocViewer
    const event = new CustomEvent('scrollToSection', { detail: id });
    window.dispatchEvent(event);
  };

  // Close document viewer
  const closeDocumentViewer = () => {
    setSelectedDocument(null);
    setDocumentContent('');
    setToc([]);
    setActiveSection('');
  };

  // Download document
  const downloadDocument = () => {
    if (selectedDocument) {
      const doc = allDocuments.find(d => d.id === selectedDocument);
      if (doc) {
        const blob = new Blob([documentContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedDocument(null);
    setDocumentContent('');
    setToc([]);
    setActiveSection('');
  };

  return (
    <>
      <Head>
        <title>Documentation - LinkDAO</title>
        <meta name="description" content="Comprehensive documentation for LinkDAO platform, smart contracts, and development" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Home
                </Link>
              </div>
              <div className="flex items-center">
                <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Documentation</h1>
              </div>
              <div></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Documentation Center</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comprehensive guides, technical documentation, and resources for LinkDAO
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4">
              <DocSidebar
                categories={documentationCategories}
                selectedCategory={selectedCategory}
                selectedDocument={selectedDocument}
                onSelectCategory={handleCategorySelect}
                onSelectDocument={handleDocumentSelect}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                toc={toc}
                onTocItemClick={handleTocItemClick}
                activeSection={activeSection}
              />
            </div>

            {/* Main Content */}
            <div className="lg:w-3/4">
              {selectedDocument ? (
                // Document Viewer
                <DocViewer
                  title={allDocuments.find(d => d.id === selectedDocument)?.title || ''}
                  content={documentContent}
                  onClose={closeDocumentViewer}
                  onDownload={downloadDocument}
                  isTechnicalWhitepaper={selectedDocument === 'technical-whitepaper'}
                  isLoading={isLoading}
                  toc={toc}
                  activeSection={activeSection}
                  onSectionChange={setActiveSection}
                />
              ) : (
                // Document List
                <div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      {selectedCategory === 'all' ? 'All Documentation' : documentationCategories.find(c => c.id === selectedCategory)?.title}
                    </h2>
                    
                    {filteredDocuments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            onClick={() => handleDocumentSelect(doc.id)}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800"
                          >
                            <div className="flex items-start">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-4">
                                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{doc.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{doc.description}</p>
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <Clock className="w-3 h-3 mr-1" />
                                  <span className="mr-2">{doc.readTime}</span>
                                  <span className="mx-2">•</span>
                                  <span>Updated {doc.lastUpdated}</span>
                                </div>
                                {doc.tags && doc.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {doc.tags.slice(0, 3).map((tag, index) => (
                                      <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Links */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center mb-4">
                        <Code className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Developers</h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Technical documentation for developers building on LinkDAO
                      </p>
                      <button
                        onClick={() => handleCategorySelect('technical')}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                      >
                        View Documentation →
                      </button>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center mb-4">
                        <GraduationCap className="w-6 h-6 text-green-600 dark:text-green-400 mr-2" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">User Guides</h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Step-by-step guides for using LinkDAO platform features
                      </p>
                      <button
                        onClick={() => handleCategorySelect('user-guides')}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                      >
                        View Guides →
                      </button>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center mb-4">
                        <HelpCircle className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Support</h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Get help with common issues and questions
                      </p>
                      <Link href="/support" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                        Visit Support Center →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocsPage;