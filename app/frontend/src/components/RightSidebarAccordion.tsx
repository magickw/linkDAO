import React, { useMemo } from 'react';
import { Disclosure } from '@headlessui/react';
import WalletSnapshotEmbed from './WalletSnapshotEmbed';
import TransactionMiniFeed from './SmartRightSidebar/TransactionMiniFeed';
import { useWeb3 } from '@/context/Web3Context';
import { useWalletData, invalidateTxCache } from '@/hooks/useWalletData';

export default function RightSidebarAccordion() {
  const { address } = useWeb3();
  const walletAddress = address || '0x0000000000000000000000000000000000000000';

  // Fetch recent transactions (real if API keys configured; falls back to empty)
  const { transactions: txs, refresh, isRefreshing } = useWalletData({ address: walletAddress, enableTransactionHistory: true, autoRefresh: false, maxTransactions: 10 });

  // Normalize transactions to the TransactionMiniFeed expected shape
  const normalizedTxs = useMemo(() => {
    return (txs || []).map((t) => ({
      id: t.id,
      type: (t.type === 'send' || t.type === 'receive' || t.type === 'swap' || t.type === 'contract' || t.type === 'nft') ? t.type : (t.type === 'contract_interaction' ? 'contract' : 'send'),
      amount: t.amount,
      token: typeof (t as any).token === 'string' ? (t as any).token : ((t as any).token?.symbol || 'ETH'),
      timestamp: new Date(t.timestamp),
      status: (t.status === 'confirmed' || t.status === 'pending' || t.status === 'failed') ? t.status : 'confirmed',
      hash: t.hash,
      toToken: (t as any).toToken,
      from: (t as any).from,
      to: (t as any).to,
    }));
  }, [txs]);

  return (
    <div className="space-y-2">
      <Disclosure defaultOpen>
        {({ open }) => (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] dark:bg-gray-800/80 backdrop-blur-lg overflow-hidden">
            <Disclosure.Button className="flex w-full items-center justify-between px-3 py-2 text-left">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Wallet Summary</span>
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </Disclosure.Button>
            <Disclosure.Panel className="px-3 pb-3">
              <WalletSnapshotEmbed walletAddress={walletAddress} />
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>

      <Disclosure>
        {({ open }) => (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] dark:bg-gray-800/80 backdrop-blur-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2">
              <Disclosure.Button className="flex items-center text-left">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Recent Transactions</span>
              </Disclosure.Button>
              <button
                onClick={async (e) => { e.stopPropagation(); invalidateTxCache(walletAddress); await refresh(); }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                title="Refresh"
                aria-label="Refresh transactions"
              >
                <svg className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0114.13-3.36L23 10"></path>
                  <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14"></path>
                </svg>
                Refresh
              </button>
            </div>
            <Disclosure.Panel className="px-3 pb-3">
              <TransactionMiniFeed transactions={normalizedTxs as any} />
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>
    </div>
  );
}
