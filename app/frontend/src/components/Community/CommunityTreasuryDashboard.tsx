/**
 * Community Treasury Dashboard Component
 * Demonstrates real-world usage of blockchain treasury management
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  useTreasuryBalance,
  useTreasuryTransactions,
  useTreasuryAllocation,
  useCreateTreasuryProposal,
  useDepositToTreasury,
} from '@/hooks/useTreasuryManagement';
import { useTokenGating } from '@/hooks/useTokenGating';

interface CommunityTreasuryDashboardProps {
  communityId: string;
  communityName: string;
  treasuryAddress: string;
}

export function CommunityTreasuryDashboard({
  communityId,
  communityName,
  treasuryAddress,
}: CommunityTreasuryDashboardProps) {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'proposals'>('overview');

  // Check if user has governance rights (voting power)
  const { hasAccess: canPropose } = useTokenGating({
    type: 'voting_power',
    minimumBalance: '1000', // Need 1000 voting power to create proposals
  });

  // Fetch treasury data
  const { balances, loading: balancesLoading, refetch: refetchBalance } = useTreasuryBalance(treasuryAddress);
  const { transactions, loading: txLoading } = useTreasuryTransactions(treasuryAddress, 10);
  const { allocation, loading: allocationLoading } = useTreasuryAllocation(treasuryAddress);

  // Treasury operations
  const { createProposal, loading: proposalLoading } = useCreateTreasuryProposal();
  const { deposit, loading: depositLoading, transactionHash } = useDepositToTreasury();

  // Proposal form state
  const [proposalForm, setProposalForm] = useState({
    title: '',
    description: '',
    recipient: '',
    amount: '',
  });

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Treasury Dashboard</h3>
        <p className="text-gray-600 mb-6">Connect your wallet to view treasury details</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg">
          Connect Wallet
        </button>
      </div>
    );
  }

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProposal(
        communityId,
        treasuryAddress,
        proposalForm.title,
        proposalForm.description,
        proposalForm.recipient,
        proposalForm.amount
      );
      // Reset form
      setProposalForm({ title: '', description: '', recipient: '', amount: '' });
      alert('Proposal created successfully!');
    } catch (error) {
      console.error('Failed to create proposal:', error);
      alert('Failed to create proposal');
    }
  };

  const handleDeposit = async () => {
    try {
      await deposit(treasuryAddress, depositAmount);
      setDepositAmount('');
      refetchBalance();
      alert('Deposit successful!');
    } catch (error) {
      console.error('Deposit failed:', error);
      alert('Deposit failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h2 className="text-3xl font-bold mb-2">{communityName} Treasury</h2>
          <p className="text-blue-100">Community Address: {treasuryAddress.slice(0, 10)}...{treasuryAddress.slice(-8)}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['overview', 'transactions', 'proposals'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-8 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Balance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {balancesLoading ? (
                  <div className="col-span-3 text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading balances...</p>
                  </div>
                ) : (
                  balances.map((balance) => (
                    <div key={balance.tokenAddress} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
                      <p className="text-sm text-gray-600 mb-1">{balance.tokenSymbol} Balance</p>
                      <p className="text-3xl font-bold text-gray-900">{parseFloat(balance.balance).toLocaleString()}</p>
                      {balance.balanceUSD && (
                        <p className="text-sm text-gray-600 mt-1">${balance.balanceUSD}</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Treasury Allocation */}
              {allocation && !allocationLoading && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Treasury Allocation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{parseFloat(allocation.total).toLocaleString()} LDAO</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Allocated</p>
                      <p className="text-2xl font-bold text-blue-600">{parseFloat(allocation.allocated).toLocaleString()} LDAO</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Available</p>
                      <p className="text-2xl font-bold text-green-600">{parseFloat(allocation.available).toLocaleString()} LDAO</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Allocated</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {((parseFloat(allocation.allocated) / parseFloat(allocation.total)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {allocation.allocations.map((alloc) => (
                      <div key={alloc.category} className="flex items-center">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{alloc.category}</span>
                            <span className="text-sm text-gray-600">{alloc.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${alloc.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="ml-4 text-sm font-semibold text-gray-900 min-w-[100px] text-right">
                          {parseFloat(alloc.amount).toLocaleString()} LDAO
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deposit Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4">Contribute to Treasury</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount in LDAO"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={depositLoading || !depositAmount}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    {depositLoading ? 'Depositing...' : 'Deposit'}
                  </button>
                </div>
                {transactionHash && (
                  <p className="mt-2 text-sm text-green-700">
                    Success! TX: {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Recent Transactions</h3>
              {txLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No transactions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TX Hash</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((tx) => (
                        <tr key={tx.hash} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.timestamp.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              tx.type === 'deposit' ? 'bg-green-100 text-green-800' :
                              tx.type === 'withdrawal' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {parseFloat(tx.amount).toLocaleString()} LDAO
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                            <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
                              {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Proposals Tab */}
          {activeTab === 'proposals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Treasury Proposals</h3>
                {!canPropose && (
                  <span className="text-sm text-gray-600">
                    Need 1000 voting power to create proposals
                  </span>
                )}
              </div>

              {canPropose && (
                <form onSubmit={handleCreateProposal} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold mb-4">Create New Proposal</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={proposalForm.title}
                        onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={proposalForm.description}
                        onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Address</label>
                        <input
                          type="text"
                          value={proposalForm.recipient}
                          onChange={(e) => setProposalForm({ ...proposalForm, recipient: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LDAO)</label>
                        <input
                          type="number"
                          value={proposalForm.amount}
                          onChange={(e) => setProposalForm({ ...proposalForm, amount: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={proposalLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      {proposalLoading ? 'Creating Proposal...' : 'Create Proposal'}
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No active proposals</p>
                <p className="text-sm text-gray-500 mt-2">Create a proposal to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
