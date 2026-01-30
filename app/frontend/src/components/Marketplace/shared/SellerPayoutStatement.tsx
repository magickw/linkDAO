import React from 'react';
import { FeeBreakdown } from './FeeBreakdown';

interface SellerPayoutStatementProps {
  orderId: string;
  itemPrice: number;
  platformFee: number;
  platformFeeRate: number;
  processingFee: number;
  taxAmount: number;
  shippingCost: number;
  totalCollected: number;
  sellerPayout: number;
  currency: string;
  paymentMethod: 'fiat' | 'crypto';
}

export const SellerPayoutStatement: React.FC<SellerPayoutStatementProps> = ({
  orderId,
  itemPrice,
  platformFee,
  platformFeeRate,
  processingFee,
  taxAmount,
  shippingCost,
  totalCollected,
  sellerPayout,
  currency,
  paymentMethod
}) => {
  return (
    <div className="bg-white/5 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Payout Statement</h2>
        <p className="text-white/70">Order #{orderId}</p>
      </div>

      {/* Detailed Fee Breakdown for Sellers */}
      <div className="mb-6">
        <FeeBreakdown
          itemPrice={itemPrice}
          platformFee={platformFee}
          platformFeeRate={platformFeeRate}
          processingFee={processingFee}
          taxAmount={taxAmount}
          taxRate={taxAmount / itemPrice} // Calculate rate for display
          shippingCost={shippingCost}
          totalAmount={totalCollected}
          paymentMethod={paymentMethod}
          currency={currency}
          showPlatformFee={true} // Show platform fee to sellers
        />
      </div>

      {/* Seller Net Payout */}
      <div className="border-t border-white/20 pt-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Your Payout</h3>
            <p className="text-white/70 text-sm">After all fees and deductions</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">
              {currency === 'USD' 
                ? `$${sellerPayout.toFixed(2)}` 
                : `${sellerPayout.toFixed(4)} ${currency}`}
            </div>
            <div className="text-white/60 text-sm">
              {((sellerPayout / totalCollected) * 100).toFixed(1)}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Platform Fee Explanation */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>Platform Fee Notice:</strong> The {platformFeeRate}% platform fee 
          has been deducted from your earnings. This fee helps maintain and improve 
          the marketplace infrastructure.
        </p>
      </div>
    </div>
  );
};