import React, { useState, useEffect } from 'react';
import { TokenBalance } from '../../types/wallet';
import { useToast } from '@/context/ToastContext';
import { dexService, DEFAULT_SLIPPAGE_OPTIONS, DEFAULT_SLIPPAGE } from '@/services/dexService';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { GasFeeService } from '@/services/gasFeeService';
import { usePublicClient } from 'wagmi';

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

  const fromTokenData = tokens.find(t => t.symbol === fromToken);
  const toTokenData = tokens.find(t => t.symbol === toToken);
  const maxAmount = fromTokenData?.balance || 0;

  // Initialize gas fee service
  useEffect(() => {
    if (publicClient) {
      setGasFeeService(new GasFeeService(publicClient as any));
    }
  }, [publicClient]);

  // Get real exchange rate from DEX
  useEffect(() => {
    if (fromTokenData && toTokenData && fromAmount) {
      const fetchQuote = async () => {
        try {
          // Get token addresses (this would need to be implemented properly)
          const fromTokenAddress = fromTokenData.contractAddress || '0x0000000000000000000000000000000000000000'; // ETH
          const toTokenAddress = toTokenData.contractAddress || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC as example

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
                Balance: {toTokenData?.balance.toFixed(4) || '0.0000'}
              </span>
            </div>
            <div className="flex gap-3">
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={toAmount}
                readOnly
                placeholder="0.00"
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Slippage Tolerance */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Slippage Tolerance
            </label>
            <div className="flex gap-2">
              {DEFAULT_SLIPPAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSlippage(option.value)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    slippage === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <div className="relative flex-1">
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                  className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center"
                  step="0.1"
                  min="0.1"
                  max="50"
                />
                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Exchange Rate */}
          {exchangeRate > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">Exchange Rate:</span>
                <span className="text-blue-900 dark:text-blue-200">
                  1 {fromToken} = {exchangeRate.toFixed(6)} {toToken}
                </span>
              </div>
              {priceImpact && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-blue-700 dark:text-blue-300">Price Impact:</span>
                  <span className="text-blue-900 dark:text-blue-200">
                    {parseFloat(priceImpact).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Fees */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Network Fee:</span>
              <span className="text-gray-900 dark:text-white">
                {gasEstimate ? (
                  gasFeeService ? (
                    gasFeeService.formatGasFeeUserFriendly({
                      gasLimit: BigInt(gasEstimate),
                      gasPrice: BigInt(20000000000), // 20 gwei default
                      totalCost: BigInt(gasEstimate) * BigInt(20000000000)
                    })
                  ) : (
                    `${formatUnits(gasEstimate, 'ether')} ETH`
                  )
                ) : (
                  '~$3.20'
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Slippage Tolerance:</span>
              <span className="text-gray-900 dark:text-white">{slippage}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Minimum Received:</span>
              <span className="text-gray-900 dark:text-white">
                {toAmount ? (parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6) : '0.00'} {toToken}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSwap}
            disabled={isLoading || !fromAmount || !toAmount || fromToken === toToken}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Swap'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}