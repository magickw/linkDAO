/**
 * AI Web3 Translation Assistant
 * Translates between different Web3 terminologies and explains complex concepts
 */

import React, { useState, useEffect } from 'react';
import { 
  Languages, Brain, BookOpen, Lightbulb, 
  ArrowRight, Copy, Volume2, VolumeX,
  CheckCircle, AlertCircle, Info, Zap,
  Globe, Users, Wallet, Shield, Target
} from 'lucide-react';

interface TranslationRequest {
  id: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: 'general' | 'defi' | 'nft' | 'governance' | 'trading' | 'technical';
  timestamp: Date;
}

interface TranslationResult {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  alternatives: string[];
  explanation?: string;
  relatedTerms: string[];
  context: string;
}

interface Web3Term {
  term: string;
  definition: string;
  category: string;
  examples: string[];
  relatedTerms: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface LanguageSupport {
  code: string;
  name: string;
  flag: string;
  web3Support: 'full' | 'partial' | 'basic';
  supportedContexts: string[];
}

const Web3TranslationAssistant: React.FC<{
  className?: string;
  onTranslationComplete?: (result: TranslationResult) => void;
  onTermExplained?: (term: Web3Term) => void;
}> = ({ className = '', onTranslationComplete, onTermExplained }) => {
  const [translationInput, setTranslationInput] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [context, setContext] = useState<'general' | 'defi' | 'nft' | 'governance' | 'trading' | 'technical'>('general');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Web3Term | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [supportedLanguages] = useState<LanguageSupport[]>([
    { code: 'en', name: 'English', flag: '🇺🇸', web3Support: 'full', supportedContexts: ['general', 'defi', 'nft', 'governance', 'trading', 'technical'] },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', web3Support: 'full', supportedContexts: ['general', 'defi', 'nft', 'governance', 'trading'] },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', web3Support: 'full', supportedContexts: ['general', 'defi', 'nft', 'trading'] },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', web3Support: 'partial', supportedContexts: ['general', 'defi', 'nft'] },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', web3Support: 'partial', supportedContexts: ['general', 'defi', 'nft'] },
    { code: 'fr', name: 'French', flag: '🇫🇷', web3Support: 'partial', supportedContexts: ['general', 'defi', 'nft'] },
    { code: 'de', name: 'German', flag: '🇩🇪', web3Support: 'partial', supportedContexts: ['general', 'defi', 'nft'] },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷', web3Support: 'basic', supportedContexts: ['general', 'defi'] },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', web3Support: 'basic', supportedContexts: ['general', 'defi'] },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', web3Support: 'basic', supportedContexts: ['general'] }
  ]);

  const [web3Terms] = useState<Web3Term[]>([
    {
      term: 'DeFi',
      definition: 'Decentralized Finance - Financial services built on blockchain without traditional intermediaries',
      category: 'Finance',
      examples: ['Uniswap', 'Compound', 'Aave'],
      relatedTerms: ['DEX', 'Yield Farming', 'Liquidity'],
      difficulty: 'beginner'
    },
    {
      term: 'Yield Farming',
      definition: 'The practice of earning rewards by providing liquidity to DeFi protocols',
      category: 'Finance',
      examples: ['Staking tokens', 'Providing liquidity', 'Lending assets'],
      relatedTerms: ['APY', 'Liquidity Mining', 'Staking'],
      difficulty: 'intermediate'
    },
    {
      term: 'Smart Contract',
      definition: 'Self-executing contracts with terms directly written into code',
      category: 'Technology',
      examples: ['Token contracts', 'DEX contracts', 'Governance contracts'],
      relatedTerms: ['Solidity', 'EVM', 'Gas'],
      difficulty: 'beginner'
    },
    {
      term: 'MEV',
      definition: 'Maximal Extractable Value - Profit extracted by reordering, including, or excluding transactions',
      category: 'Advanced',
      examples: ['Front-running', 'Back-running', 'Sandwich attacks'],
      relatedTerms: ['Flashbots', 'MEV-Boost', 'Arbitrage'],
      difficulty: 'advanced'
    },
    {
      term: 'DAO',
      definition: 'Decentralized Autonomous Organization - Organization governed by smart contracts and token holders',
      category: 'Governance',
      examples: ['MakerDAO', 'Compound Governance', 'Uniswap Governance'],
      relatedTerms: ['Governance Token', 'Proposal', 'Voting'],
      difficulty: 'intermediate'
    }
  ]);

  const [recentTranslations] = useState<TranslationResult[]>([
    {
      id: '1',
      originalText: 'Yield farming is a way to earn rewards by providing liquidity',
      translatedText: 'El yield farming es una forma de ganar recompensas proporcionando liquidez',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      confidence: 0.95,
      alternatives: ['El cultivo de rendimiento es una forma de ganar recompensas proporcionando liquidez'],
      explanation: 'Yield farming refers to the practice of earning rewards by providing liquidity to DeFi protocols',
      relatedTerms: ['DeFi', 'Liquidity', 'Rewards'],
      context: 'defi'
    },
    {
      id: '2',
      originalText: 'Smart contracts are self-executing programs on the blockchain',
      translatedText: 'Los contratos inteligentes son programas auto-ejecutables en la blockchain',
      sourceLanguage: 'en',
      targetLanguage: 'es',
      confidence: 0.92,
      alternatives: ['Los contratos inteligentes son programas que se ejecutan automáticamente en la blockchain'],
      explanation: 'Smart contracts automatically execute when predetermined conditions are met',
      relatedTerms: ['Blockchain', 'Ethereum', 'Solidity'],
      context: 'technical'
    }
  ]);

  const translateText = async () => {
    if (!translationInput.trim()) return;

    setIsTranslating(true);

    // Simulate AI translation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const sourceLang = supportedLanguages.find(l => l.code === sourceLanguage);
    const targetLang = supportedLanguages.find(l => l.code === targetLanguage);

    const result: TranslationResult = {
      id: `trans_${Date.now()}`,
      originalText: translationInput,
      translatedText: generateTranslation(translationInput, sourceLanguage, targetLanguage),
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      alternatives: generateAlternatives(translationInput, targetLanguage),
      explanation: generateExplanation(translationInput, context),
      relatedTerms: extractRelatedTerms(translationInput),
      context: context
    };

    setTranslationResults(prev => [result, ...prev]);
    onTranslationComplete?.(result);
    setIsTranslating(false);
  };

  const generateTranslation = (text: string, from: string, to: string): string => {
    // Simulate translation based on context
    const translations: Record<string, Record<string, string>> = {
      'yield farming': {
        'es': 'cultivo de rendimiento',
        'zh': '收益农场',
        'ja': 'イールドファーミング',
        'ko': '수익 농사',
        'fr': 'agriculture de rendement',
        'de': 'Ertragslandwirtschaft',
        'pt': 'agricultura de rendimento',
        'ru': 'фермерство доходности',
        'ar': 'زراعة العائد'
      },
      'smart contract': {
        'es': 'contrato inteligente',
        'zh': '智能合约',
        'ja': 'スマートコントラクト',
        'ko': '스마트 계약',
        'fr': 'contrat intelligent',
        'de': 'intelligenter Vertrag',
        'pt': 'contrato inteligente',
        'ru': 'умный контракт',
        'ar': 'العقد الذكي'
      },
      'decentralized finance': {
        'es': 'finanzas descentralizadas',
        'zh': '去中心化金融',
        'ja': '分散型金融',
        'ko': '탈중앙화 금융',
        'fr': 'finance décentralisée',
        'de': 'dezentrale Finanzen',
        'pt': 'finanças descentralizadas',
        'ru': 'децентрализованные финансы',
        'ar': 'التمويل اللامركزي'
      }
    };

    // Simple translation simulation
    const lowerText = text.toLowerCase();
    for (const [key, translations] of Object.entries(translations)) {
      if (lowerText.includes(key)) {
        return translations[to] || text;
      }
    }

    return `[Translated to ${supportedLanguages.find(l => l.code === to)?.name}: ${text}]`;
  };

  const generateAlternatives = (text: string, targetLang: string): string[] => {
    return [
      `Alternative 1: ${text} (${targetLang})`,
      `Alternative 2: ${text} (${targetLang})`
    ];
  };

  const generateExplanation = (text: string, context: string): string => {
    const explanations: Record<string, string> = {
      'defi': 'This term relates to decentralized finance protocols and applications',
      'nft': 'This term relates to non-fungible tokens and digital collectibles',
      'governance': 'This term relates to DAO governance and voting mechanisms',
      'trading': 'This term relates to cryptocurrency trading and market activities',
      'technical': 'This term relates to blockchain technology and smart contracts',
      'general': 'This is a general Web3 term that may have multiple meanings'
    };
    return explanations[context] || 'This is a Web3-related term';
  };

  const extractRelatedTerms = (text: string): string[] => {
    const terms = ['DeFi', 'NFT', 'DAO', 'Smart Contract', 'Blockchain', 'Token', 'Wallet'];
    return terms.filter(term => text.toLowerCase().includes(term.toLowerCase()));
  };

  const explainTerm = async (term: string) => {
    setIsExplaining(true);
    
    // Simulate AI explanation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundTerm = web3Terms.find(t => 
      t.term.toLowerCase() === term.toLowerCase() ||
      t.definition.toLowerCase().includes(term.toLowerCase())
    );
    
    if (foundTerm) {
      setSelectedTerm(foundTerm);
      onTermExplained?.(foundTerm);
    }
    
    setIsExplaining(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getContextIcon = (context: string) => {
    switch (context) {
      case 'defi': return <Zap size={16} className="text-blue-500" />;
      case 'nft': return <Users size={16} className="text-purple-500" />;
      case 'governance': return <Shield size={16} className="text-green-500" />;
      case 'trading': return <Target size={16} className="text-orange-500" />;
      case 'technical': return <Brain size={16} className="text-red-500" />;
      default: return <Globe size={16} className="text-gray-500" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400';
      case 'intermediate': return 'text-yellow-400';
      case 'advanced': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Languages size={24} className="text-green-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">Web3 Translation Assistant</h2>
            <p className="text-sm text-gray-400">Translate and explain Web3 concepts across languages</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center px-3 py-1 bg-green-900 text-green-300 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            Active
          </div>
        </div>
      </div>

      {/* Translation Input */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Translate Text</h3>
        
        <div className="space-y-4">
          {/* Language Selection */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-1">From</label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
              >
                {supportedLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center pt-6">
              <ArrowRight size={20} className="text-gray-400" />
            </div>
            
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-1">To</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
              >
                {supportedLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Context Selection */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Context</label>
            <select
              value={context}
              onChange={(e) => setContext(e.target.value as any)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
            >
              <option value="general">General Web3</option>
              <option value="defi">DeFi</option>
              <option value="nft">NFTs</option>
              <option value="governance">Governance</option>
              <option value="trading">Trading</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          
          {/* Text Input */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Text to Translate</label>
            <textarea
              value={translationInput}
              onChange={(e) => setTranslationInput(e.target.value)}
              placeholder="Enter Web3 terms, concepts, or text to translate..."
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
              rows={3}
            />
          </div>
          
          <button
            onClick={translateText}
            disabled={!translationInput.trim() || isTranslating}
            className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center"
          >
            {isTranslating ? (
              <>
                <Brain size={16} className="mr-2 animate-pulse" />
                Translating...
              </>
            ) : (
              <>
                <Languages size={16} className="mr-2" />
                Translate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Translation Results */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Translation Results</h3>
        
        <div className="space-y-3">
          {translationResults.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Languages size={48} className="mx-auto mb-3 opacity-50" />
              <p>No translations yet</p>
              <p className="text-sm">Enter text to get AI-powered translations</p>
            </div>
          ) : (
            translationResults.map(result => (
              <div key={result.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {getContextIcon(result.context)}
                    <div className="ml-3">
                      <div className="text-sm text-gray-400 mb-1">
                        {supportedLanguages.find(l => l.code === result.sourceLanguage)?.name} → {supportedLanguages.find(l => l.code === result.targetLanguage)?.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        Confidence: {Math.round(result.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(result.translatedText)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-400 mb-1">Original:</div>
                  <div className="text-white">{result.originalText}</div>
                </div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-400 mb-1">Translation:</div>
                  <div className="text-white font-medium">{result.translatedText}</div>
                </div>
                
                {result.explanation && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 mb-1">Explanation:</div>
                    <div className="text-sm text-gray-300">{result.explanation}</div>
                  </div>
                )}
                
                {result.alternatives.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 mb-1">Alternatives:</div>
                    <div className="space-y-1">
                      {result.alternatives.map((alt, idx) => (
                        <div key={idx} className="text-sm text-gray-300">{alt}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.relatedTerms.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Related Terms:</div>
                    <div className="flex flex-wrap gap-1">
                      {result.relatedTerms.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => explainTerm(term)}
                          className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs hover:bg-blue-800"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Term Explanation */}
      {selectedTerm && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Term Explanation</h3>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <BookOpen size={20} className="text-blue-500 mr-2" />
                <div>
                  <div className="text-xl font-bold text-white">{selectedTerm.term}</div>
                  <div className="text-sm text-gray-400">{selectedTerm.category}</div>
                </div>
              </div>
              
              <div className={`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(selectedTerm.difficulty)}`}>
                {selectedTerm.difficulty.toUpperCase()}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-sm text-gray-400 mb-1">Definition:</div>
              <div className="text-white">{selectedTerm.definition}</div>
            </div>
            
            <div className="mb-3">
              <div className="text-sm text-gray-400 mb-1">Examples:</div>
              <div className="flex flex-wrap gap-1">
                {selectedTerm.examples.map((example, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                    {example}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400 mb-1">Related Terms:</div>
              <div className="flex flex-wrap gap-1">
                {selectedTerm.relatedTerms.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => explainTerm(term)}
                    className="px-2 py-1 bg-green-900 text-green-300 rounded text-sm hover:bg-green-800"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Translations */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Translations</h3>
        
        <div className="space-y-2">
          {recentTranslations.map(translation => (
            <div key={translation.id} className="bg-gray-800 rounded p-3 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center mr-3">
                  <Languages size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-sm text-white">{translation.originalText}</div>
                  <div className="text-xs text-gray-400">{translation.translatedText}</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                {Math.round(translation.confidence * 100)}% confidence
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Web3TranslationAssistant;