import React, { useState, useEffect } from 'react';
import { TokenBalance } from '../../types/wallet';
import { useToast } from '@/context/ToastContext';
import { dexService } from '@/services/dexService';
import { formatUnits, parseUnits } from 'ethers';
import { GasFeeService } from '@/services/gasFeeService';
import { usePublicClient } from 'wagmi';
import { DEFAULT_SLIPPAGE_OPTIONS, DEFAULT_SLIPPAGE } from '@/types/dex';
import { TokenInfo } from '@/types/dex';
import { useNetworkSwitch, CHAIN_NAMES } from '../../hooks/useNetworkSwitch';

interface SwapTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenBalance[];
  onSwap: (fromToken: string, toToken: string, amount: number) => Promise<void>;
}

export default function SwapTokenModal({ isOpen, onClose, tokens, onSwap }: SwapTokenModalProps) {
  const { addToast } = useToast();
  const publicClient = usePublicClient();
  const { currentChainId, ensureNetwork, isSwitching, getChainName, supportedChains } = useNetworkSwitch();

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
  const [selectedChainId, setSelectedChainId] = useState<number>(currentChainId);

  // Define available networks for swapping
  const networks = [
    { id: 1, name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
    { id: 8453, name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org' },
    { id: 137, name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io' },
    { id: 11155111, name: 'Sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io' },
    { id: 84532, name: 'Base Sepolia', symbol: 'ETH', explorer: 'https://sepolia.basescan.org' },
  ];

  const selectedNetwork = networks.find(network => network.id === selectedChainId) || networks[0];
  const needsNetworkSwitch = selectedChainId !== currentChainId;

  // Get token balance for selected chain
  const getTokenBalanceForChain = (token: TokenBalance, chainId: number): number => {
    // Check if token has chain breakdown
    if (token.chainBreakdown) {
      const chainData = token.chainBreakdown.find(cb => cb.chainId === chainId);
      if (chainData) return chainData.balance;
    }
    // Fall back to total balance if no chain breakdown or if token is on selected chain
    if (token.chains?.includes(chainId) || !token.chains) {
      return token.balance;
    }
    return 0;
  };

  const fromTokenData = tokens.find(t => t.symbol === fromToken);
  const toTokenData = tokens.find(t => t.symbol === toToken);
  const maxAmount = fromTokenData ? getTokenBalanceForChain(fromTokenData, selectedChainId) : 0;

  // Pre-select current network when modal opens
  useEffect(() => {
    if (isOpen && currentChainId) {
      setSelectedChainId(currentChainId);
    }
  }, [isOpen, currentChainId]);

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
        const popular = await dexService.getPopularTokens(selectedChainId);
        setPopularTokens(popular);
      } catch (err) {
        console.error('Failed to fetch popular tokens:', err);
        // Use default tokens if API fails
        setPopularTokens([]);
      }
    };

    if (isOpen) {
      fetchPopularTokens();
    }
  }, [isOpen, selectedChainId]);

  // Get real exchange rate from DEX
  useEffect(() => {
    if (fromTokenData && toTokenData && fromAmount) {
      const fetchQuote = async () => {
        try {
          // Get real token addresses from wallet data
          const fromTokenAddress = fromTokenData.contractAddress || '0x0000000000000000000000000000000000000000'; // ETH/native token
          const toTokenAddress = toTokenData.contractAddress || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC as fallback

          const quoteResponse = await dexService.getSwapQuote({
            tokenInAddress: fromTokenAddress,
            tokenOutAddress: toTokenAddress,
            amountIn: parseFloat(fromAmount),
            slippageTolerance: slippage
          });

          // Check if the response is successful
          if (!quoteResponse || !quoteResponse.success || !quoteResponse.data) {
            throw new Error('Failed to get swap quote');
          }

          const quote = quoteResponse.data.quote;

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

  // Handle network change
  const handleNetworkChange = async (newChainId: number) => {
    setSelectedChainId(newChainId);
    setError(''); // Clear any previous errors
  };

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
      setError(`Insufficient balance on ${selectedNetwork.name}. Available: ${maxAmount.toFixed(4)} ${fromToken}`);
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

    setError('');

    // Auto-switch network if needed
    if (needsNetworkSwitch) {
      const switchResult = await ensureNetwork(selectedChainId);
      if (!switchResult.success) {
        setError(switchResult.error || 'Failed to switch network');
        addToast(switchResult.error || 'Failed to switch network', 'error');
        return;
      }
      addToast(`Switched to ${selectedNetwork.name}`, 'success');
    }

    setIsLoading(true);

    try {
      await onSwap(fromToken, toToken, parseFloat(fromAmount));

      // Construct the explorer URL based on the selected chain
      const explorerUrl = selectedNetwork.explorer;

      addToast('Swap transaction submitted successfully!', 'success');

      // Ask user if they want to view the transaction on the explorer
      if (window.confirm(`Swap submitted! Would you like to view it on the blockchain explorer?`)) {
        window.open(explorerUrl, '_blank', 'noopener,noreferrer');
      }

      onClose();
      setFromAmount('');
      setToAmount('');
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Swap Tokens</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Connected: {getChainName(currentChainId)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Network
            </label>
            <div className="relative">
              <select
                value={selectedChainId}
                onChange={(e) => handleNetworkChange(Number(e.target.value))}
                disabled={isSwitching}
                className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none disabled:opacity-50"
              >
                {networks.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name} ({network.symbol})
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400">
                  {selectedNetwork.symbol.slice(0, 1)}
                </div>
              </div>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Network switch indicator */}
            {needsNetworkSwitch && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Will auto-switch from {getChainName(currentChainId)} to {selectedNetwork.name}
                </span>
              </div>
            )}
          </div>

          {/* From Token */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Balance on {selectedNetwork.name}: {maxAmount.toFixed(4)}
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
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={isLoading || isSwitching || !fromAmount || !toAmount}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isSwitching ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Switching Network...
              </>
            ) : isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {needsNetworkSwitch && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {needsNetworkSwitch ? `Switch & Swap` : 'Swap Tokens'}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
