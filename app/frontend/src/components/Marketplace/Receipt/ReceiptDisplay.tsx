import React from 'react';
import { 
  PaymentReceipt, 
  MarketplaceReceipt, 
  LDAOPurchaseReceipt 
} from '../../../types/receipt';

interface ReceiptDisplayProps {
  receipt: PaymentReceipt;
  onDownload?: () => void;
  onPrint?: () => void;
}

export const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({ 
  receipt, 
  onDownload,
  onPrint 
}) => {
  const isMarketplaceReceipt = (receipt as MarketplaceReceipt).orderId !== undefined;
  const isLDAOReceipt = (receipt as LDAOPurchaseReceipt).tokensPurchased !== undefined;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: string, currency: string) => {
    const numericAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'ETH' ? 'USD' : currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Receipt</h1>
            <p className="text-gray-600 mt-1">
              Receipt #{receipt.receiptNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium">
              {formatDate(receipt.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Type Badge */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isMarketplaceReceipt 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {isMarketplaceReceipt ? 'Marketplace Purchase' : 'LDAO Token Purchase'}
        </span>
      </div>

      {/* Buyer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Buyer Information</h3>
          <div className="space-y-2">
            <p className="text-gray-600">
              <span className="font-medium">Wallet:</span> {receipt.buyerAddress}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Payment Method:</span> {receipt.paymentMethod}
            </p>
            {receipt.transactionHash && (
              <p className="text-gray-600">
                <span className="font-medium">Transaction Hash:</span> {receipt.transactionHash}
              </p>
            )}
          </div>
        </div>

        {isMarketplaceReceipt && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Seller Information</h3>
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-medium">Name:</span> {(receipt as MarketplaceReceipt).sellerName || 'N/A'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Wallet:</span> {(receipt as MarketplaceReceipt).sellerAddress || 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Order Details */}
      {isMarketplaceReceipt && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-700">Item</th>
                  <th className="text-right py-2 font-medium text-gray-700">Quantity</th>
                  <th className="text-right py-2 font-medium text-gray-700">Price</th>
                  <th className="text-right py-2 font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {(receipt as MarketplaceReceipt).items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 text-gray-900">{item.name}</td>
                    <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">
                      {formatCurrency(item.unitPrice, receipt.currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.totalPrice, receipt.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Token Purchase Details */}
      {isLDAOReceipt && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Purchase Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-gray-600">
                <span className="font-medium">Tokens Purchased:</span> {(receipt as LDAOPurchaseReceipt).tokensPurchased}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <span className="font-medium">Price Per Token:</span> {formatCurrency((receipt as LDAOPurchaseReceipt).pricePerToken, 'USD')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(receipt.amount, receipt.currency)}</span>
          </div>
          
          {receipt.fees && (
            <>
              {receipt.fees.processing && parseFloat(receipt.fees.processing) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing Fee</span>
                  <span className="font-medium">{formatCurrency(receipt.fees.processing, receipt.currency)}</span>
                </div>
              )}
              {receipt.fees.platform && parseFloat(receipt.fees.platform) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee</span>
                  <span className="font-medium">{formatCurrency(receipt.fees.platform, receipt.currency)}</span>
                </div>
              )}
              {receipt.fees.gas && parseFloat(receipt.fees.gas) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Gas Fee</span>
                  <span className="font-medium">{formatCurrency(receipt.fees.gas, receipt.currency)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Fees</span>
                <span>{formatCurrency(receipt.fees.total, receipt.currency)}</span>
              </div>
            </>
          )}
          
          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>Total Paid</span>
            <span>{formatCurrency(
              (parseFloat(receipt.amount) + parseFloat(receipt.fees?.total || '0')).toString(), 
              receipt.currency
            )}</span>
          </div>
        </div>
      </div>

      {/* Transaction Status */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Status</h3>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            receipt.status === 'completed' ? 'bg-green-500' : 
            receipt.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="capitalize font-medium">
            {receipt.status === 'completed' ? 'Payment Confirmed' : 
             receipt.status === 'failed' ? 'Payment Failed' : 'Processing'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        {onPrint && (
          <button
            onClick={onPrint}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Print Receipt
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download PDF
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
        <p>Thank you for your purchase on LinkDAO!</p>
        <p className="mt-1">This is an official receipt for your transaction.</p>
      </div>
    </div>
  );
};