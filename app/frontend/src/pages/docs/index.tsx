import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import DocSidebar from '@/components/Documentation/DocSidebar';
import DocViewer from '@/components/Documentation/DocViewer';

// This page is publicly accessible and does not require authentication
const DocsPage: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [toc, setToc] = useState<{ id: string, title: string, level: number }[]>([]);
  const [activeSection, setActiveSection] = useState('');

  // Documentation structure with enhanced categorization
  const documentationCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Essentials for new users',
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      color: 'bg-yellow-500/10 text-yellow-600',
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
      description: 'Step-by-step tutorials',
      icon: <GraduationCap className="w-6 h-6 text-green-500" />,
      color: 'bg-green-500/10 text-green-600',
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
      title: 'Technical Docs',
      description: 'APIs and Architecture',
      icon: <Code className="w-6 h-6 text-blue-500" />,
      color: 'bg-blue-500/10 text-blue-600',
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
      description: 'SDKs and Tools',
      icon: <Wrench className="w-6 h-6 text-purple-500" />,
      color: 'bg-purple-500/10 text-purple-600',
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
      description: 'Deep dives and optimization',
      icon: <TrendingUp className="w-6 h-6 text-red-500" />,
      color: 'bg-red-500/10 text-red-600',
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
        // Try to parse error message from JSON response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to load document: ${response.statusText}`);
        } catch (e) {
          // If JSON parse fails, use status text
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
          throw new Error(`Failed to load document: ${response.statusText}`);
        }
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
      }).filter(Boolean) as { id: string, title: string, level: number }[];
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

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Home
                </Link>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                  Documentation
                </h1>
              </div>
              <div></div>
            </div>
          </div>
        </div>

        {/* Hero Section (Only visible when no document is selected) */}
        {!selectedDocument && (
          <div className="relative bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 opacity-50" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
                How can we help you?
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
                Search our comprehensive documentation for guides, API references, and troubleshooting tips.
              </p>

              <div className="max-w-2xl mx-auto relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg placeholder-gray-400 transition-all"
                  placeholder="Search for articles, guides, and docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="flex flex-col lg:flex-row gap-8 h-full">
            {/* Sidebar Navigation - Always visible on desktop */}
            <div className={`lg:w-1/4 ${!selectedDocument ? 'hidden lg:block' : ''}`}>
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
            <div className={`${selectedDocument ? 'lg:w-3/4' : 'w-full'} h-full`}>
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
                  categoryTitle={allDocuments.find(d => d.id === selectedDocument)?.categoryTitle}
                  nextDoc={(() => {
                    const currentIndex = allDocuments.findIndex(d => d.id === selectedDocument);
                    if (currentIndex !== -1 && currentIndex < allDocuments.length - 1) {
                      return { id: allDocuments[currentIndex + 1].id, title: allDocuments[currentIndex + 1].title };
                    }
                    return null;
                  })()}
                  prevDoc={(() => {
                    const currentIndex = allDocuments.findIndex(d => d.id === selectedDocument);
                    if (currentIndex > 0) {
                      return { id: allDocuments[currentIndex - 1].id, title: allDocuments[currentIndex - 1].title };
                    }
                    return null;
                  })()}
                  onNavigate={handleDocumentSelect}
                />
              ) : (
                // Landing Page Content
                <div className="space-y-12">
                  {/* Categories Grid */}
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Browse by Category</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {documentationCategories.map((category) => (
                        <div
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id)}
                          className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                        >
                          <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-300`}>
                            {React.cloneElement(category.icon as React.ReactElement, { className: "w-24 h-24" })}
                          </div>

                          <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            {category.icon}
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {category.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {category.description}
                          </p>

                          <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                            Explore {category.documents.length} articles
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Popular Articles */}
                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Popular Articles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allDocuments.slice(0, 4).map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => handleDocumentSelect(doc.id)}
                          className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors group"
                        >
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {doc.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                              {doc.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Help Section */}
                  <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
                        <p className="text-blue-100">
                          Can't find what you're looking for? Our support team is here to help.
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <Link href="/support" className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
                          Contact Support
                        </Link>
                        <a href="https://discord.gg/linkdao" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-700/50 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors backdrop-blur-sm">
                          Join Discord
                        </a>
                      </div>
                    </div>
                  </section>
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