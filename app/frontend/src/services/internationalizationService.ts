/**
 * Internationalization Service for Support Documentation
 * Handles multi-language support, translation workflows, and cultural adaptation
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  region: string;
  flag: string;
}

export interface DocumentTranslation {
  language: string;
  title: string;
  description: string;
  content: string;
  translatedAt: string;
  translatedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  status: 'draft' | 'translated' | 'reviewed' | 'published';
}

export interface TranslationMetadata {
  originalLanguage: string;
  availableLanguages: string[];
  translationProgress: Record<string, number>;
  lastUpdated: Record<string, string>;
  translationQuality: Record<string, 'machine' | 'human' | 'professional'>;
}

export interface CulturalAdaptation {
  language: string;
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
  addressFormat: string;
  phoneFormat: string;
  culturalNotes: string[];
  localizedExamples: Record<string, string>;
}

class InternationalizationService {
  private supportedLanguages: SupportedLanguage[] = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      rtl: false,
      region: 'US',
      flag: '🇺🇸'
    },
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      rtl: false,
      region: 'ES',
      flag: '🇪🇸'
    },
    {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      rtl: false,
      region: 'FR',
      flag: '🇫🇷'
    },
    {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      rtl: false,
      region: 'DE',
      flag: '🇩🇪'
    },
    {
      code: 'zh',
      name: 'Chinese',
      nativeName: '中文',
      rtl: false,
      region: 'CN',
      flag: '🇨🇳'
    },
    {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      rtl: false,
      region: 'JP',
      flag: '🇯🇵'
    },
    {
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      rtl: false,
      region: 'KR',
      flag: '🇰🇷'
    },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      rtl: true,
      region: 'SA',
      flag: '🇸🇦'
    },
    {
      code: 'pt',
      name: 'Portuguese',
      nativeName: 'Português',
      rtl: false,
      region: 'BR',
      flag: '🇧🇷'
    },
    {
      code: 'ru',
      name: 'Russian',
      nativeName: 'Русский',
      rtl: false,
      region: 'RU',
      flag: '🇷🇺'
    }
  ];

  private currentLanguage: string = 'en';
  private fallbackLanguage: string = 'en';
  private translations: Map<string, Map<string, DocumentTranslation>> = new Map();
  private culturalAdaptations: Map<string, CulturalAdaptation> = new Map();

  /**
   * Initialize internationalization service
   */
  async initialize(): Promise<void> {
    try {
      // Detect user's preferred language
      this.currentLanguage = this.detectUserLanguage();
      
      // Load translations for current language
      await this.loadTranslations(this.currentLanguage);
      
      // Load cultural adaptations
      await this.loadCulturalAdaptations(this.currentLanguage);
      
      // Set up language change listeners
      this.setupLanguageChangeListeners();
      
      console.log(`Internationalization initialized for language: ${this.currentLanguage}`);
    } catch (error) {
      console.error('Failed to initialize internationalization:', error);
      // Fallback to English
      this.currentLanguage = this.fallbackLanguage;
    }
  }

  /**
   * Detect user's preferred language from browser settings
   */
  private detectUserLanguage(): string {
    // Check localStorage for saved preference
    const savedLanguage = localStorage.getItem('support-docs-language');
    if (savedLanguage && this.isLanguageSupported(savedLanguage)) {
      return savedLanguage;
    }

    // Check browser language preferences
    const browserLanguages = navigator.languages || [navigator.language];
    
    for (const lang of browserLanguages) {
      const langCode = lang.split('-')[0].toLowerCase();
      if (this.isLanguageSupported(langCode)) {
        return langCode;
      }
    }

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && this.isLanguageSupported(urlLang)) {
      return urlLang;
    }

    return this.fallbackLanguage;
  }

  /**
   * Check if a language is supported
   */
  private isLanguageSupported(languageCode: string): boolean {
    return this.supportedLanguages.some(lang => lang.code === languageCode);
  }

  /**
   * Load translations for a specific language
   */
  private async loadTranslations(languageCode: string): Promise<void> {
    try {
      const response = await fetch(`/api/support/translations/${languageCode}`);
      if (response.ok) {
        const translations = await response.json();
        this.translations.set(languageCode, new Map(Object.entries(translations)));
      } else {
        console.warn(`No translations found for language: ${languageCode}`);
      }
    } catch (error) {
      console.error(`Failed to load translations for ${languageCode}:`, error);
    }
  }

  /**
   * Load cultural adaptations for a specific language
   */
  private async loadCulturalAdaptations(languageCode: string): Promise<void> {
    try {
      const response = await fetch(`/api/support/cultural-adaptations/${languageCode}`);
      if (response.ok) {
        const adaptation = await response.json();
        this.culturalAdaptations.set(languageCode, adaptation);
      }
    } catch (error) {
      console.error(`Failed to load cultural adaptations for ${languageCode}:`, error);
    }
  }

  /**
   * Set up language change event listeners
   */
  private setupLanguageChangeListeners(): void {
    // Listen for language change events
    window.addEventListener('languagechange', () => {
      const newLanguage = this.detectUserLanguage();
      if (newLanguage !== this.currentLanguage) {
        this.changeLanguage(newLanguage);
      }
    });

    // Listen for storage changes (language preference updates)
    window.addEventListener('storage', (event) => {
      if (event.key === 'support-docs-language' && event.newValue) {
        this.changeLanguage(event.newValue);
      }
    });
  }

  /**
   * Change the current language
   */
  async changeLanguage(languageCode: string): Promise<void> {
    if (!this.isLanguageSupported(languageCode)) {
      console.warn(`Unsupported language: ${languageCode}`);
      return;
    }

    this.currentLanguage = languageCode;
    
    // Save preference
    localStorage.setItem('support-docs-language', languageCode);
    
    // Load translations if not already loaded
    if (!this.translations.has(languageCode)) {
      await this.loadTranslations(languageCode);
    }
    
    // Load cultural adaptations if not already loaded
    if (!this.culturalAdaptations.has(languageCode)) {
      await this.loadCulturalAdaptations(languageCode);
    }
    
    // Update document direction for RTL languages
    const language = this.getLanguageInfo(languageCode);
    if (language) {
      document.documentElement.dir = language.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = languageCode;
    }
    
    // Dispatch language change event
    window.dispatchEvent(new CustomEvent('support-language-changed', {
      detail: { language: languageCode }
    }));
  }

  /**
   * Get information about a language
   */
  getLanguageInfo(languageCode: string): SupportedLanguage | null {
    return this.supportedLanguages.find(lang => lang.code === languageCode) || null;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return [...this.supportedLanguages];
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get translated document
   */
  getTranslatedDocument(documentId: string, languageCode?: string): DocumentTranslation | null {
    const lang = languageCode || this.currentLanguage;
    const langTranslations = this.translations.get(lang);
    return langTranslations?.get(documentId) || null;
  }

  /**
   * Check if document has translation in specific language
   */
  hasTranslation(documentId: string, languageCode?: string): boolean {
    const lang = languageCode || this.currentLanguage;
    return this.getTranslatedDocument(documentId, lang) !== null;
  }

  /**
   * Get available languages for a document
   */
  getAvailableLanguagesForDocument(documentId: string): string[] {
    const availableLanguages: string[] = [];
    
    for (const [lang, translations] of this.translations) {
      if (translations.has(documentId)) {
        availableLanguages.push(lang);
      }
    }
    
    return availableLanguages;
  }

  /**
   * Get cultural adaptation for current language
   */
  getCulturalAdaptation(languageCode?: string): CulturalAdaptation | null {
    const lang = languageCode || this.currentLanguage;
    return this.culturalAdaptations.get(lang) || null;
  }

  /**
   * Format date according to cultural preferences
   */
  formatDate(date: Date, languageCode?: string): string {
    const lang = languageCode || this.currentLanguage;
    const adaptation = this.getCulturalAdaptation(lang);
    
    if (adaptation?.dateFormat) {
      return new Intl.DateTimeFormat(lang, {
        dateStyle: 'medium'
      }).format(date);
    }
    
    return date.toLocaleDateString(lang);
  }

  /**
   * Format number according to cultural preferences
   */
  formatNumber(number: number, languageCode?: string): string {
    const lang = languageCode || this.currentLanguage;
    return new Intl.NumberFormat(lang).format(number);
  }

  /**
   * Format currency according to cultural preferences
   */
  formatCurrency(amount: number, currency: string = 'USD', languageCode?: string): string {
    const lang = languageCode || this.currentLanguage;
    return new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Get localized example for a concept
   */
  getLocalizedExample(concept: string, languageCode?: string): string | null {
    const lang = languageCode || this.currentLanguage;
    const adaptation = this.getCulturalAdaptation(lang);
    return adaptation?.localizedExamples[concept] || null;
  }

  /**
   * Get translation progress for all languages
   */
  getTranslationProgress(): Record<string, number> {
    const progress: Record<string, number> = {};
    
    // Get total number of documents (from English)
    const englishTranslations = this.translations.get('en');
    const totalDocuments = englishTranslations?.size || 0;
    
    if (totalDocuments === 0) {
      return progress;
    }
    
    // Calculate progress for each language
    for (const [lang, translations] of this.translations) {
      const translatedCount = translations.size;
      progress[lang] = Math.round((translatedCount / totalDocuments) * 100);
    }
    
    return progress;
  }

  /**
   * Search documents in specific language
   */
  searchDocuments(query: string, languageCode?: string): DocumentTranslation[] {
    const lang = languageCode || this.currentLanguage;
    const langTranslations = this.translations.get(lang);
    
    if (!langTranslations) {
      return [];
    }
    
    const results: DocumentTranslation[] = [];
    const searchTerm = query.toLowerCase();
    
    for (const translation of langTranslations.values()) {
      const titleMatch = translation.title.toLowerCase().includes(searchTerm);
      const descriptionMatch = translation.description.toLowerCase().includes(searchTerm);
      const contentMatch = translation.content.toLowerCase().includes(searchTerm);
      
      if (titleMatch || descriptionMatch || contentMatch) {
        results.push(translation);
      }
    }
    
    return results;
  }

  /**
   * Get translation workflow status
   */
  getTranslationWorkflowStatus(documentId: string): Record<string, string> {
    const status: Record<string, string> = {};
    
    for (const [lang, translations] of this.translations) {
      const translation = translations.get(documentId);
      if (translation) {
        status[lang] = translation.status;
      } else {
        status[lang] = 'not_started';
      }
    }
    
    return status;
  }
}

export const internationalizationService = new InternationalizationService();