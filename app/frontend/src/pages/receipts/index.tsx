import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { ReceiptList } from '../../components/Marketplace/Receipt/ReceiptList';

const ReceiptsPage: React.FC = () => {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet to View Receipts</h2>
            <p className="text-gray-600 mb-6">
              Please connect your wallet to view your purchase receipts.
            </p>
            <div className="flex justify-center">
              <RainbowConnectButton
                accountStatus="address"
                showBalance={false}
                chainStatus="none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Receipts</h1>
          <p className="mt-2 text-gray-600">
            View and manage all your purchase receipts
          </p>
        </div>
        
        {address ? (
          <ReceiptList userAddress={address} />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading wallet information...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptsPage;