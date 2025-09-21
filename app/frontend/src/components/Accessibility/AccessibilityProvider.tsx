import React, { createContext, useContext, ReactNode } from 'react';
import { useAccessibility, UseAccessibilityReturn } from '@/hooks/useAccessibility';

const AccessibilityContext = createContext<UseAccessibilityReturn | null>(null);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const accessibility = useAccessibility();

  return (
    <AccessibilityContext.Provider value={accessibility}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibilityContext = (): UseAccessibilityReturn => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
};

// HOC for adding accessibility features to components
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const AccessibleComponent = (props: P) => {
    const accessibility = useAccessibilityContext();
    
    return (
      <Component 
        {...props} 
        accessibility={accessibility}
      />
    );
  };

  AccessibleComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`;
  
  return AccessibleComponent;
}