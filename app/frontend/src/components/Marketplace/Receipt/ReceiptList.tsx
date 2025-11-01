import React, { useState, useEffect } from 'react';
import { receiptService } from '../../../services/receiptService';
import { PaymentReceipt, ReceiptType } from '../../../types/receipt';
import { ReceiptDisplay } from './ReceiptDisplay';

interface ReceiptListProps {
  userAddress: string;
}

export const ReceiptList: React.FC<ReceiptListProps> = ({ userAddress }) => {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, [userAddress]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const userReceipts = await receiptService.getReceiptsByUser(userAddress);
      setReceipts(userReceipts);
      setError(null);
    } catch (err) {
      setError('Failed to load receipts');
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt);
  };

  const handleDownloadReceipt = async (receiptId: string) => {
    try {
      await receiptService.downloadReceiptPDF(receiptId);
    } catch (err) {
      console.error('Error downloading receipt:', err);
    }
  };

  const handlePrintReceipt = (receipt: PaymentReceipt) => {
    try {
      receiptService.printReceipt(receipt);
    } catch (err) {
      console.error('Error printing receipt:', err);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchReceipts}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (selectedReceipt) {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => setSelectedReceipt(null)}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Receipts
          </button>
        </div>
        <ReceiptDisplay 
          receipt={selectedReceipt}
          onDownload={() => handleDownloadReceipt(selectedReceipt.id)}
          onPrint={() => handlePrintReceipt(selectedReceipt)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Receipts</h2>
        <p className="text-gray-600">{receipts.length} receipts</p>
      </div>

      {receipts.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No receipts yet</h3>
          <p className="mt-1 text-gray-500">Your purchase receipts will appear here once you make purchases.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {receipts.map((receipt) => (
            <div 
              key={receipt.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewReceipt(receipt)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Receipt #{receipt.receiptNumber}
                    </h3>
                    <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      receipt.type === ReceiptType.MARKETPLACE 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {receipt.type === ReceiptType.MARKETPLACE ? 'Marketplace' : 'LDAO Tokens'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(receipt.createdAt)}
                  </p>
                  <p className="mt-2 text-gray-900 font-medium">
                    {formatCurrency(receipt.amount, receipt.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    receipt.status === 'completed' ? 'text-green-600' :
                    receipt.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadReceipt(receipt.id);
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};