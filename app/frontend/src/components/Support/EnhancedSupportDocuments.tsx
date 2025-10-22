/**
 * Enhanced Support Documents Component
 * Integrates internationalization and accessibility features
 */

import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  StarIcon,
  FunnelIcon,
  ChevronRightIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  AdjustmentsHorizontalIcon,
  SpeakerWaveIcon,
  GlobeAltIcon,
  XMarkIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import DocumentNavigation from './DocumentNavigation';
import ScrollProgressIndicator from './ScrollProgressIndicator';
import RelatedDocumentsSuggestions from './RelatedDocumentsSuggestions';
import { LanguageSelector } from './LanguageSelector';
import { AccessibilityControls } from './AccessibilityControls';
import { MultiLanguageSearch } from './MultiLanguageSearch';
import { CulturalAdaptation } from './CulturalAdaptation';
import { useInternationalization } from '../../hooks/useInternationalization';
import { useAccessibility } from '../../hooks/useAccessibility';

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

export const EnhancedSupportDocuments: React.FC = () => {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [showAccessibilityControls, setShowAccessibilityControls] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Internationalization hooks
  const {
    currentLanguage,
    getTranslatedDocument,
    hasTranslation,
    formatDate,
    isRTL
  } = useInternationalization();

  // Accessibility hooks
  const {
    preferences,
    speak,
    stopReading,
    readPageContent,
    isTextToSpeechSupported
  } = useAccessibility();

  // Support documents with enhanced metadata
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
      icon: <BookOpenIcon className="w-5 h-5" />,
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
      icon: <WrenchScrewdriverIcon className="w-5 h-5" />,
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
      icon: <ShieldCheckIcon className="w-5 h-5" />,
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
      icon: <QuestionMarkCircleIcon className="w-5 h-5" />,
      tags: ['faq', 'questions', 'answers', 'quick']
    }
  ];

  // Listen for accessibility settings changes
  useEffect(() => {
    const handleAccessibilitySettingsOpen = () => {
      setShowAccessibilityControls(true);
    };

    window.addEventListener('open-accessibility-settings', handleAccessibilitySettingsOpen);

    return () => {
      window.removeEventListener('open-accessibility-settings', handleAccessibilitySettingsOpen);
    };
  }, []);

  // Apply RTL layout if needed
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  // Load document with translation support
  const loadDocument = async (documentId: string) => {
    try {
      // Try to get translated version first
      const translatedDoc = getTranslatedDocument(documentId);
      
      if (translatedDoc) {
        setDocumentContent(translatedDoc.content);
      } else {
        // Fallback to original document
        const doc = supportDocuments.find(d => d.id === documentId);
        if (doc && doc.path) {
          const response = await fetch(doc.path);
          const content = await response.text();
          setDocumentContent(content);
        }
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      setDocumentContent('Failed to load document content. Please try again later.');
    }
  };

  // Handle document selection
  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocument(documentId);
    loadDocument(documentId);
  };

  // Handle search result selection
  const handleSearchResultSelect = (result: any) => {
    setSelectedDocument(result.id);
    setDocumentContent(result.content);
  };

  // Toggle audio reading
  const handleToggleReading = () => {
    if (isReading) {
      stopReading();
      setIsReading(false);
    } else {
      if (selectedDocument) {
        speak(documentContent);
        setIsReading(true);
      } else {
        readPageContent();
        setIsReading(true);
      }
    }
  };

  // Close document viewer
  const closeDocumentViewer = () => {
    setSelectedDocument(null);
    setDocumentContent('');
    if (isReading) {
      stopReading();
      setIsReading(false);
    }
  };

  // Get current document
  const currentDocument = supportDocuments.find(doc => doc.id === selectedDocument);

  return (
    <div className={`max-w-7xl mx-auto p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Accessibility Skip Links */}
      <div className="sr-only">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#search" className="skip-link">
          Skip to search
        </a>
        <a href="#navigation" className="skip-link">
          Skip to navigation
        </a>
      </div>

      {/* Header with Language and Accessibility Controls */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Support Documentation
          </h1>
          <p className="text-gray-600">
            Comprehensive guides and resources to help you succeed with LDAO tokens
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Audio Reading Control */}
          {isTextToSpeechSupported && (
            <button
              onClick={handleToggleReading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isReading
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              aria-label={isReading ? 'Stop reading page aloud' : 'Read page aloud'}
            >
              {isReading ? <StopIcon className="h-4 w-4" /> : <SpeakerWaveIcon className="h-4 w-4" />}
              <span>{isReading ? 'Stop Reading' : 'Read Aloud'}</span>
            </button>
          )}

          {/* Language Selector */}
          <LanguageSelector showProgress={true} />

          {/* Accessibility Controls */}
          <button
            onClick={() => setShowAccessibilityControls(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Open accessibility settings"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            <span>Accessibility</span>
          </button>
        </div>
      </div>

      {/* Cultural Adaptation Notice */}
      <CulturalAdaptation className="mb-8" />

      {/* Enhanced Search */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 id="search" className="text-xl font-semibold text-gray-900">
            Search Documentation
          </h2>
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <GlobeAltIcon className="h-4 w-4" />
            <span>{showAdvancedSearch ? 'Simple Search' : 'Multi-Language Search'}</span>
          </button>
        </div>

        {showAdvancedSearch ? (
          <MultiLanguageSearch
            onResultSelect={handleSearchResultSelect}
            placeholder="Search documentation in multiple languages..."
          />
        ) : (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search guides, tutorials, and FAQs..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search documentation"
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" role="navigation" aria-label="Quick actions">
        <button
          onClick={() => handleDocumentSelect('beginners-guide')}
          className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-describedby="beginners-guide-desc"
        >
          <BookOpenIcon className="w-6 h-6 text-blue-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-blue-900">Beginner's Guide</div>
            <div id="beginners-guide-desc" className="text-sm text-blue-600">Start here</div>
          </div>
        </button>

        <button
          onClick={() => handleDocumentSelect('troubleshooting-guide')}
          className="flex items-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-describedby="troubleshooting-desc"
        >
          <WrenchScrewdriverIcon className="w-6 h-6 text-orange-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-orange-900">Troubleshooting</div>
            <div id="troubleshooting-desc" className="text-sm text-orange-600">Fix issues</div>
          </div>
        </button>

        <button
          onClick={() => handleDocumentSelect('security-guide')}
          className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-describedby="security-desc"
        >
          <ShieldCheckIcon className="w-6 h-6 text-red-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-red-900">Security</div>
            <div id="security-desc" className="text-sm text-red-600">Stay safe</div>
          </div>
        </button>

        <button
          onClick={() => handleDocumentSelect('quick-faq')}
          className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-describedby="faq-desc"
        >
          <QuestionMarkCircleIcon className="w-6 h-6 text-green-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-green-900">Quick FAQ</div>
            <div id="faq-desc" className="text-sm text-green-600">Fast answers</div>
          </div>
        </button>
      </div>

      {/* Document Grid */}
      <main id="main-content" className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">All Documentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supportDocuments.map(doc => {
            const hasTranslationForDoc = hasTranslation(doc.id);
            
            return (
              <article
                key={doc.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
                onClick={() => handleDocumentSelect(doc.id)}
                tabIndex={0}
                role="button"
                aria-label={`Open ${doc.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDocumentSelect(doc.id);
                  }
                }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-50 rounded-lg mr-3" aria-hidden="true">
                        {doc.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {doc.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doc.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                            doc.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {doc.difficulty}
                          </span>
                          {!hasTranslationForDoc && currentLanguage !== 'en' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              English only
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    {doc.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                        <span>{doc.readTime}</span>
                      </div>
                      <div className="flex items-center">
                        <StarIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                        <span>{doc.popularity}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div>Updated {formatDate(new Date(doc.lastUpdated))}</div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* Document Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-title"
        >
          <div className="flex w-full h-full">
            <div className="flex-1 bg-white flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 id="document-title" className="text-xl font-semibold text-gray-900">
                  {currentDocument?.title}
                </h2>
                <div className="flex items-center space-x-2">
                  {isTextToSpeechSupported && (
                    <button
                      onClick={handleToggleReading}
                      className={`p-2 rounded transition-colors ${
                        isReading
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      aria-label={isReading ? 'Stop reading document' : 'Read document aloud'}
                    >
                      {isReading ? <StopIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                  )}
                  <button
                    onClick={closeDocumentViewer}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close document"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6" data-document-id={selectedDocument}>
                <div className="prose prose-blue max-w-none">
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {documentContent}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
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

      {/* Accessibility Controls Modal */}
      <AccessibilityControls
        isOpen={showAccessibilityControls}
        onClose={() => setShowAccessibilityControls(false)}
      />

      {/* Scroll Progress Indicator */}
      {selectedDocument && (
        <ScrollProgressIndicator
          progress={0}
          readTime={currentDocument?.readTime || '0 min'}
          views={currentDocument?.views || 0}
          popularity={currentDocument?.popularity || 0}
        />
      )}
    </div>
  );
};