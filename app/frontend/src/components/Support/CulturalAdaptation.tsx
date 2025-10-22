/**
 * Cultural Adaptation Component
 * Provides cultural adaptation features for different regions
 */

import React, { useState, useEffect } from 'react';
import {
  GlobeAltIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useInternationalization } from '../../hooks/useInternationalization';

interface CulturalExample {
  concept: string;
  description: string;
  examples: Record<string, string>;
  icon: React.ComponentType<{ className?: string }>;
}

interface CulturalAdaptationProps {
  documentId?: string;
  className?: string;
}

export const CulturalAdaptation: React.FC<CulturalAdaptationProps> = ({
  documentId,
  className = ''
}) => {
  const {
    currentLanguage,
    getLanguageInfo,
    getCulturalAdaptation,
    formatDate,
    formatNumber,
    formatCurrency,
    getLocalizedExample
  } = useInternationalization();

  const [culturalExamples, setCulturalExamples] = useState<CulturalExample[]>([]);
  const [showAdaptations, setShowAdaptations] = useState(false);

  const currentLang = getLanguageInfo();
  const culturalAdaptation = getCulturalAdaptation();

  useEffect(() => {
    // Load cultural examples based on current language
    const examples: CulturalExample[] = [
      {
        concept: 'currency',
        description: 'Currency formats and common denominations',
        examples: {
          en: '$1,000.00 USD (US Dollar)',
          es: '€1.000,00 EUR (Euro)',
          fr: '1 000,00 € EUR (Euro)',
          de: '1.000,00 € EUR (Euro)',
          zh: '¥1,000.00 CNY (Chinese Yuan)',
          ja: '¥1,000 JPY (Japanese Yen)',
          ko: '₩1,000,000 KRW (Korean Won)',
          ar: '1,000.00 ر.س SAR (Saudi Riyal)',
          pt: 'R$ 1.000,00 BRL (Brazilian Real)',
          ru: '1 000,00 ₽ RUB (Russian Ruble)'
        },
        icon: CurrencyDollarIcon
      },
      {
        concept: 'date',
        description: 'Date formats and calendar systems',
        examples: {
          en: 'MM/DD/YYYY (12/25/2023)',
          es: 'DD/MM/YYYY (25/12/2023)',
          fr: 'DD/MM/YYYY (25/12/2023)',
          de: 'DD.MM.YYYY (25.12.2023)',
          zh: 'YYYY年MM月DD日 (2023年12月25日)',
          ja: 'YYYY年MM月DD日 (2023年12月25日)',
          ko: 'YYYY.MM.DD (2023.12.25)',
          ar: 'DD/MM/YYYY (٢٥/١٢/٢٠٢٣)',
          pt: 'DD/MM/YYYY (25/12/2023)',
          ru: 'DD.MM.YYYY (25.12.2023)'
        },
        icon: CalendarIcon
      },
      {
        concept: 'time',
        description: 'Time formats and conventions',
        examples: {
          en: '12-hour format (2:30 PM)',
          es: '24-hour format (14:30)',
          fr: '24-hour format (14h30)',
          de: '24-hour format (14:30 Uhr)',
          zh: '24-hour format (14:30)',
          ja: '24-hour format (14:30)',
          ko: '12-hour format (오후 2:30)',
          ar: '12-hour format (٢:٣٠ م)',
          pt: '24-hour format (14h30)',
          ru: '24-hour format (14:30)'
        },
        icon: ClockIcon
      },
      {
        concept: 'address',
        description: 'Address formats and postal systems',
        examples: {
          en: '123 Main St, City, State 12345, USA',
          es: 'Calle Principal 123, 28001 Madrid, España',
          fr: '123 Rue Principale, 75001 Paris, France',
          de: 'Hauptstraße 123, 10115 Berlin, Deutschland',
          zh: '中国北京市朝阳区主要街道123号 100001',
          ja: '〒100-0001 東京都千代田区主要通り123',
          ko: '서울특별시 강남구 주요로 123, 06001',
          ar: 'شارع الرئيسي 123، الرياض 12345، السعودية',
          pt: 'Rua Principal, 123, 01000-000 São Paulo, Brasil',
          ru: 'Главная улица, 123, Москва, 101000, Россия'
        },
        icon: MapPinIcon
      },
      {
        concept: 'phone',
        description: 'Phone number formats',
        examples: {
          en: '+1 (555) 123-4567',
          es: '+34 912 34 56 78',
          fr: '+33 1 23 45 67 89',
          de: '+49 30 12345678',
          zh: '+86 138 0013 8000',
          ja: '+81 3-1234-5678',
          ko: '+82 2-1234-5678',
          ar: '+966 11 123 4567',
          pt: '+55 11 91234-5678',
          ru: '+7 495 123-45-67'
        },
        icon: PhoneIcon
      }
    ];

    setCulturalExamples(examples);
  }, [currentLanguage]);

  // Get example for current language
  const getCurrentExample = (concept: string): string => {
    const localizedExample = getLocalizedExample(concept);
    if (localizedExample) {
      return localizedExample;
    }

    const example = culturalExamples.find(ex => ex.concept === concept);
    return example?.examples[currentLanguage] || example?.examples['en'] || 'No example available';
  };

  // Format sample values using cultural preferences
  const getSampleFormattedValues = () => {
    const now = new Date();
    const sampleAmount = 1234.56;
    const sampleNumber = 1234567.89;

    return {
      date: formatDate(now),
      currency: formatCurrency(sampleAmount),
      number: formatNumber(sampleNumber)
    };
  };

  const sampleValues = getSampleFormattedValues();

  if (!currentLang || currentLanguage === 'en') {
    return null; // Don't show for English or if no language info
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <GlobeAltIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-900">
            Cultural Adaptations for {currentLang.nativeName}
          </h3>
          <span className="text-lg">{currentLang.flag}</span>
        </div>
        <button
          onClick={() => setShowAdaptations(!showAdaptations)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showAdaptations ? 'Hide' : 'Show'} Details
        </button>
      </div>

      <div className="text-sm text-blue-800 mb-3">
        This content has been adapted for {currentLang.region} cultural conventions and formats.
      </div>

      {/* Quick Format Examples */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="bg-white rounded p-3 border border-blue-200">
          <div className="text-xs text-gray-600 mb-1">Date Format</div>
          <div className="font-medium text-gray-900">{sampleValues.date}</div>
        </div>
        <div className="bg-white rounded p-3 border border-blue-200">
          <div className="text-xs text-gray-600 mb-1">Currency Format</div>
          <div className="font-medium text-gray-900">{sampleValues.currency}</div>
        </div>
        <div className="bg-white rounded p-3 border border-blue-200">
          <div className="text-xs text-gray-600 mb-1">Number Format</div>
          <div className="font-medium text-gray-900">{sampleValues.number}</div>
        </div>
      </div>

      {/* Detailed Cultural Adaptations */}
      {showAdaptations && (
        <div className="space-y-4">
          <div className="border-t border-blue-200 pt-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">
              Regional Format Examples
            </h4>
            
            <div className="grid gap-4">
              {culturalExamples.map((example) => {
                const Icon = example.icon;
                const currentExample = getCurrentExample(example.concept);
                
                return (
                  <div key={example.concept} className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start space-x-3">
                      <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 capitalize mb-1">
                          {example.concept}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {example.description}
                        </div>
                        <div className="bg-blue-50 rounded p-2 border border-blue-100">
                          <div className="text-sm font-medium text-blue-900">
                            {currentExample}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cultural Notes */}
          {culturalAdaptation?.culturalNotes && culturalAdaptation.culturalNotes.length > 0 && (
            <div className="border-t border-blue-200 pt-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                <InformationCircleIcon className="h-4 w-4" />
                <span>Cultural Notes</span>
              </h4>
              <div className="space-y-2">
                {culturalAdaptation.culturalNotes.map((note, index) => (
                  <div key={index} className="bg-white rounded p-3 border border-blue-200">
                    <div className="text-sm text-gray-700">{note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Language-Specific Information */}
          <div className="border-t border-blue-200 pt-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">
              Language Information
            </h4>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Language:</span>
                  <span className="ml-2 font-medium">{currentLang.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Native Name:</span>
                  <span className="ml-2 font-medium">{currentLang.nativeName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Region:</span>
                  <span className="ml-2 font-medium">{currentLang.region}</span>
                </div>
                <div>
                  <span className="text-gray-600">Text Direction:</span>
                  <span className="ml-2 font-medium">{currentLang.rtl ? 'Right-to-Left' : 'Left-to-Right'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Localization Tips */}
          <div className="border-t border-blue-200 pt-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">
              Localization Tips
            </h4>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="space-y-2 text-sm text-gray-700">
                <p>• All dates and times are displayed in your local format</p>
                <p>• Currency amounts use your regional currency and formatting</p>
                <p>• Phone numbers and addresses follow local conventions</p>
                <p>• Examples and references are adapted to your region when possible</p>
                {currentLang.rtl && (
                  <p>• Interface elements are optimized for right-to-left reading</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};