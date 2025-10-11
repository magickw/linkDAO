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
          setIsSendModalOpen(true);
          break;
        // Support specific quick-action ids like 'send-usdc' or 'send-eth' to preselect token
        case 'send-usdc':
          setPrefillToken('USDC');
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

  const handleSendToken = useCallback(async (tokenSymbol: string, amount: number, recipient: string) => {
    try {
      if (!walletData) {
        throw new Error('Wallet data not available');
      }

      // Find token metadata from wallet balances
      const tokenBalance = walletData.balances.find(b => b.symbol === tokenSymbol);

      // Fallback token metadata
      const isNative = !tokenBalance || tokenBalance.contractAddress === '0x0000000000000000000000000000000000000000' || tokenSymbol === 'ETH';
      const tokenAddress = tokenBalance ? tokenBalance.contractAddress : (isNative ? '0x0000000000000000000000000000000000000000' : undefined);
      // Guess decimals (USDC -> 6, otherwise 18)
      const decimals = tokenSymbol === 'USDC' ? 6 : 18;

      if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid recipient address');
      }

      // Parse amount to bigint using helper from hook
      const amountBigInt = parseAmount(amount.toString(), decimals);

      const paymentToken = {
        address: tokenAddress || '',
        symbol: tokenSymbol,
        name: tokenSymbol,
        decimals,
        chainId: chainId || 1,
        isNative: isNative
      };

      const paymentRequest = {
        orderId: `ui_${Date.now()}`,
        amount: amountBigInt,
        token: paymentToken,
        recipient,
        chainId: chainId || 1
      } as any;

      // Optional: estimate gas and warn user (best-effort)
      try {
        await estimateGas(paymentRequest);
      } catch (e) {
        // Estimation failed, continue but surface warning
        console.warn('Gas estimate failed, proceeding:', e);
      }

      const tx = await processPayment(paymentRequest);

      // Provide basic success feedback
      addToast(`Payment submitted (tx id: ${tx.id}).`, 'success');
      try { router.push('/wallet/transactions'); } catch {}
    } catch (err: any) {
      console.error('Send token failed:', err);
      const msg = err?.message || 'Failed to send tokens';
      addToast(msg, 'error');
      throw err;
    }
  }, [walletData, parseAmount, processPayment, estimateGas, chainId]);

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

      const request = {
        orderId: `swap_${Date.now()}`,
        amount: amountBigInt,
        token: paymentToken,
        recipient: paymentRouterAddress,
        chainId: chainId || 1,
        metadata: { type: 'swap', toToken }
      } as any;

      try { await estimateGas(request); } catch(e){ console.warn('gas estimate failed', e); }
      const tx = await processPayment(request);
      addToast(`Swap submitted (tx id: ${tx.id})`, 'success');
      try { router.push('/wallet/transactions'); } catch {}
    } catch (err: any) {
      console.error('Swap failed', err);
      addToast(err?.message || 'Swap failed', 'error');
      throw err;
    }
  }, [walletData, parseAmount, processPayment, estimateGas, chainId, router, addToast]);

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

      const request = {
        orderId: `stake_${Date.now()}`,
        amount: amountBigInt,
        token: paymentToken,
        recipient: paymentRouterAddress,
        chainId: chainId || 1,
        metadata: { type: 'stake', poolId }
      } as any;

      try { await estimateGas(request); } catch(e){ console.warn('gas estimate failed', e); }
      const tx = await processPayment(request);
      addToast(`Stake submitted (tx id: ${tx.id})`, 'success');
      try { router.push('/wallet/transactions'); } catch {}
    } catch (err: any) {
      console.error('Stake failed', err);
      addToast(err?.message || 'Staking failed', 'error');
      throw err;
    }
  }, [walletData, parseAmount, processPayment, estimateGas, chainId, router, addToast]);

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
            onClose={() => {
              setIsSendModalOpen(false);
              try { delete (window as any).__prefillSendToken; } catch {};
            }}
            tokens={walletData.balances}
            initialToken={(window as any).__prefillSendToken}
            onSend={handleSendToken}
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