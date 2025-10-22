/**
 * React Hook for Internationalization Support
 * Provides easy access to translation and localization features
 */

import { useState, useEffect, useCallback } from 'react';
import { internationalizationService, DocumentTranslation, SupportedLanguage, CulturalAdaptation } from '../services/internationalizationService';

interface UseInternationalizationReturn {
  currentLanguage: string;
  supportedLanguages: SupportedLanguage[];
  isRTL: boolean;
  loading: boolean;
  error: string | null;

  // Language management
  changeLanguage: (languageCode: string) => Promise<void>;
  getLanguageInfo: (languageCode?: string) => SupportedLanguage | null;
  getCulturalAdaptation: () => CulturalAdaptation | null;

  // Document translation
  getTranslatedDocument: (documentId: string, languageCode?: string) => DocumentTranslation | null;
  hasTranslation: (documentId: string, languageCode?: string) => boolean;
  getAvailableLanguagesForDocument: (documentId: string) => string[];

  // Cultural adaptation
  formatDate: (date: Date, languageCode?: string) => string;
  formatNumber: (number: number, languageCode?: string) => string;
  formatCurrency: (amount: number, currency?: string, languageCode?: string) => string;
  getLocalizedExample: (concept: string, languageCode?: string) => string | null;

  // Search and discovery
  searchDocuments: (query: string, languageCode?: string) => DocumentTranslation[];
  getTranslationProgress: () => Record<string, number>;
  getTranslationWorkflowStatus: (documentId: string) => Record<string, string>;
}

export const useInternationalization = (): UseInternationalizationReturn => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize internationalization service
  useEffect(() => {
    const initializeI18n = async () => {
      try {
        setLoading(true);
        setError(null);
        
        await internationalizationService.initialize();
        
        setCurrentLanguage(internationalizationService.getCurrentLanguage());
        setSupportedLanguages(internationalizationService.getSupportedLanguages());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize internationalization');
        console.error('Internationalization initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeI18n();
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLanguage(event.detail.language);
    };

    window.addEventListener('support-language-changed', handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener('support-language-changed', handleLanguageChange as EventListener);
    };
  }, []);

  // Check if current language is RTL
  const isRTL = supportedLanguages.find(lang => lang.code === currentLanguage)?.rtl || false;

  // Change language
  const changeLanguage = useCallback(async (languageCode: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await internationalizationService.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change language');
      console.error('Language change error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get language information
  const getLanguageInfo = useCallback((languageCode?: string) => {
    return internationalizationService.getLanguageInfo(languageCode || currentLanguage);
  }, [currentLanguage]);

  // Get translated document
  const getTranslatedDocument = useCallback((documentId: string, languageCode?: string) => {
    return internationalizationService.getTranslatedDocument(documentId, languageCode);
  }, []);

  // Check if document has translation
  const hasTranslation = useCallback((documentId: string, languageCode?: string) => {
    return internationalizationService.hasTranslation(documentId, languageCode);
  }, []);

  // Get available languages for document
  const getAvailableLanguagesForDocument = useCallback((documentId: string) => {
    return internationalizationService.getAvailableLanguagesForDocument(documentId);
  }, []);

  // Format date
  const formatDate = useCallback((date: Date, languageCode?: string) => {
    return internationalizationService.formatDate(date, languageCode);
  }, []);

  // Format number
  const formatNumber = useCallback((number: number, languageCode?: string) => {
    return internationalizationService.formatNumber(number, languageCode);
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount: number, currency: string = 'USD', languageCode?: string) => {
    return internationalizationService.formatCurrency(amount, currency, languageCode);
  }, []);

  // Get localized example
  const getLocalizedExample = useCallback((concept: string, languageCode?: string) => {
    return internationalizationService.getLocalizedExample(concept, languageCode);
  }, []);

  // Search documents
  const searchDocuments = useCallback((query: string, languageCode?: string) => {
    return internationalizationService.searchDocuments(query, languageCode);
  }, []);

  // Get translation progress
  const getTranslationProgress = useCallback(() => {
    return internationalizationService.getTranslationProgress();
  }, []);

  // Get translation workflow status
  const getTranslationWorkflowStatus = useCallback((documentId: string) => {
    return internationalizationService.getTranslationWorkflowStatus(documentId);
  }, []);

  // Get cultural adaptation
  const getCulturalAdaptation = useCallback(() => {
    return internationalizationService.getCulturalAdaptation(currentLanguage);
  }, [currentLanguage]);

  return {
    currentLanguage,
    supportedLanguages,
    isRTL,
    loading,
    error,
    changeLanguage,
    getLanguageInfo,
    getCulturalAdaptation,
    getTranslatedDocument,
    hasTranslation,
    getAvailableLanguagesForDocument,
    formatDate,
    formatNumber,
    formatCurrency,
    getLocalizedExample,
    searchDocuments,
    getTranslationProgress,
    getTranslationWorkflowStatus
  };
};

/**
 * Hook for document-specific internationalization
 */
export const useDocumentInternationalization = (documentId: string) => {
  const i18n = useInternationalization();
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [translationStatus, setTranslationStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (documentId) {
      setAvailableLanguages(i18n.getAvailableLanguagesForDocument(documentId));
      setTranslationStatus(i18n.getTranslationWorkflowStatus(documentId));
    }
  }, [documentId, i18n]);

  const getDocumentInLanguage = useCallback((languageCode?: string) => {
    return i18n.getTranslatedDocument(documentId, languageCode);
  }, [documentId, i18n]);

  const hasDocumentTranslation = useCallback((languageCode?: string) => {
    return i18n.hasTranslation(documentId, languageCode);
  }, [documentId, i18n]);

  return {
    ...i18n,
    availableLanguages,
    translationStatus,
    getDocumentInLanguage,
    hasDocumentTranslation
  };
};