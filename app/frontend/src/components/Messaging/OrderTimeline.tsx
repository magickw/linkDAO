import React from 'react';
import { Message } from '../../types/messaging';

interface OrderEvent {
  id: string;
  type: 'order_event';
  eventType: string;
  description: string;
  timestamp: Date;
}

interface OrderTimelineProps {
  conversationId: string;
  messages: Message[];
  orderEvents: OrderEvent[];
  className?: string;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ 
  conversationId,
  messages,
  orderEvents,
  className = ''
}) => {
  // Combine messages and order events, then sort by timestamp
  const timelineItems = [
    ...messages.map(msg => ({ ...msg, type: 'message' as const })),
    ...orderEvents
  ].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const getEventIcon = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'order_placed':
        return (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'payment_received':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'order_shipped':
        return (
          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        );
      case 'order_delivered':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`order-timeline ${className}`}>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
        
        <div className="space-y-6">
          {timelineItems.map((item, index) => (
            <div key={item.id} className="relative flex items-start gap-4">
              {item.type === 'message' ? (
                // Message item
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  item.fromAddress === 'currentUser' 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <span className="text-xs font-medium text-white">
                    {item.fromAddress.charAt(2).toUpperCase()}
                  </span>
                </div>
              ) : (
                // Order event item
                getEventIcon(item.eventType)
              )}
              
              <div className="flex-1 min-w-0 pb-4">
                {item.type === 'message' ? (
                  // Message content
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
                    item.fromAddress === 'currentUser'
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    <p className="text-sm">{item.content}</p>
                  </div>
                ) : (
                  // Order event content
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.eventType.replace('_', ' ')}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {item.description}
                    </p>
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(item.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};