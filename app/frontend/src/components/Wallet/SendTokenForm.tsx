import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useSendTransaction, useBalance } from 'wagmi';
import { parseUnits, isAddress, formatUnits } from 'viem';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { Loader2, Send, ChevronDown, Wallet, CheckCircle, AlertCircle, User, DollarSign, ArrowUpRight } from 'lucide-react';
import { SUPPORTED_CHAINS, getTokensForChain } from '@/config/payment';

interface SendTokenFormProps {
  onClose: () => void;
  initialRecipient?: string;
}

export const SendTokenForm: React.FC<SendTokenFormProps> = ({ onClose, initialRecipient = '' }) => {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { addToast } = useToast();
  
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState('');
  const [selectedChainId, setSelectedChainId] = useState<number>(chainId && SUPPORTED_CHAINS.some(c => c.chainId === chainId) ? chainId : SUPPORTED_CHAINS[0].chainId);
  const [selectedToken, setSelectedToken] = useState(getTokensForChain(selectedChainId)[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Quick amount presets
  const quickAmounts = [5, 10, 25, 50, 100];

  // Get user balance for selected token
  const { data: balanceData } = useBalance({
    address: address,
    token: selectedToken?.address as `0x${string}`,
    chainId: selectedChainId,
  });

  const userBalance = balanceData ? parseFloat(formatUnits(balanceData.value, selectedToken.decimals)) : 0;

  // Calculate USD value (stablecoins only - always 1:1 with USD)
  const tokenPriceUSD = 1;
  const amountUSD = parseFloat(amount || '0') * tokenPriceUSD;
  const balanceUSD = userBalance * tokenPriceUSD;

  // Update recipient when initialRecipient changes (e.g., when opening from different profiles)
  useEffect(() => {
    if (initialRecipient) {
      setRecipient(initialRecipient);
    }
  }, [initialRecipient]);

  // Update selected token when chain changes
  useEffect(() => {
    const tokens = getTokensForChain(selectedChainId);
    if (tokens.length > 0) {
      const existingToken = tokens.find(t => t.symbol === selectedToken?.symbol);
      setSelectedToken(existingToken || tokens[0]);
    }
  }, [selectedChainId]);

  // Sync selected chain with wallet chain if it's supported
  useEffect(() => {
    if (chainId && SUPPORTED_CHAINS.some(c => c.chainId === chainId)) {
      setSelectedChainId(chainId);
    }
  }, [chainId]);

  const { data: hash, writeContractAsync, error: writeError, isPending: isWritePending } = useWriteContract();
  const { sendTransactionAsync, isPending: isSendPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleSend = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!isAddress(recipient)) {
      addToast('Invalid recipient address', 'error');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    if (parseFloat(amount) > userBalance) {
      addToast('Insufficient balance', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      if (chainId !== selectedChainId) {
        try {
          addToast('Switching network...', 'info');
          await switchChainAsync({ chainId: selectedChainId });
        } catch (error) {
          console.error('Failed to switch network:', error);
          addToast('Failed to switch network', 'error');
          setIsProcessing(false);
          return;
        }
      }

      const amountBigInt = parseUnits(amount, selectedToken.decimals);

      if (selectedToken.isNative) {
        await sendTransactionAsync({
          to: recipient as `0x${string}`,
          value: amountBigInt,
          chainId: selectedChainId
        });
        addToast('Transaction submitted!', 'success');
        onClose();
      } else {
        if (!selectedToken.address) throw new Error('Token address missing');
        
        await writeContractAsync({
          address: selectedToken.address as `0x${string}`,
          abi: [{
            name: 'transfer',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }],
            outputs: [{ name: '', type: 'bool' }]
          }],
          functionName: 'transfer',
          args: [recipient as `0x${string}`, amountBigInt],
          chainId: selectedChainId
        });
      }
    } catch (error: any) {
      console.error('Send failed:', error);
      addToast(error.message || 'Transaction failed to initiate', 'error');
      setIsProcessing(false);
    }
  };
  
  useEffect(() => {
    if (isConfirmed) {
      addToast('Transaction confirmed!', 'success');
      setIsProcessing(false);
      onClose();
    }
    if (writeError) {
      setIsProcessing(false);
    }
  }, [isConfirmed, writeError, onClose, addToast]);

  const isValidAddress = recipient && isAddress(recipient);
  const isValidAmount = amount && parseFloat(amount) > 0;
  const canShowPreview = isValidAddress && isValidAmount && !isProcessing;

  if (showPreview && canShowPreview) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Transaction</h3>
          <p className="text-gray-600 dark:text-gray-400">Please review the details below</p>
        </div>

        {/* Preview Card */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl p-5 space-y-4 border border-gray-200 dark:border-gray-700">
          {/* Recipient */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">To</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white">{recipient.slice(0, 8)}...{recipient.slice(-6)}</p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">{amount}</span>
              <span className="text-xl text-gray-600 dark:text-gray-400">{selectedToken.symbol}</span>
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-lg text-gray-600 dark:text-gray-400">${amountUSD.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Network */}
          <div className="flex items-center justify-between text-sm py-2">
            <span className="text-gray-500 dark:text-gray-400">Network</span>
            <span className="font-medium text-gray-900 dark:text-white">{SUPPORTED_CHAINS.find(c => c.chainId === selectedChainId)?.name}</span>
          </div>

          {/* Fee Estimate */}
          <div className="flex items-center justify-between text-sm py-2">
            <span className="text-gray-500 dark:text-gray-400">Estimated Fee</span>
            <span className="font-medium text-gray-900 dark:text-white">~$0.50 - $2.00</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={isProcessing || isWritePending || isSendPending || isConfirming}
            className="w-full flex items-center justify-center gap-2 py-4 text-base"
          >
            {(isProcessing || isWritePending || isSendPending || isConfirming) ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : (
              <>
                <Send size={20} />
                Confirm & Send
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowPreview(false)}
            className="w-full py-3"
          >
            Back to Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Your Balance Card */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Your Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{userBalance.toFixed(4)}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{selectedToken?.symbol}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">≈</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">${balanceUSD.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Recipient Input */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-900 dark:text-white">Send to</label>
        
        {/* Show recipient card if pre-filled from profile */}
        {initialRecipient && recipient === initialRecipient && isValidAddress && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                  Recipient Pre-filled from Profile
                </p>
                <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                  {recipient.slice(0, 10)}...{recipient.slice(-8)}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter wallet address or ENS"
            className={`w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-all font-mono text-sm
              ${isValidAddress ? 'border-green-500 focus:ring-green-500' : recipient ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-purple-500 focus:border-purple-500'}`}
          />
          {isValidAddress && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          )}
        </div>
      </div>

      {/* Network & Token Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">Network</label>
          <div className="relative">
            <select 
              value={selectedChainId}
              onChange={(e) => setSelectedChainId(Number(e.target.value))}
              className="w-full p-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium cursor-pointer"
            >
              {SUPPORTED_CHAINS.map(chain => (
                <option key={chain.chainId} value={chain.chainId} className="bg-white dark:bg-gray-800">
                  {chain.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">Asset</label>
          <div className="relative">
            <select 
              value={selectedToken?.symbol || ''}
              onChange={(e) => {
                const token = getTokensForChain(selectedChainId).find(t => t.symbol === e.target.value);
                if (token) setSelectedToken(token);
              }}
              className="w-full p-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium cursor-pointer"
            >
              {getTokensForChain(selectedChainId).map(token => (
                <option key={token.symbol} value={token.symbol} className="bg-white dark:bg-gray-800">
                  {token.symbol}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
          </div>
        </div>
      </div>

      {/* Amount Input with Quick Select */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">Amount</label>
          {amount && (
            <div className="flex items-center gap-1 text-sm">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">${amountUSD.toFixed(2)} USD</span>
            </div>
          )}
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-gray-900 dark:text-white font-semibold">{selectedToken?.symbol}</span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-16 pr-24 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-2xl font-bold"
          />
          <button
            onClick={() => setAmount(userBalance.toString())}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            MAX
          </button>
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-5 gap-2">
          {quickAmounts.map((presetAmount) => (
            <button
              key={presetAmount}
              onClick={() => setAmount(presetAmount.toString())}
              className="py-2.5 px-1 bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 transition-all"
            >
              ${presetAmount}
            </button>
          ))}
        </div>
      </div>

      {/* Send Button */}
      <Button
        variant="primary"
        onClick={() => setShowPreview(true)}
        disabled={!canShowPreview}
        className="w-full flex items-center justify-center gap-2 py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
      >
        <ArrowUpRight size={20} />
        Review & Send
      </Button>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Double-check the recipient address. Transactions on the blockchain are irreversible.
        </p>
      </div>
    </div>
  );
};