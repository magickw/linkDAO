import React, { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { MarketplaceListing, MarketplaceService } from '@/services/marketplaceService';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

interface PurchaseModalProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [useEscrow, setUseEscrow] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState('');

  const marketplaceService = new MarketplaceService();

  const handlePurchase = async () => {
    if (!address) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    if (address.toLowerCase() === listing.sellerWalletAddress.toLowerCase()) {
      addToast('You cannot buy your own listing', 'error');
      return;
    }

    try {
      setLoading(true);

      // Check if user has sufficient balance
      const price = parseFloat(listing.price);
      const userBalance = balance ? parseFloat(balance.formatted) : 0;
      
      if (userBalance < price) {
        addToast(`Insufficient balance. You need ${price} ETH but have ${userBalance.toFixed(4)} ETH`, 'error');
        return;
      }

      // Create order
      const order = await marketplaceService.createOrder(
        listing.id,
        address,
        listing.sellerWalletAddress,
        listing.price,
        listing.tokenAddress || '0x0000000000000000000000000000000000000000'
      );

      // Create escrow if requested
      if (useEscrow && listing.itemType === 'PHYSICAL') {
        await marketplaceService.createEscrow(listing.id, address, deliveryInfo);
        addToast('Purchase successful! Escrow created for secure delivery.', 'success');
      } else {
        addToast('Purchase successful!', 'success');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Purchase error:', error);
      addToast(error.message || 'Failed to complete purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <GlassPanel variant="primary" className="w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Purchase Item</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-medium text-white mb-2">
              {listing.metadataURI || 'Unnamed Item'}
            </h4>
            <p className="text-white/70 text-sm mb-4">
              Seller: {listing.sellerWalletAddress.substring(0, 6)}...{listing.sellerWalletAddress.substring(listing.sellerWalletAddress.length - 4)}
            </p>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Price:</span>
                <span className="text-xl font-bold text-white">{listing.price} ETH</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-white/80">Your Balance:</span>
                <span className="text-white">{balance ? parseFloat(balance.formatted).toFixed(4) : '0.0000'} ETH</span>
              </div>
            </div>
          </div>

          {listing.itemType === 'PHYSICAL' && (
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="useEscrow"
                  checked={useEscrow}
                  onChange={(e) => setUseEscrow(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="useEscrow" className="text-white text-sm">
                  Use escrow for secure delivery (recommended)
                </label>
              </div>
              
              {useEscrow && (
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Delivery Information
                  </label>
                  <textarea
                    value={deliveryInfo}
                    onChange={(e) => setDeliveryInfo(e.target.value)}
                    placeholder="Enter your delivery address or instructions..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/30 text-white/80 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePurchase}
              loading={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Buy Now'}
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default PurchaseModal;