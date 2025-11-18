/**
 * Toast Context - Simple toast notification system
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const defaultContextValue: ToastContextType = {
  addToast: () => {},
  removeToast: () => {}
};

export const ToastContext = createContext<ToastContextType>(defaultContextValue);

export const useToast = () => {
  // Always return a valid context value, even if provider is not mounted
  const context = useContext(ToastContext);
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration: number = 5000) => {
    // Ensure we don't add toasts when component is not mounted
    if (!isMountedRef.current) return;
    
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);

    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        // Check if component is still mounted before removing
        if (isMountedRef.current) {
          setToasts(prev => prev.filter(t => t.id !== id));
        }
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const contextValue = useMemo(() => ({
    addToast,
    removeToast
  }), [addToast, removeToast]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-500/50 text-green-100';
      case 'error':
        return 'bg-red-900/90 border-red-500/50 text-red-100';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-500/50 text-yellow-100';
      case 'info':
        return 'bg-blue-900/90 border-blue-500/50 text-blue-100';
      default:
        return 'bg-gray-900/90 border-gray-500/50 text-gray-100';
    }
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container - only render on client side */}
      {typeof window !== 'undefined' && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 300, scale: 0.3 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 300, scale: 0.5 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`
                  flex items-center gap-3 p-4 rounded-lg border backdrop-blur-sm
                  shadow-lg max-w-sm min-w-[300px]
                  ${getToastStyles(toast.type)}
                `}
              >
                {getToastIcon(toast.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-current opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </ToastContext.Provider>
  );
};