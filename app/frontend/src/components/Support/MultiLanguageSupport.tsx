import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Check, 
  Search, 
  BookOpen, 
  MessageCircle,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

interface TranslatedDocument {
  id: string;
  title: string;
  content: string;
  language: string;
  translatedFrom?: string;
}

const MultiLanguageSupport: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [isTextToSpeechEnabled, setIsTextToSpeechEnabled] = useState(false);
  const [translatedDocuments, setTranslatedDocuments] = useState<TranslatedDocument[]>([]);

  const languages: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' }
  ];

  const currentLanguage = languages.find(lang => lang.code === selectedLanguage) || languages[0];

  // Mock translated documents - in a real implementation, this would come from an API
  useEffect(() => {
    const getTranslatedContent = (langCode: string) => {
      const translations: Record<string, Record<string, { title: string; content: string }>> = {
        'en': {
          '1': { title: 'Beginner\'s Guide to LDAO Tokens', content: 'This guide will help you understand the basics of LDAO tokens...' },
          '2': { title: 'How to Stake Your Tokens', content: 'Learn how to stake your LDAO tokens to earn rewards...' },
          '3': { title: 'Security Best Practices', content: 'Keep your tokens safe with these security recommendations...' }
        },
        'es': {
          '1': { title: 'Guía para Principiantes de Tokens LDAO', content: 'Esta guía te ayudará a entender los conceptos básicos de los tokens LDAO...' },
          '2': { title: 'Cómo Hacer Staking de Tus Tokens', content: 'Aprende cómo hacer staking de tus tokens LDAO para ganar recompensas...' },
          '3': { title: 'Mejores Prácticas de Seguridad', content: 'Mantén tus tokens seguros con estas recomendaciones de seguridad...' }
        },
        'fr': {
          '1': { title: 'Guide du Débutant pour les Tokens LDAO', content: 'Ce guide vous aidera à comprendre les bases des tokens LDAO...' },
          '2': { title: 'Comment Staker vos Tokens', content: 'Apprenez comment staker vos tokens LDAO pour gagner des récompenses...' },
          '3': { title: 'Meilleures Pratiques de Sécurité', content: 'Gardez vos tokens en sécurité avec ces recommandations de sécurité...' }
        },
        'de': {
          '1': { title: 'Anfängerleitfaden für LDAO-Token', content: 'Diese Anleitung hilft Ihnen, die Grundlagen von LDAO-Token zu verstehen...' },
          '2': { title: 'Wie man Ihre Tokens staked', content: 'Lernen Sie, wie Sie Ihre LDAO-Token staken können, um Belohnungen zu verdienen...' },
          '3': { title: 'Sicherheitsbest Practices', content: 'Halten Sie Ihre Token mit diesen Sicherheitsempfehlungen sicher...' }
        },
        'zh': {
          '1': { title: 'LDAO代币初学者指南', content: '本指南将帮助您了解LDAO代币的基础知识...' },
          '2': { title: '如何质押您的代币', content: '学习如何质押您的LDAO代币以获得奖励...' },
          '3': { title: '安全最佳实践', content: '通过这些安全建议保护您的代币安全...' }
        }
      };
      return translations[langCode] || translations['en'];
    };

    const languageData = translations[selectedLanguage as keyof typeof translations] || translations['en'];
    
    const mockDocuments: TranslatedDocument[] = [
      {
        id: '1',
        title: languageData['1'].title,
        content: languageData['1'].content,
        language: selectedLanguage
      },
      {
        id: '2',
        title: languageData['2'].title,
        content: languageData['2'].content,
        language: selectedLanguage
      },
      {
        id: '3',
        title: languageData['3'].title,
        content: languageData['3'].content,
        language: selectedLanguage
      }
    ];
    
    setTranslatedDocuments(mockDocuments);
  }, [selectedLanguage]);

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setIsLanguageSelectorOpen(false);
  };

  const handleTranslationRequest = async () => {
    const currentDoc = translatedDocuments[0];
    if (currentDoc) {
      try {
        // Simulate API call to translation service
        const response = await fetch('/api/translation/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: currentDoc.id,
            targetLanguage: selectedLanguage,
            sourceLanguage: currentDoc.language
          })
        });
        
        if (response.ok) {
          alert(`Translation request submitted successfully for "${currentDoc.title}"`);
        } else {
          throw new Error('Translation request failed');
        }
      } catch (error) {
        console.error('Translation request error:', error);
        alert('Translation request failed. Please try again later.');
      }
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const lang = languages.find(l => l.code === selectedLanguage);
      utterance.lang = lang ? `${lang.code}-${lang.code.toUpperCase()}` : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  const filteredDocuments = translatedDocuments.filter(doc => 
    doc.title.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(documentSearchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Language Selector Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Globe className="w-5 h-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-900">Language Support</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsLanguageSelectorOpen(!isLanguageSelectorOpen)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="text-lg">{currentLanguage.flag}</span>
              <span className="text-sm font-medium">{currentLanguage.nativeName}</span>
            </button>
            
            {isLanguageSelectorOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="p-2">
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search languages..."
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={languageSearchQuery}
                      onChange={(e) => setLanguageSearchQuery(e.target.value)}
                      aria-label="Search languages"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {languages
                      .filter(lang => 
                        lang.name.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
                        lang.nativeName.toLowerCase().includes(languageSearchQuery.toLowerCase())
                      )
                      .map((language) => (
                        <button
                          key={language.code}
                          onClick={() => handleLanguageChange(language.code)}
                          className={`w-full flex items-center p-2 rounded-lg text-left hover:bg-gray-100 ${
                            selectedLanguage === language.code ? 'bg-blue-50' : ''
                          }`}
                        >
                          <span className="text-lg mr-3">{language.flag}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{language.name}</div>
                            <div className="text-xs text-gray-500">{language.nativeName}</div>
                          </div>
                          {selectedLanguage === language.code && (
                            <Check className="w-5 h-5 text-blue-600" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Documentation in {currentLanguage.name}</h3>
          <button
            onClick={() => setIsTextToSpeechEnabled(!isTextToSpeechEnabled)}
            className={`p-2 rounded-lg ${
              isTextToSpeechEnabled 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isTextToSpeechEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Document Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={documentSearchQuery}
              onChange={(e) => setDocumentSearchQuery(e.target.value)}
              aria-label="Search documents"
            />
          </div>
        </div>

        {filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div 
                key={doc.id} 
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">{doc.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{doc.content}</p>
                  </div>
                  {isTextToSpeechEnabled && (
                    <button
                      onClick={() => speakText(`${doc.title}. ${doc.content}`)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {currentLanguage.flag} {currentLanguage.name}
                  </span>
                  {doc.translatedFrom && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Translated from {doc.translatedFrom}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No documents available in {currentLanguage.name}</p>
            <p className="text-sm mt-2">Try selecting another language</p>
          </div>
        )}
      </div>

      {/* Translation Request */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Need translation in another language?</h4>
            <p className="text-sm text-gray-600">Request translation for this document</p>
          </div>
          <button 
            onClick={handleTranslationRequest}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            aria-label="Request translation for current document"
          >
            Request Translation
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiLanguageSupport;