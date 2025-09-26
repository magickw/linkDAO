/**
 * AI-Powered Scam Detection Component
 * Automatically detects and warns about suspicious links, contracts, and content
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, XCircle, 
  ExternalLink, Brain, Zap, Eye, EyeOff, 
  Info, AlertCircle, Lock, Globe, Wallet, X, Image
} from 'lucide-react';

interface ScamDetectionResult {
  id: string;
  url: string;
  type: 'url' | 'contract' | 'wallet' | 'nft' | 'token';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  threats: string[];
  recommendations: string[];
  timestamp: Date;
  isVerified: boolean;
  source: string;
}

interface ContractAnalysis {
  address: string;
  name?: string;
  symbol?: string;
  isVerified: boolean;
  riskScore: number;
  suspiciousPatterns: string[];
  auditStatus?: 'audited' | 'unaudited' | 'flagged';
  liquidity?: number;
  holders?: number;
  age?: number; // days since deployment
}

interface LinkAnalysis {
  url: string;
  domain: string;
  isShortened: boolean;
  redirectChain: string[];
  riskFactors: string[];
  reputationScore: number;
  category: 'defi' | 'nft' | 'exchange' | 'social' | 'unknown';
}

const AIScamDetection: React.FC<{
  className?: string;
  onDetectionResult?: (result: ScamDetectionResult) => void;
  onBlockContent?: (content: string, reason: string) => void;
}> = ({ className = '', onDetectionResult, onBlockContent }) => {
  const [detectionResults, setDetectionResults] = useState<ScamDetectionResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisInput, setAnalysisInput] = useState('');
  const [detectionSettings, setDetectionSettings] = useState({
    autoScan: true,
    blockHighRisk: true,
    showWarnings: true,
    scanContracts: true,
    scanUrls: true,
    scanNfts: true,
    confidenceThreshold: 0.7
  });

  const [recentScams] = useState([
    {
      url: 'https://fake-uniswap.com',
      type: 'url' as const,
      riskLevel: 'critical' as const,
      description: 'Phishing site mimicking Uniswap',
      blockedCount: 1247
    },
    {
      url: '0x1234567890123456789012345678901234567890',
      type: 'contract' as const,
      riskLevel: 'high' as const,
      description: 'Honeypot token contract',
      blockedCount: 892
    },
    {
      url: 'https://fake-metamask.io',
      type: 'url' as const,
      riskLevel: 'critical' as const,
      description: 'Fake MetaMask website',
      blockedCount: 2103
    }
  ]);

  const analyzeContent = async (content: string) => {
    setIsAnalyzing(true);
    
    // Extract URLs, contract addresses, and other suspicious patterns
    const urls = extractUrls(content);
    const contracts = extractContractAddresses(content);
    const wallets = extractWalletAddresses(content);
    
    const results: ScamDetectionResult[] = [];
    
    // Analyze URLs
    for (const url of urls) {
      const analysis = await analyzeUrl(url);
      if (analysis) {
        results.push(analysis);
      }
    }
    
    // Analyze contracts
    for (const contract of contracts) {
      const analysis = await analyzeContract(contract);
      if (analysis) {
        results.push(analysis);
      }
    }
    
    setDetectionResults(prev => [...prev, ...results]);
    
    // Trigger callbacks for high-risk items
    results.forEach(result => {
      onDetectionResult?.(result);
      
      if (result.riskLevel === 'critical' && detectionSettings.blockHighRisk) {
        onBlockContent?.(content, `High-risk content detected: ${result.threats.join(', ')}`);
      }
    });
    
    setIsAnalyzing(false);
  };

  const extractUrls = (text: string): string[] => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  };

  const extractContractAddresses = (text: string): string[] => {
    const contractRegex = /0x[a-fA-F0-9]{40}/g;
    return text.match(contractRegex) || [];
  };

  const extractWalletAddresses = (text: string): string[] => {
    const walletRegex = /0x[a-fA-F0-9]{40}/g;
    return text.match(walletRegex) || [];
  };

  const analyzeUrl = async (url: string): Promise<ScamDetectionResult | null> => {
    // Simulate AI analysis
    const isSuspicious = Math.random() > 0.7;
    const riskLevel = isSuspicious ? 
      (Math.random() > 0.5 ? 'high' : 'critical') : 
      (Math.random() > 0.3 ? 'medium' : 'low');
    
    if (riskLevel === 'low') return null;
    
    const threats = generateThreats(riskLevel);
    const recommendations = generateRecommendations(riskLevel);
    
    return {
      id: `url_${Date.now()}_${Math.random()}`,
      url,
      type: 'url',
      riskLevel,
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      threats,
      recommendations,
      timestamp: new Date(),
      isVerified: false,
      source: 'AI Analysis'
    };
  };

  const analyzeContract = async (address: string): Promise<ScamDetectionResult | null> => {
    // Simulate contract analysis
    const isSuspicious = Math.random() > 0.6;
    const riskLevel = isSuspicious ? 
      (Math.random() > 0.4 ? 'high' : 'critical') : 
      (Math.random() > 0.2 ? 'medium' : 'low');
    
    if (riskLevel === 'low') return null;
    
    const threats = generateContractThreats(riskLevel);
    const recommendations = generateContractRecommendations(riskLevel);
    
    return {
      id: `contract_${Date.now()}_${Math.random()}`,
      url: address,
      type: 'contract',
      riskLevel,
      confidence: Math.random() * 0.3 + 0.7,
      threats,
      recommendations,
      timestamp: new Date(),
      isVerified: false,
      source: 'Contract Analysis'
    };
  };

  const generateThreats = (riskLevel: string): string[] => {
    const threatMap = {
      medium: ['Suspicious domain', 'Shortened URL'],
      high: ['Phishing attempt', 'Malware distribution', 'Fake exchange'],
      critical: ['Phishing site', 'Malware', 'Fake wallet', 'Rug pull']
    };
    return threatMap[riskLevel as keyof typeof threatMap] || [];
  };

  const generateContractThreats = (riskLevel: string): string[] => {
    const threatMap = {
      medium: ['Unaudited contract', 'Low liquidity'],
      high: ['Honeypot detected', 'Rug pull risk', 'Suspicious ownership'],
      critical: ['Known scam contract', 'Honeypot', 'Rug pull', 'Malicious code']
    };
    return threatMap[riskLevel as keyof typeof threatMap] || [];
  };

  const generateRecommendations = (riskLevel: string): string[] => {
    const recMap = {
      medium: ['Verify the source', 'Check community reviews'],
      high: ['Avoid interaction', 'Report to community'],
      critical: ['Do not interact', 'Report immediately', 'Block the source']
    };
    return recMap[riskLevel as keyof typeof recMap] || [];
  };

  const generateContractRecommendations = (riskLevel: string): string[] => {
    const recMap = {
      medium: ['Research the project', 'Check audits'],
      high: ['Avoid trading', 'Report to community'],
      critical: ['Do not trade', 'Report scam', 'Warn others']
    };
    return recMap[riskLevel as keyof typeof recMap] || [];
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle size={16} className="text-green-500" />;
      case 'medium': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'high': return <AlertCircle size={16} className="text-orange-500" />;
      case 'critical': return <XCircle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'url': return <Globe size={16} />;
      case 'contract': return <Lock size={16} />;
      case 'wallet': return <Wallet size={16} />;
      case 'nft': return <Image size={16} />;
      case 'token': return <Zap size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield size={24} className="text-green-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">AI Scam Detection</h2>
            <p className="text-sm text-gray-400">Protecting your community from scams</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center px-3 py-1 bg-green-900 text-green-300 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            Active
          </div>
        </div>
      </div>

      {/* Manual Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Analyze Content</h3>
        
        <div className="flex space-x-3">
          <input
            type="text"
            value={analysisInput}
            onChange={(e) => setAnalysisInput(e.target.value)}
            placeholder="Paste URL, contract address, or suspicious content..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => analyzeContent(analysisInput)}
            disabled={!analysisInput.trim() || isAnalyzing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center"
          >
            {isAnalyzing ? (
              <>
                <Brain size={16} className="mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <Shield size={16} className="mr-2" />
                Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Detection Results */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Detection Results</h3>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {detectionResults.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Shield size={48} className="mx-auto mb-3 opacity-50" />
              <p>No threats detected</p>
              <p className="text-sm">Scan content to check for scams</p>
            </div>
          ) : (
            detectionResults.map(result => (
              <div key={result.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {getRiskIcon(result.riskLevel)}
                    <div className="ml-3">
                      <div className="flex items-center">
                        {getTypeIcon(result.type)}
                        <span className="ml-2 text-sm text-white font-medium">
                          {result.type.toUpperCase()} Threat
                        </span>
                        <span className={`ml-2 text-sm font-semibold ${getRiskColor(result.riskLevel)}`}>
                          {result.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Confidence: {Math.round(result.confidence * 100)}% • {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="text-gray-400 hover:text-white">
                      <ExternalLink size={14} />
                    </button>
                    <button className="text-gray-400 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-300 break-all">
                    {result.url}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Threats:</div>
                  <div className="flex flex-wrap gap-1">
                    {result.threats.map((threat, idx) => (
                      <span key={idx} className="px-2 py-1 bg-red-900 text-red-300 rounded text-xs">
                        {threat}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400 mb-1">Recommendations:</div>
                  <div className="flex flex-wrap gap-1">
                    {result.recommendations.map((rec, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs">
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Scams */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recently Blocked Scams</h3>
        
        <div className="space-y-2">
          {recentScams.map((scam, idx) => (
            <div key={idx} className="bg-gray-800 rounded p-3 flex items-center justify-between">
              <div className="flex items-center">
                {getRiskIcon(scam.riskLevel)}
                <div className="ml-3">
                  <div className="text-sm text-white">{scam.description}</div>
                  <div className="text-xs text-gray-400">{scam.url}</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                {scam.blockedCount.toLocaleString()} blocked
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-white mb-4">Detection Settings</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={detectionSettings.autoScan}
                onChange={(e) => setDetectionSettings(prev => ({ ...prev, autoScan: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600 mr-2"
              />
              <span className="text-sm text-gray-300">Auto-scan messages</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={detectionSettings.blockHighRisk}
                onChange={(e) => setDetectionSettings(prev => ({ ...prev, blockHighRisk: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600 mr-2"
              />
              <span className="text-sm text-gray-300">Block high-risk content</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={detectionSettings.showWarnings}
                onChange={(e) => setDetectionSettings(prev => ({ ...prev, showWarnings: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600 mr-2"
              />
              <span className="text-sm text-gray-300">Show warnings</span>
            </label>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={detectionSettings.scanContracts}
                onChange={(e) => setDetectionSettings(prev => ({ ...prev, scanContracts: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600 mr-2"
              />
              <span className="text-sm text-gray-300">Scan contracts</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={detectionSettings.scanUrls}
                onChange={(e) => setDetectionSettings(prev => ({ ...prev, scanUrls: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600 mr-2"
              />
              <span className="text-sm text-gray-300">Scan URLs</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={detectionSettings.scanNfts}
                onChange={(e) => setDetectionSettings(prev => ({ ...prev, scanNfts: e.target.checked }))}
                className="rounded bg-gray-700 border-gray-600 mr-2"
              />
              <span className="text-sm text-gray-300">Scan NFTs</span>
            </label>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="text-sm text-gray-400 block mb-1">Confidence Threshold</label>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.1"
            value={detectionSettings.confidenceThreshold}
            onChange={(e) => setDetectionSettings(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(detectionSettings.confidenceThreshold * 100)}% confidence required
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIScamDetection;