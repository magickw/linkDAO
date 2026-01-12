import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { LinkDAOWalletDashboard } from '@/components/Wallet/LinkDAOWalletDashboard';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet as WalletIcon, AlertCircle } from 'lucide-react';

export default function WalletDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const address = searchParams.get('address');

    if (!address) {
      // If no address provided, use active wallet
      const activeWallet = SecureKeyStorage.getActiveWallet();
      if (activeWallet) {
        setWalletAddress(activeWallet);
        setLoading(false);
      } else {
        setError('No wallet address provided and no active wallet found');
        setLoading(false);
      }
    } else {
      // Validate that the wallet exists
      const wallets = SecureKeyStorage.listWallets();
      const walletExists = wallets.some((walletAddr) => walletAddr.toLowerCase() === address.toLowerCase());

      if (walletExists) {
        setWalletAddress(address);
        // Set as active wallet
        SecureKeyStorage.setActiveWallet(address);
        setLoading(false);
      } else {
        setError('Wallet not found');
        setLoading(false);
      }
    }
  }, [searchParams]);

  const handleBackToManage = () => {
    router.push('/wallet/manage');
  };

  if (loading) {
    return (
      <Layout title="Loading..." fullWidth={true}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading wallet...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Error - LinkDAO" fullWidth={true}>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={handleBackToManage}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all"
            >
              Back to Wallet Management
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Wallet Dashboard - LinkDAO" fullWidth={true}>
      <div className="min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToManage}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Wallet Management"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <WalletIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    LinkDAO Wallet
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {walletAddress && `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <LinkDAOWalletDashboard />
      </div>
    </Layout>
  );
}