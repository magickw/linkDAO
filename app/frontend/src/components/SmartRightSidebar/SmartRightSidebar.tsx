import React, { useState, useCallback } from 'react';
import WalletDashboard from './WalletDashboard';
import TransactionMiniFeed from './TransactionMiniFeed';
import QuickActionButtons from './QuickActionButtons';
import PortfolioModal from './PortfolioModal';
import TrendingContentWidget from './TrendingContentWidget';
import { SendTokenModal, ReceiveTokenModal, SwapTokenModal, StakeTokenModal } from '../WalletActions';
import { QuickAction, Transaction } from '../../types/wallet';
import { useWalletData } from '../../hooks/useWalletData';
import { useCryptoPayment } from '../../hooks/useCryptoPayment';
import { useWritePaymentRouterSendTokenPayment, useWritePaymentRouterSendEthPayment } from '@/generated';
import { useChainId } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/router';
import { paymentRouterAddress } from '../../generated';

interface SmartRightSidebarProps {
  context: 'feed' | 'community';
  communityId?: string;
  className?: string;
}

export default function SmartRightSidebar({ 
  context, 
  communityId,
  className = '' 
}: SmartRightSidebarProps) {
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [prefillToken, setPrefillToken] = useState<string | null>(null);
  const [sendModalEstimate, setSendModalEstimate] = useState<any /* GasFeeEstimate */ | null>(null);
  
  // Use real wallet data with live prices
  const {
    walletData,
    isLoading
  } = useWalletData({
    autoRefresh: true,
    refreshInterval: 300000 // Refresh every 5 minutes
  });

  const { addToast } = useToast();
  const router = useRouter();


  const handleQuickAction = useCallback(async (action: QuickAction) => {
    try {
      // Handle different quick actions
      switch (action.id) {
        case 'send':
          // Clear any prefill and open modal (no estimate)
          setPrefillToken(null);
          setIsSendModalOpen(true);
          break;
        // Support specific quick-action ids like 'send-usdc' or 'send-eth' to preselect token
        case 'send-usdc':
          setPrefillToken('USDC');
          // We will compute an estimate when opening modal based on a small preview amount (e.g., 0.01)
          setIsSendModalOpen(true);
          break;
        case 'send-eth':
          setPrefillToken('ETH');
          setIsSendModalOpen(true);
          break;
        case 'receive':
          setIsReceiveModalOpen(true);
          break;
        case 'swap':
          setIsSwapModalOpen(true);
          break;
        case 'stake':
          setIsStakeModalOpen(true);
          break;
        default:
          await action.action();
      }
    } catch (error) {
      console.error('Quick action failed:', error);
      // Handle error (show error toast, etc.)
    }
  }, []);

  const handleTransactionClick = useCallback((transaction: Transaction) => {
    // Navigate to transaction details or open transaction modal
    console.log('Transaction clicked:', transaction);
  }, []);

  const handlePortfolioClick = useCallback(() => {
    setIsPortfolioModalOpen(true);
  }, []);

  // Wallet action handlers
  const { processPayment, parseAmount, estimateGas } = useCryptoPayment();
  const chainId = useChainId();

  // Use generated write hooks for direct contract writes and wire lifecycle callbacks
  const [sendTxHash, setSendTxHash] = useState<string | null>(null);

  const {
    writeContract: writeSendToken,
    writeContractAsync: writeSendTokenAsync,
    isPending: isSendingTokenHook
  } = useWritePaymentRouterSendTokenPayment();

  const {
    writeContract: writeSendEth,
    writeContractAsync: writeSendEthAsync,
    isPending: isSendingEthHook
  } = useWritePaymentRouterSendEthPayment();

  const handleSendToken = useCallback(async (tokenSymbol: string, amount: number, recipient: string) => {
    try {
      if (!walletData) throw new Error('Wallet data not available');

      const tokenBalance = walletData.balances.find(b => b.symbol === tokenSymbol);
      const isNative = !tokenBalance || tokenBalance.contractAddress === '0x0000000000000000000000000000000000000000' || tokenSymbol === 'ETH';
      const tokenAddress = tokenBalance ? tokenBalance.contractAddress : (isNative ? '0x0000000000000000000000000000000000000000' : undefined);
      const decimals = tokenSymbol === 'USDC' ? 6 : 18;

      if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) throw new Error('Invalid recipient address');

      const amountBigInt = parseAmount(amount.toString(), decimals);

      // Use ETH write hook for native transfers
      if (isNative) {
        if (!writeSendEthAsync) throw new Error('ETH write hook not available');
        // Trigger the async write and capture hash when available; rely on isPending from the hook for UI
        writeSendEthAsync({ args: [recipient as `0x${string}`, amountBigInt, ''], value: amountBigInt })
          .then((res: any) => {
            const hash = res?.hash ?? res?.transactionHash ?? null;
            if (hash) setSendTxHash(hash);
          })
          .catch((err: any) => {
            console.error('writeSendEthAsync error', err);
          });
        addToast('Payment submitted (ETH)', 'success');
        try { router.push('/wallet/transactions'); } catch {}
        return;
      }

      // Token transfer via payment router
      if (!writeSendTokenAsync) throw new Error('Token write hook not available');
      const tokenAddr = tokenAddress as `0x${string}`;
      writeSendTokenAsync({ args: [tokenAddr, recipient as `0x${string}`, amountBigInt, ''] })
        .then((res: any) => {
          const hash = res?.hash ?? res?.transactionHash ?? null;
          if (hash) setSendTxHash(hash);
        })
        .catch((err: any) => console.error('writeSendTokenAsync error', err));
      addToast('Payment submitted', 'success');
      try { router.push('/wallet/transactions'); } catch {}
      return;
    } catch (err: any) {
      console.error('Send token failed:', err);
      const msg = err?.message || 'Failed to send tokens';
      addToast(msg, 'error');
      throw err;
    }
  }, [walletData, parseAmount, chainId, writeSendEthAsync, writeSendTokenAsync, router, addToast]);

  // Compute an estimated gas value when user opens the Send modal and we have a prefill token
  React.useEffect(() => {
    let cancelled = false;
    async function computeEstimate() {
      if (!isSendModalOpen) return setSendModalEstimate(null);
      if (!prefillToken || !walletData) return setSendModalEstimate(null);

      try {
        const decimals = prefillToken === 'USDC' ? 6 : 18;
        const amountBigInt = parseAmount('0.01', decimals); // preview small amount for estimate
        const tokenBalance = walletData.balances.find(b => b.symbol === prefillToken);
        const paymentToken = {
          address: tokenBalance ? tokenBalance.contractAddress : '',
          symbol: prefillToken,
          name: prefillToken,
          decimals,
          chainId: chainId || 1,
          isNative: prefillToken === 'ETH'
        } as any;

        const paymentRequest = {
          orderId: `ui_est_${Date.now()}`,
          amount: amountBigInt,
          token: paymentToken,
          recipient: walletData.address,
          chainId: chainId || 1
        } as any;

  const estimate = await estimateGas(paymentRequest);
  if (!cancelled) setSendModalEstimate(estimate ?? null);
      } catch (e) {
        console.warn('preview gas estimate failed', e);
        if (!cancelled) setSendModalEstimate(null);
      }
    }

    computeEstimate();
    return () => { cancelled = true; };
  }, [isSendModalOpen, prefillToken, walletData, parseAmount, estimateGas, chainId]);

  // write hooks already declared above; reused for swap/stake handlers

  const handleSwapToken = useCallback(async (fromToken: string, toToken: string, amount: number) => {
    try {
      if (!walletData) throw new Error('Wallet data not available');
      const decimals = fromToken === 'USDC' ? 6 : 18;
      const amountBigInt = parseAmount(amount.toString(), decimals);
      const tokenBalance = walletData.balances.find(b => b.symbol === fromToken);
      const paymentToken = {
        address: tokenBalance ? tokenBalance.contractAddress : '',
        symbol: fromToken,
        name: fromToken,
        decimals,
        chainId: chainId || 1,
        isNative: fromToken === 'ETH'
      } as any;

      // If it's a native ETH swap/send, use sendEthPayment write hook
      if (fromToken === 'ETH') {
        if (!writeSendEthAsync) throw new Error('ETH write hook not available');
        await writeSendEthAsync({ args: [paymentRouterAddress as `0x${string}`, amountBigInt, `swap:${toToken}`], value: amountBigInt });
        addToast('Swap (ETH) submitted', 'success');
        try { router.push('/wallet/transactions'); } catch {}
        return;
      }

      // For token-based swap, call sendTokenPayment(tokenAddress, to, amount, memo)
      if (!writeSendTokenAsync) throw new Error('Token write hook not available');
      const tokenAddr = paymentToken.address as `0x${string}`;
      await writeSendTokenAsync({ args: [tokenAddr, paymentRouterAddress as `0x${string}`, amountBigInt, `swap:${toToken}`] });
  addToast('Swap submitted', 'success');
  try { router.push('/wallet/transactions'); } catch {}
  return;
    } catch (err: any) {
      console.error('Swap failed', err);
      addToast(err?.message || 'Swap failed', 'error');
      throw err;
    }
  }, [walletData, parseAmount, processPayment, estimateGas, chainId, router, addToast, writeSendEthAsync, writeSendTokenAsync]);

  const handleStakeToken = useCallback(async (poolId: string, token: string, amount: number) => {
    try {
      if (!walletData) throw new Error('Wallet data not available');
      const decimals = token === 'USDC' ? 6 : 18;
      const amountBigInt = parseAmount(amount.toString(), decimals);
      const tokenBalance = walletData.balances.find(b => b.symbol === token);
      const paymentToken = {
        address: tokenBalance ? tokenBalance.contractAddress : '',
        symbol: token,
        name: token,
        decimals,
        chainId: chainId || 1,
        isNative: token === 'ETH'
      } as any;

      // Stake flows typically go to the router as a token transfer with a memo indicating staking intent
      if (token === 'ETH') {
        if (!writeSendEthAsync) throw new Error('ETH write hook not available');
        await writeSendEthAsync({ args: [paymentRouterAddress as `0x${string}`, amountBigInt, `stake:${poolId}`], value: amountBigInt });
        addToast('Stake (ETH) submitted', 'success');
        try { router.push('/wallet/transactions'); } catch {}
        return;
      }

      if (!writeSendTokenAsync) throw new Error('Token write hook not available');
      const tokenAddr = paymentToken.address as `0x${string}`;
      await writeSendTokenAsync({ args: [tokenAddr, paymentRouterAddress as `0x${string}`, amountBigInt, `stake:${poolId}`] });
      addToast('Stake submitted', 'success');
      try { router.push('/wallet/transactions'); } catch {}
      return;
    } catch (err: any) {
      console.error('Stake failed', err);
      addToast(err?.message || 'Staking failed', 'error');
      throw err;
    }
  }, [walletData, parseAmount, chainId, router, addToast, writeSendEthAsync, writeSendTokenAsync]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeletons */}
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
            <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!walletData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">👛</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Connect your wallet to see portfolio and transaction data
            </p>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Connect Wallet
            </button>
          </div>
        </div>
        
        {/* Still show trending content */}
        <TrendingContentWidget 
          context={context}
          communityId={communityId}
        />
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {/* Wallet Dashboard */}
        <WalletDashboard
          walletData={walletData}
          onQuickAction={handleQuickAction}
          onPortfolioClick={handlePortfolioClick}
        />

        {/* Transaction Mini Feed */}
        <TransactionMiniFeed
          transactions={walletData.recentTransactions}
          onTransactionClick={handleTransactionClick}
        />

        {/* Quick Action Buttons */}
        <QuickActionButtons
          actions={walletData.quickActions}
          onActionClick={handleQuickAction}
        />

        {/* Trending Content Widget */}
        <TrendingContentWidget 
          context={context}
          communityId={communityId}
        />
      </div>

      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        walletData={walletData}
      />

      {/* Wallet Action Modals */}
      {walletData && (
        <>
          <SendTokenModal
            isOpen={isSendModalOpen}
            onClose={() => setIsSendModalOpen(false)}
            tokens={walletData.balances}
            initialToken={prefillToken ?? undefined}
            estimatedGas={sendModalEstimate}
            onSend={handleSendToken}
            isPending={isSendingTokenHook || isSendingEthHook}
            onEstimate={async ({ token, amount, recipient }) => {
              try {
                const decimals = token === 'USDC' ? 6 : 18;
                const amountBigInt = parseAmount(amount, decimals);
                const tokenBalance = walletData.balances.find(b => b.symbol === token);
                const paymentToken = {
                  address: tokenBalance ? tokenBalance.contractAddress : '',
                  symbol: token,
                  name: token,
                  decimals,
                  chainId: chainId || 1,
                  isNative: token === 'ETH'
                } as any;

                const request = {
                  orderId: `ui_est_${Date.now()}`,
                  amount: amountBigInt,
                  token: paymentToken,
                  recipient,
                  chainId: chainId || 1
                } as any;

                const est = await estimateGas(request);
                return est ?? null;
              } catch (e) {
                return null;
              }
            }}
          />

          <ReceiveTokenModal
            isOpen={isReceiveModalOpen}
            onClose={() => setIsReceiveModalOpen(false)}
            walletAddress={walletData.address}
          />

          <SwapTokenModal
            isOpen={isSwapModalOpen}
            onClose={() => setIsSwapModalOpen(false)}
            tokens={walletData.balances}
            onSwap={handleSwapToken}
          />

          <StakeTokenModal
            isOpen={isStakeModalOpen}
            onClose={() => setIsStakeModalOpen(false)}
            tokens={walletData.balances}
            onStake={handleStakeToken}
          />
        </>
      )}
    </>
  );
}