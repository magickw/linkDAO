import React from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, ExternalLink, Clock, Star } from 'lucide-react';

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

interface DocumentNavigationProps {
  currentDocument: SupportDocument | null;
  previousDocument: SupportDocument | null;
  nextDocument: SupportDocument | null;
  relatedDocuments: SupportDocument[];
  canGoBack: boolean;
  onNavigate: (documentId: string) => void;
  onGoBack: () => void;
  className?: string;
}

const DocumentNavigation: React.FC<DocumentNavigationProps> = ({
  currentDocument,
  previousDocument,
  nextDocument,
  relatedDocuments,
  canGoBack,
  onNavigate,
  onGoBack,
  className = ''
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Back Button */}
      {canGoBack && (
        <button
          onClick={onGoBack}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </button>
      )}

      {/* Previous/Next Navigation */}
      <div className="flex justify-between items-center">
        {previousDocument ? (
          <button
            onClick={() => onNavigate(previousDocument.id)}
            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex-1 mr-2"
          >
            <ChevronLeft className="w-5 h-5 mr-2 text-gray-400" />
            <div className="text-left">
              <div className="text-sm text-gray-500">Previous</div>
              <div className="font-medium text-gray-900 truncate">
                {previousDocument.title}
              </div>
            </div>
          </button>
        ) : (
          <div className="flex-1 mr-2" />
        )}

        {nextDocument ? (
          <button
            onClick={() => onNavigate(nextDocument.id)}
            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex-1 ml-2"
          >
            <div className="text-right flex-1">
              <div className="text-sm text-gray-500">Next</div>
              <div className="font-medium text-gray-900 truncate">
                {nextDocument.title}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 ml-2 text-gray-400" />
          </button>
        ) : (
          <div className="flex-1 ml-2" />
        )}
      </div>

      {/* Related Documents */}
      {relatedDocuments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Related Documents
          </h3>
          <div className="space-y-3">
            {relatedDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onNavigate(doc.id)}
                className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 flex-1 pr-2">
                    {doc.title}
                  </h4>
                  <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {doc.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(doc.difficulty)}`}>
                      {doc.difficulty}
                    </span>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {doc.readTime}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500">
                    <Star className="w-3 h-3 mr-1" />
                    {doc.popularity}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Document Info */}
      {currentDocument && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            Currently Reading
          </h3>
          <div className="text-sm text-blue-800">
            {currentDocument.title}
          </div>
          <div className="flex items-center mt-2 space-x-4 text-xs text-blue-600">
            <span>Category: {currentDocument.category.replace('-', ' ')}</span>
            <span>Difficulty: {currentDocument.difficulty}</span>
            <span>Read time: {currentDocument.readTime}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentNavigation;