import React, { useEffect, useState } from 'react';
import { returnService } from '../../services/returnService';

interface Return {
  id: string;
  orderId: string;
  status: string;
  returnReason: string;
  originalAmount: number;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export const ReturnsList: React.FC = () => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReturns = async () => {
      try {
        setLoading(true);
        const response = await returnService.getUserReturns();
        if (response.success) {
          setReturns(response.data);
        } else {
          setError('Failed to fetch returns');
        }
      } catch (error) {
        console.error('Failed to fetch returns:', error);
        setError('Failed to fetch returns');
      } finally {
        setLoading(false);
      }
    };

    fetchReturns();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'approved':
        return 'text-blue-600 bg-blue-100';
      case 'requested':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Returns</h1>
        <p className="mt-2 text-gray-600">Track and manage your return requests</p>
      </div>

      {returns.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No returns found</h3>
          <p className="mt-1 text-sm text-gray-500">You haven't made any return requests yet.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {returns.map((returnItem) => (
              <li key={returnItem.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                          {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            Return #{returnItem.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="mt-2 flex">
                          <div className="flex items-center text-sm text-gray-500">
                            <p>Order: {returnItem.orderId.slice(0, 8)}</p>
                            <span className="mx-2">•</span>
                            <p>Reason: {returnItem.returnReason.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm text-gray-900 font-medium">
                        ${returnItem.originalAmount.toFixed(2)}
                      </div>
                      {returnItem.refundAmount && (
                        <div className="text-sm text-green-600">
                          Refund: ${returnItem.refundAmount.toFixed(2)}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(returnItem.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};