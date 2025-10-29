import React, { useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Code,
  GraduationCap,
  BookOpen,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Hash,
  TrendingUp,
  Users,
  Shield,
  Database,
  Wrench,
  Settings,
  FileText,
  List
} from 'lucide-react';

// This component is publicly accessible and does not require authentication
interface DocCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  documents: {
    id: string;
    title: string;
  }[];
}

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface DocSidebarProps {
  categories: DocCategory[];
  selectedCategory: string;
  selectedDocument: string | null;
  onSelectCategory: (categoryId: string) => void;
  onSelectDocument: (documentId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  toc?: TocItem[];
  onTocItemClick?: (id: string) => void;
  activeSection?: string;
}

const DocSidebar: React.FC<DocSidebarProps> = ({
  categories,
  selectedCategory,
  selectedDocument,
  onSelectCategory,
  onSelectDocument,
  searchQuery,
  onSearchChange,
  toc = [],
  onTocItemClick,
  activeSection = ''
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['getting-started', 'user-guides', 'technical']);
  const [tocExpanded, setTocExpanded] = useState(true);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  // Get icon for category
  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'getting-started':
        return <Home className="w-5 h-5" />;
      case 'user-guides':
        return <GraduationCap className="w-5 h-5" />;
      case 'technical':
        return <Code className="w-5 h-5" />;
      case 'developer':
        return <Wrench className="w-5 h-5" />;
      case 'advanced-topics':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-between w-full p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <span className="font-medium text-gray-900 dark:text-white">Documentation Menu</span>
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden`}>
        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('all');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <BookOpen className="w-5 h-5 mr-3" />
                  All Documents
                </button>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => {
                      onSelectCategory(category.id);
                      toggleCategory(category.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{getCategoryIcon(category.id)}</span>
                      {category.title}
                    </div>
                    {expandedCategories.includes(category.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {expandedCategories.includes(category.id) && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {category.documents.map((doc) => (
                        <li key={doc.id}>
                          <button
                            onClick={() => {
                              onSelectDocument(doc.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center ${
                              selectedDocument === doc.id
                                ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <FileText className="w-3 h-3 mr-2" />
                            {doc.title}
                          </button>
                          
                          {/* Show document hierarchy below the document name when selected */}
                          {selectedDocument === doc.id && toc && toc.length > 0 && (
                            <ul className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                              {toc.map((item) => (
                                <li key={item.id}>
                                  <button
                                    onClick={() => {
                                      onTocItemClick?.(item.id);
                                      setMobileMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                                      activeSection === item.id
                                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                    style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                                  >
                                    <div className="flex items-center">
                                      <Hash className="w-2 h-2 mr-1 flex-shrink-0" />
                                      <span className="truncate">{item.title}</span>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Additional Resources */}
        <div className="p-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Additional Resources</h3>
          <ul className="space-y-2">
            <li>
              <a
                href="https://github.com/LinkDAO"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
              >
                <Code className="w-4 h-4 mr-2" />
                GitHub Repository
              </a>
            </li>
            <li>
              <a
                href="/support"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Community Support
              </a>
            </li>
            <li>
              <a
                href="/blog"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Blog & Updates
              </a>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default DocSidebar;