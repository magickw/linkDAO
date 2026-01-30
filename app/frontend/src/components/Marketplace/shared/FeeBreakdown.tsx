import React from 'react';
import { DollarSign, Percent, Truck, CreditCard, FileText } from 'lucide-react';

interface FeeBreakdownProps {
  itemPrice: number;
  platformFee: number;
  platformFeeRate: number;
  processingFee: number;
  taxAmount: number;
  taxRate: number;
  shippingCost: number;
  totalAmount: number;
  paymentMethod: 'fiat' | 'crypto';
  currency: string;
  className?: string;
}

export const FeeBreakdown: React.FC<FeeBreakdownProps> = ({
  itemPrice,
  platformFee,
  platformFeeRate,
  processingFee,
  taxAmount,
  taxRate,
  shippingCost,
  totalAmount,
  paymentMethod,
  currency,
  className = ''
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatCrypto = (amount: number) => {
    return `${amount.toFixed(4)} ${currency}`;
  };

  const isCrypto = currency !== 'USD';
  const formatAmount = isCrypto ? formatCrypto : formatCurrency;

  return (
    <div className={`bg-white/5 rounded-lg p-4 ${className}`}>
      <h3 className="text-white font-medium mb-4 flex items-center">
        <FileText className="w-4 h-4 mr-2" />
        Order Summary
      </h3>
      
      <div className="space-y-3">
        {/* Item Price */}
        <div className="flex justify-between">
          <span className="text-white/70">Item Price</span>
          <span className="text-white font-medium">{formatAmount(itemPrice)}</span>
        </div>

        {/* Platform Fee */}
        <div className="flex justify-between">
          <div className="flex items-center">
            <Percent className="w-4 h-4 mr-2 text-blue-400" />
            <span className="text-white/70">
              Platform Fee ({platformFeeRate}%)
            </span>
          </div>
          <span className="text-white">{formatAmount(platformFee)}</span>
        </div>

        {/* Processing Fee */}
        <div className="flex justify-between">
          <div className="flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-green-400" />
            <span className="text-white/70">
              {paymentMethod === 'fiat' ? 'Processing Fee' : 'Network Fee'}
            </span>
          </div>
          <span className="text-white">{formatAmount(processingFee)}</span>
        </div>

        {/* Tax */}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-white/70">Tax ({(taxRate * 100).toFixed(1)}%)</span>
            <span className="text-white">{formatAmount(taxAmount)}</span>
          </div>
        )}

        {/* Shipping */}
        {shippingCost > 0 && (
          <div className="flex justify-between">
            <div className="flex items-center">
              <Truck className="w-4 h-4 mr-2 text-orange-400" />
              <span className="text-white/70">Shipping</span>
            </div>
            <span className="text-white">{formatAmount(shippingCost)}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/20 pt-2">
          <div className="flex justify-between font-bold">
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-yellow-400" />
              <span className="text-white">Total</span>
            </div>
            <span className="text-white text-lg">{formatAmount(totalAmount)}</span>
          </div>
        </div>

        {/* Payment Method Badge */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Payment Method</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              paymentMethod === 'fiat' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-purple-500/20 text-purple-400'
            }`}>
              {paymentMethod === 'fiat' ? 'Credit Card' : 'Cryptocurrency'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};