import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { useToast } from '@/context/ToastContext';
import { X, Droplets, ExternalLink, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface USDCFaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const USDCFaucetModal: React.FC<USDCFaucetModalProps> = ({ isOpen, onClose }) => {
  const { address, isConnected, chainId } = useAccount();
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Use a generic mint function if the token contract supports it (typical for testnet tokens)
  // Otherwise, we might need a dedicated faucet contract
  const { data: hash, writeContract, error: writeError } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash, 
  });

  const handleMint = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    // Only allow on testnets (Sepolia, Base Sepolia, etc.)
    const isTestnet = [11155111, 84532].includes(chainId || 0);
    
    if (!isTestnet) {
      addToast('Faucet is only available on test networks', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
      if (!usdcAddress) throw new Error('USDC address not configured');

      // Attempt to call 'mint' function on the USDC contract
      // This assumes the testnet USDC contract has a public mint function
      writeContract({
        address: usdcAddress,
        abi: [{
          name: 'mint',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
          outputs: []
        }],
        functionName: 'mint',
        args: [address, BigInt(1000 * 1000000)], // Mint 1000 USDC (6 decimals)
      });

    } catch (error) {
      console.error('Mint failed:', error);
      addToast('Failed to mint USDC. Contract might not support public minting.', 'error');
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    if (isConfirmed) {
      addToast('1,000 USDC minted successfully!', 'success');
      setIsProcessing(false);
      onClose();
    }
    if (writeError) {
      // If public mint fails, suggest external faucet
      addToast('Minting failed. Please try the external faucet.', 'error');
      setIsProcessing(false);
    }
  }, [isConfirmed, writeError, onClose, addToast]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-blue-900 to-cyan-900 rounded-2xl w-full max-w-md border border-white/20 relative z-[10000]">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Droplets className="text-cyan-400" />
              USDC Faucet
            </h2>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white/80 mb-2">
                Get testnet USDC to test the marketplace functionality.
              </p>
              <div className="text-sm text-white/60">
                Network: {chainId === 11155111 ? 'Sepolia' : chainId === 84532 ? 'Base Sepolia' : 'Unknown'}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleMint}
              disabled={isProcessing || isConfirming}
              className="w-full flex items-center justify-center gap-2 py-3"
            >
              {isProcessing || isConfirming ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Minting...
                </>
              ) : (
                'Mint 1,000 USDC'
              )}
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/40 text-sm">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <a 
              href="https://faucet.circle.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                Go to Official Circle Faucet
                <ExternalLink size={16} />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default USDCFaucetModal;
