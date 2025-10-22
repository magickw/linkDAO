/**
 * Language Selector Component for Support Documentation
 * Provides language switching functionality with cultural adaptation
 */

import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';
import { internationalizationService, SupportedLanguage } from '../../services/internationalizationService';

interface LanguageSelectorProps {
  className?: string;
  showProgress?: boolean;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  showProgress = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [translationProgress, setTranslationProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize language data
    const initializeLanguageData = async () => {
      try {
        await internationalizationService.initialize();
        setCurrentLanguage(internationalizationService.getCurrentLanguage());
        setSupportedLanguages(internationalizationService.getSupportedLanguages());
        
        if (showProgress) {
          setTranslationProgress(internationalizationService.getTranslationProgress());
        }
      } catch (error) {
        console.error('Failed to initialize language data:', error);
      }
    };

    initializeLanguageData();

    // Listen for language changes
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLanguage(event.detail.language);
    };

    window.addEventListener('support-language-changed', handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener('support-language-changed', handleLanguageChange as EventListener);
    };
  }, [showProgress]);

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      await internationalizationService.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLanguageInfo = (): SupportedLanguage | null => {
    return supportedLanguages.find(lang => lang.code === currentLanguage) || null;
  };

  const currentLang = getCurrentLanguageInfo();

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          disabled={loading}
        >
          <GlobeAltIcon className="h-4 w-4" />
          <span>{currentLang?.flag}</span>
          <ChevronDownIcon className="h-3 w-3" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
            <div className="py-1">
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    language.code === currentLanguage ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{language.flag}</span>
                    <span>{language.nativeName}</span>
                  </div>
                  {language.code === currentLanguage && (
                    <CheckIcon className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
      >
        <GlobeAltIcon className="h-5 w-5 text-gray-500" />
        <div className="flex items-center space-x-2">
          <span className="text-lg">{currentLang?.flag}</span>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {currentLang?.nativeName}
            </div>
            <div className="text-xs text-gray-500">
              {currentLang?.name}
            </div>
          </div>
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Select Language
              </h3>
              <p className="text-xs text-gray-600">
                Choose your preferred language for support documentation
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    language.code === currentLanguage ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{language.flag}</span>
                      <div>
                        <div className={`text-sm font-medium ${
                          language.code === currentLanguage ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {language.nativeName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {language.name} • {language.region}
                        </div>
                        {showProgress && translationProgress[language.code] !== undefined && (
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-300"
                                style={{ width: `${translationProgress[language.code]}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {translationProgress[language.code]}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {language.code === currentLanguage && (
                      <CheckIcon className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {showProgress && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600">
                  Translation progress shows the percentage of documents available in each language.
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};