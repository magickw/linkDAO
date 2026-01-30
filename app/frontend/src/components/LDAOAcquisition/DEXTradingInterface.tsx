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
import { dexService, DexSwapQuote } from '@/services/web3/dexService';
import { ethers } from 'ethers';

interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoUrl?: string;
  price?: number;
  balance?: string;
}

interface DEXOption {
  name: string;
  tvl: string;
  fee: number;
  available: boolean;
}

interface DEXTradingInterfaceProps {
  userAddress?: string;
  chainId?: number;
  onClose?: () => void;
}

const getSupportedTokens = (chainId: number = 1): TokenInfo[] => {
  // Base Mainnet (8453)
  if (chainId === 8453) {
    return [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        decimals: 18,
        logoUrl: '/tokens/eth.png',
        price: 2400
      },
      {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: '0x4200000000000000000000000000000000000006',
        decimals: 18,
        logoUrl: '/tokens/weth.png',
        price: 2400
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        logoUrl: '/tokens/usdc.png',
        price: 1
      },
      {
        symbol: 'LDAO',
        name: 'LinkDAO Token',
        address: process.env.NEXT_PUBLIC_LDAO_ADDRESS_BASE || '0x...', 
        decimals: 18,
        logoUrl: '/tokens/ldao.png',
        price: 0.01
      }
    ];
  }
  
  // Base Sepolia (84532)
  if (chainId === 84532) {
    return [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        decimals: 18,
        logoUrl: '/tokens/eth.png',
        price: 2400
      },
      {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: '0x4200000000000000000000000000000000000006',
        decimals: 18,
        logoUrl: '/tokens/weth.png',
        price: 2400
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        decimals: 6,
        logoUrl: '/tokens/usdc.png',
        price: 1
      },
      {
        symbol: 'LDAO',
        name: 'LinkDAO Token',
        address: process.env.NEXT_PUBLIC_LDAO_ADDRESS_BASE_SEPOLIA || '0xc9F690B45e33ca909bB9ab97836091673232611B',
        decimals: 18,
        logoUrl: '/tokens/ldao.png',
        price: 0.01
      }
    ];
  }

  // Default to Ethereum Mainnet (1)
  return [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
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
      address: '0xc9F690B45e33ca909bB9ab97836091673232611B',
      decimals: 18,
      logoUrl: '/tokens/ldao.png',
      price: 0.01
    }
  ];
};

const DEX_OPTIONS: DEXOption[] = [
  { name: 'Uniswap V3', tvl: '$4.2B', fee: 0.3, available: true },
  { name: 'SushiSwap', tvl: '$1.1B', fee: 0.25, available: true },
  { name: 'Curve', tvl: '$2.8B', fee: 0.04, available: false }
];

export default function DEXTradingInterface({ userAddress, onClose, chainId = 1 }: DEXTradingInterfaceProps) {
  const supportedTokens = getSupportedTokens(chainId);
  const [fromToken, setFromToken] = useState<TokenInfo>(supportedTokens[0]);
  const [toToken, setToToken] = useState<TokenInfo>(supportedTokens[supportedTokens.length - 1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [quotes, setQuotes] = useState<DexSwapQuote[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [selectedDEX, setSelectedDEX] = useState<DEXOption>(DEX_OPTIONS[0]);
  const [priceChart] = useState<number[]>([0.0095, 0.0098, 0.0102, 0.0099, 0.0105, 0.0108, 0.0101, 0.0112]);

  const fetchQuotes = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setQuotes([]);
      setToAmount('');
      return;
    }

    try {
      setLoading(true);
      const dexQuotes = await dexService.getSwapQuotes(
        fromToken.symbol,
        toToken.symbol,
        fromAmount,
        slippageTolerance,
        chainId
      );
      setQuotes(dexQuotes);
      if (dexQuotes.length > 0) {
        setToAmount(dexQuotes[0].expectedAmount);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to get swap quotes');
    } finally {
      setLoading(false);
    }
  }, [fromToken, toToken, fromAmount, slippageTolerance, chainId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotes();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchQuotes]);

  const handleSwap = async () => {
    if (!quotes.length) return;
    
    try {
      setSwapping(true);
      const bestQuote = quotes[0];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      let result;
      if (bestQuote.dex === 'uniswap') {
        result = await dexService.swapOnUniswap(
          fromToken.symbol,
          toToken.symbol,
          fromAmount,
          bestQuote.toAmount,
          deadline,
          chainId
        );
      } else {
        result = await dexService.swapOnSushiswap(
          fromToken.symbol,
          toToken.symbol,
          fromAmount,
          bestQuote.toAmount,
          deadline,
          chainId
        );
      }

      if (result.status === 'success') {
        toast.success('Swap executed successfully!');
        setFromAmount('');
        setToAmount('');
        setQuotes([]);
      } else {
        toast.error(result.error || 'Swap failed');
      }
    } catch (error) {
      console.error('Swap error:', error);
      toast.error('An error occurred during the swap');
    } finally {
      setSwapping(false);
    }
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('');
    setToAmount('');
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
            const selectedToken = supportedTokens.find(t => t.symbol === e.target.value);
            if (selectedToken) onSelect(selectedToken);
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {supportedTokens.map((t) => (
            <option key={t.symbol} value={t.symbol}>
              {t.symbol} - {t.name}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <GlobeAltIcon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );

  const PriceChart = () => (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-sm">LDAO/USD Price (24h)</h3>
        <div className="text-xs text-green-600 font-medium">+2.4%</div>
      </div>
      <div className="h-24 flex items-end space-x-1">
        {priceChart.map((price, index) => (
          <div
            key={index}
            className="bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
            style={{
              height: `${(price / Math.max(...priceChart)) * 100}%`,
              width: `${100 / priceChart.length}%`
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 mt-2 uppercase tracking-wider">
        <span>24h ago</span>
        <span>Now</span>
      </div>
    </div>
  );

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
                    onClick={() => setSelectedDEX(dex)}
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
            <h3 className="font-medium text-gray-900 text-sm">Best Rates</h3>
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
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium capitalize text-sm">{quote.dex}</div>
                    <div className="text-xs text-gray-500">
                      {quote.expectedAmount} {toToken.symbol}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-xs">Fee: {quote.fee} ETH</div>
                    <div className="text-[10px] text-gray-500">Instant</div>
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
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] active:scale-[0.98]'
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
            <div className="text-xs text-red-800">
              <div className="font-medium">High Price Impact</div>
              <div>This swap will significantly affect the token price. Consider reducing the amount.</div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <div className="font-medium">DEX Trading</div>
            <div>Trades are executed on decentralized exchanges. Prices update in real-time.</div>
          </div>
        </div>
      </div>
    </div>
  );
}