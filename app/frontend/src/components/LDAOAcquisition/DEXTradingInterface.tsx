import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowsUpDownIcon,
  ChartBarIcon,
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CogIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { dexService } from '@/services/web3/dexService';

interface DEXTradingInterfaceProps {
  userAddress?: string;
  onClose?: () => void;
}

interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoUrl: string;
  balance?: string;
  price?: number;
}

interface SwapQuote {
  fromAmount: string;
  toAmount: string;
  priceImpact: number;
  minimumReceived: string;
  gasFee: string;
  route: string[];
  validUntil: number;
  dex: 'uniswap' | 'sushiswap';
  expectedAmount: string;
}

interface DEXOption {
  name: string;
  logo: string;
  tvl: string;
  fee: number;
  available: boolean;
}

const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logoUrl: '/tokens/eth.png',
    price: 2400
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86a33E6441b8435b662303c0f0c8c8c8c8c8c',
    decimals: 6,
    logoUrl: '/tokens/usdc.png',
    price: 1
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    logoUrl: '/tokens/usdt.png',
    price: 1
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    logoUrl: '/tokens/wbtc.png',
    price: 65000
  },
  {
    symbol: 'LDAO',
    name: 'LinkDAO Token',
    address: '0xc9F690B45e33ca909bB9ab97836091673232611B', // Updated to correct LDAO address
    decimals: 18,
    logoUrl: '/tokens/ldao.png',
    price: 0.01
  }
];

const DEX_OPTIONS: DEXOption[] = [
  {
    name: 'Uniswap V3',
    logo: '/dex/uniswap.png',
    tvl: '$4.2B',
    fee: 0.3,
    available: true
  },
  {
    name: 'SushiSwap',
    logo: '/dex/sushi.png',
    tvl: '$1.8B',
    fee: 0.25,
    available: true
  },
  {
    name: '1inch',
    logo: '/dex/1inch.png',
    tvl: '$2.1B',
    fee: 0.1,
    available: true
  }
];

export default function DEXTradingInterface({ userAddress, onClose }: DEXTradingInterfaceProps) {
  const [fromToken, setFromToken] = useState<TokenInfo>(SUPPORTED_TOKENS[0]);
  const [toToken, setToToken] = useState<TokenInfo>(SUPPORTED_TOKENS[4]); // LDAO
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [quotes, setQuotes] = useState<SwapQuote[]>([]);
  const [selectedDEX, setSelectedDEX] = useState<DEXOption>(DEX_OPTIONS[0]);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [priceChart, setPriceChart] = useState<number[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load token balances and price data
  useEffect(() => {
    if (userAddress) {
      loadTokenBalances();
      loadPriceChart();
      startPriceUpdates();
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [userAddress]);

  // Get quotes when amounts change
  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      getSwapQuotes();
    } else {
      setToAmount('');
      setQuotes([]);
    }
  }, [fromAmount, fromToken, toToken]);

  const loadTokenBalances = async () => {
    try {
      // Mock loading balances - in real implementation, fetch from blockchain
      const updatedTokens = SUPPORTED_TOKENS.map(token => ({
        ...token,
        balance: Math.random() * 1000 + ''
      }));
      // Update token balances in state
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  const loadPriceChart = async () => {
    try {
      // Mock price chart data - in real implementation, fetch from price API
      const mockData = Array.from({ length: 24 }, (_, i) => 
        0.01 + (Math.sin(i / 4) * 0.002) + (Math.random() * 0.001)
      );
      setPriceChart(mockData);
    } catch (error) {
      console.error('Failed to load price chart:', error);
    }
  };

  const startPriceUpdates = useCallback(() => {
    const interval = setInterval(() => {
      if (fromAmount && parseFloat(fromAmount) > 0) {
        getSwapQuotes();
      }
    }, 10000); // Update every 10 seconds
    
    setRefreshInterval(interval);
  }, [fromAmount, fromToken, toToken]);

  const getSwapQuotes = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setQuotes([]);
      return;
    }

    try {
      setLoading(true);
      
      // Get real quotes from DEX service
      const dexQuotes = await dexService.getSwapQuotes(
        fromToken.symbol,
        toToken.symbol,
        fromAmount,
        slippageTolerance
      );
      
      console.log('DEX Quotes received:', dexQuotes);
      
      // Convert to our SwapQuote format
      const formattedQuotes = dexQuotes.map(quote => ({
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        priceImpact: quote.priceImpact,
        minimumReceived: quote.toAmount,
        gasFee: ethers.formatEther(quote.estimatedGas),
        route: quote.path,
        validUntil: Date.now() + 30000, // 30 seconds
        dex: quote.dex,
        expectedAmount: quote.expectedAmount
      }));
      
      setQuotes(formattedQuotes);
      
      // Set the best quote as the default
      if (formattedQuotes.length > 0) {
        setToAmount(formattedQuotes[0].toAmount);
      } else {
        // If no quotes are available, show an error message
        toast.error('No DEX quotes available. Please try a different amount or token pair.');
      }
    } catch (error) {
      console.error('Failed to get quotes:', error);
      toast.error(`Failed to get swap quotes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount('');
  };

  const handleSwap = async () => {
    if (!userAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    if (quotes.length === 0) {
      toast.error('No quotes available');
      return;
    }

    // Get the best quote (first in the sorted list)
    const bestQuote = quotes[0];
    
    // Find the matching DEX option
    const dexOption = DEX_OPTIONS.find(dex => 
      dex.name.toLowerCase().includes(bestQuote.dex.toLowerCase())
    ) || DEX_OPTIONS[0];

    try {
      setSwapping(true);
      
      // Execute the swap based on the selected DEX
      let result;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      
      if (bestQuote.dex === 'uniswap') {
        result = await dexService.swapOnUniswap(
          fromToken.symbol,
          toToken.symbol,
          fromAmount,
          bestQuote.minimumReceived,
          deadline
        );
      } else {
        result = await dexService.swapOnSushiswap(
          fromToken.symbol,
          toToken.symbol,
          fromAmount,
          bestQuote.minimumReceived,
          deadline
        );
      }
      
      if (result.status === 'success') {
        toast.success(`Successfully swapped ${fromAmount} ${fromToken.symbol} for ${bestQuote.toAmount} ${toToken.symbol}!`);
        
        // Reset form
        setFromAmount('');
        setToAmount('');
        setQuotes([]);
        
        // Reload balances
        loadTokenBalances();
      } else {
        toast.error(result.error || 'Swap failed. Please try again.');
      }
    } catch (error) {
      console.error('Swap failed:', error);
      toast.error('Swap failed. Please try again.');
    } finally {
      setSwapping(false);
    }
  };

  const TokenSelector = ({ 
    token, 
    onSelect, 
    label 
  }: { 
    token: TokenInfo; 
    onSelect: (token: TokenInfo) => void; 
    label: string;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <select
          value={token.symbol}
          onChange={(e) => {
            const selectedToken = SUPPORTED_TOKENS.find(t => t.symbol === e.target.value);
            if (selectedToken) onSelect(selectedToken);
          }}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
        >
          {SUPPORTED_TOKENS.map((t) => (
            <option key={t.symbol} value={t.symbol}>
              {t.symbol} - {t.name}
            </option>
          ))}
        </select>
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
            {token.symbol[0]}
          </div>
        </div>
      </div>
      {token.balance && (
        <div className="text-sm text-gray-500">
          Balance: {parseFloat(token.balance).toFixed(4)} {token.symbol}
        </div>
      )}
    </div>
  );

  const PriceChart = () => (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">LDAO/USD Price (24h)</h3>
        <div className="text-sm text-green-600">+2.4%</div>
      </div>
      <div className="h-32 flex items-end space-x-1">
        {priceChart.map((price, index) => (
          <div
            key={index}
            className="bg-blue-500 rounded-t"
            style={{
              height: `${(price / Math.max(...priceChart)) * 100}%`,
              width: `${100 / priceChart.length}%`
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>24h ago</span>
        <span>Now</span>
      </div>
    </div>
  );

  // Import ethers at the top
  const ethers = require('ethers');

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">DEX Trading</h2>
            <p className="text-blue-100 text-sm">Swap tokens instantly</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            >
              <CogIcon className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slippage Tolerance
              </label>
              <div className="flex space-x-2">
                {[0.1, 0.5, 1.0].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippageTolerance(value)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      slippageTolerance === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DEX Selection
              </label>
              <div className="space-y-2">
                {DEX_OPTIONS.map((dex) => (
                  <button
                    key={dex.name}
                    onClick={() => {
                      // In a real implementation, we would filter quotes by selected DEX
                      // For now, we'll just update the UI
                      setSelectedDEX(dex);
                    }}
                    disabled={!dex.available}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedDEX.name === dex.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${!dex.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{dex.name}</div>
                        <div className="text-sm text-gray-500">TVL: {dex.tvl}</div>
                      </div>
                      <div className="text-sm text-gray-600">{dex.fee}% fee</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Token Selection */}
        <div className="space-y-4">
          <TokenSelector
            token={fromToken}
            onSelect={setFromToken}
            label="From"
          />
          
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowsUpDownIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <TokenSelector
            token={toToken}
            onSelect={setToToken}
            label="To"
          />
        </div>

        {/* Amount Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => {
                  if (fromToken.balance) {
                    setFromAmount(fromToken.balance);
                  }
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 text-sm font-medium hover:text-blue-700"
              >
                MAX
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              You'll receive
            </label>
            <div className="relative">
              <input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quote Selection */}
        {quotes.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Best Rates</h3>
            {quotes.map((quote, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  index === 0 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setToAmount(quote.toAmount);
                  // In a real implementation, we would track which quote is selected
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium capitalize">{quote.dex}</div>
                    <div className="text-sm text-gray-500">
                      {quote.expectedAmount} {toToken.symbol}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">Fee: {quote.gasFee} ETH</div>
                    <div className="text-sm text-gray-500">Instant</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price Chart */}
        <PriceChart />

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={!userAddress || quotes.length === 0 || swapping || loading}
          className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
            !userAddress
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : quotes.length === 0 || loading
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : swapping
              ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
          }`}
        >
          {!userAddress
            ? 'Connect Wallet'
            : swapping
            ? 'Swapping...'
            : loading
            ? 'Getting Quotes...'
            : quotes.length === 0
            ? 'Enter Amount'
            : `Swap ${fromToken.symbol} for ${toToken.symbol}`
          }
        </button>

        {/* Warnings */}
        {quotes.length > 0 && quotes[0].priceImpact > 3 && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <div className="font-medium">High Price Impact</div>
              <div>This swap will significantly affect the token price. Consider reducing the amount.</div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <div className="font-medium">DEX Trading</div>
            <div>Trades are executed on decentralized exchanges. Prices update in real-time.</div>
          </div>
        </div>
      </div>
    </div>
  );
}