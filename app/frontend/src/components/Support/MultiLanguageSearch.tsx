/**
 * Multi-Language Search Component
 * Provides language-specific search and filtering capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  GlobeAltIcon,
  XMarkIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { useInternationalization } from '../../hooks/useInternationalization';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  content: string;
  language: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lastUpdated: string;
  relevanceScore: number;
  translationQuality: 'machine' | 'human' | 'professional';
}

interface SearchFilters {
  languages: string[];
  categories: string[];
  difficulties: string[];
  translationQuality: string[];
  dateRange: 'all' | 'week' | 'month' | 'year';
  sortBy: 'relevance' | 'date' | 'title' | 'quality';
  sortOrder: 'asc' | 'desc';
}

interface MultiLanguageSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export const MultiLanguageSearch: React.FC<MultiLanguageSearchProps> = ({
  onResultSelect,
  placeholder,
  className = ''
}) => {
  const {
    currentLanguage,
    supportedLanguages,
    searchDocuments,
    getTranslationProgress,
    formatDate
  } = useInternationalization();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    languages: [currentLanguage],
    categories: [],
    difficulties: [],
    translationQuality: [],
    dateRange: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  const categories = [
    'getting-started',
    'security',
    'troubleshooting',
    'advanced',
    'api',
    'tutorials'
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced'];
  const qualityLevels = ['machine', 'human', 'professional'];

  // Update language filter when current language changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(currentLanguage) 
        ? prev.languages 
        : [...prev.languages, currentLanguage]
    }));
  }, [currentLanguage]);

  // Perform search when query or filters change
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Search in all selected languages
        const allResults: SearchResult[] = [];
        
        for (const language of filters.languages) {
          const languageResults = searchDocuments(query, language);
          
          // Convert to SearchResult format
          const formattedResults: SearchResult[] = languageResults.map(doc => ({
            id: `${doc.language}-${doc.title.toLowerCase().replace(/\s+/g, '-')}`,
            title: doc.title,
            description: doc.description,
            content: doc.content,
            language: doc.language,
            category: extractCategory(doc.content),
            difficulty: extractDifficulty(doc.content),
            lastUpdated: doc.translatedAt,
            relevanceScore: calculateRelevanceScore(doc, query),
            translationQuality: getTranslationQuality(doc.language)
          }));
          
          allResults.push(...formattedResults);
        }

        // Apply filters
        const filteredResults = applyFilters(allResults, filters);
        
        // Sort results
        const sortedResults = sortResults(filteredResults, filters.sortBy, filters.sortOrder);
        
        setResults(sortedResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, filters, searchDocuments]);

  // Extract category from document content (simplified)
  const extractCategory = (content: string): string => {
    const categoryKeywords = {
      'getting-started': ['beginner', 'start', 'introduction', 'setup'],
      'security': ['security', 'safe', 'protect', 'private'],
      'troubleshooting': ['problem', 'error', 'fix', 'issue'],
      'advanced': ['advanced', 'expert', 'complex'],
      'api': ['api', 'endpoint', 'integration'],
      'tutorials': ['tutorial', 'guide', 'step', 'how-to']
    };

    const lowerContent = content.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return category;
      }
    }
    return 'general';
  };

  // Extract difficulty from document content (simplified)
  const extractDifficulty = (content: string): 'beginner' | 'intermediate' | 'advanced' => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('beginner') || lowerContent.includes('basic')) {
      return 'beginner';
    }
    if (lowerContent.includes('advanced') || lowerContent.includes('expert')) {
      return 'advanced';
    }
    return 'intermediate';
  };

  // Calculate relevance score
  const calculateRelevanceScore = (doc: any, searchQuery: string): number => {
    const queryTerms = searchQuery.toLowerCase().split(' ');
    let score = 0;

    queryTerms.forEach(term => {
      // Title matches are worth more
      if (doc.title.toLowerCase().includes(term)) {
        score += 10;
      }
      // Description matches
      if (doc.description.toLowerCase().includes(term)) {
        score += 5;
      }
      // Content matches
      const contentMatches = (doc.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
      score += contentMatches;
    });

    return score;
  };

  // Get translation quality for language
  const getTranslationQuality = (language: string): 'machine' | 'human' | 'professional' => {
    // This would typically come from the translation service
    const highQualityLanguages = ['en', 'es', 'fr', 'de'];
    const mediumQualityLanguages = ['zh', 'ja', 'ko', 'pt'];
    
    if (highQualityLanguages.includes(language)) {
      return 'professional';
    } else if (mediumQualityLanguages.includes(language)) {
      return 'human';
    } else {
      return 'machine';
    }
  };

  // Apply filters to results
  const applyFilters = (results: SearchResult[], filters: SearchFilters): SearchResult[] => {
    return results.filter(result => {
      // Language filter
      if (filters.languages.length > 0 && !filters.languages.includes(result.language)) {
        return false;
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(result.category)) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulties.length > 0 && !filters.difficulties.includes(result.difficulty)) {
        return false;
      }

      // Translation quality filter
      if (filters.translationQuality.length > 0 && !filters.translationQuality.includes(result.translationQuality)) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const resultDate = new Date(result.lastUpdated);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (filters.dateRange) {
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
          case 'year':
            if (daysDiff > 365) return false;
            break;
        }
      }

      return true;
    });
  };

  // Sort results
  const sortResults = (results: SearchResult[], sortBy: string, sortOrder: string): SearchResult[] => {
    return [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date':
          comparison = new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'quality':
          const qualityOrder = { professional: 3, human: 2, machine: 1 };
          comparison = qualityOrder[b.translationQuality] - qualityOrder[a.translationQuality];
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Update filter
  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Toggle filter value in array
  const toggleFilterValue = (filterKey: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterKey] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return { ...prev, [filterKey]: newValues };
    });
  };

  // Get language info
  const getLanguageInfo = (languageCode: string) => {
    return supportedLanguages.find(lang => lang.code === languageCode);
  };

  // Get quality badge color
  const getQualityBadgeColor = (quality: string) => {
    switch (quality) {
      case 'professional': return 'bg-green-100 text-green-800';
      case 'human': return 'bg-blue-100 text-blue-800';
      case 'machine': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || 'Search documentation in multiple languages...'}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
              showFilters ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Search Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <XMarkIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {supportedLanguages.map(language => (
                  <label key={language.code} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.languages.includes(language.code)}
                      onChange={() => toggleFilterValue('languages', language.code)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{language.flag}</span>
                    <span className="text-sm text-gray-700">{language.nativeName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="space-y-2">
                {categories.map(category => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={() => toggleFilterValue('categories', category)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {category.replace('-', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulties */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <div className="space-y-2">
                {difficulties.map(difficulty => (
                  <label key={difficulty} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.difficulties.includes(difficulty)}
                      onChange={() => toggleFilterValue('difficulties', difficulty)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{difficulty}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Translation Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Translation Quality
              </label>
              <div className="space-y-2">
                {qualityLevels.map(quality => (
                  <label key={quality} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.translationQuality.includes(quality)}
                      onChange={() => toggleFilterValue('translationQuality', quality)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{quality}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All time</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
                <option value="year">Past year</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <div className="flex space-x-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value as any)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="quality">Quality</option>
                </select>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => updateFilter('sortOrder', e.target.value as any)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">↓</option>
                  <option value="asc">↑</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.length > 0 && (
          <div className="text-sm text-gray-600">
            Found {results.length} result{results.length !== 1 ? 's' : ''} in {filters.languages.length} language{filters.languages.length !== 1 ? 's' : ''}
          </div>
        )}

        {results.map((result) => {
          const languageInfo = getLanguageInfo(result.language);
          
          return (
            <div
              key={result.id}
              onClick={() => onResultSelect?.(result)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
                    <div className="flex items-center space-x-1">
                      <span className="text-lg">{languageInfo?.flag}</span>
                      <span className="text-xs text-gray-500">{result.language.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">{result.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="capitalize">{result.category.replace('-', ' ')}</span>
                    <span className="capitalize">{result.difficulty}</span>
                    <span>Updated {formatDate(new Date(result.lastUpdated))}</span>
                    <span className="flex items-center space-x-1">
                      <span>Score:</span>
                      <span className="font-medium">{result.relevanceScore}</span>
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getQualityBadgeColor(result.translationQuality)}`}>
                    {result.translationQuality}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {query && results.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No results found for "{query}"</p>
            <p className="text-sm mt-1">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};