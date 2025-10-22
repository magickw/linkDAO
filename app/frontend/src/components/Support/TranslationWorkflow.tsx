/**
 * Translation Workflow Component
 * Manages document translation process and workflow status
 */

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  LanguageIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useInternationalization } from '../../hooks/useInternationalization';

interface TranslationWorkflowProps {
  documentId: string;
  onTranslationUpdate?: (documentId: string, language: string, status: string) => void;
}

interface TranslationWorkflowItem {
  language: string;
  languageName: string;
  flag: string;
  status: 'not_started' | 'draft' | 'translated' | 'reviewed' | 'published';
  translatedBy?: string;
  translatedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  progress: number;
  quality: 'machine' | 'human' | 'professional';
}

export const TranslationWorkflow: React.FC<TranslationWorkflowProps> = ({
  documentId,
  onTranslationUpdate
}) => {
  const { 
    supportedLanguages, 
    getTranslationWorkflowStatus,
    formatDate 
  } = useInternationalization();
  
  const [workflowItems, setWorkflowItems] = useState<TranslationWorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  useEffect(() => {
    loadTranslationWorkflow();
  }, [documentId]);

  const loadTranslationWorkflow = async () => {
    try {
      setLoading(true);
      
      const translationStatus = getTranslationWorkflowStatus(documentId);
      
      const items: TranslationWorkflowItem[] = supportedLanguages.map(lang => {
        const status = translationStatus[lang.code] || 'not_started';
        
        return {
          language: lang.code,
          languageName: lang.nativeName,
          flag: lang.flag,
          status: status as TranslationWorkflowItem['status'],
          progress: getProgressForStatus(status),
          quality: getQualityForLanguage(lang.code)
        };
      });
      
      setWorkflowItems(items);
    } catch (error) {
      console.error('Failed to load translation workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressForStatus = (status: string): number => {
    switch (status) {
      case 'not_started': return 0;
      case 'draft': return 25;
      case 'translated': return 75;
      case 'reviewed': return 90;
      case 'published': return 100;
      default: return 0;
    }
  };

  const getQualityForLanguage = (languageCode: string): 'machine' | 'human' | 'professional' => {
    // This would typically come from the translation service
    // For now, we'll use some defaults
    const highQualityLanguages = ['en', 'es', 'fr', 'de'];
    const mediumQualityLanguages = ['zh', 'ja', 'ko', 'pt'];
    
    if (highQualityLanguages.includes(languageCode)) {
      return 'professional';
    } else if (mediumQualityLanguages.includes(languageCode)) {
      return 'human';
    } else {
      return 'machine';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not_started':
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
      case 'draft':
        return <DocumentTextIcon className="h-5 w-5 text-yellow-500" />;
      case 'translated':
        return <LanguageIcon className="h-5 w-5 text-blue-500" />;
      case 'reviewed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'published':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'translated': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-green-200 text-green-900';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getQualityBadge = (quality: 'machine' | 'human' | 'professional') => {
    const colors = {
      machine: 'bg-gray-100 text-gray-700',
      human: 'bg-blue-100 text-blue-700',
      professional: 'bg-purple-100 text-purple-700'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[quality]}`}>
        {quality.charAt(0).toUpperCase() + quality.slice(1)}
      </span>
    );
  };

  const handleStatusUpdate = async (language: string, newStatus: string) => {
    try {
      // Update local state
      setWorkflowItems(items => 
        items.map(item => 
          item.language === language 
            ? { ...item, status: newStatus as TranslationWorkflowItem['status'], progress: getProgressForStatus(newStatus) }
            : item
        )
      );
      
      // Notify parent component
      onTranslationUpdate?.(documentId, language, newStatus);
      
      // Here you would typically make an API call to update the backend
      console.log(`Updated translation status for ${language}: ${newStatus}`);
    } catch (error) {
      console.error('Failed to update translation status:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Translation Workflow
        </h3>
        <div className="text-sm text-gray-600">
          Document ID: {documentId}
        </div>
      </div>

      <div className="grid gap-4">
        {workflowItems.map((item) => (
          <div
            key={item.language}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{item.flag}</span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {item.languageName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.language.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusIcon(item.status)}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {getQualityBadge(item.quality)}
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {item.progress}%
                  </div>
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {item.status !== 'not_started' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {item.translatedBy && (
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Translated by:</span>
                      <span className="font-medium">{item.translatedBy}</span>
                    </div>
                  )}
                  
                  {item.translatedAt && (
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Translated:</span>
                      <span className="font-medium">
                        {formatDate(new Date(item.translatedAt))}
                      </span>
                    </div>
                  )}
                  
                  {item.reviewedBy && (
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Reviewed by:</span>
                      <span className="font-medium">{item.reviewedBy}</span>
                    </div>
                  )}
                  
                  {item.reviewedAt && (
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Reviewed:</span>
                      <span className="font-medium">
                        {formatDate(new Date(item.reviewedAt))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons for workflow management */}
            <div className="mt-4 flex space-x-2">
              {item.status === 'not_started' && (
                <button
                  onClick={() => handleStatusUpdate(item.language, 'draft')}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Start Translation
                </button>
              )}
              
              {item.status === 'draft' && (
                <button
                  onClick={() => handleStatusUpdate(item.language, 'translated')}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Mark as Translated
                </button>
              )}
              
              {item.status === 'translated' && (
                <button
                  onClick={() => handleStatusUpdate(item.language, 'reviewed')}
                  className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  Mark as Reviewed
                </button>
              )}
              
              {item.status === 'reviewed' && (
                <button
                  onClick={() => handleStatusUpdate(item.language, 'published')}
                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  Publish
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Translation Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {['not_started', 'draft', 'translated', 'reviewed', 'published'].map(status => {
            const count = workflowItems.filter(item => item.status === status).length;
            return (
              <div key={status} className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600 capitalize">
                  {status.replace('_', ' ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};