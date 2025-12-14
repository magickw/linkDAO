import React, { useCallback, useState } from 'react';
import { QuickAction, Transaction } from '../../types/wallet';
import { useWalletData } from '../../hooks/useWalletData';
import { useCryptoPayment } from '../../hooks/useCryptoPayment';
import { useChainId } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/router';
import { paymentRouterAddress, useWritePaymentRouterSendEthPayment, useWritePaymentRouterSendTokenPayment } from '@/generated';
import { dexService } from '@/services/dexService';
import TrendingContentWidget from './TrendingContentWidget';
import WalletDashboard from './WalletDashboard';
import TransactionMiniFeed from './TransactionMiniFeed';
import PortfolioModal from './PortfolioModal';
import SendTokenModal from '@/components/WalletActions/SendTokenModal';
import ReceiveTokenModal from '@/components/WalletActions/ReceiveTokenModal';
import SwapTokenModal from '@/components/WalletActions/SwapTokenModal';
import StakeTokenModal from '@/components/WalletActions/StakeTokenModal';

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
  // const [sendModalEstimate, setSendModalEstimate] = useState<any | null>(null); // Removed as estimation is handled by wallet or internal hook

  // Use real wallet data with live prices and transaction history
  const {
    walletData,
    isLoading
  } = useWalletData({
    autoRefresh: true,
    refreshInterval: 300000, // Refresh every 5 minutes
    enableTransactionHistory: true,
    maxTransactions: 10
  });

  const { refresh } = useWalletData({ // Get refresh function
    autoRefresh: false // Don't need another auto-refresh here, just need the function
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
          // For any other actions, we still want to trigger the modal
          // But we should check if it's one of our known actions first
          if (['send', 'receive', 'swap', 'stake'].includes(action.id)) {
            // Handle known actions that might have been triggered differently
            switch (action.id) {
              case 'send':
                setPrefillToken(null);
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
            }
          } else {
            // Execute the action directly if it has a custom action function
            await action.action();
          }
      }
    } catch (error) {
      console.error('Quick action failed:', error);
      // Handle error (show error toast, etc.)
      addToast('Quick action failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  }, [addToast]);

  const handleTransactionClick = useCallback((transaction: Transaction) => {
    // Navigate to transaction details or open transaction modal
    console.log('Transaction clicked:', transaction);
    // In a real implementation, we might want to show transaction details
    // For now, we'll just show a toast with the transaction info
    addToast(`Transaction: ${transaction.type} ${transaction.amount} ${transaction.token}`, 'info');
  }, [addToast]);

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

  // handleSendToken removed in favor of direct transfer in SendTokenModal
  /*
  const handleSendToken = useCallback(async (tokenSymbol: string, amount: number, recipient: string) => {
     ... legacy code ...
  }, [walletData, parseAmount, chainId, writeSendEthAsync, writeSendTokenAsync, router, addToast]);
  */

  // Estimation effect removed as it's handled by wallet/hook now
  /*
  React.useEffect(() => {
    ...
  }, [isSendModalOpen, prefillToken, walletData, parseAmount, estimateGas, chainId]);
  */

  // write hooks already declared above; reused for swap/stake handlers

  const handleSwapToken = useCallback(async (fromToken: string, toToken: string, amount: number) => {
    try {
      if (!walletData) throw new Error('Wallet data not available');

      // Get token addresses
      const fromTokenData = walletData.balances.find(b => b.symbol === fromToken);
      const toTokenData = walletData.balances.find(b => b.symbol === toToken);

      const fromTokenAddress = fromTokenData?.contractAddress || '0x0000000000000000000000000000000000000000'; // ETH
      const toTokenAddress = toTokenData?.contractAddress || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC as example

      // Get real swap quote from DEX service
      const quoteResponse = await dexService.getSwapQuote({
        tokenInAddress: fromTokenAddress,
        tokenOutAddress: toTokenAddress,
        amountIn: amount,
        slippageTolerance: 0.5, // 0.5% slippage
        recipient: walletData.address
      });

      if (!quoteResponse || !quoteResponse.success) {
        throw new Error(quoteResponse?.message || 'Failed to get swap quote');
      }

      const decimals = fromToken === 'USDC' ? 6 : 18;
      const amountBigInt = parseAmount(amount.toString(), decimals);
      const paymentToken = {
        address: fromTokenData ? fromTokenData.contractAddress : '',
        symbol: fromToken,
        name: fromToken,
        decimals,
        chainId: chainId || 1,
        isNative: fromToken === 'ETH'
      } as any;

      // If it's a native ETH swap/send, use sendEthPayment write hook
      if (fromToken === 'ETH') {
        if (!writeSendEthAsync) throw new Error('ETH write hook not available');
        const routerAddress = paymentRouterAddress[chainId as keyof typeof paymentRouterAddress] as `0x${string}` | undefined;
        if (!routerAddress) throw new Error(`Payment router address not configured for chain ID: ${chainId}`);
        await writeSendEthAsync({
          args: [routerAddress, amountBigInt, `swap:${toToken}`],
          value: amountBigInt,
          gas: 300000n,
          chainId: chainId as keyof typeof paymentRouterAddress
        });
        addToast('Swap (ETH) submitted', 'success');
        try { router.push('/wallet/transactions'); } catch { }
        return;
      }

      // For token-based swap, call sendTokenPayment(tokenAddress, to, amount, memo)
      if (!writeSendTokenAsync) throw new Error('Token write hook not available');
      const tokenAddr = paymentToken.address as `0x${string}`;
      const routerAddress = paymentRouterAddress[chainId as keyof typeof paymentRouterAddress] as `0x${string}` | undefined;
      if (!routerAddress) throw new Error(`Payment router address not configured for chain ID: ${chainId}`);
      await writeSendTokenAsync({
        args: [tokenAddr, routerAddress, amountBigInt, `swap:${toToken}`],
        gas: 500000n,
        chainId: chainId as keyof typeof paymentRouterAddress
      });
      addToast('Swap submitted', 'success');
      try { router.push('/wallet/transactions'); } catch { }
      return;
    } catch (err: any) {
      console.error('Swap failed', err);
      addToast(err?.message || 'Swap failed', 'error');
      throw err;
    }
  }, [walletData, parseAmount, chainId, router, addToast, writeSendEthAsync, writeSendTokenAsync]);

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
        const routerAddress = paymentRouterAddress[chainId as keyof typeof paymentRouterAddress] as `0x${string}` | undefined;
        if (!routerAddress) throw new Error(`Payment router address not configured for chain ID: ${chainId}`);
        await writeSendEthAsync({
          args: [routerAddress, amountBigInt, `stake:${poolId}`],
          value: amountBigInt,
          gas: 300000n,
          chainId: chainId as keyof typeof paymentRouterAddress
        });
        addToast('Stake (ETH) submitted', 'success');
        try { router.push('/wallet/transactions'); } catch { }
        return;
      }

      if (!writeSendTokenAsync) throw new Error('Token write hook not available');
      const tokenAddr = paymentToken.address as `0x${string}`;
      const routerAddress = paymentRouterAddress[chainId as keyof typeof paymentRouterAddress] as `0x${string}` | undefined;
      if (!routerAddress) throw new Error(`Payment router address not configured for chain ID: ${chainId}`);
      await writeSendTokenAsync({
        args: [tokenAddr, routerAddress, amountBigInt, `stake:${poolId}`],
        gas: 500000n,
        chainId: chainId as keyof typeof paymentRouterAddress
      });
      addToast('Stake submitted', 'success');
      try { router.push('/wallet/transactions'); } catch { }
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

        {/* Trending Now (available even when wallet is disconnected) */}
        <TrendingContentWidget context={context} />
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

        {/* Trending Now (moved here from left sidebar) */}
        <TrendingContentWidget context={context} />

        {/* Transaction Mini Feed - only show if we have transactions */}
        {walletData && walletData.recentTransactions && walletData.recentTransactions.length > 0 && (
          <TransactionMiniFeed
            transactions={walletData.recentTransactions}
            onTransactionClick={handleTransactionClick}
          />
        )}

        {/* Trending content moved to left sidebar */}
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
            onSuccess={(hash) => {
              console.log('Send successful:', hash);
              refresh(); // Refresh wallet data
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