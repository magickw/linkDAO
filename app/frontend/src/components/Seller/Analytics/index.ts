export { SellerAnalyticsDashboard } from './SellerAnalyticsDashboard';
export { SellerPerformanceMetrics } from './SellerPerformanceMetrics';
export { SellerTierProgression } from './SellerTierProgression';

// Lazy load other components for better performance
export const SellerInsights = React.lazy(() => 
  import('./SellerInsights').then(module => ({ default: module.SellerInsights }))
);

export const SellerBottlenecks = React.lazy(() => 
  import('./SellerBottlenecks').then(module => ({ default: module.SellerBottlenecks }))
);

export const SellerPerformanceComparison = React.lazy(() => 
  import('./SellerPerformanceComparison').then(module => ({ default: module.SellerPerformanceComparison }))
);

import React from 'react';