import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { returnService } from '../../services/returnService';

interface ReturnDetails {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  returnReason: string;
  returnReasonDetails?: string;
  itemsToReturn: any[];
  originalAmount: number;
  refundAmount?: number;
  restockingFee: number;
  returnShippingCost: number;
  status: string;
  refundStatus: string;
  riskLevel: string;
  returnLabelUrl?: string;
  returnTrackingNumber?: string;
  returnCarrier?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface ReturnMessage {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  attachments?: string[];
  createdAt: string;
}

export const ReturnDetails: React.FC = () => {
  const { returnId } = useParams<{ returnId: string }>();
  const [returnData, setReturnData] = useState<ReturnDetails | null>(null);
  const [messages, setMessages] = useState<ReturnMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchReturnDetails = async () => {
      if (!returnId) return;
      
      try {
        setLoading(true);
        const [returnResponse, messagesResponse] = await Promise.all([
          returnService.getReturn(returnId),
          returnService.getReturnMessages(returnId)
        ]);

        if (returnResponse.success) {
          setReturnData(returnResponse.data);
        } else {
          setError('Failed to fetch return details');
        }

        if (messagesResponse.success) {
          setMessages(messagesResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch return details:', error);
        setError('Failed to fetch return details');
      } finally {
        setLoading(false);
      }
    };

    fetchReturnDetails();
  }, [returnId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !returnId) return;

    try {
      setSendingMessage(true);
      const response = await returnService.addReturnMessage(returnId, {
        message: newMessage,
        attachments: [],
        isInternal: false
      });

      if (response.success) {
        setMessages([...messages, response.data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

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

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
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

  if (error || !returnData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error || 'Return not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Return Details</h1>
        <p className="mt-2 text-gray-600">Return #{returnData.id.slice(0, 8)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Return Information */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Return Information</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(returnData.status)}`}>
                    {returnData.status.charAt(0).toUpperCase() + returnData.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(returnData.riskLevel)}`}>
                    {returnData.riskLevel.charAt(0).toUpperCase() + returnData.riskLevel.slice(1)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Return Reason</label>
                <p className="mt-1 text-sm text-gray-900">{returnData.returnReason.replace('_', ' ')}</p>
                {returnData.returnReasonDetails && (
                  <p className="mt-1 text-sm text-gray-600">{returnData.returnReasonDetails}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Original Amount</label>
                  <p className="mt-1 text-sm text-gray-900">${returnData.originalAmount.toFixed(2)}</p>
                </div>
                {returnData.refundAmount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Refund Amount</label>
                    <p className="mt-1 text-sm text-gray-900">${returnData.refundAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {returnData.restockingFee > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Restocking Fee</label>
                  <p className="mt-1 text-sm text-gray-900">${returnData.restockingFee.toFixed(2)}</p>
                </div>
              )}

              {returnData.returnTrackingNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tracking Information</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {returnData.returnCarrier}: {returnData.returnTrackingNumber}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Items to Return</label>
                <div className="mt-2 space-y-2">
                  {returnData.itemsToReturn.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-gray-900">{item.name || `Item ${index + 1}`}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      {item.reason && <p className="text-sm text-gray-600">Reason: {item.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Messages</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-500">No messages yet</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-900">
                          {message.senderRole.charAt(0).toUpperCase() + message.senderRole.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{message.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};