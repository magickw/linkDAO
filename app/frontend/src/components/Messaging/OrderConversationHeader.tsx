import React from 'react';
import { Conversation } from '../../types/messaging';

interface OrderConversationHeaderProps {
  conversation: Conversation & {
    orderId?: number;
    productId?: string;
    contextMetadata?: {
      productName?: string;
      productImage?: string;
      orderStatus?: string;
      orderId?: number;
    };
  };
  onViewOrder?: (orderId: number) => void;
  onTrackPackage?: (trackingNumber: string) => void;
}

export const OrderConversationHeader: React.FC<OrderConversationHeaderProps> = ({
  conversation,
  onViewOrder,
  onTrackPackage
}) => {
  if (!conversation.orderId || !conversation.contextMetadata) {
    return null;
  }

  const handleViewOrder = () => {
    if (onViewOrder && conversation.orderId) {
      onViewOrder(conversation.orderId);
    }
  };

  const handleTrackPackage = () => {
    // In a real implementation, we would have tracking number in contextMetadata
    if (onTrackPackage) {
      onTrackPackage('TRK123456789'); // Placeholder tracking number
    }
  };

  return (
    <div className="order-context-banner bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="order-info flex items-center gap-3">
          {conversation.contextMetadata.productImage ? (
            <img 
              src={conversation.contextMetadata.productImage} 
              alt={conversation.contextMetadata.productName}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {conversation.contextMetadata.productName}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Order #{conversation.contextMetadata.orderId}
            </p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              conversation.contextMetadata.orderStatus === 'shipped' 
                ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200' 
                : conversation.contextMetadata.orderStatus === 'delivered'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200'
            }`}>
              {conversation.contextMetadata.orderStatus}
            </span>
          </div>
        </div>
        
        <div className="order-actions flex gap-2">
          <button
            onClick={handleViewOrder}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            View Order
          </button>
          {conversation.contextMetadata.orderStatus === 'shipped' && (
            <button
              onClick={handleTrackPackage}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Track Package
            </button>
          )}
        </div>
      </div>
    </div>
  );
};