import React, { useState, useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { MarketplaceListing, marketplaceService } from '@/services/marketplaceService';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useEnhancedCart } from '@/hooks/useEnhancedCart';

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
  const cart = useEnhancedCart();
  const [loading, setLoading] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'direct' | 'cart'>('cart');
  const [useEscrow, setUseEscrow] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState('');

  // Use the singleton marketplace service
  const service = useMemo(() => marketplaceService, []);

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

      if (purchaseType === 'cart') {
        // Add to cart
        const cartProduct = {
          id: listing.id,
          title: listing.metadataURI || 'Unnamed Item',
          description: listing.metadataURI || '',
          image: '',
          price: {
            crypto: listing.price,
            cryptoSymbol: 'ETH',
            fiat: (parseFloat(listing.price) * 1650).toFixed(2),
            fiatSymbol: 'USD'
          },
          seller: {
            id: listing.sellerWalletAddress,
            name: `Seller ${listing.sellerWalletAddress.slice(0, 6)}`,
            avatar: '',
            verified: true,
            daoApproved: false,
            escrowSupported: true
          },
          category: listing.itemType.toLowerCase(),
          isDigital: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT',
          isNFT: listing.itemType === 'NFT',
          inventory: listing.quantity,
          shipping: {
            cost: '0',
            freeShipping: true,
            estimatedDays: listing.itemType === 'DIGITAL' ? 'instant' : '3-5',
            regions: ['US', 'CA', 'EU']
          },
          trust: {
            escrowProtected: true,
            onChainCertified: true,
            safetyScore: 95
          }
        };
        
        cart.addItem(cartProduct);
        addToast('Added to cart! Go to cart to complete purchase.', 'success');
        onSuccess();
        onClose();
        return;
      }

      // Direct purchase flow
      const price = parseFloat(listing.price);
      const userBalance = balance ? parseFloat(balance.formatted) : 0;
      
      if (userBalance < price) {
        addToast(`Insufficient balance. You need ${price} ETH but have ${userBalance.toFixed(4)} ETH`, 'error');
        return;
      }

      // Create order
      const order = await marketplaceService.createOrder({
        listingId: listing.id,
        buyerAddress: address!,
        sellerAddress: listing.sellerWalletAddress,
        price: listing.price,
        tokenAddress: listing.tokenAddress,
        quantity: quantity,
        deliveryInfo: listing.itemType !== 'DIGITAL' && listing.itemType !== 'NFT' ? deliveryInfo : undefined
      });

      // Create escrow for order
      if (order.id) {
        await marketplaceService.createEscrowForOrder(order.id, {
          buyerAddress: address!,
          sellerAddress: listing.sellerWalletAddress,
          amount: listing.price,
          tokenAddress: listing.tokenAddress
        });
      }

      addToast('Purchase successful! Order created with escrow protection.', 'success');

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

          <div className="mb-6">
            <label className="block text-sm font-medium text-white/90 mb-3">
              Purchase Method
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="purchaseType"
                  value="cart"
                  checked={purchaseType === 'cart'}
                  onChange={(e) => setPurchaseType(e.target.value as 'direct' | 'cart')}
                  className="mr-2"
                />
                <span className="text-white">Add to Cart (Recommended)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="purchaseType"
                  value="direct"
                  checked={purchaseType === 'direct'}
                  onChange={(e) => setPurchaseType(e.target.value as 'direct' | 'cart')}
                  className="mr-2"
                />
                <span className="text-white">Buy Now (Direct)</span>
              </label>
            </div>
          </div>

          {listing.itemType === 'PHYSICAL' && purchaseType === 'direct' && (
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
              {loading ? 'Processing...' : purchaseType === 'cart' ? 'Add to Cart' : 'Buy Now'}
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default PurchaseModal;