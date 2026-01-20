import React, { useState, useEffect, Fragment } from 'react';
import { TokenBalance } from '../../types/wallet';
import { useToast } from '@/context/ToastContext';
import { dexSwapService } from '@/services/dexSwapService';
import { formatUnits, parseUnits } from 'ethers';
import { GasFeeService } from '@/services/gasFeeService';
import { usePublicClient } from 'wagmi';
import { DEFAULT_SLIPPAGE_OPTIONS, DEFAULT_SLIPPAGE } from '@/types/dex';
import { TokenInfo } from '@/types/dex';
import { useNetworkSwitch, CHAIN_NAMES } from '../../hooks/useNetworkSwitch';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { getTokenLogoWithFallback } from '@/utils/tokenLogoUtils';
import { useDebounce } from '@/hooks/useDebounce';

interface SwapTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenBalance[];
  onSwap: (fromToken: string, toToken: string, amount: number) => Promise<void>;
}

// Helper to estimate decimals since TokenBalance might miss it
const getDecimals = (symbol: string) => {
  if (['USDC', 'USDT'].includes(symbol)) return 6;
  if (['WBTC'].includes(symbol)) return 8;
  return 18;
};

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

  // Debounce the input amount to prevent excessive API calls
  const debouncedFromAmount = useDebounce(fromAmount, 800);

  // Define available networks for swapping
  const networks = [
    { id: 1, name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io', icon: '/networks/ethereum.png' },
    { id: 8453, name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org', icon: '/networks/base.png' },
    { id: 137, name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com', icon: '/networks/polygon.png' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io', icon: '/networks/arbitrum.png' },
    { id: 11155111, name: 'Sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io', icon: '/networks/ethereum.png' },
    { id: 84532, name: 'Base Sepolia', symbol: 'ETH', explorer: 'https://sepolia.basescan.org', icon: '/networks/base.png' },
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
        const popular = await dexSwapService.getPopularTokens(selectedChainId);
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

  // Get real exchange rate from DEX using debounced input
  // Get real exchange rate from DEX using debounced input
  useEffect(() => {
    // Only fetch if we have valid inputs and debounced amount
    if (fromTokenData && toTokenData && debouncedFromAmount && parseFloat(debouncedFromAmount) > 0) {
      const fetchQuote = async () => {
        setIsLoading(true);
        setError('');

        // Get real token addresses from wallet data
        const fromTokenAddress = fromTokenData.contractAddress || '0x0000000000000000000000000000000000000000'; // ETH/native token
        const toTokenAddress = toTokenData.contractAddress || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC as fallback

        try {

          const quoteResponse = await dexSwapService.getSwapQuote({
            tokenIn: {
              address: fromTokenAddress,
              symbol: fromTokenData.symbol,
              name: fromTokenData.name,
              decimals: getDecimals(fromTokenData.symbol)
            },
            tokenOut: {
              address: toTokenAddress,
              symbol: toTokenData.symbol,
              name: toTokenData.name,
              decimals: getDecimals(toTokenData.symbol)
            },
            amountIn: debouncedFromAmount,
            slippageTolerance: slippage
          }, selectedChainId);

          if (!quoteResponse) {
            throw new Error('Failed to get swap quote');
          }

          // Calculate exchange rate
          const rate = parseFloat(quoteResponse.amountOut) / parseFloat(quoteResponse.amountIn);
          setExchangeRate(rate);
          setToAmount(quoteResponse.amountOut);
          setGasEstimate(quoteResponse.gasEstimate);
          setPriceImpact(quoteResponse.priceImpact.toString());
        } catch (err) {
          console.error('Error fetching swap quote:', err);
          setError('Failed to get live quote. Using estimated rate.');

          try {
            // Fallback: Try to calculate rate from wallet prices or service
            let fromPrice = 0;
            let toPrice = 0;

            // 1. Try to get prices from service
            const [p1, p2] = await Promise.all([
              dexSwapService.getTokenPrice(fromTokenAddress, selectedChainId),
              dexSwapService.getTokenPrice(toTokenAddress, selectedChainId)
            ]);

            if (p1) fromPrice = p1;
            if (p2) toPrice = p2;

            // 2. If service failed, try to derive from wallet data
            if (!fromPrice && fromTokenData.balance > 0) {
              fromPrice = fromTokenData.valueUSD / fromTokenData.balance;
            }
            if (!toPrice && toTokenData.balance > 0) {
              toPrice = toTokenData.valueUSD / toTokenData.balance;
            }

            // Calculate rate if we have valid prices
            if (fromPrice > 0 && toPrice > 0) {
              const rate = fromPrice / toPrice;
              setExchangeRate(rate);

              if (debouncedFromAmount) {
                const estimated = parseFloat(debouncedFromAmount) * rate;
                setToAmount(estimated.toFixed(6));
              }
              // Clear the critical error since we have a fallback, but keep a warning
              setError('Using estimated exchange rate (live quote failed).');
            } else {
              setExchangeRate(0);
              setToAmount('');
              setError('Failed to get exchange rate.');
            }
          } catch (fallbackErr) {
            console.error('Fallback calculation failed:', fallbackErr);
            setExchangeRate(0);
            setToAmount('');
          }

        } finally {
          setIsLoading(false);
        }
      };

      fetchQuote();
    } else if (!debouncedFromAmount) {
      setExchangeRate(0);
      setToAmount('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken, toToken, debouncedFromAmount, fromTokenData?.contractAddress, fromTokenData?.symbol, toTokenData?.contractAddress, toTokenData?.symbol, slippage, selectedChainId]);

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
        dexSwapService.validateToken(fromTokenAddress, selectedChainId),
        dexSwapService.validateToken(toTokenAddress, selectedChainId)
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Network
            </label>
            <div className="relative">
              <Listbox value={selectedNetwork} onChange={(val) => handleNetworkChange(val.id)} disabled={isSwitching}>
                <div className="relative mt-1">
                  <Listbox.Button className="relative w-full cursor-default rounded-xl bg-white dark:bg-gray-700 py-3 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                    <span className="flex items-center truncate">
                      <img
                        src={selectedNetwork.icon}
                        alt={selectedNetwork.name}
                        className="mr-2 h-5 w-5 rounded-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="mr-2 hidden h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600 dark:text-primary-400">
                        {selectedNetwork.symbol.slice(0, 1)}
                      </div>
                      <span className="block truncate text-gray-900 dark:text-gray-100">{selectedNetwork.name}</span>
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronDown
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                      {networks.map((network, networkIdx) => (
                        <Listbox.Option
                          key={networkIdx}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                            }`
                          }
                          value={network}
                        >
                          {({ selected }) => (
                            <>
                              <span className="flex items-center truncate">
                                <img
                                  src={network.icon}
                                  alt={network.name}
                                  className="mr-2 h-5 w-5 rounded-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="mr-2 hidden h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600 dark:text-primary-400">
                                  {network.symbol.slice(0, 1)}
                                </div>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                  {network.name}
                                </span>
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                                  <Check className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>

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

              {/* From Token */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Balance on {selectedNetwork.name}: {maxAmount.toFixed(4)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Listbox value={fromToken} onChange={setFromToken}>
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white dark:bg-gray-700 py-3 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                          <span className="flex items-center truncate">
                            {(() => {
                              const logo = getTokenLogoWithFallback(fromToken);
                              return logo ? (
                                <img src={logo} alt={fromToken} className="mr-2 h-5 w-5 rounded-full" />
                              ) : (
                                <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600 dark:text-primary-400">
                                  {fromToken.slice(0, 1)}
                                </div>
                              );
                            })()}
                            <span className="block truncate text-gray-900 dark:text-gray-100">{fromToken}</span>
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                            {tokens.map((token) => (
                              <Listbox.Option
                                key={token.symbol}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                                  }`
                                }
                                value={token.symbol}
                              >
                                {({ selected }) => (
                                  <>
                                    <span className="flex items-center truncate">
                                      {(() => {
                                        const logo = getTokenLogoWithFallback(token.symbol);
                                        return logo ? (
                                          <img src={logo} alt={token.symbol} className="mr-2 h-5 w-5 rounded-full" />
                                        ) : (
                                          <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                            {token.symbol.slice(0, 1)}
                                          </div>
                                        );
                                      })()}
                                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                        {token.symbol}
                                      </span>
                                    </span>
                                    {selected ? (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                                        <Check className="h-5 w-5" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>
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
                  <div className="flex-1">
                    <Listbox value={toToken} onChange={setToToken}>
                      <div className="relative">
                        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white dark:bg-gray-700 py-3 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                          <span className="flex items-center truncate">
                            {(() => {
                              const logo = getTokenLogoWithFallback(toToken);
                              return logo ? (
                                <img src={logo} alt={toToken} className="mr-2 h-5 w-5 rounded-full" />
                              ) : (
                                <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600 dark:text-primary-400">
                                  {toToken.slice(0, 1)}
                                </div>
                              );
                            })()}
                            <span className="block truncate text-gray-900 dark:text-gray-100">{toToken}</span>
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                            {/* Show tokens from wallet first */}
                            {tokens
                              .filter(token => token.symbol !== fromToken)
                              .map((token) => (
                                <Listbox.Option
                                  key={`${token.symbol}-${token.contractAddress}`}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                                    }`
                                  }
                                  value={token.symbol}
                                >
                                  {({ selected }) => (
                                    <>
                                      <span className="flex items-center truncate">
                                        {(() => {
                                          const logo = getTokenLogoWithFallback(token.symbol);
                                          return logo ? (
                                            <img src={logo} alt={token.symbol} className="mr-2 h-5 w-5 rounded-full" />
                                          ) : (
                                            <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                              {token.symbol.slice(0, 1)}
                                            </div>
                                          );
                                        })()}
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                          {token.symbol}
                                        </span>
                                      </span>
                                      {selected ? (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                                          <Check className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            {/* Add popular tokens not in wallet */}
                            {popularTokens
                              .filter(token =>
                                !tokens.some(t => t.symbol === token.symbol) &&
                                token.symbol !== fromToken
                              )
                              .map((token) => (
                                <Listbox.Option
                                  key={`${token.symbol}-${token.address}`}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                                    }`
                                  }
                                  value={token.symbol}
                                >
                                  {({ selected }) => (
                                    <>
                                      <span className="flex items-center truncate">
                                        {(() => {
                                          const logo = getTokenLogoWithFallback(token.symbol);
                                          return logo ? (
                                            <img src={logo} alt={token.symbol} className="mr-2 h-5 w-5 rounded-full" />
                                          ) : (
                                            <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                              {token.symbol.slice(0, 1)}
                                            </div>
                                          );
                                        })()}
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                          {token.symbol}
                                        </span>
                                      </span>
                                      {selected ? (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                                          <Check className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>
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
      </div>
    </div>
  );
}
