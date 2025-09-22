/**
 * Sidebar Error Boundary
 * Specialized error boundary for sidebar components with minimal fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  sidebarType: 'left' | 'right';
  componentName?: string;
}

interface State {
  hasError: boolean;
  errorType: 'network' | 'rendering' | 'data' | 'unknown';
}

class SidebarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    let errorType: State['errorType'] = 'unknown';
    
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      errorType = 'network';
    } else if (error.message.includes('Cannot read') || error.message.includes('undefined')) {
      errorType = 'data';
    } else if (error.stack?.includes('React')) {
      errorType = 'rendering';
    }

    return {
      hasError: true,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Sidebar Error (${this.props.sidebarType}):`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ce-sidebar-error">
          <div className="ce-sidebar-error-content">
            <div className="ce-sidebar-error-icon">⚠️</div>
            <p className="ce-sidebar-error-text">
              {this.props.componentName || 'Component'} temporarily unavailable
            </p>
          </div>
          
          <style jsx>{`
            .ce-sidebar-error {
              padding: var(--ce-space-md);
              background: var(--ce-bg-secondary);
              border: 1px solid var(--ce-border-light);
              border-radius: var(--ce-radius-md);
              margin-bottom: var(--ce-space-md);
            }
            
            .ce-sidebar-error-content {
              text-align: center;
            }
            
            .ce-sidebar-error-icon {
              font-size: 1.5rem;
              margin-bottom: var(--ce-space-sm);
            }
            
            .ce-sidebar-error-text {
              font-size: var(--ce-font-size-xs);
              color: var(--ce-text-tertiary);
              margin: 0;
              line-height: 1.4;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SidebarErrorBoundary;