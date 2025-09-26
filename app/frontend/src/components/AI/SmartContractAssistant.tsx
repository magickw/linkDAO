/**
 * AI Smart Contract Assistant
 * Provides intelligent suggestions for smart contract interactions
 */

import React, { useState, useEffect } from 'react';
import { 
  Brain, Zap, Shield, TrendingUp, AlertTriangle, 
  CheckCircle, XCircle, Info, ExternalLink, 
  Copy, Send, Wallet, Target, Lightbulb,
  ArrowRight, Clock, DollarSign, Fuel
} from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';

interface ContractInteraction {
  id: string;
  contractAddress: string;
  contractName: string;
  functionName: string;
  parameters: any[];
  gasEstimate: number;
  value: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  suggestions: string[];
  alternatives: ContractAlternative[];
}

interface ContractAlternative {
  id: string;
  name: string;
  description: string;
  gasSavings: number;
  riskLevel: 'low' | 'medium' | 'high';
  benefits: string[];
}

interface AISuggestion {
  id: string;
  type: 'optimization' | 'security' | 'gas' | 'alternative' | 'warning';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  action?: string;
  gasSavings?: number;
  riskReduction?: number;
}

interface ContractAnalysis {
  address: string;
  name: string;
  isVerified: boolean;
  riskScore: number;
  gasOptimization: number;
  securityScore: number;
  suggestions: AISuggestion[];
  estimatedGas: number;
  estimatedCost: number;
}

const SmartContractAssistant: React.FC<{
  className?: string;
  contractAddress?: string;
  onSuggestionApplied?: (suggestion: AISuggestion) => void;
  onInteractionOptimized?: (optimization: ContractInteraction) => void;
}> = ({ className = '', contractAddress, onSuggestionApplied, onInteractionOptimized }) => {
  const { address, isConnected } = useAccount();
  
  const [currentContract, setCurrentContract] = useState<ContractAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interactionInput, setInteractionInput] = useState('');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [gasPrice, setGasPrice] = useState(20); // Gwei
  const [ethPrice, setEthPrice] = useState(2000); // USD

  const [recentInteractions] = useState<ContractInteraction[]>([
    {
      id: '1',
      contractAddress: '0xA0b86a33E6441b8C4C8C0C4C0C4C0C4C0C4C0C4C',
      contractName: 'Uniswap V3 Router',
      functionName: 'swapExactTokensForTokens',
      parameters: ['1000000000000000000', '950000000000000000', ['0x...', '0x...'], address, Date.now() + 1800],
      gasEstimate: 150000,
      value: 0,
      riskLevel: 'low',
      description: 'Swap 1 ETH for USDC',
      suggestions: ['Consider using multicall for batch operations', 'Check slippage tolerance'],
      alternatives: [
        {
          id: 'alt1',
          name: 'Uniswap V2',
          description: 'Lower gas costs for simple swaps',
          gasSavings: 30000,
          riskLevel: 'low',
          benefits: ['Lower gas', 'Simpler interface']
        }
      ]
    },
    {
      id: '2',
      contractAddress: '0xB0b86a33E6441b8C4C8C0C4C0C4C0C4C0C4C0C4C',
      contractName: 'Compound cETH',
      functionName: 'mint',
      parameters: [],
      gasEstimate: 200000,
      value: 1000000000000000000,
      riskLevel: 'medium',
      description: 'Supply 1 ETH to Compound',
      suggestions: ['Consider interest rate trends', 'Check collateralization ratio'],
      alternatives: [
        {
          id: 'alt2',
          name: 'Aave',
          description: 'Alternative lending protocol',
          gasSavings: 25000,
          riskLevel: 'low',
          benefits: ['Better rates', 'More tokens']
        }
      ]
    }
  ]);

  const analyzeContract = async (address: string) => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const analysis: ContractAnalysis = {
      address,
      name: 'Sample Contract',
      isVerified: Math.random() > 0.3,
      riskScore: Math.random() * 100,
      gasOptimization: Math.random() * 100,
      securityScore: Math.random() * 100,
      suggestions: generateSuggestions(),
      estimatedGas: Math.floor(Math.random() * 200000) + 50000,
      estimatedCost: Math.floor(Math.random() * 0.1 * 100) / 100
    };
    
    setCurrentContract(analysis);
    setIsAnalyzing(false);
  };

  const generateSuggestions = (): AISuggestion[] => {
    return [
      {
        id: 'sug1',
        type: 'gas',
        title: 'Gas Optimization',
        description: 'Use batch operations to reduce gas costs by 30%',
        impact: 'high',
        confidence: 0.85,
        gasSavings: 45000
      },
      {
        id: 'sug2',
        type: 'security',
        title: 'Security Check',
        description: 'Contract is unverified. Consider using verified alternatives.',
        impact: 'medium',
        confidence: 0.92,
        riskReduction: 25
      },
      {
        id: 'sug3',
        type: 'alternative',
        title: 'Better Alternative',
        description: 'Similar functionality available with 40% lower gas costs',
        impact: 'high',
        confidence: 0.78,
        gasSavings: 60000
      },
      {
        id: 'sug4',
        type: 'optimization',
        title: 'Parameter Optimization',
        description: 'Adjust slippage tolerance to reduce failed transactions',
        impact: 'medium',
        confidence: 0.88
      }
    ];
  };

  const analyzeInteraction = async (input: string) => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis of interaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newSuggestions = generateSuggestions();
    setSuggestions(prev => [...prev, ...newSuggestions]);
    setIsAnalyzing(false);
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    onSuggestionApplied?.(suggestion);
    
    // Remove applied suggestion
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp size={16} className="text-green-500" />;
      case 'security': return <Shield size={16} className="text-blue-500" />;
      case 'gas': return <Fuel size={16} className="text-yellow-500" />;
      case 'alternative': return <Lightbulb size={16} className="text-purple-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low': return 'text-gray-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatGasCost = (gas: number) => {
    const cost = (gas * gasPrice * 1e-9 * ethPrice).toFixed(2);
    return `$${cost}`;
  };

  useEffect(() => {
    if (contractAddress) {
      analyzeContract(contractAddress);
    }
  }, [contractAddress]);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Brain size={24} className="text-blue-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">Smart Contract Assistant</h2>
            <p className="text-sm text-gray-400">AI-powered contract interaction optimization</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center px-3 py-1 bg-blue-900 text-blue-300 rounded-full text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
            Active
          </div>
        </div>
      </div>

      {/* Contract Analysis */}
      {currentContract && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Contract Analysis</h3>
          
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">{currentContract.name}</div>
                  <div className="text-sm text-gray-400">{currentContract.address}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`px-2 py-1 rounded text-xs ${
                  currentContract.isVerified ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                }`}>
                  {currentContract.isVerified ? 'Verified' : 'Unverified'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{Math.round(currentContract.securityScore)}</div>
                <div className="text-sm text-gray-400">Security Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{Math.round(currentContract.gasOptimization)}</div>
                <div className="text-sm text-gray-400">Gas Optimization</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{Math.round(currentContract.riskScore)}</div>
                <div className="text-sm text-gray-400">Risk Score</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Estimated Gas: {currentContract.estimatedGas.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">
                Estimated Cost: {formatGasCost(currentContract.estimatedGas)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Analyze Interaction</h3>
        
        <div className="flex space-x-3 mb-4">
          <input
            type="text"
            value={interactionInput}
            onChange={(e) => setInteractionInput(e.target.value)}
            placeholder="Paste contract interaction data, function call, or transaction..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => analyzeInteraction(interactionInput)}
            disabled={!interactionInput.trim() || isAnalyzing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center"
          >
            {isAnalyzing ? (
              <>
                <Brain size={16} className="mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap size={16} className="mr-2" />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">AI Suggestions</h3>
        
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Brain size={48} className="mx-auto mb-3 opacity-50" />
              <p>No suggestions yet</p>
              <p className="text-sm">Analyze a contract interaction to get AI recommendations</p>
            </div>
          ) : (
            suggestions.map(suggestion => (
              <div key={suggestion.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {getSuggestionIcon(suggestion.type)}
                    <div className="ml-3">
                      <div className="font-medium text-white">{suggestion.title}</div>
                      <div className="text-sm text-gray-400">{suggestion.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-semibold ${getImpactColor(suggestion.impact)}`}>
                      {suggestion.impact.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    {suggestion.gasSavings && (
                      <div className="flex items-center">
                        <Fuel size={14} className="mr-1" />
                        Save {suggestion.gasSavings.toLocaleString()} gas
                      </div>
                    )}
                    {suggestion.riskReduction && (
                      <div className="flex items-center">
                        <Shield size={14} className="mr-1" />
                        {suggestion.riskReduction}% risk reduction
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => applySuggestion(suggestion)}
                    className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center"
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Apply
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Interactions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Interactions</h3>
        
        <div className="space-y-3">
          {recentInteractions.map(interaction => (
            <div key={interaction.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                    <Zap size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{interaction.contractName}</div>
                    <div className="text-sm text-gray-400">{interaction.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-semibold ${getRiskColor(interaction.riskLevel)}`}>
                    {interaction.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="mb-3">
                <div className="text-sm text-gray-400 mb-1">Function: {interaction.functionName}</div>
                <div className="text-sm text-gray-400">
                  Gas: {interaction.gasEstimate.toLocaleString()} • Cost: {formatGasCost(interaction.gasEstimate)}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {interaction.suggestions.length} suggestions available
                </div>
                
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                  Optimize
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Gas Price (Gwei)</label>
            <input
              type="number"
              value={gasPrice}
              onChange={(e) => setGasPrice(parseInt(e.target.value))}
              className="w-full bg-gray-700 text-white rounded px-3 py-1 text-sm"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-400 block mb-1">ETH Price (USD)</label>
            <input
              type="number"
              value={ethPrice}
              onChange={(e) => setEthPrice(parseInt(e.target.value))}
              className="w-full bg-gray-700 text-white rounded px-3 py-1 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartContractAssistant;