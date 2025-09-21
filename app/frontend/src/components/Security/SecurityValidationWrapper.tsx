/**
 * Security Validation Wrapper Component
 * Wraps components with automatic security validation
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { useSecurity } from '../../hooks/useSecurity';
import { useSecurityContext } from './SecurityProvider';
import SecurityAlert from './SecurityAlert';
import { Loader2 } from 'lucide-react';

interface SecurityValidationWrapperProps {
  children: ReactNode;
  validationType: 'content' | 'media' | 'url' | 'transaction' | 'comprehensive';
  validationData?: any;
  autoValidate?: boolean;
  showAlert?: boolean;
  blockOnError?: boolean;
  onValidationComplete?: (result: any) => void;
  onValidationError?: (error: string) => void;
  className?: string;
}

export function SecurityValidationWrapper({
  children,
  validationType,
  validationData,
  autoValidate = true,
  showAlert = true,
  blockOnError = true,
  onValidationComplete,
  onValidationError,
  className = ''
}: SecurityValidationWrapperProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const { securityContext } = useSecurityContext();
  const [securityState, securityActions] = useSecurity(securityContext);

  // Auto-validate when data changes
  useEffect(() => {
    if (!autoValidate || !validationData) {
      return;
    }

    const performValidation = async () => {
      try {
        let result;

        switch (validationType) {
          case 'content':
            result = await securityActions.validateContent(validationData);
            break;
          case 'media':
            result = await securityActions.validateMedia(
              Array.isArray(validationData) ? validationData : [validationData]
            );
            break;
          case 'url':
            result = await securityActions.validateUrl(validationData);
            break;
          case 'transaction':
            result = await securityActions.validateTransaction(
              validationData.transaction,
              validationData.provider
            );
            break;
          case 'comprehensive':
            result = await securityActions.performComprehensiveScan(validationData);
            break;
          default:
            throw new Error(`Unknown validation type: ${validationType}`);
        }

        // Handle validation result
        if (!result.valid && blockOnError) {
          setIsBlocked(true);
        }

        if (result.errors.length > 0 || result.warnings.length > 0) {
          setShowSecurityAlert(true);
        }

        onValidationComplete?.(result);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Validation failed';
        onValidationError?.(errorMessage);
        
        if (blockOnError) {
          setIsBlocked(true);
        }
        
        setShowSecurityAlert(true);
      }
    };

    performValidation();
  }, [
    validationData,
    validationType,
    autoValidate,
    blockOnError,
    onValidationComplete,
    onValidationError,
    securityActions
  ]);

  // Handle security alert actions
  const handleProceedAnyway = () => {
    setIsBlocked(false);
    setShowSecurityAlert(false);
  };

  const handleCancel = () => {
    setIsBlocked(true);
    setShowSecurityAlert(false);
  };

  const handleDismissAlert = () => {
    setShowSecurityAlert(false);
  };

  // Render loading state
  if (securityState.isValidating) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          Validating security...
        </span>
      </div>
    );
  }

  // Render blocked state
  if (isBlocked && blockOnError) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Content Blocked
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This content has been blocked due to security concerns.
              </p>
            </div>
          </div>
        </div>

        {showAlert && showSecurityAlert && (
          <div className="mt-4">
            <SecurityAlert
              level={securityState.riskLevel}
              errors={securityState.errors}
              warnings={securityState.warnings}
              blocked={securityState.blocked}
              recommendations={securityActions.getSecurityRecommendations()}
              onProceed={securityState.riskLevel !== 'critical' ? handleProceedAnyway : undefined}
              onCancel={handleCancel}
              onDismiss={handleDismissAlert}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Security Alert */}
      {showAlert && showSecurityAlert && (
        <div className="mb-4">
          <SecurityAlert
            level={securityState.riskLevel}
            errors={securityState.errors}
            warnings={securityState.warnings}
            blocked={securityState.blocked}
            recommendations={securityActions.getSecurityRecommendations()}
            onProceed={handleProceedAnyway}
            onCancel={handleCancel}
            onDismiss={handleDismissAlert}
          />
        </div>
      )}

      {/* Main Content */}
      {children}
    </div>
  );
}

export default SecurityValidationWrapper;