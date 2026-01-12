import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Plus, Wallet as WalletIcon, Key, Shield, Trash2, ChevronRight, Copy, Check, Eye, EyeOff, AlertTriangle, Settings } from 'lucide-react';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { WalletCreationFlow } from '@/components/Wallet/WalletCreationFlow';
import { WalletImportFlow } from '@/components/Wallet/WalletImportFlow';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

type View = 'list' | 'create' | 'import';

export default function WalletManage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [view, setView] = useState<View>('list');
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const loadWallets = () => {
    const walletList = SecureKeyStorage.listWallets();
    setWallets(walletList);
    setActiveWallet(SecureKeyStorage.getActiveWallet());
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const handleCreateComplete = (address: string) => {
    addToast('Wallet created successfully', 'success');
    loadWallets();
    setView('list');
  };

  const handleImportComplete = (address: string) => {
    addToast('Wallet imported successfully', 'success');
    loadWallets();
    setView('list');
  };

  const handleSetActiveWallet = async (address: string) => {
    try {
      SecureKeyStorage.setActiveWallet(address);
      setActiveWallet(address);
      addToast('Wallet activated', 'success');
      loadWallets();
    } catch (error: any) {
      addToast(`Failed to activate wallet: ${error.message}`, 'error');
    }
  };

  const handleDeleteWallet = (address: string) => {
    setShowDeleteConfirm(address);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      try {
        SecureKeyStorage.deleteWallet(showDeleteConfirm);
        addToast('Wallet deleted', 'success');
        setShowDeleteConfirm(null);
        loadWallets();
      } catch (error: any) {
        addToast(`Failed to delete wallet: ${error.message}`, 'error');
      }
    }
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      addToast('Address copied to clipboard', 'success');
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      addToast('Failed to copy address', 'error');
    }
  };

  const handleOpenDashboard = (address: string) => {
    router.push(`/wallet/dashboard?address=${address}`);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainNames = (chainIds: number[]) => {
    const chainNames: Record<number, string> = {
      1: 'ETH',
      8453: 'Base',
      137: 'Polygon',
      42161: 'Arbitrum',
    };
    return chainIds.map((id) => chainNames[id] || `Chain ${id}`).join(', ');
  };

  return (
    <Layout title="Manage Wallets - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {view === 'list' ? 'Manage Wallets' : view === 'create' ? 'Create Wallet' : 'Import Wallet'}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {view === 'list' 
                    ? 'Create, import, and manage your LinkDAO wallets'
                    : view === 'create'
                    ? 'Generate a new wallet with secure key generation'
                    : 'Import an existing wallet using recovery phrase or private key'
                  }
                </p>
              </div>
              {view !== 'list' && (
                <button
                  onClick={() => setView('list')}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Back to List
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {view === 'list' && (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setView('create')}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">Create New Wallet</span>
                </button>
                <button
                  onClick={() => setView('import')}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  <Key className="w-5 h-5" />
                  <span className="font-semibold">Import Wallet</span>
                </button>
              </div>

              {/* Wallet List */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                {wallets.length === 0 ? (
                  <div className="p-12 text-center">
                    <WalletIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No Wallets Yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Create a new wallet or import an existing one to get started
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {wallets.map((wallet) => (
                      <div
                        key={wallet.address}
                        className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            {/* Wallet Icon */}
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              {wallet.isHardwareWallet ? (
                                <Shield className="w-6 h-6 text-white" />
                              ) : (
                                <WalletIcon className="w-6 h-6 text-white" />
                              )}
                            </div>

                            {/* Wallet Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                  {wallet.name}
                                </h3>
                                {activeWallet === wallet.address && (
                                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                                    Active
                                  </span>
                                )}
                                {wallet.isHardwareWallet && (
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                    Hardware
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <code className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                  {formatAddress(wallet.address)}
                                </code>
                                <button
                                  onClick={() => handleCopyAddress(wallet.address)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  {copiedAddress === wallet.address ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {getChainNames(wallet.chainIds)}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                            {activeWallet !== wallet.address && (
                              <button
                                onClick={() => handleSetActiveWallet(wallet.address)}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenDashboard(wallet.address)}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-1"
                            >
                              <span>Dashboard</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWallet(wallet.address)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete Wallet"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Notice */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Security Notice
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Never share your recovery phrase or private key with anyone. LinkDAO support will never ask for it.
                      Keep your wallet password secure and enable two-factor authentication when available.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-2xl mx-auto">
              <WalletCreationFlow
                onComplete={handleCreateComplete}
                onCancel={() => setView('list')}
              />
            </div>
          )}

          {view === 'import' && (
            <div className="max-w-2xl mx-auto">
              <WalletImportFlow
                onComplete={handleImportComplete}
                onCancel={() => setView('list')}
              />
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Delete Wallet?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Are you sure you want to delete this wallet? You will lose access to all funds in this wallet unless you have your recovery phrase backed up.
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    Delete Wallet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}