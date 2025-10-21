import React, { ComponentType } from 'react';
import { SellerErrorBoundary } from './SellerErrorBoundary';
import { SellerError } from '../../../../types/sellerError';

interface WithSellerErrorBoundaryOptions {
  context?: string;
  fallback?: React.ComponentType<{ error?: SellerError; onReset?: () => void }>;
  enableRecovery?: boolean;
  onError?: (error: SellerError, errorInfo: React.ErrorInfo) => void;
}

/**
 * Higher-order component to wrap seller components with error boundaries
 */
export function withSellerErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithSellerErrorBoundaryOptions = {}
) {
  const WithSellerErrorBoundaryComponent = (props: P) => {
    const {
      context = WrappedComponent.displayName || WrappedComponent.name || 'SellerComponent',
      fallback,
      enableRecovery = true,
      onError,
    } = options;

    return (
      <SellerErrorBoundary
        context={context}
        fallback={fallback}
        enableRecovery={enableRecovery}
        onError={onError}
      >
        <WrappedComponent {...props} />
      </SellerErrorBoundary>
    );
  };

  WithSellerErrorBoundaryComponent.displayName = `withSellerErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithSellerErrorBoundaryComponent;
}

/**
 * Decorator version for class components
 */
export function sellerErrorBoundary(options: WithSellerErrorBoundaryOptions = {}) {
  return function <P extends object>(WrappedComponent: ComponentType<P>) {
    return withSellerErrorBoundary(WrappedComponent, options);
  };
}

export default withSellerErrorBoundary;