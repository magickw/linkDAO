import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { PaymentMethod, tokenService, TokenInfo } from '../../services/tokenService';
import PaymentMethodSelector from './PaymentMethodSelector';

interface BuyNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: {
    tokenId: number;
    name: string;
    image: string;
    price: string;
    paymentMethod: PaymentMethod;
    seller: string;
  };
  marketplaceAddress: string;
  onSuccess: () => void;
}

enum PurchaseStep {
  SELECT_PAYMENT = 'select_payment',
  APPROVE_TOKEN = 'approve_token',
  CONFIRM_PURCHASE = 'confirm_purchase',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error'
}

export const BuyNFTModal: React.FC<BuyNFTModalProps> = ({
  isOpen,
  onClose,
  nft,
  marketplaceAddress,
  onSuccess
}) => {
  const [step, setStep] = useState<PurchaseStep>(PurchaseStep.SELECT_PAYMENT);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(nft.paymentMethod);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      initialize();
    }
  }, [isOpen, nft]);

  const initialize = async () => {
    try {
      await tokenService.initialize();
      const info = await tokenService.getTokenInfo(nft.paymentMethod);
      setTokenInfo(info);

      // Check if approval is needed for token payments
      if (nft.paymentMethod !== PaymentMethod.ETH) {
        const priceBigInt = tokenService.parseAmount(nft.price, info.decimals);
        const needsApprove = await tokenService.needsApproval(
          nft.paymentMethod,
          marketplaceAddress,
          priceBigInt
        );
        setNeedsApproval(needsApprove);

        if (needsApprove) {
          setStep(PurchaseStep.APPROVE_TOKEN);
        } else {
          setStep(PurchaseStep.CONFIRM_PURCHASE);
        }
      } else {
        setStep(PurchaseStep.CONFIRM_PURCHASE);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError('Failed to initialize payment. Please try again.');
      setStep(PurchaseStep.ERROR);
    }
  };

  const handleApproveToken = async () => {
    if (!tokenInfo) return;

    try {
      setLoading(true);
      setError('');

      const priceBigInt = tokenService.parseAmount(nft.price, tokenInfo.decimals);

      // Approve the exact amount (or use unlimited approval based on user preference)
      const receipt = await tokenService.approveToken(
        nft.paymentMethod,
        marketplaceAddress,
        priceBigInt
      );

      setTxHash(receipt.transactionHash);
      setNeedsApproval(false);
      setStep(PurchaseStep.CONFIRM_PURCHASE);
    } catch (err: any) {
      console.error('Approval error:', err);
      setError(err.message || 'Failed to approve token. Please try again.');
      setStep(PurchaseStep.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNFT = async () => {
    if (!tokenInfo) return;

    try {
      setLoading(true);
      setError('');
      setStep(PurchaseStep.PROCESSING);

      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();

      // Get marketplace contract
      const marketplaceABI = [
        'function buyNFT(uint256 tokenId) payable'
      ];
      const marketplace = new ethers.Contract(marketplaceAddress, marketplaceABI, signer);

      let tx;
      if (nft.paymentMethod === PaymentMethod.ETH) {
        // For ETH, send value with transaction
        const priceBigInt = tokenService.parseAmount(nft.price, tokenInfo.decimals);
        tx = await marketplace.buyNFT(nft.tokenId, { value: priceBigInt });
      } else {
        // For tokens, just call buyNFT (tokens are transferred via transferFrom)
        tx = await marketplace.buyNFT(nft.tokenId);
      }

      const receipt = await tx.wait();
      setTxHash(receipt.transactionHash);
      setStep(PurchaseStep.SUCCESS);

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Failed to purchase NFT. Please try again.');
      setStep(PurchaseStep.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case PurchaseStep.APPROVE_TOKEN:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Approve {tokenInfo?.symbol} Spending
              </h3>
              <p className="text-sm text-gray-600">
                You need to approve the marketplace to spend your {tokenInfo?.symbol} tokens. This is a one-time transaction.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount to approve:</span>
                <span className="font-semibold">{nft.price} {tokenInfo?.symbol}</span>
              </div>
            </div>

            <button
              onClick={handleApproveToken}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Approving...
                </span>
              ) : (
                'Approve'
              )}
            </button>
          </div>
        );

      case PurchaseStep.CONFIRM_PURCHASE:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Purchase
              </h3>
              <p className="text-sm text-gray-600">
                Review the details and confirm your purchase
              </p>
            </div>

            {/* NFT Preview */}
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <img src={nft.image} alt={nft.name} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h4 className="font-semibold text-gray-900">{nft.name}</h4>
                <p className="text-sm text-gray-600 mt-1">Token ID: {nft.tokenId}</p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold">{nft.price} {tokenInfo?.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold">{tokenInfo?.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Seller:</span>
                <span className="font-mono text-xs">{nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{nft.price} {tokenInfo?.symbol}</span>
              </div>
            </div>

            <button
              onClick={handleBuyNFT}
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Processing...' : 'Confirm Purchase'}
            </button>
          </div>
        );

      case PurchaseStep.PROCESSING:
        return (
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Processing Purchase...</h3>
            <p className="text-sm text-gray-600">Please wait while your transaction is being confirmed</p>
          </div>
        );

      case PurchaseStep.SUCCESS:
        return (
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Purchase Successful!</h3>
            <p className="text-sm text-gray-600">Congratulations! You now own {nft.name}</p>
            {txHash && (
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View transaction →
              </a>
            )}
          </div>
        );

      case PurchaseStep.ERROR:
        return (
          <div className="text-center space-y-4 py-8">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Purchase Failed</h3>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => setStep(needsApproval ? PurchaseStep.APPROVE_TOKEN : PurchaseStep.CONFIRM_PURCHASE)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Modal content */}
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default BuyNFTModal;
