/**
 * Alert Component
 * Provides alert notifications with different variants
 */

import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  className?: string;
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ 
  variant = 'default', 
  className = '', 
  children 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className={`relative w-full rounded-lg border p-4 ${getVariantStyles()} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3">
          {children}
        </div>
      </div>
    </div>
  );
};

const AlertDescription: React.FC<AlertDescriptionProps> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
};

const AlertTitle: React.FC<AlertDescriptionProps> = ({ 
  className = '', 
  children 
}) => {
  return (
    <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>
      {children}
    </h5>
  );
};

export { Alert, AlertDescription, AlertTitle };