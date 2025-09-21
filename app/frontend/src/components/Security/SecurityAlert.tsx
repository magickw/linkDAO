/**
 * Security Alert Component
 * Displays security warnings and recommendations to users
 */

import React from 'react';
import { AlertTriangle, Shield, X, Info, AlertCircle } from 'lucide-react';

interface SecurityAlertProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  errors: string[];
  warnings: string[];
  blocked: string[];
  recommendations: string[];
  onDismiss?: () => void;
  onProceed?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
  className?: string;
}

export function SecurityAlert({
  level,
  errors,
  warnings,
  blocked,
  recommendations,
  onDismiss,
  onProceed,
  onCancel,
  showActions = true,
  className = ''
}: SecurityAlertProps) {
  const getAlertConfig = () => {
    switch (level) {
      case 'critical':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          iconColor: 'text-red-600 dark:text-red-400',
          title: 'Critical Security Issue'
        };
      case 'high':
        return {
          icon: AlertCircle,
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          textColor: 'text-orange-800 dark:text-orange-200',
          iconColor: 'text-orange-600 dark:text-orange-400',
          title: 'High Risk Detected'
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          title: 'Security Warning'
        };
      case 'low':
        return {
          icon: Info,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-800 dark:text-blue-200',
          iconColor: 'text-blue-600 dark:text-blue-400',
          title: 'Security Notice'
        };
      default:
        return {
          icon: Shield,
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-800 dark:text-gray-200',
          iconColor: 'text-gray-600 dark:text-gray-400',
          title: 'Security Information'
        };
    }
  };

  const config = getAlertConfig();
  const Icon = config.icon;

  const hasIssues = errors.length > 0 || warnings.length > 0 || blocked.length > 0;

  if (!hasIssues && recommendations.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.textColor}`}>
            {config.title}
          </h3>
          
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-2">
              <h4 className={`text-xs font-medium ${config.textColor} opacity-90`}>
                Critical Issues:
              </h4>
              <ul className={`mt-1 text-xs ${config.textColor} opacity-80`}>
                {errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blocked Items */}
          {blocked.length > 0 && (
            <div className="mt-2">
              <h4 className={`text-xs font-medium ${config.textColor} opacity-90`}>
                Blocked Content:
              </h4>
              <ul className={`mt-1 text-xs ${config.textColor} opacity-80`}>
                {blocked.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-2">
              <h4 className={`text-xs font-medium ${config.textColor} opacity-90`}>
                Warnings:
              </h4>
              <ul className={`mt-1 text-xs ${config.textColor} opacity-80`}>
                {warnings.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mt-2">
              <h4 className={`text-xs font-medium ${config.textColor} opacity-90`}>
                Recommendations:
              </h4>
              <ul className={`mt-1 text-xs ${config.textColor} opacity-80`}>
                {recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="mt-3 flex space-x-2">
              {level === 'critical' || errors.length > 0 ? (
                <button
                  onClick={onCancel}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border ${config.borderColor} ${config.textColor} hover:opacity-80 transition-opacity`}
                >
                  Cancel
                </button>
              ) : (
                <>
                  {onProceed && (
                    <button
                      onClick={onProceed}
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border ${config.borderColor} ${config.textColor} hover:opacity-80 transition-opacity`}
                    >
                      Proceed Anyway
                    </button>
                  )}
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:opacity-80 transition-opacity"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${config.textColor} hover:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current`}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SecurityAlert;