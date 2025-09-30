import React, { useState, useMemo } from 'react';
import { 
  MarketplaceEscrow,
  MarketplaceService
} from '@/services/marketplaceService';

interface EscrowPanelProps {
  escrow: MarketplaceEscrow;
  userAddress: string;
  onUpdate: () => void;
}

const EscrowPanel: React.FC<EscrowPanelProps> = ({ 
  escrow, 
  userAddress,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Memoize the marketplace service to prevent recreation on every render
  const marketplaceService = useMemo(() => new MarketplaceService(), []);
  
  const isBuyer = escrow.buyerWalletAddress.toLowerCase() === userAddress.toLowerCase();
  const isSeller = escrow.sellerWalletAddress.toLowerCase() === userAddress.toLowerCase();
  const isParticipant = isBuyer || isSeller;
  
  const handleApprove = async () => {
    if (!isParticipant) return;
    
    try {
      setLoading(true);
      setError('');
      
      await marketplaceService.approveEscrow(escrow.id, userAddress);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to approve escrow');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDispute = async () => {
    if (!isParticipant) return;
    
    try {
      setLoading(true);
      setError('');
      
      await marketplaceService.openDispute(escrow.id, userAddress);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to open dispute');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Escrow Transaction</h3>
          <p className="text-sm text-gray-500 mt-1">
            Escrow ID: {escrow.id}
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          escrow.disputeOpened 
            ? 'bg-red-100 text-red-800' 
            : escrow.resolvedAt 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
        }`}>
          {escrow.disputeOpened 
            ? 'Dispute Opened' 
            : escrow.resolvedAt 
              ? 'Resolved' 
              : 'Active'}
        </span>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500">Buyer</h4>
          <p className="mt-1 text-sm text-gray-900">{formatAddress(escrow.buyerWalletAddress)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Seller</h4>
          <p className="mt-1 text-sm text-gray-900">{formatAddress(escrow.sellerWalletAddress)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Amount</h4>
          <p className="mt-1 text-sm text-gray-900">{escrow.amount} ETH</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500">Created</h4>
          <p className="mt-1 text-sm text-gray-900">{formatDate(escrow.createdAt)}</p>
        </div>
        {escrow.resolvedAt && (
          <div>
            <h4 className="text-sm font-medium text-gray-500">Resolved</h4>
            <p className="mt-1 text-sm text-gray-900">{formatDate(escrow.resolvedAt)}</p>
          </div>
        )}
        {escrow.resolverWalletAddress && (
          <div>
            <h4 className="text-sm font-medium text-gray-500">Resolver</h4>
            <p className="mt-1 text-sm text-gray-900">{formatAddress(escrow.resolverWalletAddress)}</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-4 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {!escrow.resolvedAt && !escrow.disputeOpened && (
        <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          {isParticipant && (
            <>
              {!escrow.buyerApproved && isBuyer && (
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Approving...' : 'Approve Transaction'}
                </button>
              )}
              {!escrow.sellerApproved && isSeller && (
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Approving...' : 'Approve Transaction'}
                </button>
              )}
              <button
                onClick={handleOpenDispute}
                disabled={loading}
                className="flex-1 bg-red-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Opening...' : 'Open Dispute'}
              </button>
            </>
          )}
        </div>
      )}
      
      {escrow.buyerApproved && escrow.sellerApproved && !escrow.resolvedAt && (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Transaction Approved
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Both parties have approved this transaction. Funds will be released shortly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowPanel;