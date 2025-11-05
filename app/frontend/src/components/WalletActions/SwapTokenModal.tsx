import React, { useState, useEffect } from 'react';
import { TokenBalance } from '../../types/wallet';
import { useToast } from '@/context/ToastContext';
import { dexService } from '@/services/dexService';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { GasFeeService } from '@/services/gasFeeService';
import { usePublicClient } from 'wagmi';
import { DEFAULT_SLIPPAGE_OPTIONS, DEFAULT_SLIPPAGE } from '@/types/dex';
import { TokenInfo } from '@/types/dex';

interface SwapTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenBalance[];
  onSwap: (fromToken: string, toToken: string, amount: number) => Promise<void>;
}

export default function SwapTokenModal({ isOpen, onClose, tokens, onSwap }: SwapTokenModalProps) {
  const { addToast } = useToast();
  const publicClient = usePublicClient();
  const [gasFeeService, setGasFeeService] = useState<GasFeeService | null>(null);
  const [fromToken, setFromToken] = useState(tokens[0]?.symbol || 'ETH');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [exchangeRate, setExchangeRate] = useState(0);
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [priceImpact, setPriceImpact] = useState<string | null>(null);
  const [popularTokens, setPopularTokens] = useState<TokenInfo[]>([]);

  const fromTokenData = tokens.find(t => t.symbol === fromToken);
  const toTokenData = tokens.find(t => t.symbol === toToken);
  const maxAmount = fromTokenData?.balance || 0;

  // Initialize gas fee service
  useEffect(() => {
    if (publicClient) {
      setGasFeeService(new GasFeeService(publicClient as any));
    }
  }, [publicClient]);

  // Fetch popular tokens for better swap options
  useEffect(() => {
    const fetchPopularTokens = async () => {
      try {
        const chainId = publicClient?.chain?.id || 1;
        const popular = await dexService.getPopularTokens(chainId);
        setPopularTokens(popular);
      } catch (err) {
        console.error('Failed to fetch popular tokens:', err);
        // Use default tokens if API fails
        setPopularTokens([]);
      }
    };

    if (isOpen && publicClient) {
      fetchPopularTokens();
    }
  }, [isOpen, publicClient]);

  // Get real exchange rate from DEX
  useEffect(() => {
    if (fromTokenData && toTokenData && fromAmount) {
      const fetchQuote = async () => {
        try {
          // Get real token addresses from wallet data
          const fromTokenAddress = fromTokenData.contractAddress || '0x0000000000000000000000000000000000000000'; // ETH/native token
          const toTokenAddress = toTokenData.contractAddress || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC as fallback

          const quote = await dexService.getSwapQuote({
            tokenInAddress: fromTokenAddress,
            tokenOutAddress: toTokenAddress,
            amountIn: parseFloat(fromAmount),
            slippageTolerance: slippage
          });

          // Calculate exchange rate
          const rate = parseFloat(quote.amountOut) / parseFloat(quote.amountIn);
          setExchangeRate(rate);
          setToAmount(quote.amountOut);
          setGasEstimate(quote.gasEstimate);
          setPriceImpact(quote.priceImpact);
        } catch (err) {
          console.error('Error fetching swap quote:', err);
          setError('Failed to get exchange rate. Using mock data.');
          
          // Fallback to mock calculation
          const rate = fromTokenData.valueUSD / toTokenData.valueUSD;
          setExchangeRate(rate);
          
          if (fromAmount) {
            const estimated = parseFloat(fromAmount) * rate;
            setToAmount(estimated.toFixed(6));
          }
        }
      };

      fetchQuote();
    } else {
      setExchangeRate(0);
      setToAmount('');
    }
  }, [fromToken, toToken, fromAmount, fromTokenData, toTokenData, slippage]);

  // Validate tokens before swap
  const validateTokens = async () => {
    if (!fromTokenData || !toTokenData) return false;
    
    try {
      // Validate token addresses using DEX service
      const fromTokenAddress = fromTokenData.contractAddress || '0x0000000000000000000000000000000000000000';
      const toTokenAddress = toTokenData.contractAddress || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      
      // Validate both tokens
      await Promise.all([
        dexService.validateToken(fromTokenAddress),
        dexService.validateToken(toTokenAddress)
      ]);
      
      return true;
    } catch (err) {
      console.error('Token validation failed:', err);
      return false;
    }
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (value && exchangeRate) {
      const estimated = parseFloat(value) * exchangeRate;
      setToAmount(estimated.toFixed(6));
    } else {
      setToAmount('');
    }
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('');
    setToAmount('');
  };

  const handleSwap = async () => {
    if (!fromAmount || !toAmount) {
      setError('Please enter an amount');
      return;
    }

    if (parseFloat(fromAmount) > maxAmount) {
      setError('Insufficient balance');
      return;
    }

    if (fromToken === toToken) {
      setError('Cannot swap the same token');
      return;
    }

    // Validate tokens before proceeding
    const isValid = await validateTokens();
    if (!isValid) {
      setError('One or both tokens are not supported for swapping');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSwap(fromToken, toToken, parseFloat(fromAmount));
      onClose();
      setFromAmount('');
      setToAmount('');
      addToast('Swap transaction submitted successfully!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
      addToast('Swap failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Swap Tokens</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* From Token */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Balance: {maxAmount.toFixed(4)}
              </span>
            </div>
            <div className="flex gap-3">
              <select
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleFromAmountChange(maxAmount.toString())}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ~{toAmount || '0.00'}
              </span>
            </div>
            <div className="flex gap-3">
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {/* Show tokens from wallet first, then popular tokens */}
                {tokens
                  .filter(token => token.symbol !== fromToken)
                  .map((token) => (
                    <option key={`${token.symbol}-${token.contractAddress}`} value={token.symbol}>
                      {token.symbol} ({token.balance.toFixed(4)})
                    </option>
                  ))}
                {/* Add popular tokens not in wallet */}
                {popularTokens
                  .filter(token => 
                    !tokens.some(t => t.symbol === token.symbol) && 
                    token.symbol !== fromToken
                  )
                  .map((token) => (
                    <option key={`${token.symbol}-${token.address}`} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
              </select>
              <div className="flex-1">
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Exchange Rate and Slippage */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {exchangeRate > 0 ? `1 ${fromToken} = ${exchangeRate.toFixed(6)} ${toToken}` : 'Loading...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Slippage Tolerance</span>
              <select
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value))}
                className="p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {DEFAULT_SLIPPAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {priceImpact && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600 dark:text-gray-400">Price Impact</span>
                <span className={`font-medium ${parseFloat(priceImpact) > 5 ? 'text-red-500' : 'text-green-500'}`}>
                  {priceImpact}%
                </span>
              </div>
            )}
            {gasEstimate && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600 dark:text-gray-400">Estimated Gas</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {gasEstimate}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={isLoading || !fromAmount || !toAmount}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading || !fromAmount || !toAmount
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              'Swap Tokens'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}