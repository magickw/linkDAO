import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown, AlertTriangle, ShieldCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { TokenBalance } from '../../types/wallet';
import { useToast } from '@/context/ToastContext';
import { useTokenTransfer } from '../../hooks/useTokenTransfer';
import { useNetworkSwitch, CHAIN_NAMES } from '../../hooks/useNetworkSwitch';
import { getTokenLogoWithFallback } from '@/utils/tokenLogoUtils';
import { isAddress, parseUnits, formatEther, encodeFunctionData } from 'viem';
import { useEstimateGas } from 'wagmi';
import { SecureKeyStorage } from '../../security/secureKeyStorage';

// Basic ERC20 ABI for transfer encoding
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

// Placeholder for a real phishing detection service
// In production, this should check against a real-time blocklist API
const MALICIOUS_ADDRESSES = [
  '0x000000000000000000000000000000000000dead', // Example
  '0x0000000000000000000000000000000000000000'
];

const isMaliciousAddress = (address: string): boolean => {
  if (!address) return false;
  return MALICIOUS_ADDRESSES.includes(address.toLowerCase());
};

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenBalance[];
  initialToken?: string;
  onSuccess?: (hash: string) => void;
}

export default function SendTokenModal({ isOpen, onClose, tokens, initialToken, onSuccess }: SendTokenModalProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { currentChainId, ensureNetwork, isSwitching, getChainName, supportedChains } = useNetworkSwitch();
  const { transfer, isPending, txHash } = useTokenTransfer();

  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState(tokens[0]?.symbol || 'ETH');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState('');
  const [selectedChainId, setSelectedChainId] = useState<number>(currentChainId);

  // Local Wallet State
  const [isLocalWallet, setIsLocalWallet] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Define available networks with icons
  const networks = [
    { id: 1, name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io', icon: '/networks/ethereum.png' },
    { id: 8453, name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org', icon: '/networks/base.png' },
    { id: 137, name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com', icon: '/networks/polygon.png' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io', icon: '/networks/arbitrum.png' },
    { id: 11155111, name: 'Sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io', icon: '/networks/ethereum.png' },
    { id: 84532, name: 'Base Sepolia', symbol: 'ETH', explorer: 'https://sepolia.basescan.org', icon: '/networks/base.png' },
  ];

  const selectedNetwork = networks.find(network => network.id === selectedChainId) || networks[0];
  const needsNetworkSwitch = selectedChainId !== currentChainId && !isLocalWallet; // Don't enforce switch for local wallet (handled by service)

  const selectedToken = tokens.find(t => t.symbol === selectedTokenSymbol);
  const maxAmount = selectedToken ? getTokenBalanceForChain(selectedToken, selectedChainId) : 0;
  const estimatedValue = parseFloat(amount || '0') * (selectedToken?.valueUSD || 0) / (selectedToken?.balance || 1);

  // Determine if native token (ETH/MATIC)
  const isNative = useMemo(() => {
    if (!selectedToken) return true;
    return !selectedToken.contractAddress ||
      selectedToken.contractAddress === '0x0000000000000000000000000000000000000000' ||
      (selectedChainId === 137 && selectedToken.symbol === 'MATIC') ||
      (selectedToken.symbol === 'ETH' && selectedChainId !== 137); // Simple heuristic
  }, [selectedToken, selectedChainId]);

  // Check for local wallet on mount/open
  useEffect(() => {
    if (isOpen) {
      const active = SecureKeyStorage.getActiveWallet();
      setIsLocalWallet(!!active);
    }
  }, [isOpen]);

  // Prepare transaction data for gas estimation
  const estimateParams = useMemo(() => {
    if (!amount || !recipient || !isAddress(recipient) || parseFloat(amount) <= 0) return undefined;

    try {
      if (isNative) {
        return {
          to: recipient as `0x${string}`,
          value: parseUnits(amount, 18), // Native is always 18 mostly
          chainId: selectedChainId
        };
      } else {
        // ERC20
        const decimals = selectedTokenSymbol === 'USDC' ? 6 : 18; // Logic from handleSend
        const data = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [recipient as `0x${string}`, parseUnits(amount, decimals)]
        });
        return {
          to: selectedToken?.contractAddress as `0x${string}`,
          data,
          chainId: selectedChainId
        };
      }
    } catch (e) {
      return undefined;
    }
  }, [amount, recipient, isNative, selectedChainId, selectedTokenSymbol, selectedToken]);

  // Estimate Gas
  const { data: gasData, error: gasError, isLoading: isGasLoading } = useEstimateGas({
    ...estimateParams,
    query: {
      enabled: !!estimateParams && !needsNetworkSwitch && !isLocalWallet, // Don't estimate via wagmi if local wallet (handled by service simulation)
      retry: false
    }
  });

  // Pre-select current network when modal opens
  useEffect(() => {
    if (isOpen && currentChainId) {
      setSelectedChainId(currentChainId);
    }
  }, [isOpen, currentChainId]);

  // Sync selected token when modal opens or when tokens/initialToken change
  useEffect(() => {
    if (!isOpen) return;

    if (initialToken) {
      const found = tokens.find(t => t.symbol === initialToken);
      if (found) {
        setSelectedTokenSymbol(initialToken);
        return;
      }
    }

    // Only set a default token if no token is currently selected
    // This allows users to freely choose any token without being forced to a default
    if (tokens && tokens.length > 0 && !initialToken && !selectedTokenSymbol) {
      setSelectedTokenSymbol(tokens[0].symbol);
    }
  }, [isOpen, tokens, initialToken, selectedTokenSymbol]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setRecipient('');
      setError('');
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen]);

  // Get token balance for selected chain
  function getTokenBalanceForChain(token: TokenBalance, chainId: number): number {
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
  }

  // Handle network change with auto-switch
  const handleNetworkChange = async (newChainId: number) => {
    setSelectedChainId(newChainId);
    setError(''); // Clear any previous errors
  };

  const handleSend = async () => {
    if (!amount || !recipient) {
      setError('Please fill in all fields');
      return;
    }

    if (isLocalWallet && !password) {
      setError('Password is required for local wallet transactions');
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      setError(`Insufficient balance on ${selectedNetwork.name}. Available: ${maxAmount.toFixed(4)} ${selectedTokenSymbol}`);
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    // UPDATED: EIP-55 Address Validation
    if (!isAddress(recipient)) {
      setError('Invalid recipient address (Checksum failed or invalid format)');
      return;
    }

    // UPDATED: Phishing Detection
    if (isMaliciousAddress(recipient)) {
      setError('Security Alert: This address is flagged as malicious!');
      return;
    }

    setError('');

    // Auto-switch network if needed (only for injected wallets)
    if (needsNetworkSwitch && !isLocalWallet) {
      const switchResult = await ensureNetwork(selectedChainId);
      if (!switchResult.success) {
        setError(switchResult.error || 'Failed to switch network');
        addToast(switchResult.error || 'Failed to switch network', 'error');
        return;
      }
      addToast(`Switched to ${selectedNetwork.name}`, 'success');
    }

    try {
      const hash = await transfer({
        tokenAddress: selectedToken?.contractAddress,
        tokenSymbol: selectedTokenSymbol,
        recipient,
        amount,
        decimals: selectedTokenSymbol === 'USDC' ? 6 : 18, // Simple heuristic
        chainId: selectedChainId,
        password: isLocalWallet ? password : undefined
      });

      if (hash) {
        addToast('Transaction submitted successfully! Redirecting...', 'success');
        if (onSuccess) onSuccess(hash);

        // Redirect to transaction history
        router.push('/wallet/transactions');

        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      addToast('Transaction failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    }
  };

  const handleMax = () => {
    setAmount(maxAmount.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Send Tokens</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Connected: {getChainName(currentChainId)}
              {isLocalWallet && ' (Local Wallet)'}
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
        <div className="p-6 space-y-5">
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
              {needsNetworkSwitch && !isLocalWallet && (
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
          </div>

          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Asset
            </label>
            <div className="relative">
              <Listbox value={selectedTokenSymbol} onChange={setSelectedTokenSymbol}>
                <div className="relative mt-1">
                  <Listbox.Button className="relative w-full cursor-default rounded-xl bg-white dark:bg-gray-700 py-3 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm">
                    <span className="flex items-center truncate">
                      {(() => {
                        const logo = getTokenLogoWithFallback(selectedTokenSymbol);
                        return logo ? (
                          <img src={logo} alt={selectedTokenSymbol} className="mr-2 h-5 w-5 rounded-full" />
                        ) : (
                          <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600 dark:text-primary-400">
                            {selectedTokenSymbol.slice(0, 1)}
                          </div>
                        );
                      })()}
                      <span className="block truncate text-gray-900 dark:text-gray-100">{selectedTokenSymbol}</span>
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
                      {tokens.map((token, tokenIdx) => (
                        <Listbox.Option
                          key={tokenIdx}
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
              <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                <span>Balance on {selectedNetwork.name}: {maxAmount.toFixed(4)} {selectedTokenSymbol}</span>
                <span>≈ ${((maxAmount * (selectedToken?.valueUSD || 0)) / (selectedToken?.balance || 1)).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 pr-16 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
              />
              <button
                onClick={handleMax}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-bold rounded hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
              >
                MAX
              </button>
            </div>
            {amount && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                ≈ ${estimatedValue.toFixed(2)} USD
              </p>
            )}
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            />
            {/* Security Indicators */}
            {recipient && isAddress(recipient) && !isMaliciousAddress(recipient) && (
              <div className="mt-1 flex items-center text-xs text-green-600 dark:text-green-400">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Valid checksummed address
              </div>
            )}
            {recipient && isMaliciousAddress(recipient) && (
              <div className="mt-1 flex items-center text-xs text-red-600 dark:text-red-400 font-bold">
                <ShieldAlert className="w-3 h-3 mr-1" />
                Security Risk: Suspicious address
              </div>
            )}
          </div>

          {/* Password Input for Local Wallet */}
          {isLocalWallet && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wallet Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your wallet password"
                  className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Required to sign the transaction with your local wallet
              </p>
            </div>
          )}

          {/* Gas Estimation & Simulation */}
          {estimateParams && !needsNetworkSwitch && !isLocalWallet && (
            <div className={`p-3 rounded-lg text-sm border ${gasError
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Transaction Simulation:</span>
                {isGasLoading ? (
                  <div className="flex items-center">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="text-gray-500">Estimating gas...</span>
                  </div>
                ) : gasError ? (
                  <span className="text-red-600 dark:text-red-400 font-bold flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Execution Will Fail
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400 font-bold flex items-center">
                    <Check className="w-3 h-3 mr-1" />
                    Likely to Succeed
                  </span>
                )}
              </div>
              {gasData && !gasError && (
                <div className="mt-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Estimated Gas Cost:</span>
                  <span className="font-mono">
                    {formatEther(gasData * BigInt(2000000000))} {networks.find(n => n.id === selectedChainId)?.symbol} (approx)
                  </span>
                </div>
              )}
              {gasError && (
                <div className="mt-1 text-xs text-red-500 break-words">
                  Error: Transaction invalid or likely to revert. Check balance and permissions.
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSend}
            disabled={isPending || isSwitching || !amount || !recipient || (!!gasError && !isLocalWallet) || (isGasLoading && !isLocalWallet)}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isSwitching ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Switching Network...
              </>
            ) : isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {needsNetworkSwitch && !isLocalWallet && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {needsNetworkSwitch && !isLocalWallet ? `Switch & Send ${selectedTokenSymbol}` : `Send ${selectedTokenSymbol}`}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
