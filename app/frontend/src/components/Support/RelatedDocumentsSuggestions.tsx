import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Star, TrendingUp, Users, ArrowRight } from 'lucide-react';

interface SupportDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  difficulty: string;
  readTime: string;
  popularity: number;
  views: number;
  lastUpdated: string;
  href?: string;
  path?: string;
  tags: string[];
}

interface RelatedDocumentsSuggestionsProps {
  currentDocument: SupportDocument | null;
  allDocuments: SupportDocument[];
  onDocumentSelect: (documentId: string) => void;
  className?: string;
}

const RelatedDocumentsSuggestions: React.FC<RelatedDocumentsSuggestionsProps> = ({
  currentDocument,
  allDocuments,
  onDocumentSelect,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<{
    byCategory: SupportDocument[];
    byTags: SupportDocument[];
    byDifficulty: SupportDocument[];
    trending: SupportDocument[];
    mostViewed: SupportDocument[];
  }>({
    byCategory: [],
    byTags: [],
    byDifficulty: [],
    trending: [],
    mostViewed: []
  });

  useEffect(() => {
    if (!currentDocument) {
      setSuggestions({
        byCategory: [],
        byTags: [],
        byDifficulty: [],
        trending: [],
        mostViewed: []
      });
      return;
    }

    const otherDocuments = allDocuments.filter(doc => doc.id !== currentDocument.id);

    // Documents in same category
    const byCategory = otherDocuments
      .filter(doc => doc.category === currentDocument.category)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 3);

    // Documents with shared tags
    const byTags = otherDocuments
      .map(doc => {
        const sharedTags = doc.tags.filter(tag => currentDocument.tags.includes(tag));
        return { ...doc, sharedTagCount: sharedTags.length };
      })
      .filter(doc => doc.sharedTagCount > 0)
      .sort((a, b) => b.sharedTagCount - a.sharedTagCount || b.popularity - a.popularity)
      .slice(0, 3);

    // Documents with same difficulty level
    const byDifficulty = otherDocuments
      .filter(doc => doc.difficulty === currentDocument.difficulty)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 3);

    // Trending documents (high popularity, recently updated)
    const trending = otherDocuments
      .sort((a, b) => {
        const aScore = a.popularity + (new Date(a.lastUpdated).getTime() / 1000000);
        const bScore = b.popularity + (new Date(b.lastUpdated).getTime() / 1000000);
        return bScore - aScore;
      })
      .slice(0, 3);

    // Most viewed documents
    const mostViewed = otherDocuments
      .sort((a, b) => b.views - a.views)
      .slice(0, 3);

    setSuggestions({
      byCategory,
      byTags,
      byDifficulty,
      trending,
      mostViewed
    });
  }, [currentDocument, allDocuments]);

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

  const SuggestionCard: React.FC<{ document: SupportDocument; reason: string }> = ({ document, reason }) => (
    <button
      onClick={() => onDocumentSelect(document.id)}
      className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors flex-1 pr-2">
          {document.title}
        </h4>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {document.description}
      </p>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(document.difficulty)}`}>
            {document.difficulty}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
            {document.category.replace('-', ' ')}
          </span>
        </div>
        
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {document.readTime}
          </div>
          <div className="flex items-center">
            <Star className="w-3 h-3 mr-1" />
            {document.popularity}%
          </div>
        </div>
      </div>
      
      <div className="text-xs text-blue-600 font-medium">
        {reason}
      </div>
    </button>
  );

  if (!currentDocument) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900">
        Recommended for You
      </h2>

      {/* Same Category */}
      {suggestions.byCategory.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-gray-900">
              More in {currentDocument.category.replace('-', ' ')}
            </h3>
          </div>
          <div className="space-y-3">
            {suggestions.byCategory.map((doc) => (
              <SuggestionCard
                key={doc.id}
                document={doc}
                reason="Same category"
              />
            ))}
          </div>
        </div>
      )}

      {/* Similar Topics */}
      {suggestions.byTags.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-medium text-gray-900">
              Similar Topics
            </h3>
          </div>
          <div className="space-y-3">
            {suggestions.byTags.map((doc) => (
              <SuggestionCard
                key={doc.id}
                document={doc}
                reason="Related topics"
              />
            ))}
          </div>
        </div>
      )}

      {/* Same Difficulty Level */}
      {suggestions.byDifficulty.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <Star className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="font-medium text-gray-900">
              {currentDocument.difficulty.charAt(0).toUpperCase() + currentDocument.difficulty.slice(1)} Level
            </h3>
          </div>
          <div className="space-y-3">
            {suggestions.byDifficulty.map((doc) => (
              <SuggestionCard
                key={doc.id}
                document={doc}
                reason={`${currentDocument.difficulty} level`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      {suggestions.trending.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="font-medium text-gray-900">
              Trending Now
            </h3>
          </div>
          <div className="space-y-3">
            {suggestions.trending.map((doc) => (
              <SuggestionCard
                key={doc.id}
                document={doc}
                reason="Trending"
              />
            ))}
          </div>
        </div>
      )}

      {/* Most Popular */}
      {suggestions.mostViewed.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <Users className="w-5 h-5 text-indigo-600 mr-2" />
            <h3 className="font-medium text-gray-900">
              Most Popular
            </h3>
          </div>
          <div className="space-y-3">
            {suggestions.mostViewed.map((doc) => (
              <SuggestionCard
                key={doc.id}
                document={doc}
                reason="Most viewed"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedDocumentsSuggestions;