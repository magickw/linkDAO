import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { receiptService } from '../../services/receiptService';
import { PaymentReceipt } from '../../types/receipt';
import { ReceiptDisplay } from '../../components/Marketplace/Receipt/ReceiptDisplay';

const ReceiptPage: React.FC = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { id } = router.query;
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchReceipt(id);
    }
  }, [id]);

  const fetchReceipt = async (receiptId: string) => {
    try {
      setLoading(true);
      const fetchedReceipt = await receiptService.getReceiptById(receiptId);
      
      if (!fetchedReceipt) {
        setError('Receipt not found');
        return;
      }

      // Check if user is authorized to view this receipt
      if (isConnected && address && fetchedReceipt.buyerAddress !== address) {
        setError('You are not authorized to view this receipt');
        return;
      }

      setReceipt(fetchedReceipt);
      setError(null);
    } catch (err) {
      setError('Failed to load receipt');
      console.error('Error fetching receipt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (receipt) {
      try {
        await receiptService.downloadReceiptPDF(receipt.id);
      } catch (err) {
        console.error('Error downloading receipt:', err);
      }
    }
  };

  const handlePrint = () => {
    if (receipt) {
      try {
        receiptService.printReceipt(receipt);
      } catch (err) {
        console.error('Error printing receipt:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Error</h3>
          <p className="mt-2 text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Receipt Not Found</h3>
          <p className="mt-2 text-gray-500">The receipt you're looking for doesn't exist or has been removed.</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </button>
        </div>
        <ReceiptDisplay 
          receipt={receipt}
          onDownload={handleDownload}
          onPrint={handlePrint}
        />
      </div>
    </div>
  );
};

export default ReceiptPage;