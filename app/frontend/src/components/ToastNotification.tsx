import React, { useEffect } from 'react';

interface ToastNotificationProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: (id: string) => void;
}

export default function ToastNotification({ 
  id, 
  message, 
  type, 
  duration = 5000, 
  onClose 
}: ToastNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info':
      default:
        return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  return (
    <div className={`${getTypeStyles()} border-l-4 p-4 rounded shadow-lg max-w-md`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm">{message}</p>
        </div>
        <button 
          onClick={() => onClose(id)}
          className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}