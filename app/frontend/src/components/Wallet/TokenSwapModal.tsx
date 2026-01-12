/**
 * Token Swap Modal Component
 * Provides a UI for swapping tokens using DEX aggregators
 */

import React, { useState, useEffect } from 'react';
import { ArrowDownUp, Settings, X, RefreshCw, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { dexSwapService, Token, SwapQuote, SwapResult } from '@/services/dexSwapService';
import { useToast } from '@/context/ToastContext';

interface TokenSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTokenIn?: Token;
  initialTokenOut?: Token;
}

type SlippageOption = 'auto' | '0.1' | '0.5' | '1.0' | 'custom';

export const TokenSwapModal: React.FC<TokenSwapModalProps> = ({
  isOpen,
  onClose,
  initialTokenIn,
  initialTokenOut
}) => {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { addToast } = useToast();

  const [tokenIn, setTokenIn] = useState<Token | null>(initialTokenIn || null);
  const [tokenOut, setTokenOut] = useState<Token | null>(initialTokenOut || null);
  const [amountIn, setAmountIn] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState<SlippageOption>('0.5');
  const [customSlippage, setCustomSlippage] = useState('0.5');
  const [showTokenSelector, setShowTokenSelector] = useState<'in' | 'out' | null>(null);
  const [popularTokens, setPopularTokens] = useState<Token[]>([]);

  // Load popular tokens on mount
  useEffect(() => {
    if (isOpen) {
      loadPopularTokens();
    }
  }, [isOpen, chain?.id]);

  const loadPopularTokens = async () => {
    try {
      const tokens = await dexSwapService.getPopularTokens(chain?.id || 1);
      setPopularTokens(tokens);
      
      // Set default tokens if not provided
      if (!tokenIn && tokens.length > 0) {
        setTokenIn(tokens[0]);
      }
      if (!tokenOut && tokens.length > 1) {
        setTokenOut(tokens[1]);
      }
    } catch (error) {
      console.error('Failed to load popular tokens:', error);
    }
  };

  // Get quote when inputs change
  useEffect(() => {
    const getQuote = async () => {
      if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
        setQuote(null);
        return;
      }

      setIsLoading(true);
      try {
        const result = await dexSwapService.getSwapQuote({
          tokenIn,
          tokenOut,
          amountIn,
          slippageTolerance: getSlippageValue()
        }, chain?.id || 1);
        setQuote(result);
      } catch (error) {
        console.error('Failed to get quote:', error);
        setQuote(null);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(getQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [tokenIn, tokenOut, amountIn, slippage, customSlippage, chain?.id]);

  const getSlippageValue = (): number => {
    if (slippage === 'custom') {
      return parseFloat(customSlippage);
    }
    return parseFloat(slippage);
  };

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setQuote(null);
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      setAmountIn(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setAmountIn(sanitized);
    }
  };

  const handleMaxAmount = () => {
    if (tokenIn?.balance) {
      setAmountIn(tokenIn.balance);
    }
  };

  const handleExecuteSwap = async () => {
    if (!address || !walletClient || !publicClient || !tokenIn || !tokenOut || !quote) {
      return;
    }

    setIsExecuting(true);
    try {
      const result: SwapResult = await dexSwapService.executeSwap({
        tokenIn,
        tokenOut,
        amountIn,
        slippageTolerance: getSlippageValue(),
        walletAddress: address,
        publicClient,
        walletClient
      });

      if (result.success) {
        addToast(`Swap successful! Received ${result.amountOut} ${tokenOut.symbol}`, 'success');
        onClose();
        setAmountIn('');
        setQuote(null);
      } else {
        addToast(`Swap failed: ${result.error}`, 'error');
      }
    } catch (error) {
      addToast(`Swap error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const canExecute = () => {
    return (
      tokenIn &&
      tokenOut &&
      amountIn &&
      parseFloat(amountIn) > 0 &&
      quote &&
      !isLoading &&
      !isExecuting
    );
  };

  const getPriceImpactColor = () => {
    if (!quote) return 'text-gray-500';
    if (quote.priceImpact < 0.1) return 'text-green-500';
    if (quote.priceImpact < 1) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Swap Tokens</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Slippage Tolerance
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['auto', '0.1', '0.5', '1.0'] as SlippageOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSlippage(option)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      slippage === option
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option === 'auto' ? 'Auto' : `${option}%`}
                  </button>
                ))}
              </div>
              {slippage === 'custom' && (
                <div className="mt-2">
                  <input
                    type="number"
                    value={customSlippage}
                    onChange={(e) => setCustomSlippage(e.target.value)}
                    step="0.1"
                    min="0.1"
                    max="50"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="Custom slippage %"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your transaction will revert if the price changes unfavorably by more than this percentage
            </p>
          </div>
        )}

        {/* Swap Interface */}
        <div className="p-6 space-y-4">
          {/* Token In */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">You pay</label>
              {tokenIn?.balance && (
                <button
                  onClick={handleMaxAmount}
                  className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                >
                  MAX
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={amountIn}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-3xl font-bold text-gray-900 dark:text-white focus:outline-none"
              />
              <button
                onClick={() => setShowTokenSelector('in')}
                className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
              >
                {tokenIn ? (
                  <>
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{tokenIn.symbol[0]}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{tokenIn.symbol}</span>
                  </>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Select token</span>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {tokenIn?.balance && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Balance: {tokenIn.balance} {tokenIn.symbol}
              </p>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleSwapTokens}
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-colors"
            >
              <ArrowDownUp className="w-5 h-5" />
            </button>
          </div>

          {/* Token Out */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">You receive</label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                {isLoading ? (
                  <div className="text-3xl font-bold text-gray-400">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                ) : quote ? (
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {quote.amountOut}
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-gray-400">0.0</div>
                )}
              </div>
              <button
                onClick={() => setShowTokenSelector('out')}
                className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
              >
                {tokenOut ? (
                  <>
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{tokenOut.symbol[0]}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{tokenOut.symbol}</span>
                  </>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Select token</span>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {tokenOut?.balance && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Balance: {tokenOut.balance} {tokenOut.symbol}
              </p>
            )}
          </div>

          {/* Quote Details */}
          {quote && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Rate</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  1 {tokenIn?.symbol} = {(parseFloat(quote.amountOut) / parseFloat(amountIn)).toFixed(6)} {tokenOut?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Price Impact</span>
                <span className={`${getPriceImpactColor()} font-medium`}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Minimum received</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {quote.amountOutMin} {tokenOut?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Gas Estimate</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatUnits(BigInt(quote.gasEstimate || '0'), 9).slice(0, 8)} Gwei
                </span>
              </div>
            </div>
          )}

          {/* Warning */}
          {quote && quote.priceImpact >= 5 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">High price impact</p>
                <p className="text-xs mt-1">
                  This swap has a high price impact of {quote.priceImpact.toFixed(2)}%. Consider increasing your slippage tolerance or splitting your trade.
                </p>
              </div>
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecuteSwap}
            disabled={!canExecute()}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Swapping...</span>
              </>
            ) : !canExecute() ? (
              <span>Enter an amount</span>
            ) : (
              <span>Swap</span>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="px-6 pb-6">
          <div className="flex items-start space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Powered by 1inch and Uniswap V3. Slippage tolerance protects you from unfavorable price movements during transaction execution.
            </p>
          </div>
        </div>
      </div>

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select a token</h3>
              <button
                onClick={() => setShowTokenSelector(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {popularTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => {
                      if (showTokenSelector === 'in') {
                        setTokenIn(token);
                      } else {
                        setTokenOut(token);
                      }
                      setShowTokenSelector(null);
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{token.symbol[0]}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{token.symbol}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{token.name}</p>
                    </div>
                    {token.balance && (
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {token.balance}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
