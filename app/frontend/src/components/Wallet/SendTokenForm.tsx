import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useSendTransaction } from 'wagmi';
import { parseUnits, isAddress } from 'viem';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { Loader2, Send, ChevronDown } from 'lucide-react';
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

  // Update selected token when chain changes
  useEffect(() => {
    const tokens = getTokensForChain(selectedChainId);
    if (tokens.length > 0) {
      // Try to preserve selection if token symbol exists on new chain
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

  // Hook for ERC20 transfers
  const { data: hash, writeContractAsync, error: writeError, isPending: isWritePending } = useWriteContract();
  
  // Hook for Native (ETH) transfers
  const { sendTransactionAsync, isPending: isSendPending } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash,
  });

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

    setIsProcessing(true);

    try {
      // Switch network if needed
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
        // Send Native Token (ETH, MATIC, etc.)
        console.log(`Sending ${amount} ${selectedToken.symbol} to ${recipient}`);
        await sendTransactionAsync({
          to: recipient as `0x${string}`,
          value: amountBigInt,
          chainId: selectedChainId
        });
        addToast('Transaction submitted!', 'success');
        onClose();
      } else {
        // Send ERC20
        if (!selectedToken.address) throw new Error('Token address missing');
        
        console.log(`Sending ${amount} ${selectedToken.symbol} (ERC20) to ${recipient}`);
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
        // Wait for confirmation logic handled by useWaitForTransactionReceipt effect
      }

    } catch (error: any) {
      console.error('Send failed:', error);
      addToast(error.message || 'Transaction failed to initiate', 'error');
      setIsProcessing(false);
    }
  };
  
  // Handlers for confirmation (ERC20)
  useEffect(() => {
    if (isConfirmed) {
      addToast('Transaction confirmed!', 'success');
      setIsProcessing(false);
      onClose();
    }
    if (writeError) {
      // addToast(`Error: ${writeError.message}`, 'error'); // Already handled in catch block mostly
      setIsProcessing(false);
    }
  }, [isConfirmed, writeError, onClose, addToast]);

  return (
    <div className="p-4 space-y-4">
      {/* Network Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Network</label>
        <div className="relative">
          <select 
            value={selectedChainId}
            onChange={(e) => setSelectedChainId(Number(e.target.value))}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {SUPPORTED_CHAINS.map(chain => (
              <option key={chain.chainId} value={chain.chainId} className="bg-gray-800">
                {chain.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Recipient */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Recipient Address</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Asset Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Asset</label>
        <div className="grid grid-cols-3 gap-2">
          {getTokensForChain(selectedChainId).map(token => (
            <button
              key={token.symbol}
              onClick={() => setSelectedToken(token)}
              className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                selectedToken.symbol === token.symbol 
                  ? 'bg-purple-500/20 border-purple-500 text-white' 
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              {token.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <Button
        variant="primary"
        onClick={handleSend}
        disabled={isProcessing || isWritePending || isSendPending || isConfirming}
        className="w-full flex items-center justify-center gap-2"
      >
        {(isProcessing || isWritePending || isSendPending || isConfirming) ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <Send size={18} />
        )}
        {isConfirming ? 'Confirming...' : `Send ${selectedToken.symbol}`}
      </Button>
    </div>
  );
};