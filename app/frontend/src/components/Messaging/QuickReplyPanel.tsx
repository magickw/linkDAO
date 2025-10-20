import React, { useState, useEffect } from 'react';

interface QuickReply {
  id: string;
  name: string;
  content: string;
  category: string;
}

interface QuickReplyPanelProps {
  onSelectReply: (content: string) => void;
  className?: string;
}

export const QuickReplyPanel: React.FC<QuickReplyPanelProps> = ({ 
  onSelectReply,
  className = ''
}) => {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [templates, setTemplates] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real implementation, these would be fetched from an API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setQuickReplies([
        {
          id: '1',
          name: 'Shipping Inquiry',
          content: 'When will my order be shipped?',
          category: 'shipping'
        },
        {
          id: '2',
          name: 'Delivery Time',
          content: 'How long will delivery take?',
          category: 'shipping'
        },
        {
          id: '3',
          name: 'Return Policy',
          content: 'What is your return policy?',
          category: 'returns'
        },
        {
          id: '4',
          name: 'Product Question',
          content: 'Is this item still in stock?',
          category: 'product'
        }
      ]);

      setTemplates([
        {
          id: 't1',
          name: 'Order Confirmation',
          content: 'Thank you for your order! We\'ll process it within 24 hours.',
          category: 'order'
        },
        {
          id: 't2',
          name: 'Shipping Notification',
          content: 'Your order has been shipped! Tracking number: [TRACKING_NUMBER]',
          category: 'shipping'
        },
        {
          id: 't3',
          name: 'Delivery Confirmation',
          content: 'Your order has been delivered. Thank you for shopping with us!',
          category: 'delivery'
        }
      ]);

      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className={`quick-reply-panel ${className}`}>
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-6"></div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`quick-reply-panel bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Replies</h4>
        <div className="grid grid-cols-1 gap-2 mb-6">
          {quickReplies.map(reply => (
            <button
              key={reply.id}
              onClick={() => onSelectReply(reply.content)}
              className="text-left px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="font-medium">{reply.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{reply.content}</div>
            </button>
          ))}
        </div>

        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Templates</h4>
        <div className="grid grid-cols-1 gap-2">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => onSelectReply(template.content)}
              className="text-left px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{template.content}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};